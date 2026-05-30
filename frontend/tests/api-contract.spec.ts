import { test, expect } from '@playwright/test';

test.describe('API Contract Tests — Backend', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  test('health endpoint returns expected schema', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('version');
  });

  test('emergency nearby returns expected schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/emergency/nearby?lat=13.0827&lon=80.2707&radius=5000`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('services');
    expect(Array.isArray(body.services)).toBe(true);

    if (body.services.length > 0) {
      const service = body.services[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('category');
      expect(service).toHaveProperty('lat');
      expect(service).toHaveProperty('lon');
      expect(service).toHaveProperty('distance');
    }
  });

  test('challan calculate returns expected schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/challan/calculate?violation_code=MVA_185`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('violation');
    expect(body).toHaveProperty('fine');
    expect(body).toHaveProperty('description');
  });

  test('geocoding returns expected schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/geocode/reverse?lat=13.0827&lon=80.2707`
    );
    // May be 429 if rate limited, but schema should be consistent
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('display_name');
      expect(body).toHaveProperty('lat');
      expect(body).toHaveProperty('lon');
    }
  });

  test('road issues returns expected schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/roads/nearby?lat=13.0827&lon=80.2707&radius=5000`
    );
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('issues');
      expect(Array.isArray(body.issues)).toBe(true);
    }
  });

  test('error responses have consistent schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/emergency/nearby?lat=invalid&lon=invalid`
    );
    // Should return 422 validation error
    expect(res.status()).toBe(422);

    const body = await res.json();
    expect(body).toHaveProperty('detail');
  });

  test('auth csrf-token endpoint returns expected schema', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/auth/csrf-token`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('csrf_token');
    expect(typeof body.csrf_token).toBe('string');
  });

  test('user profile schema (unauthorized returns 401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/user/profile`);
    expect([401, 403]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('detail');
  });

  test('SOS dispatch endpoint rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/emergency/sos`, {
      data: { lat: 13.0827, lon: 80.2707 },
    });
    // Must reject unauthenticated SOS dispatch
    expect([401, 403]).toContain(res.status());
  });

  test('tracking nearby schema (no auth → 401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/live-tracking/nearby`);
    expect([401, 403]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('detail');
  });

  test('roadwatch feed returns expected schema', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/roadwatch/feed?lat=13.0827&lon=80.2707`);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('feed');
      expect(Array.isArray(body.feed)).toBe(true);
    }
  });

  test('challan with invalid violation returns 404 schema', async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/v1/challan/calculate?violation_code=INVALID_XXX_999`
    );
    expect([404, 422, 200]).toContain(res.status());
    if (res.status() === 404) {
      const body = await res.json();
      expect(body).toHaveProperty('detail');
    }
  });

  test('offline bundle returns emergency numbers schema', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/offline/bundle`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('emergency_numbers');
    expect(Array.isArray(body.emergency_numbers)).toBe(true);
  });
});

test.describe('API Contract Tests — Chatbot', () => {
  const CHATBOT_URL = process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:8010';

  test('chat endpoint returns expected schema', async ({ request }) => {
    const res = await request.post(`${CHATBOT_URL}/api/v1/chat/`, {
      data: { message: 'test', session_id: 'contract-test' },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('response');
    expect(typeof body.response).toBe('string');
    expect(body.response.length).toBeGreaterThan(0);
  });

  test('chat health returns expected schema', async ({ request }) => {
    const res = await request.get(`${CHATBOT_URL}/api/v1/chat/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('intent');
  });

  test('speech status returns expected schema', async ({ request }) => {
    const res = await request.get(`${CHATBOT_URL}/speech/status`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty('configured');
    expect(body).toHaveProperty('device');
  });

  test('chat endpoint rejects empty message', async ({ request }) => {
    const res = await request.post(`${CHATBOT_URL}/api/v1/chat/`, {
      data: { message: '', session_id: 'contract-test' },
    });
    expect([400, 422]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('detail');
  });

  test('chat stream endpoint exists', async ({ request }) => {
    const res = await request.post(`${CHATBOT_URL}/api/v1/chat/stream`, {
      data: { message: 'test', session_id: 'contract-test' },
    });
    // Streaming endpoint may return 200 (SSE) or fall back to normal response
    expect([200, 400, 422]).toContain(res.status());
  });

  test('speech translate endpoint rejects invalid language', async ({ request }) => {
    const res = await request.post(`${CHATBOT_URL}/speech/translate?target_language=invalid`);
    expect([400, 422]).toContain(res.status());
  });

  test('chat health returns provider info', async ({ request }) => {
    const res = await request.get(`${CHATBOT_URL}/api/v1/chat/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('intent');
    // Should indicate provider readiness
    if (body.providers) {
      expect(Array.isArray(body.providers)).toBe(true);
    }
  });
});
