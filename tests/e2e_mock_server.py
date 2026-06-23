# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team
"""Lightweight mock API server for E2E and API contract tests."""
from __future__ import annotations

import json
import os
import threading
import time
from fastapi import FastAPI, Response, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

# ── Mock Data ──
MOCK_DATA = {
    "health": {"status": "ok", "service": "safevixai-backend", "version": "1.0.0"},
    "emergency_nearby": {
        "services": [
            {"id": "Apollo Hospital", "name": "Apollo Hospital", "category": "medical", "lat": 13.0827, "lon": 80.2707, "distance": 100.0}
        ]
    },
    "challan_calculate": {"violation": "MVA_185", "fine": 10000, "description": "Drunk driving"},
    "chat": {"response": "This is a mock response for E2E testing.", "intent": "general"},
    "chat_health": {"status": "ok", "intent": "general", "providers": []},
    "speech_status": {"configured": True, "device": "cpu"},
    "geocode": {"display_name": "IIT Madras, Chennai, Tamil Nadu", "lat": "13.0827", "lon": "80.2707"},
    "roads_nearby": {"issues": []},
    "roadwatch_feed": {"feed": []},
    "offline_bundle": {"emergency_numbers": []},
}

# ── Backend Endpoints (Port 8000) ──

@app.get("/health")
def health():
    return MOCK_DATA["health"]

@app.get("/api/v1/emergency/nearby")
def emergency_nearby(lat: str = None, lon: str = None):
    # Reject with 422 if lat/lon is invalid/not a float representation
    if lat == "invalid" or lon == "invalid":
        return Response(content=json.dumps({"detail": "Invalid coordinates"}), status_code=422, media_type="application/json")
    return MOCK_DATA["emergency_nearby"]

@app.get("/api/v1/challan/calculate")
@app.post("/api/v1/challan/calculate")
def challan_calculate(violation_code: str = None):
    if violation_code == "INVALID_XXX_999":
        return Response(content=json.dumps({"detail": "Violation not found"}), status_code=404, media_type="application/json")
    return MOCK_DATA["challan_calculate"]

@app.get("/api/v1/geocode/reverse")
def reverse_geocode(lat: str = None, lon: str = None):
    return MOCK_DATA["geocode"]

@app.get("/api/v1/roads/nearby")
def roads_nearby():
    return MOCK_DATA["roads_nearby"]

@app.get("/api/v1/auth/csrf-token")
def csrf_token():
    return {"csrf_token": "mock-csrf-token"}

@app.get("/api/v1/auth/verify")
def auth_verify():
    return {"status": "valid", "sub": "e2e-test", "role": "user"}

@app.get("/api/v1/user/profile")
def user_profile():
    return Response(content=json.dumps({"detail": "Not authenticated"}), status_code=401, media_type="application/json")

@app.post("/api/v1/emergency/sos")
def emergency_sos():
    return Response(content=json.dumps({"detail": "Not authenticated"}), status_code=401, media_type="application/json")

@app.get("/api/v1/live-tracking/nearby")
def live_tracking_nearby():
    return Response(content=json.dumps({"detail": "Not authenticated"}), status_code=401, media_type="application/json")

@app.get("/api/v1/roadwatch/feed")
def roadwatch_feed():
    return MOCK_DATA["roadwatch_feed"]

@app.get("/api/v1/offline/bundle")
def offline_bundle():
    return MOCK_DATA["offline_bundle"]

# ── Chatbot Endpoints (Port 8010) ──

@app.post("/api/v1/chat/")
def chat(req: ChatRequest):
    if not req.message.strip():
        return Response(content=json.dumps({"detail": "Empty message"}), status_code=422, media_type="application/json")
    return MOCK_DATA["chat"]

@app.get("/api/v1/chat/health")
def chat_health():
    return MOCK_DATA["chat_health"]

@app.get("/speech/status")
def speech_status():
    return MOCK_DATA["speech_status"]

@app.post("/api/v1/chat/stream")
def chat_stream(req: ChatRequest):
    if not req.message.strip():
        return Response(content=json.dumps({"detail": "Empty message"}), status_code=422, media_type="application/json")
    return Response(content=json.dumps(MOCK_DATA["chat"]), media_type="text/event-stream")

@app.post("/speech/translate")
def speech_translate(target_language: str = Query(...)):
    if target_language == "invalid":
        return Response(content=json.dumps({"detail": "Invalid language"}), status_code=422, media_type="application/json")
    return {"status": "ok", "translated": "Mock translation"}

# ── Dual Port Server Runner ──

def run_server(port: int):
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")

if __name__ == "__main__":
    # If a port is specified in env, run just that port (e.g. for manual testing)
    port_env = os.environ.get("MOCK_PORT")
    if port_env:
        uvicorn.run(app, host="0.0.0.0", port=int(port_env), log_level="info")
    else:
        # Run on both 8000 (backend) and 8010 (chatbot)
        print("Starting mock server threads on ports 8000 and 8010...")
        t1 = threading.Thread(target=run_server, args=(8000,), daemon=True)
        t2 = threading.Thread(target=run_server, args=(8010,), daemon=True)
        t1.start()
        t2.start()
        
        # Keep main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Stopping mock servers.")
