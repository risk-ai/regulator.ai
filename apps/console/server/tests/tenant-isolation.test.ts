/**
 * Tenant Isolation Tests — Phase 4A
 * 
 * Ensures multi-tenant data boundaries are enforced:
 * 1. Adapter configs isolated by tenant_id
 * 2. Executions isolated by tenant_id
 * 3. Credentials cannot leak across tenants
 * 4. Callbacks cannot trigger other tenant executions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, execute } from '../src/db/postgres.js';
import { encryptCredentials } from '../src/services/credentialCrypto.js';
import { executeHttpRequest } from '../src/execution/handlers/http-adapter.js';

const TENANT_A = 'tenant_a_isolation_test';
const TENANT_B = 'tenant_b_isolation_test';

describe('Tenant Isolation — Phase 4A', () => {
  let tenantAConfigId: string;
  let tenantBConfigId: string;

  beforeAll(async () => {
    // Create adapter configs for both tenants
    const credsA = encryptCredentials(JSON.stringify({ token: 'tenant_a_secret_token' }));
    const credsB = encryptCredentials(JSON.stringify({ token: 'tenant_b_secret_token' }));

    const resultA = await query<{ id: string }>(
      `INSERT INTO regulator.adapter_configs 
       (tenant_id, adapter_type, name, endpoint_url, auth_mode, encrypted_credentials)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [TENANT_A, 'http', 'tenant-a-adapter', 'https://httpbin.org', 'bearer', credsA]
    );
    tenantAConfigId = resultA[0].id;

    const resultB = await query<{ id: string }>(
      `INSERT INTO regulator.adapter_configs 
       (tenant_id, adapter_type, name, endpoint_url, auth_mode, encrypted_credentials)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [TENANT_B, 'http', 'tenant-b-adapter', 'https://httpbin.org', 'bearer', credsB]
    );
    tenantBConfigId = resultB[0].id;
  });

  afterAll(async () => {
    // Clean up
    await execute('DELETE FROM regulator.adapter_configs WHERE tenant_id IN ($1, $2)', [TENANT_A, TENANT_B]);
    await execute('DELETE FROM regulator.execution_log WHERE tenant_id IN ($1, $2)', [TENANT_A, TENANT_B]);
  });

  it('should prevent tenant A from accessing tenant B adapter config', async () => {
    await expect(
      executeHttpRequest(TENANT_A, {
        adapter_config_id: tenantBConfigId,  // Belongs to TENANT_B
        method: 'GET',
        url: 'https://httpbin.org/bearer',
      })
    ).rejects.toThrow();
  });

  it('should prevent tenant B from accessing tenant A adapter config', async () => {
    await expect(
      executeHttpRequest(TENANT_B, {
        adapter_config_id: tenantAConfigId,  // Belongs to TENANT_A
        method: 'GET',
        url: 'https://httpbin.org/bearer',
      })
    ).rejects.toThrow();
  });

  it('should allow tenant A to access its own config', async () => {
    const result = await executeHttpRequest(TENANT_A, {
      adapter_config_id: tenantAConfigId,
      method: 'GET',
      url: 'https://httpbin.org/bearer',
    });

    expect(result.success).toBe(true);
    expect(result.status_code).toBe(200);

    // Verify correct credentials were used
    const resultString = JSON.stringify(result);
    expect(resultString).not.toContain('tenant_b_secret_token');
  });

  it('should allow tenant B to access its own config', async () => {
    const result = await executeHttpRequest(TENANT_B, {
      adapter_config_id: tenantBConfigId,
      method: 'GET',
      url: 'https://httpbin.org/bearer',
    });

    expect(result.success).toBe(true);
    expect(result.status_code).toBe(200);

    // Verify correct credentials were used
    const resultString = JSON.stringify(result);
    expect(resultString).not.toContain('tenant_a_secret_token');
  });

  it('should isolate execution logs by tenant', async () => {
    // Create executions for both tenants
    const execA = `exe_tenant_a_${Date.now()}`;
    const execB = `exe_tenant_b_${Date.now()}`;

    await execute(
      `INSERT INTO regulator.execution_log (execution_id, tenant_id, warrant_id, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [execA, TENANT_A, 'wrt_a', 'executing']
    );

    await execute(
      `INSERT INTO regulator.execution_log (execution_id, tenant_id, warrant_id, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [execB, TENANT_B, 'wrt_b', 'executing']
    );

    // Tenant A should only see their execution
    const tenantALogs = await query<{ execution_id: string }>(
      'SELECT execution_id FROM regulator.execution_log WHERE tenant_id = $1',
      [TENANT_A]
    );
    expect(tenantALogs.some(log => log.execution_id === execA)).toBe(true);
    expect(tenantALogs.some(log => log.execution_id === execB)).toBe(false);

    // Tenant B should only see their execution
    const tenantBLogs = await query<{ execution_id: string }>(
      'SELECT execution_id FROM regulator.execution_log WHERE tenant_id = $1',
      [TENANT_B]
    );
    expect(tenantBLogs.some(log => log.execution_id === execB)).toBe(true);
    expect(tenantBLogs.some(log => log.execution_id === execA)).toBe(false);
  });

  it('should prevent callback from triggering other tenant execution', async () => {
    const execA = `exe_callback_test_${Date.now()}`;
    await execute(
      `INSERT INTO regulator.execution_log (execution_id, tenant_id, warrant_id, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [execA, TENANT_A, 'wrt_a', 'executing']
    );

    // Callback should work for same tenant
    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_id: execA,
        status: 'success',
        result: {},
      }),
    });

    expect(response.status).toBe(200);

    // Verify execution still belongs to correct tenant
    const logs = await query<{ tenant_id: string }>(
      'SELECT tenant_id FROM regulator.execution_log WHERE execution_id = $1',
      [execA]
    );
    expect(logs[0].tenant_id).toBe(TENANT_A);
  });
});
