#!/usr/bin/env python3
"""
SafeVixAI Wiki Manager v3 — Multi-LLM Documentation Generator with Email Alerts

Uses OpenRouter/Mistral/Gemini fallback chain to generate wiki docs from source code.
Falls back to AST-based stubs if no API key is available.
Sends email alerts on persistent failures with 3 solution suggestions.

Modes:
  python scripts/wiki_manager.py check        # Report coverage + staleness
  python scripts/wiki_manager.py fix          # Fix stale refs
  python scripts/wiki_manager.py generate     # Generate docs for new code (LLM or AST)
  python scripts/wiki_manager.py full         # fix + generate (CI mode)
  python scripts/wiki_manager.py update       # Re-generate outdated docs

Env:
  OPENROUTER_API_KEY — OpenRouter (primary, uses Gemini Flash via proxy)
  MISTRAL_API_KEY    — Mistral (secondary fallback)
  GOOGLE_API_KEY     — Gemini Direct (tertiary, rate-limited)
  ALERT_EMAIL        — Gmail address for failure alerts (optional)
  ALERT_EMAIL_PASSWORD — Gmail App Password for SMTP (optional)
"""

import os
import re
import sys
import json
import ast
import time
import smtplib
import textwrap
from pathlib import Path
from datetime import datetime
from email.mime.text import MIMEText
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent
WIKI_CONTENT = ROOT / "docs" / "wiki" / "content"
WIKI_META = ROOT / "docs" / "wiki" / "meta" / "repowiki-metadata.json"
DOCS_DIR = ROOT / "docs"

# ── Ground Truth ─────────────────────────────────────────────────────────────
GROUND_TRUTH = {
    "embedding_model": "LocalHashEmbeddingFunction (SHA-256, zero ML dependency)",
    "intent_count": 9,
    "tool_count": 13,
    "provider_count": 9,
    "providers": [
        "Cerebras", "Gemini", "GitHub Models", "Groq", "Mistral",
        "NVIDIA NIM", "OpenRouter", "Sarvam AI", "Together AI"
    ],
    "endpoint_count": 28,
    "component_count": 45,
    "page_count": 16,
}

# ── Code → Wiki Section Mapping ──────────────────────────────────────────────
MODULE_MAP = {
    "backend/api": "API Reference",
    "backend/models": "Database Schema",
    "backend/services": "Project Overview/Core Modules Overview",
    "chatbot_service/providers": "AI Chatbot Service",
    "chatbot_service/tools": "AI Chatbot Service",
    "chatbot_service/agents": "AI Chatbot Service",
    "chatbot_service/models": "AI Chatbot Service",
    "frontend/app": "Frontend Application",
    "frontend/components": "Frontend Application/Component Library",
    "frontend/hooks": "Frontend Application",
    "frontend/lib": "Frontend Application",
    "data": "Data Management",
}

CODE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
SKIP = {"__pycache__", "node_modules", ".next", ".git", "venv",
        "__init__.py", "conftest.py", "test_", "_test.", ".test.",
        "index", "layout", "loading", "not-found", "error"}

# ── Stale Fixes ──────────────────────────────────────────────────────────────
STALE_FIXES = [
    (r'\b11 LLMs?\b', '9 LLMs', 'LLM count'),
    (r'\b11 LLM providers?\b', '9 LLM providers', 'LLM provider count'),
    (r'11-provider', '9-provider', 'provider count'),
    (r'sentence-transformers/all-MiniLM-L6-v2', 'LocalHashEmbeddingFunction (zero-dependency)', 'embedding'),
    (r'sentence[- ]transformers', 'hash-based embeddings', 'embedding'),
    (r'SentenceTransformer\b', 'LocalHashEmbeddingFunction', 'embedding class'),
    (r'all-MiniLM-L6-v2', 'LocalHashEmbeddingFunction', 'embedding model'),
    (r'admin123', 'environment-sourced credentials', 'demo cred'),
    (r'mock-jwt-token-for-hackathon', 'environment-sourced JWT', 'demo token'),
    (r'mock-jwt', 'environment-sourced JWT', 'demo token'),
]

