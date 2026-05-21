# Backend Coverage 90%+ Implementation Plan

## Current Status
- **Coverage:** 79% (4453/5647 lines)
- **Target:** 90%+ (5082+ lines)
- **Gap:** 629 lines to cover
- **Tests:** 215 passing, 1 skipped

---

## Priority 1: API Route Tests (High Impact, Low Effort)
**Target: +150 lines covered**

### 1.1 MCP Server API (`api/v1/mcp_server.py`) - 54% → 85%
**Missing:** 112 lines
**Tests to Add:**
- `test_mcp_server_api.py` - Test all MCP endpoints
  - `GET /api/v1/mcp/tools` - List available tools
  - `POST /api/v1/mcp/call` - Call specific tools
  - Tool execution: `get_emergency_services`, `calculate_challan`, `geocode_address`
  - Error handling: invalid tool names, missing parameters
  - Authentication: JWT token validation

### 1.2 Live Tracking API (`api/v1/live_tracking.py`) - 51% → 85%
**Missing:** 50 lines
**Tests to Add:**
- `test_live_tracking_api.py` - Test tracking endpoints
  - `POST /api/v1/live-tracking/start` - Start tracking session
  - `PUT /api/v1/live-tracking/update` - Update location
  - `GET /api/v1/live-tracking/session/{id}` - Get session details
  - `DELETE /api/v1/live-tracking/session/{id}` - End session
  - Validation: invalid coordinates, expired sessions

### 1.3 Emergency API (`api/v1/emergency.py`) - 51% → 85%
**Missing:** 29 lines
**Tests to Add:**
- `test_emergency_api.py` - Test emergency endpoints
  - `GET /api/v1/emergency/nearby` - Find nearby services
  - `POST /api/v1/emergency/sos` - Trigger SOS
  - Validation: radius limits, coordinate bounds
  - Error handling: no services found, invalid input

### 1.4 User API (`api/v1/user.py`) - 51% → 85%
**Missing:** 19 lines
**Tests to Add:**
- `test_user_api.py` - Test user endpoints
  - `GET /api/v1/user/profile` - Get user profile
  - `PUT /api/v1/user/profile` - Update profile
  - Validation: required fields, data types

### 1.5 Waze Feed API (`api/v1/waze_feed.py`) - 51% → 85%
**Missing:** 29 lines
**Tests to Add:**
- `test_waze_feed_api.py` - Test Waze integration
  - `GET /api/v1/waze/alerts` - Get traffic alerts
  - `GET /api/v1/waze/jams` - Get traffic jams
  - Error handling: API failures, empty responses

---

## Priority 2: Service Layer Tests (Medium Impact, Medium Effort)
**Target: +200 lines covered**

### 2.1 Roadwatch Service (`services/roadwatch_service.py`) - 33% → 75%
**Missing:** 133 lines
**Tests to Add:**
- `test_roadwatch_service.py` - Already exists, needs expansion
  - Report submission flow
  - Report verification/rejection
  - Statistics calculation
  - Heatmap data generation
  - Trend analysis

### 2.2 Routing Service (`services/routing_service.py`) - 40% → 75%
**Missing:** 112 lines
**Tests to Add:**
- `test_routing_service.py` - Already exists, needs expansion
  - ORS integration testing
  - TomTom integration testing
  - OSRM fallback testing
  - Route caching behavior
  - Error handling for all providers

### 2.3 Geocoding Service (`services/geocoding_service.py`) - 62% → 85%
**Missing:** 53 lines
**Tests to Add:**
- `test_geocoding_service.py` - Expand existing tests
  - Photon API integration
  - BigDataCloud fallback
  - Nominatim fallback
  - Cache behavior
  - Error handling

### 2.4 Emergency Locator (`services/emergency_locator.py`) - 64% → 85%
**Missing:** 87 lines
**Tests to Add:**
- `test_emergency_locator.py` - Expand existing tests
  - Haversine distance calculation
  - Service filtering by type
  - Radius expansion logic
  - Cache behavior
  - Edge cases: no services, invalid coordinates

### 2.5 Challan Service (`services/challan_service.py`) - 73% → 90%
**Missing:** 48 lines
**Tests to Add:**
- `test_challan_service.py` - Expand existing tests
  - State-specific fine calculation
  - Vehicle type multipliers
  - Repeat offender logic
  - DuckDB integration
  - Edge cases: unknown violations, missing data

