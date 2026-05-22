# SafeVixAI — Complete System Map

> Generated: 2026-05-22 | Coverage: All 3 services, infra, data flows

---

## 1. Service Topology

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   FRONTEND   │     │    BACKEND       │     │  CHATBOT SERVICE │
│  :3000       │     │   :8000          │     │   :8010          │
│  Next.js 15  │────▶│   FastAPI        │────▶│   FastAPI        │
│  React 19    │     │   SQLAlchemy     │     │   Providers x11  │
│  PWA + SW    │     │   PostGIS/Redis  │     │   ChromaDB/Redis │
│  MapLibre GL │     │   14 Services    │     │   13 Tools       │
│  Zustand     │     │   35+ Endpoints   │     │   9 LLM Provider │
└──────┬───────┘     └───────┬──────────┘     └────────┬─────────┘
       │                     │                          │
       │          ┌──────────▼──────────┐              │
       │          │   DATA LAYER        │              │
       │          │                     │              │
       │          │  PostgreSQL 16      │              │
       │          │  + PostGIS          │              │
       │          │  (Supabase)         │              │
       │          │                     │              │
       │          │  Redis 7            │◄─────────────┘
       │          │  (Upstash)          │
       │          │  Cache + RateLimit  │
       │          │  + Session Store    │
       │          └─────────────────────┘
```

---

## 2. Data Flow Diagrams

### Emergency SOS Flow
```
User → GlobalSOS button → /sos page → SOSButton (double-tap)
  → [Online] POST /api/v1/emergency/sos
     → SosIncident DB record
     → EmergencyLocatorService.find_nearby()
        → Cache check → PostGIS query → Local CSV → Overpass
     → Build SOS payload (services + numbers)
     → Start family tracking (POST /api/v1/live-tracking/start)
     → WhatsApp/SMS share
  → [Offline] IndexedDB queue → auto-flush on online event
```

### Chatbot Message Flow
```
User → ChatInterface → POST /api/v1/chat/stream (SSE)
  → Backend LLMService proxy → chatbot_service /chat
     → SafetyChecker.evaluate()
        → [BLOCKED] → return blocked response
     → IntentDetector.detect()
     → ContextAssembler.assemble()
        → Call relevant tools (SOS, Challan, etc.)
        → Retrieve RAG chunks (ChromaDB)
     → ProviderRouter.generate()
        → Language detection → select provider
        → LLM API call with timeout
        → [Fails] → fallback chain (9 providers)
        → [All fail] → TemplateProvider (deterministic)
     → ConversationMemoryStore.append()
     → AIGovernance.evaluate()
     → SSE stream back
```

### Challan Calculation Flow
```
User → ChallanCalculator → [Online] POST /api/v1/challan/calculate
  → ChallanService.calculate_with_db()
     → Query traffic_violations table
     → Query state_fine_overrides table
     → Return fine amount + section
  → [Offline] DuckDB-Wasm
     → Load violations.csv into WASM
     → Execute SQL query client-side
     → Return result
```

---

## 3. Database Schema

### Tables (7 total)

```
emergency_services
├── id (PK, UUID)
├── osm_id, osm_type, name, name_local
├── category (hospital, police, fire_station, ambulance, pharmacy)
├── sub_category, address, phone, phone_emergency
├── location (POINT, SRID 4326, GIST index)
├── city, district, state, state_code
├── is_24hr, has_trauma, has_icu, bed_count
├── source (overpass, healthsites, manual, seed)
├── verified, org_id
└── GIST spatial index on location

road_issues
├── id (PK, UUID)
├── issue_type, severity (1-5)
├── description, location (POINT)
├── location_address, road_name, road_type
├── photo_url, ai_detection (JSONB)
├── reporter_id, status
├── authority_name, authority_phone
├── complaint_ref, org_id
├── composite indexes: (status, issue_type), (status, created_at)
└── GIST spatial index on location

road_infrastructure
├── id (PK)
├── road_id, road_name, road_type, road_number
├── length_km, geometry (LINESTRING)
├── state_code, contractor_name, exec_engineer
├── budget_sanctioned, budget_spent
├── construction_date, last_relayed_date
├── org_id
└── GIST spatial index on geometry

sos_incidents
├── id (UUID PK, gen_random_uuid())
├── user_id, lat, lon, user_agent, created_at
└── org_id

user_profiles
├── id (UUID PK)
├── user_id, name, blood_group
├── emergency_contacts (JSON)
├── allergies, vehicle_details, medical_notes
├── org_id, created_at, updated_at

live_tracking
├── session_id (UUID PK)
├── user_id, user_name, blood_group, vehicle_number
├── lat, lon, battery_percent
├── is_active, expires_at (4hr TTL)
├── view_token, org_id

traffic_violations + state_fine_overrides
├── violation_code, vehicle_class, section, description
├── base_fine, repeat_fine, aliases
└── No ORM model (raw SQL via text())
```

---

## 4. Auth System

```
Login → POST /api/v1/auth/login
  → PBKDF2 verify against AUTH_OPERATOR_PASSWORD_HASH env var
  → Create JWT (HS256, 24h expiry)
  → Set HttpOnly cookie (access_token)
  → Return token in body + cookie

Verification → get_current_user(request)
  → Check cookie first → check Authorization: Bearer header
  → Decode: App JWT → Supabase JWT → JWKS → Fallback
  → Return user payload {sub, role, org_id}

