export const K6_OPTIONS = {
  cloud: {
    name: 'SafeVixAI Load Test',
    projectID: __ENV.K6_CLOUD_PROJECT_ID || '',
  },
};

export const CI_THRESHOLDS = {
  http_req_duration: ['p95<3000'],
  http_req_failed: ['rate<0.01'],
  errors: ['rate<0.05'],
};
