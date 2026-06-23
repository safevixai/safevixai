// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:8000';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ['p95<500'],
  },
};

export default function () {
  const endpoints = [
    `${API_BASE}/health`,
    `${API_BASE}/api/v1/emergency/nearby?lat=12.9716&lon=77.5946&radius=500`,
    `${API_BASE}/api/v1/challan/calculate`,
    `${API_BASE}/api/v1/auth/session`,
    `${API_BASE}/api/v1/roadwatch/nearby?lat=12.9716&lon=77.5946&radius=1000`,
  ];

  let allPassed = true;

  for (const url of endpoints) {
    let res;

    if (url.includes('/challan/calculate') && !url.includes('?')) {
      res = http.post(url, JSON.stringify({
        violation_code: 'MVA_185',
        state: 'KA',
        vehicle_type: 'car',
      }), { headers: { 'Content-Type': 'application/json' } });
    } else {
      res = http.get(url);
    }

    const passed = check(res, {
      [`GET ${url} returns < 500`]: (r) => r.status < 500,
    });

    if (!passed) {
      console.error(`FAILED: ${url} returned ${res.status}`);
      allPassed = false;
    }

    sleep(0.1);
  }

  if (!allPassed) {
    throw new Error('Smoke test failed — one or more endpoints returned errors');
  }
}
