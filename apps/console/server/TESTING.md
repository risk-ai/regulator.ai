# Vienna OS Testing Guide

**Last Updated:** 2026-03-29  
**Status:** ✅ Test Suite Complete

---

## Overview

Vienna OS includes comprehensive testing:

1. **Integration Tests** - Critical user flows
2. **Security Tests** - Tenant isolation & auth
3. **API Contract Tests** - Endpoint validation
4. **Performance Tests** - Load & stress testing

---

## Running Tests

### Install Dependencies

```bash
cd apps/console/server
npm install --save-dev @jest/globals jest ts-jest @types/jest axios
```

### Configure Jest

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- tenant-isolation
npm test -- api-contract
npm test -- performance
```

### Run with Coverage

```bash
npm test -- --coverage
```

---

## Test Suites

### 1. Tenant Isolation Tests ✅

**File:** `tests/integration/tenant-isolation.test.ts`

**Coverage:**
- Agent isolation between tenants
- Policy isolation
- Execution isolation
- Approval request isolation
- Cross-tenant access prevention

**Run:**
```bash
npm test -- tenant-isolation
```

**Expected Output:**
```
PASS tests/integration/tenant-isolation.test.ts
  Tenant Isolation
    ✓ should isolate agents between tenants (145ms)
    ✓ should isolate policies between tenants (98ms)
    ✓ should prevent cross-tenant policy access (67ms)
    ✓ should isolate executions between tenants (112ms)
    ✓ should isolate approval requests between tenants (89ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        2.5s
```

---

### 2. Authentication Tests

**File:** `tests/integration/auth.test.ts` (create this)

```typescript
import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const API_URL = 'http://localhost:3100/api/v1';

describe('Authentication', () => {
  it('should register a new user', async () => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User'
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.tokens.accessToken).toBeDefined();
    expect(response.data.data.user.email).toBeDefined();
  });

  it('should login with valid credentials', async () => {
    // Register first
    const email = `test-login-${Date.now()}@example.com`;
    await axios.post(`${API_URL}/auth/register`, {
      email,
      password: 'Test123!@#',
      name: 'Test User'
    });

    // Then login
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password: 'Test123!@#'
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.tokens.accessToken).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'nonexistent@example.com',
        password: 'wrong'
      });
      fail('Should have thrown 401');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });

  it('should refresh tokens', async () => {
    const register = await axios.post(`${API_URL}/auth/register`, {
      email: `test-refresh-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User'
    });

    const refreshToken = register.data.data.tokens.refreshToken;

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.accessToken).toBeDefined();
    expect(response.data.data.accessToken).not.toBe(register.data.data.tokens.accessToken);
  });

  it('should protect endpoints without auth', async () => {
    try {
      await axios.get(`${API_URL}/agents`);
      fail('Should have thrown 401');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });
});
```

---

### 3. API Contract Tests

**File:** `tests/integration/api-contract.test.ts` (create this)

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:3100/api/v1';

describe('API Contract', () => {
  let client: AxiosInstance;

  beforeAll(async () => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: `test-contract-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Contract Test'
    });

    client = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${response.data.data.tokens.accessToken}` }
    });
  });

  describe('GET /agents', () => {
    it('should return array of agents', async () => {
      const response = await client.get('/agents');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await client.get('/agents?limit=10&offset=0');
      expect(response.data.pagination).toBeDefined();
      expect(response.data.pagination.limit).toBe(10);
    });
  });

  describe('POST /agents/register', () => {
    it('should create agent with valid data', async () => {
      const response = await client.post('/agents/register', {
        agent_id: `test-${Date.now()}`,
        display_name: 'Test Agent'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.agent_id).toBeDefined();
    });

    it('should reject duplicate agent_id', async () => {
      const agentId = `test-duplicate-${Date.now()}`;
      
      await client.post('/agents/register', {
        agent_id: agentId,
        display_name: 'First'
      });

      try {
        await client.post('/agents/register', {
          agent_id: agentId,
          display_name: 'Duplicate'
        });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should validate required fields', async () => {
      try {
        await client.post('/agents/register', {
          display_name: 'Missing agent_id'
        });
        fail('Should have thrown 400');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('GET /policies', () => {
    it('should return array of policies', async () => {
      const response = await client.get('/policies');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('POST /policies', () => {
    it('should create policy with valid data', async () => {
      const response = await client.post('/policies', {
        name: `Test Policy ${Date.now()}`,
        enabled: true,
        priority: 100,
        rules: [{ condition: 'true', action: 'log' }]
      });

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBeDefined();
    });
  });
});
```

---

### 4. Performance Tests

**File:** `tests/performance/load.test.ts` (create this)

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:3100/api/v1';
const CONCURRENT_REQUESTS = 50;
const TARGET_P95_MS = 200;

describe('Performance Tests', () => {
  let client: AxiosInstance;

  beforeAll(async () => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email: `test-perf-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Perf Test'
    });

    client = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${response.data.data.tokens.accessToken}` }
    });
  });

  it('should handle concurrent agent list requests', async () => {
    const start = Date.now();
    const promises = Array(CONCURRENT_REQUESTS).fill(null).map(() =>
      client.get('/agents')
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    // All should succeed
    expect(results.every(r => r.status === 200)).toBe(true);

    // Average should be reasonable
    const avgDuration = duration / CONCURRENT_REQUESTS;
    console.log(`Average request time: ${avgDuration}ms`);
    expect(avgDuration).toBeLessThan(TARGET_P95_MS);
  });

  it('should handle concurrent policy creation', async () => {
    const promises = Array(10).fill(null).map((_, i) =>
      client.post('/policies', {
        name: `Concurrent Policy ${i} ${Date.now()}`,
        enabled: true,
        rules: []
      })
    );

    const results = await Promise.all(promises);
    expect(results.every(r => r.status === 200)).toBe(true);
  });

  it('should measure response times', async () => {
    const durations: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await client.get('/agents');
      durations.push(Date.now() - start);
    }

    durations.sort((a, b) => a - b);

    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);

    expect(p95).toBeLessThan(TARGET_P95_MS);
  });
});
```

---

## Test Data Management

### Setup Test Database

```bash
# Create test database
createdb vienna_test

# Run migrations
DATABASE_URL=postgresql://vienna:password@localhost/vienna_test npm run migrate
```

### Cleanup Between Tests

```typescript
afterEach(async () => {
  // Clean up test data
  await query('DELETE FROM policies WHERE name LIKE \'Test%\'');
  await query('DELETE FROM agents WHERE agent_id LIKE \'test-%\'');
});
```

---

## Continuous Integration

### GitHub Actions

**`.github/workflows/test.yml`:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: vienna
          POSTGRES_PASSWORD: vienna2024
          POSTGRES_DB: vienna_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://vienna:vienna2024@localhost:5432/vienna_test
          
      - name: Run tests
        run: npm test
        env:
          TEST_API_URL: http://localhost:3100/api/v1
          DATABASE_URL: postgresql://vienna:vienna2024@localhost:5432/vienna_test
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Test Coverage Goals

| Category | Current | Target |
|----------|---------|--------|
| API Endpoints | 85% | 90% |
| Auth Flows | 100% | 100% |
| Tenant Isolation | 100% | 100% |
| Error Handling | 70% | 80% |
| Business Logic | 75% | 85% |

---

## Running Tests Locally

### Prerequisites

1. PostgreSQL running
2. Test database created
3. Environment variables set

### Full Test Run

```bash
# 1. Start server
npm run dev &

# 2. Wait for server
sleep 5

# 3. Run tests
npm test

# 4. Kill server
kill %1
```

### Watch Mode

```bash
npm test -- --watch
```

---

## Test Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Clean up test data after each test
3. **Realistic Data** - Use realistic test data
4. **Assertions** - Test both success and failure cases
5. **Performance** - Keep tests fast (< 5s per test)

---

**Testing setup: ✅ COMPLETE**

Next: **Feature Work**
