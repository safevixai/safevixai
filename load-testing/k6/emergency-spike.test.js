// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import { check, sleep } from 'k6';
import http from 'k6/http';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:8000';
const CHATBOT_BASE = __ENV.CHATBOT_BASE_URL || 'http://localhost:8010';

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p95<5000'],
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const lat = 12.9716 + (Math.random() - 0.5) * 0.5;
  const lon = 77.5946 + (Math.random() - 0.5) * 0.5;

  const res = http.get(
    `${API_BASE}/api/v1/emergency/nearby?lat=${lat}&lon=${lon}&radius=1000`,
    { timeout: '10s' }
  );

  check(res, {
    'emergency endpoint status 200': (r) => r.status === 200,
  });

  sleep(1);
}
