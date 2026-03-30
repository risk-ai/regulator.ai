import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
  },
};

const BASE_URL = 'http://localhost:3100';

export default function () {
  // Test 1: Health endpoint (should be fast)
  let res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health: status is 200': (r) => r.status === 200,
    'health: response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  sleep(1);
  
  // Test 2: Public metrics endpoint
  res = http.get(`${BASE_URL}/metrics`);
  check(res, {
    'metrics: status is 200': (r) => r.status === 200,
    'metrics: has data': (r) => r.body.includes('vienna_'),
  });
  
  sleep(1);
  
  // Test 3: Policy templates (API)
  res = http.get(`${BASE_URL}/api/v1/policy-templates`);
  check(res, {
    'policy-templates: status is 200': (r) => r.status === 200,
    'policy-templates: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(1);
  
  // Test 4: Agent templates (API)
  res = http.get(`${BASE_URL}/api/v1/agent-templates`);
  check(res, {
    'agent-templates: status is 200': (r) => r.status === 200,
    'agent-templates: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(2);
}
