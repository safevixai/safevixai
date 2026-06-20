import { check, sleep, group } from 'k6';
import http from 'k6/http';

const API_BASE = __ENV.API_BASE_URL || 'http://localhost:8000';
const CHATBOT_BASE = __ENV.CHATBOT_BASE_URL || 'http://localhost:8010';

export const options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p95<4000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  group('SOS flow', () => {
    const res = http.get(
      `${API_BASE}/api/v1/emergency/nearby?lat=12.9716&lon=77.5946&radius=1000`,
      { timeout: '10s', tags: { name: 'emergency_nearby' } }
    );
    check(res, { 'emergency nearby ok': (r) => r.status === 200 });
  });

  group('challan flow', () => {
    const violations = ['MVA_185', 'MVA_184', 'MVA_177'];
    for (const v of violations) {
      const res = http.post(`${API_BASE}/api/v1/challan/calculate`,
        JSON.stringify({ violation_code: v, state: 'KA', vehicle_type: 'car' }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'challan_calc' } }
      );
      check(res, { [`challan ${v} ok`]: (r) => r.status === 200 });
    }
  });

  group('chat flow', () => {
    const messages = [
      'what is the fine for jumping red light?',
      'nearest hospital to me',
      'how to treat burn injury?',
    ];
    for (const msg of messages) {
      const res = http.post(`${API_BASE}/api/v1/chat/`,
        JSON.stringify({ message: msg, session_id: `perf-${__VU}`, language: 'en' }),
        { headers: { 'Content-Type': 'application/json' }, timeout: '15s', tags: { name: 'chat' } }
      );
      check(res, { 'chat responds': (r) => r.status === 200 });
      sleep(0.5);
    }
  });

  sleep(2);
}
