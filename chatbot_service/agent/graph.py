# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from uuid import uuid4

import logging
import html

from agent.context_assembler import ContextAssembler
from agent.governance import AIGovernance
from agent.intent_detector import IntentDetector
from agent.safety_checker import SafetyChecker
from agent.state import ChatRequest, ChatResponse
from memory.redis_memory import ConversationMemoryStore
from memory.summarizer import ConversationSummarizer
from providers.base import ProviderRequest
from providers.router import ProviderRouter
from rag.vectorstore import LocalVectorStore

logger = logging.getLogger("safevixai.chatbot.engine")


def _log_intent_refinement(original: str, refined: str, message: str) -> None:
    if original != refined:
        logger.info("Intent refined: %s -> %s (msg='%s')", original, refined, message[:60])


class ChatEngine:
    def __init__(
        self,
        *,
        memory_store: ConversationMemoryStore,
        vectorstore: LocalVectorStore,
        intent_detector: IntentDetector,
        safety_checker: SafetyChecker,
        context_assembler: ContextAssembler,
        provider_router: ProviderRouter,
        redis_url: str | None = None,
        summarizer: ConversationSummarizer | None = None,
    ) -> None:
        self.memory_store = memory_store
        self.vectorstore = vectorstore
        self.intent_detector = intent_detector
        self.safety_checker = safety_checker
        self.context_assembler = context_assembler
        self.provider_router = provider_router
        self.summarizer = summarizer or ConversationSummarizer()
        # Phase 0.7: AI governance
        self.governance = AIGovernance(redis_url)

    async def chat(self, payload: ChatRequest) -> ChatResponse:
        session_id = payload.session_id or str(uuid4())
        await self.memory_store.append_message(session_id, 'user', payload.message)
        history = await self.memory_store.get_history(session_id, limit=12)

        safety = self.safety_checker.evaluate(payload.message)
        if safety.blocked:
            await self.memory_store.append_message(session_id, 'assistant', safety.response or '')
            return ChatResponse(
                response=safety.response or 'I cannot help with that request.',
                intent='blocked',
                sources=['policy:safety'],
                session_id=session_id,
            )

        summarized_history, _ = self.summarizer.get_summary_for_history(history)
        intent = self.intent_detector.detect(payload.message)
        refined_intent = self.intent_detector.refine_intent(intent, payload.message, history)
        _log_intent_refinement(intent, refined_intent, payload.message)
        context = await self.context_assembler.assemble(
            session_id=session_id,
            message=payload.message,
            intent=refined_intent,
            lat=payload.lat,
            lon=payload.lon,
            client_ip=payload.client_ip,
            history=history,
        )

        if not context.retrieved and not context.tools and refined_intent != 'general':
            response = (
                'I do not know from the SafeVixAI knowledge base. '
                'Please share more details or try a different road-safety question.'
            )
            await self.memory_store.append_message(
                session_id,
                'assistant',
                response,
                metadata={'intent': refined_intent, 'sources': ['policy:weak-retrieval']},
            )
            return ChatResponse(
                response=response,
                intent=refined_intent,
                sources=['policy:weak-retrieval'],
                session_id=session_id,
            )

        provider_result = await self.provider_router.generate(
            ProviderRequest(
                message=payload.message,
                intent=refined_intent,
                history=summarized_history,
                tool_summaries=[item.summary for item in context.tools],
                document_snippets=[
                    f'{item.title} ({item.source}): {item.snippet}'
                    for item in context.retrieved
                ],
            )
        )

        # Phase 0.3: Output safety check — catch harmful LLM responses
        output_safety = self.safety_checker.check_output_safety(provider_result.text)
        if output_safety.blocked:
            await self.memory_store.append_message(
                session_id, 'assistant', output_safety.response or '',
                metadata={'intent': 'blocked_output', 'sources': ['policy:safety-output']},
            )
            return ChatResponse(
                response=output_safety.response or 'I encountered an issue generating a safe response.',
                intent='blocked_output',
                sources=['policy:safety-output'],
                session_id=session_id,
            )

        # Phase 0.3: Medical disclaimer — append for first-aid/medical topics
        provider_result.text = self.safety_checker.add_medical_disclaimer_if_needed(
            payload.message, provider_result.text
        )

        # Phase 0.7: AI governance evaluation
        governance_result = await self.governance.evaluate(
            response_text=provider_result.text,
            retrieved_context=[
                {"content": item.snippet, "source": item.source, "title": item.title}
                for item in context.retrieved
            ],
            tool_results=[{"payload": tool.payload} for tool in context.tools],
            prompt=payload.message,
        )

        # Add governance metadata to response
        response_text = provider_result.text
        if governance_result.flagged:
            response_text = f"[⚠️ Low confidence] {response_text}"
        
        sources = self._dedupe_sources(
            [source for tool in context.tools for source in tool.sources]
            + [item.source for item in context.retrieved]
            + governance_result.citations
        )
        
        await self.memory_store.append_message(
            session_id,
            'assistant',
            response_text,
            metadata={
                'intent': refined_intent,
                'sources': sources,
                'governance': {
                    'hallucination_score': governance_result.hallucination_score,
                    'factuality_score': governance_result.factuality_score,
                    'flagged': governance_result.flagged,
                    'prompt_version': governance_result.prompt_version,
                }
            },
        )
        return ChatResponse(
            response=response_text,
            intent=refined_intent,
            sources=sources,
            session_id=session_id,
        )

    async def stream_chat(self, payload: ChatRequest):
        """Stream chat with real LLM token streaming.

        Yields event dicts for SSE serialization:
          {'type': 'token', 'text': str}
          {'type': 'done', 'intent': str, 'sources': list, 'session_id': str}
          {'type': 'error', 'message': str}
        """
        session_id = payload.session_id or str(uuid4())
        await self.memory_store.append_message(session_id, 'user', payload.message)
        history = await self.memory_store.get_history(session_id, limit=12)

        safety = self.safety_checker.evaluate(payload.message)
        if safety.blocked:
            blocked_text = safety.response or 'I cannot help with that request.'
            await self.memory_store.append_message(session_id, 'assistant', blocked_text)
            yield {'type': 'token', 'text': blocked_text}
            yield {'type': 'done', 'intent': 'blocked', 'sources': ['policy:safety'], 'session_id': session_id}
            return

        summarized_history, _ = self.summarizer.get_summary_for_history(history)
        intent = self.intent_detector.detect(payload.message)
        refined_intent = self.intent_detector.refine_intent(intent, payload.message, history)
        _log_intent_refinement(intent, refined_intent, payload.message)
        context = await self.context_assembler.assemble(
            session_id=session_id,
            message=payload.message,
            intent=refined_intent,
            lat=payload.lat,
            lon=payload.lon,
            client_ip=payload.client_ip,
            history=history,
        )

        if not context.retrieved and not context.tools and refined_intent != 'general':
            response = (
                'I do not know from the SafeVixAI knowledge base. '
                'Please share more details or try a different road-safety question.'
            )
            await self.memory_store.append_message(
                session_id, 'assistant', response,
                metadata={'intent': refined_intent, 'sources': ['policy:weak-retrieval']},
            )
            yield {'type': 'token', 'text': response}
            yield {'type': 'done', 'intent': refined_intent, 'sources': ['policy:weak-retrieval'], 'session_id': session_id}
            return

        base_sources = self._dedupe_sources(
            [source for tool in context.tools for source in tool.sources]
            + [item.source for item in context.retrieved]
        )

        full_text = ""
        try:
            async for event in self.provider_router.stream_generate(
                ProviderRequest(
                    message=payload.message,
                    intent=refined_intent,
                    history=summarized_history,
                    tool_summaries=[item.summary for item in context.tools],
                    document_snippets=[
                        f'{item.title} ({item.source}): {item.snippet}'
                        for item in context.retrieved
                    ],
                )
            ):
                if event['type'] == 'token':
                    escaped = html.escape(event['text'])
                    full_text += escaped
                    yield {'type': 'token', 'text': escaped}
                elif event['type'] == 'done':
                    # Phase 0.3: Output safety check — catch harmful LLM responses
                    output_safety = self.safety_checker.check_output_safety(full_text)
                    if output_safety.blocked:
                        safe_text = output_safety.response or 'I encountered an issue generating a safe response.'
                        yield {'type': 'token', 'text': safe_text}
                        yield {'type': 'done', 'intent': 'blocked_output', 'sources': ['policy:safety-output'], 'session_id': session_id}
                        await self.memory_store.append_message(
                            session_id, 'assistant', safe_text,
                            metadata={'intent': 'blocked_output', 'sources': ['policy:safety-output']},
                        )
                        return

                    # Phase 0.3: Medical disclaimer — append for first-aid/medical topics
                    full_text = self.safety_checker.add_medical_disclaimer_if_needed(payload.message, full_text)

                    governance_result = await self.governance.evaluate(
                        response_text=full_text,
                        retrieved_context=[
                            {"content": item.snippet, "source": item.source, "title": item.title}
                            for item in context.retrieved
                        ],
                        tool_results=[{"payload": tool.payload} for tool in context.tools],
                        prompt=payload.message,
                    )
                    response_text = full_text
                    if governance_result.flagged:
                        response_text = f"[⚠️ Low confidence] {full_text}"

                    all_sources = self._dedupe_sources(base_sources + governance_result.citations)

                    await self.memory_store.append_message(
                        session_id, 'assistant', response_text,
                        metadata={
                            'intent': refined_intent,
                            'sources': all_sources,
                            'governance': {
                                'hallucination_score': governance_result.hallucination_score,
                                'factuality_score': governance_result.factuality_score,
                                'flagged': governance_result.flagged,
                                'prompt_version': governance_result.prompt_version,
                            }
                        },
                    )
                    yield {'type': 'done', 'intent': refined_intent, 'sources': all_sources, 'session_id': session_id}
                elif event['type'] == 'error':
                    yield event
        except Exception as exc:
            logger.error(f"Stream chat error [session={session_id}]: {exc}", exc_info=True)
            yield {'type': 'error', 'message': 'An internal error occurred while processing your request.'}

    async def get_history(self, session_id: str) -> list[dict]:
        return await self.memory_store.get_history(session_id, limit=30)

    def rebuild_index(self) -> dict[str, int | str]:
        self.vectorstore.build_index(force=True)
        return self.vectorstore.stats()

    def stats(self) -> dict[str, int | str]:
        return self.vectorstore.stats()

    @staticmethod
    def _dedupe_sources(values: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for value in values:
            if not value or value in seen:
                continue
            seen.add(value)
            deduped.append(value)
        return deduped

    async def close(self) -> None:
        """Close governance resources."""
        await self.governance.close()
