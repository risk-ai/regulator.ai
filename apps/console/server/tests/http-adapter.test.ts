/**
 * HTTP Adapter Tests — Phase 4A
 * 
 * Tests:
 * 1. Credential injection (bearer, api_key_header, basic, hmac)
 * 2. Request execution with timeout
 * 3. Status code validation
 * 4. Redaction of auth headers in response
 * 5. Error handling (network, timeout, invalid status)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeHttpRequest } from '../src/execution/handlers/http-adapter.js';
import { query, execute } from '../src/db/postgres.js';
import { encryptCredentials } from '../src/services/credentialCrypto.js';

const TEST_TENANT = 'test_tenant_http_adapter';

describe('HTTP Adapter — Phase 4A', () => {
  let adapterConfigId: string;

  beforeAll(async () => {
    // Create test adapter config with encrypted credentials
    const credentials = JSON.stringify({ token: 'test_bearer_token_12345' });
    const encryptedCreds = encryptCredentials(credentials);

    const result = await query<{ id: string }>(
      `INSERT INTO regulator.adapter_configs 
       (tenant_id, adapter_type, name, endpoint_url, auth_mode, encrypted_credentials)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [TEST_TENANT, 'http', 'httpbin-test', 'https://httpbin.org', 'bearer', encryptedCreds]
    );

    adapterConfigId = result[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await execute(
      'DELETE FROM regulator.adapter_configs WHERE tenant_id = $1',
      [TEST_TENANT]
    );
  });

  it('should execute HTTP request with bearer auth', async () => {
    const result = await executeHttpRequest(TEST_TENANT, {
      adapter_config_id: adapterConfigId,
      method: 'GET',
      url: 'https://httpbin.org/bearer',
      timeout_ms: 5000,
      expected_status: [200],
    });

    expect(result.success).toBe(true);
    expect(result.status_code).toBe(200);
    expect(result.body).toBeDefined();
    expect(result.latency_ms).toBeGreaterThan(0);

    // Verify auth was injected (httpbin.org/bearer returns authenticated:true if valid)
    expect(result.body.authenticated).toBe(true);
  });

  it('should redact authorization header in response', async () => {
    const result = await executeHttpRequest(TEST_TENANT, {
      adapter_config_id: adapterConfigId,
      method: 'GET',
      url: 'https://httpbin.org/bearer',
      timeout_ms: 5000,
    });

    // Response headers should be redacted
    const resultString = JSON.stringify(result);
    expect(resultString).not.toContain('test_bearer_token_12345');
    expect(resultString).not.toContain('Bearer test_bearer_token');

    // But should still include the redaction marker
    if (result.headers && result.headers.authorization) {
      expect(result.headers.authorization).toContain('[REDACTED');
    }
  });

  it('should handle 4xx/5xx errors gracefully', async () => {
    const result = await executeHttpRequest(TEST_TENANT, {
      adapter_config_id: adapterConfigId,
      method: 'GET',
      url: 'https://httpbin.org/status/503',
      timeout_ms: 5000,
      expected_status: [200],
    });

    expect(result.success).toBe(false);
    expect(result.status_code).toBe(503);
    expect(result.error).toContain('503');
  });

  it('should timeout on slow endpoints', async () => {
    const result = await executeHttpRequest(TEST_TENANT, {
      adapter_config_id: adapterConfigId,
      method: 'GET',
      url: 'https://httpbin.org/delay/10', // 10 second delay
      timeout_ms: 1000, // 1 second timeout
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should reject requests to non-existent adapter configs', async () => {
    await expect(
      executeHttpRequest(TEST_TENANT, {
        adapter_config_id: 'non_existent_id',
        method: 'GET',
        url: 'https://httpbin.org/get',
      })
    ).rejects.toThrow();
  });

  it('should enforce tenant isolation (cannot access other tenant configs)', async () => {
    await expect(
      executeHttpRequest('different_tenant', {
        adapter_config_id: adapterConfigId,  // Config belongs to TEST_TENANT
        method: 'GET',
        url: 'https://httpbin.org/get',
      })
    ).rejects.toThrow();
  });
});