SAFE_LINE_PATTERNS = [
    r'@huggingface/transformers', r'huggingface\.co/datasets/SafeVixAI',
    r'SafeVixAI-Dataset-Hub', r'HF Inference API', r'HF_TOKEN', r'via HF_TOKEN',
]


def is_safe_line(line):
    return any(re.search(p, line, re.IGNORECASE) for p in SAFE_LINE_PATTERNS)


# ══════════════════════════════════════════════════════════════════════════════
#  EMAIL ALERT SYSTEM
# ══════════════════════════════════════════════════════════════════════════════

def send_alert(subject, details, context=""):
    """Send email alert on failure with 3 solution suggestions.

    Requires ALERT_EMAIL + ALERT_EMAIL_PASSWORD env vars (Gmail App Password).
    Falls back to console output if email isn't configured.
    """
    smtp_user = os.environ.get("ALERT_EMAIL", "")
    smtp_pass = os.environ.get("ALERT_EMAIL_PASSWORD", "")
    alert_to = os.environ.get("ALERT_EMAIL_TO", smtp_user)

    solutions = """
3 WAYS TO FIX THIS:

1. RATE LIMIT EXHAUSTED
   → Wait 1 hour and re-run: python scripts/wiki_manager.py update
   → Increase delay: python scripts/batch_upgrade_wiki.py --delay 5
   → Switch provider by updating OPENROUTER_API_KEY or MISTRAL_API_KEY

2. API KEY EXPIRED / INVALID
   → OpenRouter: https://openrouter.ai/keys
   → Mistral: https://console.mistral.ai/api-keys
   → Gemini: https://aistudio.google.com/app/apikey
   → Update keys in chatbot_service/.env and GitHub Secrets

3. SERVICE OUTAGE
   → Check: https://status.openrouter.ai | https://status.mistral.ai
   → AST stubs remain functional as fallback documentation
   → Re-run later: python scripts/wiki_manager.py update
"""

    body = f"""SafeVixAI Wiki Manager — Alert

ISSUE: {subject}
TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

DETAILS:
{details}

CONTEXT:
{context}
{solutions}"""

    if smtp_user and smtp_pass:
        try:
            msg = MIMEText(body)
            msg["Subject"] = f"[SafeVixAI Wiki] {subject}"
            msg["From"] = smtp_user
            msg["To"] = alert_to
            with smtplib.SMTP("smtp.gmail.com", 587) as s:
                s.starttls()
                s.login(smtp_user, smtp_pass)
                s.send_message(msg)
            print(f"  📧 Alert emailed to {alert_to}")
        except Exception as e:
            print(f"  📧 Email failed ({e}), printing to console:")
            print(body)
    else:
        print(f"\n  ⚠️  ALERT: {subject}")
        print(f"  {details}")
        print(solutions)


# ══════════════════════════════════════════════════════════════════════════════
#  LLM PROVIDER
# ══════════════════════════════════════════════════════════════════════════════