Roles: ADMIN > OPERATOR > USER > READONLY (hierarchical, NOT enforced)

Supabase JWT: aud=authenticated, verified via SUPABASE_JWT_SECRET
```

---

## 5. Service Dependencies

```
EmergencyLocatorService
  └─ OverpassService ─┬─ Overpass API (3 mirrors)
  │                   └─ Healthsites.io API
  ├─ CacheHelper ─┬─ Redis
  │               └─ In-memory dict
  ├─ LocalEmergencyCatalog ── CSV files (50k+ facilities)
  └─ PostGIS (emergency_services table)

ChallanService
  ├─ PostGIS (traffic_violations, state_fine_overrides)
  └─ CSV files (violations.csv, state_overrides.csv)

RoadWatchService
  ├─ AuthorityRouter ─┬─ PostGIS (road_infrastructure)
  │                   └─ OverpassService
  ├─ GeocodingService ─┬─ Photon API
  │                    └─ Nominatim API
  ├─ ReportClassifier (rule-based NLP)
  ├─ OSMContributor ── OpenStreetMap API v0.6
  ├─ CacheHelper
  ├─ PostGIS (road_issues table)
  └─ Supabase Storage (photo upload)

RoutingService
  ├─ OpenRouteService API
  ├─ OSRM API
  └─ CacheHelper

LLMService (proxy)
  └─ Chatbot Service (:8010) ── HTTP POST

ChatbotService
  └─ Backend (:8000) ── POST /api/v1/challan/calculate
  │                   ── GET /api/v1/emergency/sos
  │                   ── GET /api/v1/emergency/nearby
  │                   ── GET /api/v1/roads/issues
  │                   ── GET /api/v1/roads/infrastructure
  │                   ── POST /api/v1/roads/report
  ├─ Redis (session memory + LLM cache)
  ├─ ChromaDB (RAG vectorstore)
  ├─ LLM Providers x9 (Groq, Gemini, Cerebras, etc.)
  ├─ Open-Meteo + OpenWeather API
  ├─ What3Words API
  ├─ Open FDA API
  └─ Nominatim + OpenCage API
```

---

## 6. External API Dependencies

| API | Service | Rate Limit | Fallback | Key Required |
|-----|---------|-----------|----------|-------------|
| Overpass | Backend | Variable | 3 mirrors + Healthsites.io | No |
| OpenRouteService | Backend | 2000/day | OSRM (free) | Yes |
| Nominatim | Backend/Chatbot | 1 req/s | Photon / OpenCage | No |
| Photon | Backend | Unlim | Nominatim | No |
| Open-Meteo | Chatbot | Unlim | OpenWeather | No |
| OpenWeather | Chatbot | 60/min, 1M/mo | None | Yes |
| What3Words | Chatbot | 50K/mo | None | Yes |
| Open FDA | Chatbot | Unlim | None | No |
| OpenCage | Chatbot | 2500/day | Nominatim | Yes |
| Groq LLM | Chatbot | 30 RPM | Cerebras | Yes |
| Cerebras LLM | Chatbot | 10 RPM | Gemini | Yes |
| Gemini LLM | Chatbot | 15 RPM, 1M tkns/day | GitHub | Yes |
| GitHub Models | Chatbot | Variable | NVIDIA | Yes |
| NVIDIA NIM | Chatbot | 1000 req/day | OpenRouter | Yes |
| OpenRouter | Chatbot | Variable | Mistral | Yes |
| Mistral LLM | Chatbot | 500 RPM | Together | Yes |
| Together | Chatbot | Variable | Template | Yes |
| Sarvam AI | Chatbot | Variable | HF Inference | Yes |

---

## 7. Cache Map

| Cache Key | TTL | Storage | Invalidated By |
|-----------|-----|---------|---------------|
| `emergency:nearby:{lat}:{lon}:{cats}:{rad}` | 3600s | Redis+Mem | TTL expiry |
| `geocode:reverse:{lat}:{lon}` | 86400s | Redis+Mem | TTL expiry |
| `geocode:search:{query}` | 86400s | Redis+Mem | TTL expiry |
| `route:preview:{origin}:{dest}` | 900s | Redis+Mem | TTL expiry |
| `roads:authority:{lat}:{lon}` | 3600s | Redis+Mem | TTL expiry |
| `roads:infra:{lat}:{lon}` | 3600s | Redis+Mem | TTL expiry |
| `roads:issues:v{ver}:{lat}:{lon}:{rad}` | 3600s | Redis+Mem | Version increment on new report |
| `chat:session:{session_id}` | 86400s | Redis | TTL expiry |
| LLM response cache | 3600s | Redis | TTL expiry |
| `idempotency:{key}` | 86400s | Redis+Mem | TTL expiry |

---

## 8. Cron Schedule

| Schedule | Workflow | Action |
|----------|----------|--------|
| Weekly Mon 02:00 UTC | load-testing.yml | k6 load tests against production |
| Weekly Mon 03:00 UTC | chaos-tests.yml | Chaos engineering tests |
| Weekly Mon 06:00 UTC | security.yml | Gitleaks + dependency audit |
| Weekly Thu 08:21 UTC | codacy.yml | Codacy SAST scan |
| Weekly Mon | Dependabot | Dependency update PRs |
| On push to main | sync-wiki.yml | Auto-generate wiki docs |
| On push to main | update-master-doc.yml | Generate DOCX master doc |
| On push to main | deploy-docs.yml | Deploy MkDocs to GitHub Pages |
