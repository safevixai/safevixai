// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:8000';
const CHATBOT_BASE = __ENV.CHATBOT_BASE_URL || 'http://localhost:8010';

const errorRate = new Rate('errors');
const sosLatency = new Trend('sos_latency_ms');
const challanLatency = new Trend('challan_latency_ms');
const chatLatency = new Trend('chat_latency_ms');
const authLatency = new Trend('auth_latency_ms');
const sosSuccess = new Counter('sos_success_count');
const sosFailures = new Counter('sos_failure_count');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    sos_latency_ms: ['p95<2000', 'p99<5000'],
    challan_latency_ms: ['p95<1500', 'p99<3000'],
    chat_latency_ms: ['p95<5000', 'p99<10000'],
    auth_latency_ms: ['p95<2000', 'p99<4000'],
    http_req_duration: ['p95<3000'],
  },
};

export default function () {
  const scenarios = [
    () => testHealth(),
    () => testNearbyEmergency(),
    () => testChallan(),
    () => testChat(),
    () => testAuth(),
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(Math.random() * 2 + 0.5);
}

function testHealth() {
  group('health checks', () => {
    const backend = http.get(`${API_BASE}/health`);
    check(backend, {
      'backend health returns 200': (r) => r.status === 200,
    });
    errorRate.add(backend.status !== 200);

    const chatbot = http.get(`${CHATBOT_BASE}/health`);
    check(chatbot, {
      'chatbot health returns 200': (r) => r.status === 200,
    });
    errorRate.add(chatbot.status !== 200);
  });
}

function testNearbyEmergency() {
  group('nearby emergency', () => {
    const lat = 12.9716 + (Math.random() - 0.5) * 0.1;
    const lon = 77.5946 + (Math.random() - 0.5) * 0.1;
    const radius = [500, 1000, 2000][Math.floor(Math.random() * 3)];

    const res = http.get(
      `${API_BASE}/api/v1/emergency/nearby?lat=${lat}&lon=${lon}&radius=${radius}`,
      { timeout: '10s' }
    );

    const passed = check(res, {
      'emergency nearby returns 200': (r) => r.status === 200,
      'response has body': (r) => r.body.length > 0,
    });

    sosLatency.add(res.timings.duration);
    if (passed) {
      sosSuccess.add(1);
    } else {
      sosFailures.add(1);
    }
    errorRate.add(!passed);
  });
}

function testChallan() {
  group('challan calculation', () => {
    const violations = ['MVA_185', 'MVA_184', 'MVA_177', 'MVA_112', 'MVA_119'];
    const violation = violations[Math.floor(Math.random() * violations.length)];

    const payload = JSON.stringify({
      violation_code: violation,
      state: ['KA', 'TN', 'MH', 'DL', 'UP'][Math.floor(Math.random() * 5)],
      vehicle_type: ['car', 'bike', 'auto', 'bus', 'truck'][Math.floor(Math.random() * 5)],
      is_repeat_offense: Math.random() > 0.8,
    });

    const res = http.post(`${API_BASE}/api/v1/challan/calculate`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '5s',
    });

    const passed = check(res, {
      'challan returns 200': (r) => r.status === 200,
      'challan has fine amount': (r) => {
        try {
          return JSON.parse(r.body).total_fine > 0;
        } catch { return false; }
      },
    });

    challanLatency.add(res.timings.duration);
    errorRate.add(!passed);
  });
}

function testChat() {
  group('chat message', () => {
    const intents = [
      'what is the fine for drunk driving?',
      'how do I treat a cut wound?',
      'nearest hospital to MG Road Bangalore',
      'tell me about helmet rule in India',
      'what is the speed limit in city?',
    ];
    const message = intents[Math.floor(Math.random() * intents.length)];

    const payload = JSON.stringify({
      message,
      session_id: `load-test-${__VU}-${__ITER}`,
      language: 'en',
    });

    const res = http.post(`${API_BASE}/api/v1/chat/`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '15s',
    });

    const passed = check(res, {
      'chat returns 200': (r) => r.status === 200,
      'chat has response': (r) => {
        try {
          return JSON.parse(r.body).response && JSON.parse(r.body).response.length > 0;
        } catch { return false; }
      },
    });

    chatLatency.add(res.timings.duration);
    errorRate.add(!passed);
  });
}

function testAuth() {
  group('auth endpoints', () => {
    const endpoints = [
      { method: 'POST', url: `${API_BASE}/api/v1/auth/login`, body: { email: 'loadtest@safevixai.com', password: 'testpassword123' } },
      { method: 'POST', url: `${API_BASE}/api/v1/auth/signup`, body: { email: `user-${__VU}-${__ITER}@loadtest.com`, password: 'LoadTest123!', name: 'Load Test User' } },
      { method: 'GET', url: `${API_BASE}/api/v1/auth/session` },
    ];

    const ep = endpoints[Math.floor(Math.random() * endpoints.length)];

    let res;
    if (ep.method === 'POST') {
      res = http.post(ep.url, JSON.stringify(ep.body), {
        headers: { 'Content-Type': 'application/json' },
        timeout: '5s',
      });
    } else {
      res = http.get(ep.url, { timeout: '5s' });
    }

    const passed = check(res, {
      'auth endpoint responds': (r) => r.status < 500,
    });

    authLatency.add(res.timings.duration);
    errorRate.add(!passed);
  });
}