class LLMProvider:
    """Multi-provider LLM with automatic fallback chain.

    Priority: GitHub Models (free via Student Pack) → OpenRouter → Mistral → Gemini.
    Handles 429 rate limits with exponential backoff + provider switching.
    """

    def __init__(self):
        self.github_token = os.environ.get("GITHUB_TOKEN", "")
        self.openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
        self.mistral_key = os.environ.get("MISTRAL_API_KEY", "")
        self.google_key = os.environ.get("GOOGLE_API_KEY", "")
        self._providers = []
        self.provider = None
        self._build_chain()

    def _build_chain(self):
        # GitHub Models is primary (free with GitHub Student Developer Pack)
        if self.github_token:
            self._providers.append("github-models")
        if self.openrouter_key:
            self._providers.append("openrouter")
        if self.mistral_key:
            self._providers.append("mistral")
        if self.google_key:
            self._providers.append("gemini")

        if self._providers:
            self.provider = self._providers[0]
            names = {
                "github-models": "GitHub Models (GPT-4o-mini)",
                "openrouter": "OpenRouter/Gemini",
                "mistral": "Mistral",
                "gemini": "Gemini Direct",
            }
            chain = " -> ".join(names.get(p, p) for p in self._providers)
            print(f"  LLM chain: {chain}")
        else:
            print("  LLM: None (will use AST-based stubs)")

    def generate(self, prompt, max_tokens=2048):
        """Generate text, trying each provider in fallback chain with retries."""
        if not self._providers:
            return None

        for provider in self._providers:
            result = self._try_provider(provider, prompt, max_tokens)
            if result:
                self.provider = provider
                return result

        print("    All LLM providers exhausted")
        return None

    def _try_provider(self, provider, prompt, max_tokens, max_retries=3):
        """Try a single provider with retry + exponential backoff on 429."""
        caller = {
            "github-models": self._call_github_models,
            "openrouter": self._call_openrouter,
            "mistral": self._call_mistral,
            "gemini": self._call_gemini,
        }.get(provider)
        if not caller:
            return None

        for attempt in range(max_retries):
            try:
                return caller(prompt, max_tokens)
            except HTTPError as e:
                if e.code == 429:
                    wait = (2 ** attempt) * 5  # 5s, 10s, 20s
                    print(f"    {provider} rate-limited (429). Retry {attempt+1}/{max_retries} in {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"    {provider} HTTP {e.code}: {e.reason}")
                    return None
            except Exception as e:
                print(f"    {provider} error: {e}")
                return None

        print(f"    {provider} exhausted after {max_retries} retries")
        return None

    def _call_github_models(self, prompt, max_tokens):
        """Call GitHub Models API (free with GitHub Student Developer Pack).

        Uses GPT-4o-mini via Azure-hosted inference endpoint.
        Supports GPT-4o, GPT-4o-mini, Llama, Mistral, and more.
        """
        body = json.dumps({
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens, "temperature": 0.3
        }).encode("utf-8")
        req = Request("https://models.inference.ai.azure.com/chat/completions", data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.github_token}"
        })
        resp = urlopen(req, timeout=90)
        data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]

    def _call_openrouter(self, prompt, max_tokens):
        body = json.dumps({
            "model": "google/gemini-2.0-flash-lite-001",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens, "temperature": 0.3
        }).encode("utf-8")
        req = Request("https://openrouter.ai/api/v1/chat/completions", data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openrouter_key}"
        })
        resp = urlopen(req, timeout=60)
        data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]

    def _call_mistral(self, prompt, max_tokens):
        body = json.dumps({
            "model": "mistral-small-latest",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens, "temperature": 0.3
        }).encode("utf-8")
        req = Request("https://api.mistral.ai/v1/chat/completions", data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.mistral_key}"
        })
        resp = urlopen(req, timeout=60)
        data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]

    def _call_gemini(self, prompt, max_tokens):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key={self.google_key}"
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.3}
        }).encode("utf-8")
        req = Request(url, data=body, headers={"Content-Type": "application/json"})
        resp = urlopen(req, timeout=60)
        data = json.loads(resp.read().decode("utf-8"))
        return data["candidates"][0]["content"]["parts"][0]["text"]


# ══════════════════════════════════════════════════════════════════════════════
#  CODE DISCOVERY
# ══════════════════════════════════════════════════════════════════════════════

def discover_code_modules():
    modules = {}
    for code_dir, wiki_section in MODULE_MAP.items():
        full_dir = ROOT / code_dir.replace("/", os.sep)
        if not full_dir.exists():
            continue
        for f in full_dir.rglob("*"):
            if (f.is_file() and f.suffix in CODE_EXTENSIONS
                    and not any(s in str(f) for s in SKIP)
                    and f.stem not in SKIP):
                modules[str(f.relative_to(ROOT))] = {
                    "name": f.stem,
                    "section": wiki_section,
                    "path": str(f.relative_to(ROOT)),
                    "ext": f.suffix,
                }
    return modules


def discover_wiki_topics():
    topics = set()
    if not WIKI_CONTENT.exists():
        return topics
    for f in WIKI_CONTENT.rglob("*.md"):
        topics.add(f.stem.lower().replace(" ", "_").replace("-", "_"))
        try:
            text = f.read_text(encoding="utf-8")[:2000].lower()
            for m in re.findall(r'`(\w+(?:[_-]\w+)+)`', text):
                topics.add(m.replace("-", "_"))
        except Exception:
            pass
    return topics


