# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from prometheus_client import Counter, Gauge, Histogram, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST

REGISTRY = CollectorRegistry(auto_describe=True)

chatbot_request_total = Counter(
    "chatbot_request_total",
    "Total chatbot requests by intent, provider, and status",
    ["intent", "provider", "status"],
    registry=REGISTRY,
)

chatbot_response_time = Histogram(
    "chatbot_response_time_seconds",
    "Time to generate chatbot response by provider",
    ["provider"],
    registry=REGISTRY,
)

chatbot_fallback_total = Counter(
    "chatbot_fallback_total",
    "LLM provider fallback count (from→to)",
    ["from_provider", "to_provider"],
    registry=REGISTRY,
)

chatbot_safety_block_total = Counter(
    "chatbot_safety_block_total",
    "Total safety blocks triggered",
    ["reason"],
    registry=REGISTRY,
)

chatbot_rag_retrieval_time = Histogram(
    "chatbot_rag_retrieval_time_seconds",
    "Time taken for RAG document retrieval",
    registry=REGISTRY,
)

chatbot_memory_operation_time = Histogram(
    "chatbot_memory_operation_time_seconds",
    "Time taken for conversation memory operations",
    ["operation"],
    registry=REGISTRY,
)

api_request_total = Counter(
    "api_request_total",
    "Total API requests by method, endpoint, status",
    ["method", "endpoint", "status_code"],
    registry=REGISTRY,
)

api_request_time = Histogram(
    "api_request_time_seconds",
    "Time to process API requests",
    ["method", "endpoint"],
    registry=REGISTRY,
)

speech_translate_total = Counter(
    "speech_translate_total",
    "Total speech translation requests by status",
    ["status"],
    registry=REGISTRY,
)

speech_translate_time = Histogram(
    "speech_translate_time_seconds",
    "Time for speech translation",
    registry=REGISTRY,
)

chatbot_circuit_breaker_state = Gauge(
    "chatbot_circuit_breaker_state",
    "Chatbot provider circuit breaker state (0=available, 1=unavailable)",
    ["provider"],
    registry=REGISTRY,
)

chatbot_circuit_breaker_trips_total = Counter(
    "chatbot_circuit_breaker_trips_total",
    "Total circuit breaker trips by provider",
    ["provider", "error_type"],
    registry=REGISTRY,
)


def update_circuit_breaker_gauges(unavailable_providers: set[str], all_providers: list[str]) -> None:
    for provider in all_providers:
        chatbot_circuit_breaker_state.labels(provider=provider).set(
            1 if provider in unavailable_providers else 0
        )


def metrics_response():
    return generate_latest(REGISTRY)


def metrics_content_type():
    return CONTENT_TYPE_LATEST