---

## Priority 3: Core Module Tests (Medium Impact, Low Effort)
**Target: +100 lines covered**

### 3.1 JWKS Client (`core/jwks.py`) - 32% → 85%
**Missing:** 75 lines
**Tests to Add:**
- `test_jwks.py` - Test JWKS functionality
  - Key fetching and caching
  - JWT verification with JWKS
  - Key rotation handling
  - Error handling: network failures, invalid keys
  - Cache invalidation

### 3.2 Redis Client (`core/redis_client.py`) - 52% → 85%
**Missing:** 58 lines
**Tests to Add:**
- `test_redis_client.py` - Test Redis operations
  - Connection pooling
  - Get/set operations
  - TTL handling
  - JSON serialization
  - Fallback to in-memory when Redis unavailable
  - Error handling: connection failures

### 3.3 Tenant Module (`core/tenant.py`) - 76% → 90%
**Missing:** 11 lines
**Tests to Add:**
- `test_tenant.py` - Already exists, needs minor expansion
  - Edge cases: missing org_id, empty tenant list
  - Query filtering with complex joins

---

## Priority 4: Utility Service Tests (Low Impact, Low Effort)
**Target: +179 lines covered**

### 4.1 Safe Routing (`services/safe_routing.py`) - 19% → 85%
**Missing:** 25 lines
**Tests to Add:**
- `test_safe_routing.py` - Test safe routing logic
  - Safety score calculation
  - Route filtering by safety threshold
  - Integration with routing service

### 4.2 Safe Spaces (`services/safe_spaces.py`) - 29% → 85%
**Missing:** 20 lines
**Tests to Add:**
- `test_safe_spaces.py` - Test safe spaces logic
  - Space discovery
  - Rating calculation
  - Filtering by type/rating

### 4.3 LLM Service (`services/llm_service.py`) - 69% → 90%
**Missing:** 15 lines
**Tests to Add:**
- `test_llm_service.py` - Expand existing tests
  - Provider fallback chain
  - Timeout handling
  - Error recovery

### 4.4 Local Emergency Catalog (`services/local_emergency_catalog.py`) - 71% → 90%
**Missing:** 41 lines
**Tests to Add:**
- `test_local_emergency_catalog.py` - Expand existing tests
  - Catalog loading
  - Search functionality
  - Filtering by location/type

---

## Implementation Timeline

### Week 1: API Route Tests (Priority 1)
- Day 1-2: MCP Server API tests
- Day 3: Live Tracking API tests
- Day 4: Emergency API tests
- Day 5: User + Waze Feed API tests

### Week 2: Service Layer Tests (Priority 2)
- Day 1-2: Roadwatch Service tests
- Day 3: Routing Service tests
- Day 4: Geocoding + Emergency Locator tests
- Day 5: Challan Service tests

### Week 3: Core + Utility Tests (Priority 3-4)
- Day 1-2: JWKS + Redis Client tests
- Day 3: Tenant module tests
- Day 4: Safe Routing + Safe Spaces tests
- Day 5: LLM + Local Emergency Catalog tests

### Week 4: Integration + Polish
- Day 1-2: Integration tests for full flows
- Day 3: Property-based tests for edge cases
- Day 4: Coverage analysis and gap filling
- Day 5: Final review and CI validation

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Overall Coverage | 79% | 90%+ |
| API Route Coverage | 50-60% | 85%+ |
| Service Layer Coverage | 40-70% | 85%+ |
| Core Module Coverage | 32-76% | 85%+ |
| Test Count | 215 | 350+ |
| CI Pass Rate | 100% | 100% |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| External API dependencies | High | Mock all external calls, use VCR for recording |
| Complex service interactions | Medium | Use dependency injection, isolate test units |
| Time-consuming test execution | Medium | Parallelize tests, use fixtures efficiently |
| Flaky tests | High | Add retry logic, stabilize async operations |

---

## Notes

- All new tests should follow existing patterns in `tests/`
- Use `pytest-asyncio` for async tests
- Mock external services with `unittest.mock`
- Add property-based tests with `hypothesis` for edge cases
- Maintain test isolation - no shared state between tests
- Update `requirements-dev.txt` if new test dependencies needed