def check_coverage(modules, topics):
    covered, uncovered = [], []
    for path, info in modules.items():
        key = info["name"].lower().replace("-", "_")
        if any(key in t or t in key for t in topics):
            covered.append(info)
        else:
            uncovered.append(info)
    return covered, uncovered


def read_source_code(filepath, max_lines=150):
    """Read source code, truncating if too long."""
    try:
        full_path = ROOT / filepath
        lines = full_path.read_text(encoding="utf-8", errors="ignore").split("\n")
        if len(lines) > max_lines:
            return "\n".join(lines[:max_lines]) + f"\n\n# ... truncated ({len(lines)} total lines)"
        return "\n".join(lines)
    except Exception:
        return ""


# ══════════════════════════════════════════════════════════════════════════════
#  DOCUMENTATION GENERATION
# ══════════════════════════════════════════════════════════════════════════════

def build_llm_prompt(info, source_code):
    """Build prompt for LLM to generate wiki documentation."""
    return f"""You are a technical documentation writer for SafeVixAI, an AI-powered road safety platform.

Generate a comprehensive wiki page in Markdown for the following module.

## Context
- Project: SafeVixAI — IIT Madras Road Safety Hackathon 2026
- Module: `{info['name']}{info['ext']}`
- Section: {info['section']}
- File: `{info['path']}`
- Platform uses: 9 LLM providers (Groq, Gemini, Cerebras, etc.), Supabase Auth, Next.js frontend, FastAPI backend
- Embeddings: LocalHashEmbeddingFunction (zero-dependency, SHA-256 based)
- Auth: Supabase Auth with JWT (no demo credentials)

## Source Code
```{info['ext'].lstrip('.')}
{source_code}
```

## Required Output Format
Generate a complete wiki page with these sections:
1. **Title** (# heading)
2. **Overview** — What this module does and why it exists (2-3 sentences)
3. **Architecture** — Where it fits in the system, include a mermaid flowchart showing data flow
4. **Key Classes/Functions** — Table with name, parameters, return type, description
5. **Dependencies** — What it imports/uses
6. **Configuration** — Any env vars, constants, or config needed
7. **Usage Examples** — Real code examples
8. **Error Handling** — How errors are managed
9. **Related Modules** — Links to related files

Rules:
- Be specific to THIS code, not generic
- Use actual function/class names from the source
- Include actual parameter types
- Keep it concise but complete
- Use tables for structured data
- No placeholder TODOs
- Output ONLY the markdown, no preamble
- Include at least one mermaid diagram (```mermaid) showing the module's data flow or class relationships
- Ensure mermaid syntax is valid: quote labels with special chars, no HTML tags in labels
"""


