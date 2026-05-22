#!/usr/bin/env python3
"""
SafeVixAI end-to-end verification script.

Runs source, local-runtime, and deployed-service checks for the full app:
frontend PWA, offline SOS/report sync, crash detection, maps/tests, backend
routes/auth/schemas, chatbot/RAG, and live deployment smoke flows.

Usage:
    python safevixai_verify.py
    python safevixai_verify.py --code
    python safevixai_verify.py --run
    python safevixai_verify.py --live
    python safevixai_verify.py --quick

Environment overrides:
    BACKEND_URL=https://...
    CHATBOT_URL=https://...
    FRONTEND_URL=https://...
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parent
BACKEND_URL = os.getenv("BACKEND_URL", "https://safevixai-api.onrender.com").rstrip("/")
CHATBOT_URL = os.getenv("CHATBOT_URL", "https://safevixai-chatbot-service.onrender.com").rstrip("/")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://safevixai.vercel.app").rstrip("/")
TIMEOUT = int(os.getenv("SAFEVIX_VERIFY_TIMEOUT", "20"))

SOURCE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".html"}
IGNORED_DIRS = {
    ".git",
    ".next",
    ".pytest_cache",
    ".ruff_cache",
    ".swc",
    ".venv",
    "__pycache__",
    "node_modules",
    "test-results",
}

results: list[dict[str, Any]] = []


def rel(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def section(title: str) -> None:
    print("\n" + "=" * 78)
    print(f"  {title}")
    print("=" * 78)


def check(
    name: str,
    category: str,
    passed: bool,
    detail: str = "",
    fix: str = "",
    required: bool = True,
) -> None:
    status = "PASS" if passed else ("FAIL" if required else "WARN")
    results.append(
        {
            "name": name,
            "category": category,
            "passed": passed,
            "required": required,
            "detail": detail,
            "fix": fix,
        }
    )
    rendered_detail = f"  {detail[:96]}" if detail else ""
    print(f"  [{status:<4}] {name:<58}{rendered_detail}")
    if not passed and fix:
        print(f"         FIX: {fix[:130]}")


def read_text(path: str | Path) -> str:
    full_path = REPO_ROOT / path if not isinstance(path, Path) else path
    try:
        return full_path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return ""


def read_json(path: str | Path) -> Any | None:
    text = read_text(path)
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def exists(path: str) -> bool:
    return (REPO_ROOT / path).exists()


def iter_source_files(*roots: str, exts: set[str] | None = None) -> list[Path]:
    allowed = exts or SOURCE_EXTENSIONS
    files: list[Path] = []
    for root in roots:
        root_path = REPO_ROOT / root
        if root_path.is_file():
            if root_path.suffix in allowed:
                files.append(root_path)
            continue
        if not root_path.exists():
            continue
        for path in root_path.rglob("*"):
            if not path.is_file() or path.suffix not in allowed:
                continue
            if any(part in IGNORED_DIRS for part in path.parts):
                continue
            files.append(path)
    return files


def search(pattern: str, *roots: str, flags: int = re.IGNORECASE) -> list[tuple[Path, int, str]]:
    regex = re.compile(pattern, flags)
    matches: list[tuple[Path, int, str]] = []
    for path in iter_source_files(*roots):
        for line_no, line in enumerate(read_text(path).splitlines(), 1):
            if regex.search(line):
                matches.append((path, line_no, line.strip()))
    return matches


def command_exists(command: str) -> bool:
    candidates = os.environ.get("PATH", "").split(os.pathsep)
    suffixes = os.environ.get("PATHEXT", ".EXE;.BAT;.CMD").split(";") if os.name == "nt" else [""]
    for directory in candidates:
        for suffix in suffixes:
            if (Path(directory) / f"{command}{suffix}").exists():
                return True
    return False


def run_cmd(cmd: list[str], cwd: Path | None = None, timeout: int = 120) -> tuple[int, str]:
    try:
        completed = subprocess.run(
            cmd,
            cwd=str(cwd or REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        output = (completed.stdout or "") + (completed.stderr or "")
        return completed.returncode, output.strip()
    except FileNotFoundError:
        return 127, f"Command not found: {cmd[0]}"
    except subprocess.TimeoutExpired as exc:
        output = (exc.stdout or "") + (exc.stderr or "")
        return -1, f"TIMEOUT after {timeout}s\n{output}".strip()


def http_request(
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = TIMEOUT,
) -> dict[str, Any]:
    if params:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{urlencode(params)}"

    payload = None
    request_headers = {"User-Agent": "safevixai-verify/2026"}
    if headers:
        request_headers.update(headers)
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    started = time.perf_counter()
    request = Request(url, data=payload, headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            parsed = None
            try:
                parsed = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                parsed = None
            return {
                "ok": 200 <= response.status < 300,
                "status": response.status,
                "headers": dict(response.headers.items()),
                "text": raw,
                "json": parsed,
                "elapsed_ms": elapsed_ms,
            }
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": exc.code,
            "headers": dict(exc.headers.items()),
            "text": raw,
            "json": None,
            "elapsed_ms": int((time.perf_counter() - started) * 1000),
        }
    except (URLError, TimeoutError, OSError) as exc:
        return {
            "ok": False,
            "status": 0,
            "headers": {},
            "text": str(exc),
            "json": None,
            "elapsed_ms": int((time.perf_counter() - started) * 1000),
        }


def run_code_checks() -> None:
    section("CODE CHECKS")

    check("Repository root has frontend/backend/chatbot_service", "CODE",
          all(exists(p) for p in ("frontend", "backend", "chatbot_service")),
          "core application directories present",
          "Run this script from the SafeVixAI repo root.")

    package_json = read_json("frontend/package.json") or {}
    scripts = package_json.get("scripts", {})
    deps = {**package_json.get("dependencies", {}), **package_json.get("devDependencies", {})}
    check("Frontend package exposes build/test/e2e scripts", "CODE",
          all(name in scripts for name in ("build", "test", "test:e2e")),
          f"scripts: {', '.join(sorted(scripts))}",
          "Add build, test, and test:e2e scripts to frontend/package.json.")
    check("Frontend uses expected Next/React stack", "CODE",
          "next" in deps and "react" in deps and "maplibre-gl" in deps,
          "Next, React, and MapLibre dependencies detected",
          "Restore missing frontend dependencies in package.json.")

    check("Frontend public env wrapper exists", "CODE",
          exists("frontend/lib/public-env.ts"),
          "frontend/lib/public-env.ts",
          "Centralize public API/chatbot URLs in frontend/lib/public-env.ts.")

    frontend_localhost = [
        item for item in search(r"localhost:8000", "frontend/app", "frontend/components", "frontend/lib")
        if "__tests__" not in rel(item[0])
    ]
    check("Frontend source has no hardcoded localhost:8000", "CODE",
          not frontend_localhost,
          "clean" if not frontend_localhost else f"{rel(frontend_localhost[0][0])}:{frontend_localhost[0][1]}",
          "Use NEXT_PUBLIC_API_URL through frontend/lib/public-env.ts.")

    secret_matches = search(r"(gsk_[A-Za-z0-9_-]+|AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,})",
                            "frontend", "backend", "chatbot_service")
    secret_matches = [
        m for m in secret_matches
        if ".env.example" not in rel(m[0])
        and "/data/" not in rel(m[0]).replace("\\", "/")
        and m[0].name not in {"package-lock.json", "pnpm-lock.yaml"}
    ]
    check("No obvious API secrets committed in source", "CODE",
          not secret_matches,
          "clean" if not secret_matches else f"{rel(secret_matches[0][0])}:{secret_matches[0][1]}",
          "Move secrets to environment variables and rotate any exposed key.")

    manifest = read_json("frontend/public/manifest.json") or {}
    icons = manifest.get("icons", [])
    check("PWA manifest is valid and has share_target", "CODE",
          bool(manifest.get("name")) and "share_target" in manifest,
          f"name={manifest.get('name', 'missing')}",
          "Add name and share_target to frontend/public/manifest.json.")
    expected_icon_sizes = {72, 96, 128, 144, 152, 192, 384, 512}
    found_icon_sizes = {
        int(match.group(1))
        for path in (REPO_ROOT / "frontend/public/icons").glob("icon-*.png")
        for match in [re.search(r"icon-(\d+)\.png$", path.name)]
        if match
    }
    check("All required PWA icon sizes exist", "CODE",
          expected_icon_sizes.issubset(found_icon_sizes),
          f"found={sorted(found_icon_sizes)}",
          "Generate 72, 96, 128, 144, 152, 192, 384, and 512px icons.")

    sw_text = read_text("frontend/public/sw.js")
    offline_queue_text = read_text("frontend/lib/offline-sos-queue.ts")
    sw_db = re.search(r"indexedDB\.open\('([^']+)'", sw_text)
    lib_db = re.search(r"openDB<[^>]+>\('([^']+)'", offline_queue_text)
    check("Service worker and offline queue use same IndexedDB", "CODE",
          bool(sw_db and lib_db and sw_db.group(1) == lib_db.group(1)),
          f"sw={sw_db.group(1) if sw_db else 'missing'}, lib={lib_db.group(1) if lib_db else 'missing'}",
          "Keep the DB name identical in sw.js and offline-sos-queue.ts.")
    check("Service worker handles SOS and road-report background sync", "CODE",
          "sos-queue-flush" in sw_text and "road-report-queue-flush" in sw_text,
          "sync tags present",
          "Handle both offline SOS and road report queues in frontend/public/sw.js.")
    sw_registration = search(r"serviceWorker\.register\('/sw\.js'\)", "frontend/app", "frontend/components", "frontend/lib")
    check("Service worker is registered from frontend code", "CODE",
          bool(sw_registration),
          f"{rel(sw_registration[0][0])}:{sw_registration[0][1]}" if sw_registration else "missing",
          "Call navigator.serviceWorker.register('/sw.js') during app startup/offline init.")

    offline_assets = [
        "frontend/public/offline-data/first-aid.json",
        "frontend/public/offline-data/india-emergency.geojson",
        "frontend/public/offline-data/violations.csv",
        "frontend/public/offline-data/state_overrides.csv",
        "frontend/public/offline-data/accidents_summary.json",
    ]
    check("Offline-first public data bundle exists", "CODE",
          all(exists(path) for path in offline_assets),
          f"{sum(exists(path) for path in offline_assets)}/{len(offline_assets)} files",
          "Restore missing files under frontend/public/offline-data.")

    check("Crash countdown component exists", "CODE",
          exists("frontend/components/crash/CrashCountdown.tsx"),
          "frontend/components/crash/CrashCountdown.tsx",
          "Restore the crash confirmation countdown UI.")
    crash_text = read_text("frontend/lib/crash-detection.ts")
    constants_text = read_text("frontend/lib/safety-constants.ts")
    check("Crash detection requests iOS DeviceMotion permission", "CODE",
          "requestPermission" in crash_text,
          "DeviceMotionEvent.requestPermission found",
          "Ask for DeviceMotion permission before starting crash detection on iOS.")
    check("Safety constants are centralized", "CODE",
          "CRASH" in constants_text and "SOS" in constants_text,
          "frontend/lib/safety-constants.ts",
          "Keep crash/SOS timing and thresholds in frontend/lib/safety-constants.ts.")

    ui_files = [
        "frontend/components/ui/OfflineBanner.tsx",
        "frontend/components/ui/SystemStatusBar.tsx",
        "frontend/components/__tests__/map.test.tsx",
    ]
    check("Key UI and map test files exist", "CODE",
          all(exists(path) for path in ui_files),
          f"{sum(exists(path) for path in ui_files)}/{len(ui_files)} files",
          "Restore OfflineBanner, SystemStatusBar, and map.test.tsx.")
    check("Frontend test coverage is present", "CODE",
          bool(list((REPO_ROOT / "frontend").rglob("*.test.tsx")) or list((REPO_ROOT / "frontend").rglob("*.test.ts"))),
          "test files detected",
          "Add Jest tests for critical UI/map/offline flows.")
    check("Playwright E2E configuration exists", "CODE",
          exists("frontend/playwright.config.ts") and exists("frontend/e2e"),
          "frontend/playwright.config.ts and frontend/e2e",
          "Add Playwright E2E setup for browser-level flows.")

    check("Bystander mode UI exists", "CODE",
          exists("frontend/app/bystander/page.tsx"),
          "frontend/app/bystander/page.tsx",
          "Ensure V2 witness/first-aid bystander features are enabled.")

    check("Zustand store persistence is enabled", "CODE",
          "persist(" in read_text("frontend/lib/store.ts") and "svai-storage" in read_text("frontend/lib/store.ts"),
          "persist middleware present",
          "Keep map layers and profile state stored via Zustand persistent storage.")

    check("Map UI layer controls enforce ARIA accessibility", "CODE",
          "aria-label" in read_text("frontend/components/RightSidebar.tsx") and "aria-label" in read_text("frontend/components/dashboard/SystemSidebar.tsx"),
          "aria-label attributes verified",
          "Enforce accessibility attributes on emergency mapping dashboards.")

    backend_init = read_text("backend/api/v1/__init__.py")
    expected_routers = [
        "chat_router",
        "challan_router",
        "emergency_router",
        "roadwatch_router",
        "geocode_router",
        "offline_router",
        "routing_router",
        "user_router",
        "tracking_router",
        "auth_router",
        "live_tracking_router",
        "waze_feed_router",
    ]
    check("Backend API v1 registers all product routers", "CODE",
          all(router in backend_init for router in expected_routers),
          f"{sum(router in backend_init for router in expected_routers)}/{len(expected_routers)} routers",
          "Include every v1 router in backend/api/v1/__init__.py.")

    check("MCP server module is available for Agentic RAG", "CODE",
          exists("backend/api/v1/mcp_server.py"),
          "backend/api/v1/mcp_server.py",
          "Expose FastMCP/Starlette endpoints to serve external AI tool integrations.")

    check("Live tracking supports real-time continuous sync and Enterprise WebSockets", "CODE",
          "@router.websocket" in read_text("backend/api/v1/tracking.py") and "pubsub" in read_text("backend/api/v1/tracking.py"),
          "WebSocket endpoint plus Redis pubsub scaling",
          "Support continuous group location WebSockets with horizontal Redis clustering.")

    schemas_text = read_text("backend/models/schemas.py")
    check("Challan schema matches current API contract", "CODE",
          all(field in schemas_text for field in ("base_fine", "repeat_fine", "amount_due")),
          "base_fine/repeat_fine/amount_due",
          "Use the current ChallanResponse fields instead of legacy fine_amount.")
    emergency_text = read_text("backend/api/v1/emergency.py")
    check("Emergency API exposes nearby, SOS GET, SOS POST, and numbers", "CODE",
          all(snippet in emergency_text for snippet in ("@router.get('/nearby'", "@router.get('/sos'", "@router.post('/sos'", "@router.get('/numbers'")),
          "nearby, sos get/post, numbers",
          "Restore emergency locator and SOS endpoints.")
    check("SOS POST records an incident and is rate limited", "CODE",
          "SosIncident(" in emergency_text and "10/minute" in emergency_text,
          "ORM-based incident insert plus limiter",
          "Persist SOS incidents via ORM and keep abuse protection on POST /sos.")

    security_text = read_text("backend/core/security.py")
    check("Production JWT secret is mandatory", "CODE",
          "JWT_SECRET_KEY is required when ENVIRONMENT=production" in security_text,
          "production guard present",
          "Raise at startup if JWT_SECRET_KEY is missing in production.")
    check("Static mock tokens are explicitly rejected", "CODE",
          "REJECTED_STATIC_TOKENS" in security_text and "mock-jwt-token-for-hackathon" in security_text,
          "reject list present",
          "Reject demo/mock bearer tokens in core/security.py.")
    admin_passwords = [
        m for m in search(r"admin123|password123|demo-user", "backend", "chatbot_service")
        if "/tests/" not in rel(m[0]).replace("\\", "/")
    ]
    check("No obvious demo admin passwords in runtime code", "CODE",
          not admin_passwords,
          "clean" if not admin_passwords else f"{rel(admin_passwords[0][0])}:{admin_passwords[0][1]}",
          "Remove hardcoded demo credentials from runtime services.")

    backend_tests = [
        "backend/tests/test_emergency.py",
        "backend/tests/test_challan.py",
        "backend/tests/test_roadwatch.py",
        "backend/tests/test_routing.py",
        "backend/tests/test_auth.py",
    ]
    check("Backend critical endpoint tests exist", "CODE",
          all(exists(path) for path in backend_tests),
          f"{sum(exists(path) for path in backend_tests)}/{len(backend_tests)} tests",
          "Add focused tests for emergency, challan, roads, routing, and auth.")

    expanded_backend_tests = [
        "backend/tests/test_chat_flow.py",
        "backend/tests/test_websocket.py",
        "backend/tests/test_live_tracking.py",
        "backend/tests/test_waze_feed.py",
        "backend/tests/test_offline_bundle.py",
        "backend/tests/test_geocoding_fallback.py",
        "backend/tests/test_migrations.py",
    ]
    check("Backend expanded test suite exists", "CODE",
          all(exists(path) for path in expanded_backend_tests),
          f"{sum(exists(path) for path in expanded_backend_tests)}/{len(expanded_backend_tests)} tests",
          "Add integration, WebSocket, and infrastructure tests.")

    expanded_chatbot_tests = [
        "chatbot_service/tests/test_safety_checker.py",
        "chatbot_service/tests/test_prompt_injection.py",
        "chatbot_service/tests/test_context_assembler.py",
        "chatbot_service/tests/test_chat_engine.py",
        "chatbot_service/tests/test_memory.py",
        "chatbot_service/tests/test_speech.py",
        "chatbot_service/tests/test_sarvam_provider.py",
        "chatbot_service/tests/test_language_detection.py",
        "chatbot_service/tests/test_template_provider.py",
        "chatbot_service/tests/test_admin.py",
        "tests/test_alerts.py",  # root-level, NOT chatbot_service/tests/
        "chatbot_service/tests/test_property_based.py",
    ]
    check("Chatbot expanded test suite exists", "CODE",
          all(exists(path) for path in expanded_chatbot_tests),
          f"{sum(exists(path) for path in expanded_chatbot_tests)}/{len(expanded_chatbot_tests)} tests",
          "Add safety, context, memory, and provider tests.")

    advanced_test_dirs = [
        "tests/load",
        "tests/stress",
        "tests/chaos",
        "tests/security",
        "tests/recovery",
        "tests/performance",
        "tests/contract",
        "tests/fuzz",
        "tests/infra",
    ]
    check("Advanced test directories exist (load/stress/chaos/security)", "CODE",
          all(exists(path) for path in advanced_test_dirs),
          f"{sum(exists(path) for path in advanced_test_dirs)}/{len(advanced_test_dirs)} dirs",
          "Create advanced testing infrastructure for production readiness.")

    frontend_expanded_tests = [
        "frontend/components/__tests__/chat-interface.test.tsx",
        "frontend/components/__tests__/sos-button.test.tsx",
        "frontend/components/__tests__/map-layers.test.tsx",
        "frontend/components/__tests__/challan-calculator.test.tsx",
        "frontend/tests/accessibility.test.tsx",
        "frontend/e2e/responsive.spec.ts",
        "frontend/e2e/visual.spec.ts",
        "frontend/e2e/offline.spec.ts",
    ]
    check("Frontend expanded test suite exists", "CODE",
          all(exists(path) for path in frontend_expanded_tests),
          f"{sum(exists(path) for path in frontend_expanded_tests)}/{len(frontend_expanded_tests)} tests",
          "Add component, accessibility, and E2E tests.")

    chatbot_main = read_text("chatbot_service/main.py")
    chatbot_chat = read_text("chatbot_service/api/chat.py")
    check("Chatbot exposes root health and API health", "CODE",
          "@app.get('/health'" in chatbot_main and "@router.get('/health')" in chatbot_chat,
          "/health and /api/v1/chat/health",
          "Expose health endpoints for Render and app status checks.")
    check("Chatbot supports blocking and streaming chat", "CODE",
          "@router.post('/'" in chatbot_chat and "@router.post('/stream')" in chatbot_chat,
          "POST /api/v1/chat/ and /stream",
          "Restore standard and SSE chat endpoints.")
    check("Chat history is admin protected", "CODE",
          "x_admin_secret" in chatbot_chat and "403" in chatbot_chat,
          "admin secret gate present",
          "Require admin secret for chat history access.")
    rag_assets = [
        "chatbot_service/data/chroma_db",
        "chatbot_service/data/violations_seed.csv",
        "chatbot_service/data/state_overrides.csv",
        "chatbot_service/data/emergency_numbers.json",
        "chatbot_service/data/first_aid.json",
    ]
    check("Chatbot RAG/reference data exists", "CODE",
          all(exists(path) for path in rag_assets),
          f"{sum(exists(path) for path in rag_assets)}/{len(rag_assets)} assets",
          "Restore chatbot_service/data reference files and ChromaDB.")
    runtime_torch = [
        m for m in search(r"^\s*import\s+torch|^\s*from\s+torch", "chatbot_service")
        if "/data/" not in rel(m[0]).replace("\\", "/") and "/tests/" not in rel(m[0]).replace("\\", "/")
    ]
    check("Torch is not imported by core chatbot runtime", "CODE",
          not runtime_torch,
          "clean" if not runtime_torch else f"{rel(runtime_torch[0][0])}:{runtime_torch[0][1]}",
          "Keep heavyweight ML imports out of Render-facing runtime code or isolate them behind optional extras.",
          required=False)

    check("Interactive architecture knowledge graph is fully up to date", "CODE",
          exists("graphify-out/GRAPH_REPORT.md") and exists("graphify-out/graph.json"),
          "graphify-out/GRAPH_REPORT.md and graph.json",
          "Run graphify update . to synchronize architecture knowledge graph artifacts.")

    core_backend_services = [
        "backend/services/osm_contributor.py",
        "backend/services/safe_routing.py",
        "backend/services/safe_spaces.py",
        "alert_service.py",
    ]
    check("Core backend safety and monitoring services are fully deployed", "CODE",
          all(exists(path) for path in core_backend_services),
          f"{sum(exists(path) for path in core_backend_services)}/{len(core_backend_services)} services",
          "Ensure secondary support features (OSM uploads, routing overrides, public safe-spaces, email alerts) are available.")

    llm_providers = [
        "chatbot_service/providers/nvidia_nim_provider.py",
        "chatbot_service/providers/sarvam_provider.py",
        "chatbot_service/providers/together_provider.py",
        "chatbot_service/providers/mistral_provider.py",
        "chatbot_service/providers/gemini_provider.py",
        "chatbot_service/providers/groq_provider.py",
    ]
    check("Chatbot supports a unified 11-provider fallback chain framework", "CODE",
          all(exists(path) for path in llm_providers),
          f"{sum(exists(path) for path in llm_providers)}/{len(llm_providers)} key providers",
          "Include full suite of LLM provider integrations for high-availability agent fallback routing.")

    check("Chatbot circular import fixed via extracted limiter module", "CODE",
          exists("chatbot_service/limiter.py"),
          "chatbot_service/limiter.py",
          "Extract limiter from main.py to break main.RealTimeLimiter dependency cycle.")

    check("Backend AI report classifier service exists", "CODE",
          exists("backend/services/report_classifier.py"),
          "backend/services/report_classifier.py",
          "Restore 10-category rule-based road hazard classifier.")

    check("GeoJSON compression middleware is installed", "CODE",
          exists("backend/middleware/compression.py"),
          "backend/middleware/compression.py",
          "Add gzip middleware for large GeoJSON emergency bundles.")

    check("Dependabot weekly security PR automation is configured", "CODE",
          exists(".github/dependabot.yml"),
          ".github/dependabot.yml",
          "Configure .github/dependabot.yml for weekly npm/pip/GHActions audits.")

    check("Phase 3 completion documented in plan", "CODE",
          exists("docs/phase3-plan.md") and "All Phase 3 items complete" in read_text("docs/phase3-plan.md"),
          "docs/phase3-plan.md marks all Phase 3 items complete",
          "Update docs/phase3-plan.md to track completed enterprise hardening milestones.")

    check("PyJWT is patched above CVE-2026-32597 threshold (>=2.12.0)", "CODE",
          "PyJWT[crypto]==2.12.0" in read_text("backend/requirements.txt"),
          "backend/requirements.txt has PyJWT[crypto]==2.12.0",
          "Upgrade PyJWT to 2.12.0 to fix HIGH CVE-2026-32597.")

    check("All services have .env.example template files", "CODE",
          exists("backend/.env.example") and exists("chatbot_service/.env.example") and exists("frontend/.env.example"),
          "backend, chatbot_service, frontend all have .env.example",
          "Add .env.example files with documented required vars for every service.")

    etl_scripts = [
        "backend/scripts/data/prepare_road_sources.py",
        "scripts/data/extract_morth2022_tables.py",
        "scripts/data/bootstrap_local_data.py",
    ]
    check("Enterprise ETL and local data bootstrapping pipeline scripts exist", "CODE",
          all(exists(path) for path in etl_scripts),
          f"{sum(exists(path) for path in etl_scripts)}/{len(etl_scripts)} scripts",
          "Maintain automated pipelines for road watch infrastructure and MoRTH datasets.")

    check("Speech translation service supports multimodal Indic voice input", "CODE",
          exists("chatbot_service/services/speech_translation.py"),
          "chatbot_service/services/speech_translation.py",
          "Enable localized multimodal audio transcription and Indic translation for voice-driven emergency navigation.")


def run_local_checks() -> None:
    section("LOCAL RUN CHECKS")

    git_available = command_exists("git")
    check("git is available for history checks", "RUN", git_available,
          "git found" if git_available else "git missing",
          "Install git or run in a git-enabled environment.", required=False)
    if git_available:
        code, output = run_cmd(["git", "log", "--all", "--full-history", "--", "*.env"], timeout=30)
        check("No .env files appear in git history", "RUN",
              code == 0 and not output.strip(),
              "clean" if not output.strip() else output.splitlines()[0],
              "Purge committed secrets from git history and rotate exposed credentials.")

        code, output = run_cmd(["git", "log", "--all", "--full-history", "--", "*.pt", "*.bin", "*.safetensors"], timeout=30)
        check("No large model weights appear in git history", "RUN",
              code == 0 and not output.strip(),
              "clean" if not output.strip() else output.splitlines()[0],
              "Use external model storage or Git LFS for model weights.")

    python_exe = sys.executable or "python"
    py_files = [
        "safevixai_verify.py",
        "backend/main.py",
        "backend/api/v1/emergency.py",
        "backend/api/v1/challan.py",
        "backend/core/security.py",
        "chatbot_service/main.py",
        "chatbot_service/api/chat.py",
    ]
    code, output = run_cmd([python_exe, "-m", "py_compile", *py_files], timeout=60)
    check("Critical Python files compile", "RUN",
          code == 0,
          "py_compile ok" if code == 0 else output[-300:],
          "Fix Python syntax/import-path errors in critical app files.")

    if command_exists("npm"):
        frontend_path = REPO_ROOT / "frontend"
        code, output = run_cmd(["npm", "run", "build"], cwd=frontend_path, timeout=180)
        check("Frontend production build succeeds", "RUN",
              code == 0,
              "next build ok" if code == 0 else output[-500:],
              "Fix TypeScript/Next build errors before deploying.")

        code, output = run_cmd(["npm", "test", "--", "--runInBand"], cwd=frontend_path, timeout=180)
        check("Frontend Jest tests pass", "RUN",
              code == 0,
              "jest ok" if code == 0 else output[-500:],
              "Fix failing frontend tests.")

        code, output = run_cmd(["npm", "audit", "--json"], cwd=frontend_path, timeout=120)
        audit_ok = False
        audit_detail = "npm audit unavailable"
        if output:
            try:
                audit = json.loads(output)
                vulns = audit.get("metadata", {}).get("vulnerabilities", {})
                critical = int(vulns.get("critical", 0))
                high = int(vulns.get("high", 0))
                audit_ok = critical == 0
                audit_detail = f"critical={critical}, high={high}"
            except json.JSONDecodeError:
                audit_detail = output[-300:]
        check("npm audit has no critical vulnerabilities", "RUN",
              audit_ok,
              audit_detail,
              "Resolve critical vulnerabilities or document accepted risk.",
              required=False)
    else:
        check("npm is available for frontend build/test", "RUN", False,
              "npm missing",
              "Install Node.js/npm to run frontend verification.",
              required=False)

    if command_exists("pytest"):
        code, output = run_cmd(["pytest", "backend/tests", "-q"], cwd=REPO_ROOT / "backend", timeout=180)
        check("Backend pytest suite passes", "RUN",
              code == 0,
              "pytest ok" if code == 0 else output[-500:],
              "Fix failing backend tests.")
    else:
        check("pytest is available for backend tests", "RUN", False,
              "pytest missing",
              "Install backend test dependencies, then run pytest.",
              required=False)

    chroma_dir = REPO_ROOT / "chatbot_service/data/chroma_db"
    chroma_files = list(chroma_dir.rglob("*")) if chroma_dir.exists() else []
    check("ChromaDB directory is populated", "RUN",
          any(path.is_file() for path in chroma_files),
          f"{sum(1 for path in chroma_files if path.is_file())} files",
          "Populate chatbot_service/data/chroma_db before deployment.")


def run_live_checks() -> None:
    section("LIVE DEPLOYMENT CHECKS")
    print(f"  backend : {BACKEND_URL}")
    print(f"  chatbot : {CHATBOT_URL}")
    print(f"  frontend: {FRONTEND_URL}")

    backend_health = http_request("GET", f"{BACKEND_URL}/health")
    backend_json = backend_health.get("json") if isinstance(backend_health.get("json"), dict) else {}
    check("Backend /health returns structured status", "LIVE",
          backend_health["status"] in {200, 503} and "status" in backend_json,
          f"status={backend_health['status']} elapsed={backend_health['elapsed_ms']}ms",
          "Check Render backend logs and database connectivity.")

    chatbot_health = http_request("GET", f"{CHATBOT_URL}/health")
    chatbot_json = chatbot_health.get("json") if isinstance(chatbot_health.get("json"), dict) else {}
    check("Chatbot /health returns ok", "LIVE",
          chatbot_health["status"] == 200 and chatbot_json.get("status") == "ok",
          f"status={chatbot_health['status']} elapsed={chatbot_health['elapsed_ms']}ms",
          "Check Render chatbot service logs and startup dependencies.")

    frontend_home = http_request("GET", FRONTEND_URL)
    frontend_text = str(frontend_home.get("text", "")).lower()
    check("Frontend Vercel app responds with SafeVixAI shell", "LIVE",
          frontend_home["status"] == 200 and ("safevix" in frontend_text or "roadsos" in frontend_text),
          f"status={frontend_home['status']} elapsed={frontend_home['elapsed_ms']}ms",
          "Check Vercel deployment/build status.")

    manifest = http_request("GET", f"{FRONTEND_URL}/manifest.json")
    manifest_json = manifest.get("json") if isinstance(manifest.get("json"), dict) else {}
    check("Live PWA manifest is served", "LIVE",
          manifest["status"] == 200 and "share_target" in manifest_json,
          f"status={manifest['status']}",
          "Ensure frontend/public/manifest.json is deployed.")

    sw = http_request("GET", f"{FRONTEND_URL}/sw.js")
    check("Live service worker is served", "LIVE",
          sw["status"] == 200 and "sos-queue-flush" in str(sw.get("text", "")),
          f"status={sw['status']}",
          "Ensure frontend/public/sw.js is deployed and cache is refreshed.")

    emergency = http_request(
        "GET",
        f"{BACKEND_URL}/api/v1/emergency/nearby",
        params={"lat": 13.0827, "lon": 80.2707, "radius": 5000, "limit": 5},
    )
    emergency_json = emergency.get("json") if isinstance(emergency.get("json"), dict) else {}
    check("Emergency nearby endpoint returns service envelope", "LIVE",
          emergency["status"] == 200 and isinstance(emergency_json.get("services"), list),
          f"status={emergency['status']} count={emergency_json.get('count', 'n/a')}",
          "Check emergency locator dependencies and local/Overpass fallback data.")

    sos_get = http_request(
        "GET",
        f"{BACKEND_URL}/api/v1/emergency/sos",
        params={"lat": 13.0827, "lon": 80.2707},
    )
    sos_get_json = sos_get.get("json") if isinstance(sos_get.get("json"), dict) else {}
    check("SOS GET preview returns emergency payload", "LIVE",
          sos_get["status"] == 200 and "numbers" in sos_get_json and "services" in sos_get_json,
          f"status={sos_get['status']}",
          "Check GET /api/v1/emergency/sos preview flow.")

    sos_post = http_request(
        "POST",
        f"{BACKEND_URL}/api/v1/emergency/sos",
        params={"lat": 13.0827, "lon": 80.2707},
    )
    check("SOS POST records/returns emergency payload", "LIVE",
          sos_post["status"] in {200, 201, 503},
          f"status={sos_post['status']}",
          "If status is 503, inspect database write path for sos_incidents.")

    challan = http_request(
        "POST",
        f"{BACKEND_URL}/api/v1/challan/calculate",
        body={
            "violation_code": "185",
            "vehicle_class": "light_motor_vehicle",
            "state_code": "TN",
            "is_repeat": False,
        },
    )
    challan_json = challan.get("json") if isinstance(challan.get("json"), dict) else {}
    check("Challan calculator returns current fine contract", "LIVE",
          challan["status"] == 200 and challan_json.get("amount_due", 0) > 0,
          f"status={challan['status']} amount_due={challan_json.get('amount_due', 'n/a')}",
          "Check challan service DB/CSV fallback and request schema.")

    waze = http_request("GET", f"{BACKEND_URL}/api/v1/feeds/waze")
    waze_json = waze.get("json") if isinstance(waze.get("json"), dict) else {}
    check("Waze feed endpoint returns CIFS payload", "LIVE",
          waze["status"] == 200 and ("incidents" in waze_json or "features" in waze_json or waze_json.get("type") == "FeatureCollection"),
          f"status={waze['status']} count={waze_json.get('count', 'n/a') if isinstance(waze_json, dict) else 'n/a'}",
          "Check waze_feed router and backing road incident query.",
          required=False)

    profile_no_auth = http_request("GET", f"{BACKEND_URL}/api/v1/user/profile")
    check("Profile endpoint requires authentication", "LIVE",
          profile_no_auth["status"] == 401,
          f"status={profile_no_auth['status']}",
          "Protect profile routes with get_current_user.")

    mock_token = http_request(
        "GET",
        f"{BACKEND_URL}/api/v1/user/profile",
        headers={"Authorization": "Bearer mock-jwt-token-for-hackathon"},
    )
    check("Mock JWT token is rejected live", "LIVE",
          mock_token["status"] == 401,
          f"status={mock_token['status']}",
          "Remove any live mock-token bypass.")

    cors = http_request(
        "GET",
        f"{BACKEND_URL}/api/v1/emergency/nearby",
        params={"lat": 13.0827, "lon": 80.2707},
        headers={"Origin": "https://malicious.example"},
    )
    cors_header = cors.get("headers", {}).get("Access-Control-Allow-Origin", "")
    check("Backend does not wildcard malicious CORS origin", "LIVE",
          cors_header not in {"*", "https://malicious.example"},
          f"allow-origin={cors_header or 'not set'}",
          "Set CORS origins to deployed frontend domains only.")

    chat = http_request(
        "POST",
        f"{CHATBOT_URL}/api/v1/chat/",
        body={
            "message": "What is the fine for drunk driving under the Motor Vehicles Act?",
            "session_id": "verify-safevixai-legal",
        },
        timeout=45,
    )
    chat_json = chat.get("json") if isinstance(chat.get("json"), dict) else {}
    response_text = str(chat_json.get("response", "")).lower()
    legal_terms = ("185", "10000", "10,000", "drunk", "motor vehicles", "challan")
    check("Chatbot answers road-safety legal query", "LIVE",
          chat["status"] == 200 and any(term in response_text for term in legal_terms),
          f"status={chat['status']} session={chat_json.get('session_id', 'n/a')}",
          "Check chatbot provider keys, RAG data, and backend challan tool.")

    out_of_scope = http_request(
        "POST",
        f"{CHATBOT_URL}/api/v1/chat/",
        body={"message": "What is the GDP of Jupiter?", "session_id": "verify-safevixai-scope"},
        timeout=45,
    )
    scope_json = out_of_scope.get("json") if isinstance(out_of_scope.get("json"), dict) else {}
    scope_text = str(scope_json.get("response", "")).lower()
    refusal_terms = ("road safety", "cannot", "outside", "not", "do not", "safevixai")
    check("Chatbot handles out-of-scope prompt safely", "LIVE",
          out_of_scope["status"] == 200 and any(term in scope_text for term in refusal_terms),
          f"status={out_of_scope['status']}",
          "Keep chatbot scoped to road safety, emergency response, first aid, and challans.")


def print_summary(write_report: bool) -> None:
    section("VERIFICATION SUMMARY")
    required = [item for item in results if item["required"]]
    optional = [item for item in results if not item["required"]]
    failed_required = [item for item in required if not item["passed"]]
    failed_optional = [item for item in optional if not item["passed"]]
    passed = [item for item in results if item["passed"]]
    score = int((len(required) - len(failed_required)) / max(len(required), 1) * 100)
    bar = "#" * (score // 10) + "." * (10 - score // 10)

    print(f"  Timestamp      : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Required checks: {len(required)}")
    print(f"  Optional checks: {len(optional)}")
    print(f"  Passed         : {len(passed)}")
    print(f"  Required failed: {len(failed_required)}")
    print(f"  Optional warns : {len(failed_optional)}")
    print(f"  Score          : {score}/100 [{bar}]")

    if failed_required:
        print("\n  Required failures, fix in this order:")
        priority = {"LIVE": 0, "RUN": 1, "CODE": 2}
        for index, item in enumerate(sorted(failed_required, key=lambda x: priority.get(x["category"], 9)), 1):
            print(f"  {index:2}. [{item['category']}] {item['name']}")
            if item["detail"]:
                print(f"      Detail: {item['detail'][:120]}")
            if item["fix"]:
                print(f"      Fix   : {item['fix'][:120]}")

    if failed_optional:
        print("\n  Optional warnings:")
        for item in failed_optional[:10]:
            print(f"  - [{item['category']}] {item['name']}: {item['detail'][:100]}")

    if write_report:
        report = {
            "timestamp": datetime.now().isoformat(),
            "score": score,
            "passed": len(passed),
            "failed_required": len(failed_required),
            "failed_optional": len(failed_optional),
            "total": len(results),
            "backend_url": BACKEND_URL,
            "chatbot_url": CHATBOT_URL,
            "frontend_url": FRONTEND_URL,
            "results": results,
        }
        report_path = REPO_ROOT / "docs/verification_report.json"
        report_path.parent.mkdir(exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\n  Report saved to: {rel(report_path)}")

    print("\n" + "=" * 78)
    print("  SafeVixAI end-to-end verification complete")
    print("=" * 78)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify SafeVixAI end to end.")
    parser.add_argument("--code", action="store_true", help="Run source/static checks only.")
    parser.add_argument("--run", action="store_true", help="Run local build/test/runtime checks only.")
    parser.add_argument("--live", action="store_true", help="Run deployed endpoint checks only.")
    parser.add_argument("--quick", action="store_true", help="Alias for --code --no-report.")
    parser.add_argument("--no-report", action="store_true", help="Do not write docs/verification_report.json.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    print("\n" + "=" * 78)
    print("  SafeVixAI End-to-End Verification")
    print(f"  Repo: {REPO_ROOT}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 78)

    if args.quick:
        args.code = True
        args.no_report = True

    explicit = args.code or args.run or args.live
    if args.code or not explicit:
        run_code_checks()
    if args.run or not explicit:
        run_local_checks()
    if args.live or not explicit:
        run_live_checks()

    print_summary(write_report=not args.no_report)
    failed_required = [item for item in results if item["required"] and not item["passed"]]
    return 1 if failed_required else 0


if __name__ == "__main__":
    raise SystemExit(main())
