import http from 'k6/http';
import { check, sleep } from 'k6';

// Aggressive stress test for launch day (simulating HN/PH traffic spike)
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Quick ramp to 50 users
    { duration: '1m', target: 200 },    // Spike to 200 users (HN frontpage)
    { duration: '2m', target: 500 },    // Peak traffic (500 concurrent)
    { duration: '1m', target: 200 },    // Cool down
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% under 1s (acceptable for spike)
    http_req_failed: ['rate<0.05'],     // Less than 5% errors
  },
};

const BASE_URL = 'http://localhost:3100';

export default function () {
  // Test 1: Health check (public, no auth)
  let res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health: 200 OK': (r) => r.status === 200,
    'health: < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(0.5);
  
  // Test 2: Protected endpoint (should return 401)
  res = http.get(`${BASE_URL}/api/v1/agents`);
  check(res, {
    'agents: 401 unauthorized': (r) => r.status === 401,
    'agents: has error code': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.code === 'UNAUTHORIZED';
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 3: Auth register endpoint (should return error for missing data, not 500)
  res = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'register: not 500': (r) => r.status !== 500,
    'register: has response': (r) => r.body.length > 0,
  });
  
  sleep(0.5);
  
  // Test 4: Policy templates (public templates, should work)
  res = http.get(`${BASE_URL}/api/v1/policy-templates`);
  check(res, {
    'policy-templates: not 500': (r) => r.status !== 500,
    'policy-templates: has response': (r) => r.body.length > 0,
  });
  
  sleep(1);
}