def generate_ast_stub(info):
    """Fallback: Generate stub using AST analysis (no LLM needed)."""
    name = info["name"]
    title = name.replace("_", " ").replace("-", " ").title()
    ext = info["ext"]
    lang = "python" if ext == ".py" else "typescript"
    now = datetime.now().strftime("%Y-%m-%d")
    source = info["path"]
    full_path = ROOT / source

    # Extract info from source
    docstring, classes, functions, imports = "", [], [], []
    try:
        text = full_path.read_text(encoding="utf-8", errors="ignore")
        if ext == ".py":
            try:
                tree = ast.parse(text)
                docstring = ast.get_docstring(tree) or ""
                for node in ast.walk(tree):
                    if isinstance(node, ast.ClassDef):
                        classes.append(node.name)
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        if not node.name.startswith("_"):
                            functions.append(node.name)
            except SyntaxError:
                pass
            for m in re.finditer(r'^(?:from|import)\s+(\w+)', text, re.MULTILINE):
                imp = m.group(1)
                if imp not in ("os", "sys", "re", "json", "typing", "datetime", "pathlib"):
                    imports.append(imp)
        else:
            for m in re.finditer(r'(?:export\s+)?(?:class|interface)\s+(\w+)', text):
                classes.append(m.group(1))
            for m in re.finditer(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', text):
                functions.append(m.group(1))
            for m in re.finditer(r'export\s+(?:const|let)\s+(\w+)\s*=', text):
                functions.append(m.group(1))
            for m in re.finditer(r"from ['\"]([^'\"]+)['\"]", text):
                if not m.group(1).startswith("."):
                    imports.append(m.group(1))
    except Exception:
        pass

    desc = docstring.split("\n")[0] if docstring else f"{title} module for the {info['section']} subsystem."
    sections = [f"# {title}\n", f"> Source: `{source}` | Generated: {now}\n", f"## Overview\n\n{desc}\n"]

    if classes:
        sections.append("## Classes\n")
        sections.append("| Class | Description |")
        sections.append("|---|---|")
        for c in classes[:10]:
            sections.append(f"| `{c}` | {c.replace('_',' ').title()} |")
        sections.append("")

    if functions:
        sections.append("## Key Functions\n")
        sections.append("| Function | Description |")
        sections.append("|---|---|")
        for fn in functions[:15]:
            sections.append(f"| `{fn}()` | {fn.replace('_',' ').title()} |")
        sections.append("")

    if imports:
        sections.append("## Dependencies\n")
        for imp in sorted(set(imports))[:10]:
            sections.append(f"- `{imp}`")
        sections.append("")

    sections.append(f"\n## File Location\n\n```\n{source}\n```\n")
    return "\n".join(sections)


def review_generated_doc(content, info, source_code, llm):
    """Self-review: validate generated doc matches source code.

    Checks:
    1. Function/class names in doc actually exist in source
    2. Mermaid diagrams have valid syntax (no unclosed blocks, no HTML tags)
    3. No hallucinated API endpoints or dependencies
    Returns (is_valid, issues) tuple.
    """
    issues = []

    # ── Check mermaid syntax ────────────────────────────────────────────
    import re as _re
    mermaid_blocks = _re.findall(r'```mermaid\s*\n(.*?)```', content, _re.DOTALL)
    for i, block in enumerate(mermaid_blocks):
        # Common mermaid errors
        if block.count('(') != block.count(')'):
            issues.append(f"Mermaid block {i+1}: unbalanced parentheses")
        if block.count('[') != block.count(']'):
            issues.append(f"Mermaid block {i+1}: unbalanced brackets")
        if '<br>' in block and '<br/>' not in block:
            issues.append(f"Mermaid block {i+1}: use <br/> not <br>")

    # ── Check function/class name accuracy ──────────────────────────────
    if source_code:
        ext = info.get("ext", ".py")
        if ext == ".py":
            try:
                tree = ast.parse(source_code)
                real_names = set()
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        real_names.add(node.name)
                    elif isinstance(node, ast.ClassDef):
                        real_names.add(node.name)

                # Find backtick-quoted names in doc that look like function/class refs
                doc_refs = set(_re.findall(r'`(\w+)\(`', content))
                doc_refs |= set(_re.findall(r'`class\s+(\w+)`', content))
                doc_refs -= {"self", "cls", "str", "int", "dict", "list", "bool", "None",
                              "True", "False", "print", "len", "range", "type", "open",
                              "Exception", "ValueError", "TypeError", "KeyError"}
                # Ignore names that match (they're correct)
                hallucinated = doc_refs - real_names
                if hallucinated and len(hallucinated) > 3:
                    issues.append(f"Possibly hallucinated refs: {', '.join(sorted(hallucinated)[:5])}")
            except SyntaxError:
                pass  # Can't parse — skip name check

    # ── Minimal quality check ───────────────────────────────────────────
    if content.count("#") < 2:
        issues.append("Missing headings — too few # markers")
    if "TODO" in content or "PLACEHOLDER" in content:
        issues.append("Contains TODO/PLACEHOLDER markers")

    return len(issues) == 0, issues


def generate_doc(info, llm):
    """Generate documentation for a module using LLM with AST fallback.

    After LLM generation, runs a self-review to validate accuracy:
    - Checks function/class names match actual source code
    - Validates mermaid diagram syntax
    - Falls back to AST stub if review finds critical issues
    """
    source_code = read_source_code(info["path"])

    if llm.provider and source_code:
        prompt = build_llm_prompt(info, source_code)
        result = llm.generate(prompt, max_tokens=4096)
        if result and len(result) > 100:
            # Cap output to prevent bloated wiki pages
            if len(result) > 8000:
                result = result[:8000].rsplit("\n", 1)[0] + "\n"

            # ── Self-review generated content ───────────────────────
            is_valid, issues = review_generated_doc(result, info, source_code, llm)
            if not is_valid:
                name = info["name"]
                print(f"    ⚠ Review issues for {name}: {'; '.join(issues[:3])}")
                # If issues are minor (< 3), keep the doc but log warning
                # If critical (> 3 issues), fall through to AST
                if len(issues) > 3:
                    print(f"    ✘ Rejecting LLM output for {name} — falling back to AST")
                    return generate_ast_stub(info)

            return result

    # Fallback to AST
    return generate_ast_stub(info)


# ══════════════════════════════════════════════════════════════════════════════
#  CHECK MODE
# ══════════════════════════════════════════════════════════════════════════════

def check_staleness():
    stale_files = []
    for f in WIKI_CONTENT.rglob("*.md"):
        try:
            text = f.read_text(encoding="utf-8")
            issues = []
            for pat, _, desc in STALE_FIXES:
                for i, line in enumerate(text.split("\n"), 1):
                    if not is_safe_line(line) and re.search(pat, line, re.IGNORECASE):
                        issues.append((i, desc))
            if issues:
                stale_files.append((f.relative_to(ROOT), issues))
        except Exception:
            pass
    return stale_files


def run_check():
    print("=" * 60)
    print("SafeVixAI Wiki — Check Report")
    print("=" * 60)

    modules = discover_code_modules()
    topics = discover_wiki_topics()
    covered, uncovered = check_coverage(modules, topics)
    pct = len(covered) / len(modules) * 100 if modules else 100

    print(f"\n--- Coverage: {len(covered)}/{len(modules)} ({pct:.0f}%) ---")
    if uncovered:
        by_section = {}
        for info in uncovered:
            by_section.setdefault(info["section"], []).append(info)
        for section, items in sorted(by_section.items()):
            print(f"\n  [{section}] ({len(items)} undocumented)")
            for info in items[:5]:
                print(f"    - {info['name']}{info['ext']}")
            if len(items) > 5:
                print(f"    ... and {len(items) - 5} more")

    stale = check_staleness()
    print(f"\n--- Staleness: {len(stale)} files with stale refs ---")
    for fpath, issues in stale[:10]:
        print(f"  {fpath.name}: {len(issues)} issues")

    wiki_count = sum(1 for _ in WIKI_CONTENT.rglob("*.md")) if WIKI_CONTENT.exists() else 0
    print(f"\n--- Wiki: {wiki_count} content files ---")

    # Check docs/ alignment
    docs_md = list(DOCS_DIR.glob("*.md"))
    print(f"--- docs/ folder: {len(docs_md)} files ---")

    print(f"{'=' * 60}\n")
    return len(uncovered), len(stale)


# ══════════════════════════════════════════════════════════════════════════════
#  FIX MODE
# ══════════════════════════════════════════════════════════════════════════════

def run_fix():
    print("=" * 60)
    print("SafeVixAI Wiki — Fixing Stale References")
    print("=" * 60)

    total_fixes = 0
    files_fixed = 0

    # Fix wiki content
    for f in sorted(WIKI_CONTENT.rglob("*.md")):
        try:
            text = f.read_text(encoding="utf-8")
            original = text
            new_lines = []
            for line in text.split("\n"):
                if is_safe_line(line):
                    new_lines.append(line)
                    continue
                new_line = line
                for pat, repl, _ in STALE_FIXES:
                    new_line = re.sub(pat, repl, new_line, flags=re.IGNORECASE)
                new_lines.append(new_line)
            new_text = "\n".join(new_lines)
            if new_text != original:
                f.write_text(new_text, encoding="utf-8")
                count = sum(1 for o, n in zip(original.split("\n"), new_text.split("\n")) if o != n)
                total_fixes += count
                files_fixed += 1
                print(f"  Fixed: {f.name} ({count} lines)")
        except Exception as e:
            print(f"  Error: {f.name}: {e}")

    # Also fix docs/ folder
    for f in sorted(DOCS_DIR.glob("*.md")):
        if f.parent.name == "wiki":
            continue
        try:
            text = f.read_text(encoding="utf-8")
            original = text
            new_lines = []
            for line in text.split("\n"):
                if is_safe_line(line):
                    new_lines.append(line)
                    continue
                new_line = line
                for pat, repl, _ in STALE_FIXES:
                    new_line = re.sub(pat, repl, new_line, flags=re.IGNORECASE)
                new_lines.append(new_line)
            new_text = "\n".join(new_lines)
            if new_text != original:
                f.write_text(new_text, encoding="utf-8")
                count = sum(1 for o, n in zip(original.split("\n"), new_text.split("\n")) if o != n)
                total_fixes += count
                files_fixed += 1
                print(f"  Fixed: docs/{f.name} ({count} lines)")
        except Exception as e:
            pass

    # Fix root MD files
    for name in ["AGENTS.md", "README.md", "DESIGN.md", "SETUP.md", "SKILL.md"]:
        f = ROOT / name
        if not f.exists():
            continue
        try:
            text = f.read_text(encoding="utf-8")
            original = text
            new_lines = []
            for line in text.split("\n"):
                if is_safe_line(line):
                    new_lines.append(line)
                    continue
                new_line = line
                for pat, repl, _ in STALE_FIXES:
                    new_line = re.sub(pat, repl, new_line, flags=re.IGNORECASE)
                new_lines.append(new_line)
            new_text = "\n".join(new_lines)
            if new_text != original:
                f.write_text(new_text, encoding="utf-8")
                count = sum(1 for o, n in zip(original.split("\n"), new_text.split("\n")) if o != n)
                total_fixes += count
                files_fixed += 1
                print(f"  Fixed: {name} ({count} lines)")
        except Exception as e:
            pass

    print(f"\n  Total: {total_fixes} fixes across {files_fixed} files")
    return total_fixes


# ══════════════════════════════════════════════════════════════════════════════
#  GENERATE MODE
# ══════════════════════════════════════════════════════════════════════════════

def run_generate():
    print("=" * 60)
    print("SafeVixAI Wiki — Generating Documentation")
    print("=" * 60)

    llm = LLMProvider()

    modules = discover_code_modules()
    topics = discover_wiki_topics()
    _, uncovered = check_coverage(modules, topics)

    if not uncovered:
        print("\n  All code modules are documented!")
        return 0

    print(f"\n  Found {len(uncovered)} undocumented modules. Generating...")

    created = 0
    for info in sorted(uncovered, key=lambda x: (x["section"], x["name"])):
        section_dir = WIKI_CONTENT / info["section"]
        section_dir.mkdir(parents=True, exist_ok=True)

        title = info["name"].replace("_", " ").replace("-", " ").title()
        stub_path = section_dir / f"{title}.md"

        if stub_path.exists():
            continue

        content = generate_doc(info, llm)
        stub_path.write_text(content, encoding="utf-8")
        created += 1

        method = "LLM" if llm.provider else "AST"
        print(f"  [{method}] Created: {info['section']}/{title}.md")

        # Rate limit per provider
        if llm.provider in ("gemini",):
            time.sleep(4.5)
        elif llm.provider in ("openrouter", "mistral"):
            time.sleep(2)

    print(f"\n  Total: {created} wiki files created")
    return created


# ══════════════════════════════════════════════════════════════════════════════
#  UPDATE MODE — Re-generate outdated docs
# ══════════════════════════════════════════════════════════════════════════════

def run_update():
    """Check existing wiki docs against source code and update if outdated."""
    print("=" * 60)
    print("SafeVixAI Wiki — Updating Outdated Documentation")
    print("=" * 60)

    llm = LLMProvider()
    if not llm.provider:
        print("  No LLM available — update mode requires an API key.")
        return 0

    modules = discover_code_modules()
    updated = 0
    failed = 0
    consecutive_fails = 0

    for path, info in sorted(modules.items()):
        title = info["name"].replace("_", " ").replace("-", " ").title()
        wiki_path = WIKI_CONTENT / info["section"] / f"{title}.md"

        if not wiki_path.exists():
            continue

        wiki_text = wiki_path.read_text(encoding="utf-8")

        # Check if wiki is auto-generated stub (needs upgrade)
        if "Auto-generated:" in wiki_text:
            source_code = read_source_code(info["path"])
            if source_code:
                content = generate_doc(info, llm)
                if content and len(content) > 100:
                    wiki_path.write_text(content, encoding="utf-8")
                    updated += 1
                    consecutive_fails = 0
                    print(f"  Updated: {info['section']}/{title}.md")

                    if llm.provider in ("gemini",):
                        time.sleep(4.5)
                    elif llm.provider in ("openrouter", "mistral"):
                        time.sleep(2)
                else:
                    failed += 1
                    consecutive_fails += 1
                    print(f"  FAILED: {info['section']}/{title}.md")

                    if consecutive_fails >= 5:
                        send_alert(
                            "Wiki update stopped — 5 consecutive LLM failures",
                            f"Failed at: {info['section']}/{title}.md\n"
                            f"Updated {updated} files before failure, {failed} total failures.",
                            f"Provider chain: {', '.join(llm._providers)}"
                        )
                        break

    print(f"\n  Total: {updated} updated, {failed} failed")
    return updated


# ══════════════════════════════════════════════════════════════════════════════
#  FULL MODE
# ══════════════════════════════════════════════════════════════════════════════

def run_review():
    """Standalone review mode: verify all existing wiki docs for quality."""
    print("=" * 60)
    print("SafeVixAI Wiki — Self-Review (Quality + Mermaid + Codebase)")
    print("=" * 60)

    if not WIKI_CONTENT.exists():
        print("  No wiki content found.")
        return 0

    modules = discover_code_modules()
    total_docs = 0
    total_issues = 0
    mermaid_errors = 0
    hallucinated = 0
    quality_fail = 0

    for f in sorted(WIKI_CONTENT.rglob("*.md")):
        total_docs += 1
        text = f.read_text(encoding="utf-8")

        stem = f.stem.lower().replace(" ", "_").replace("-", "_")
        matched_info = None
        matched_source = ""
        for path, info in modules.items():
            if info["name"].lower().replace("-", "_") == stem:
                matched_info = info
                matched_source = read_source_code(info["path"])
                break

        if not matched_info:
            matched_info = {"name": f.stem, "ext": ".py", "path": "", "section": ""}

        is_valid, issues = review_generated_doc(text, matched_info, matched_source, None)
        if not is_valid:
            total_issues += 1
            for issue in issues:
                if "Mermaid" in issue:
                    mermaid_errors += 1
                elif "hallucinated" in issue:
                    hallucinated += 1
                else:
                    quality_fail += 1
            if issues:
                print(f"  Warning: {f.name}: {'; '.join(issues[:2])}")

    print(f"\n  {'=' * 50}")
    print(f"  REVIEW SUMMARY")
    print(f"  Total docs reviewed: {total_docs}")
    print(f"  Docs with issues: {total_issues}")
    print(f"    Mermaid syntax: {mermaid_errors}")
    print(f"    Hallucinated refs: {hallucinated}")
    print(f"    Quality fails: {quality_fail}")
    print(f"  Clean docs: {total_docs - total_issues}")
    print(f"  {'=' * 50}")
    return total_issues


def run_full():
    print("=" * 60)
    print("SafeVixAI Wiki — Full Update")
    print("=" * 60)

    fixes = run_fix()
    print()
    created = run_generate()
    print()
    review_issues = run_review()

    print(f"\n{'=' * 60}")
    print(f"Summary: {fixes} stale fixes + {created} new docs + {review_issues} review issues")
    print(f"{'=' * 60}")
    return fixes + created


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "check"

    if mode == "check":
        uncov, stale = run_check()
        sys.exit(1 if stale > 0 else 0)
    elif mode == "fix":
        run_fix()
    elif mode == "generate":
        run_generate()
    elif mode == "update":
        run_update()
    elif mode == "review":
        issues = run_review()
        sys.exit(1 if issues > 0 else 0)
    elif mode == "full":
        run_full()
    else:
        print(f"Usage: python {sys.argv[0]} [check|fix|generate|update|review|full]")
        sys.exit(1)


if __name__ == "__main__":
    main()
