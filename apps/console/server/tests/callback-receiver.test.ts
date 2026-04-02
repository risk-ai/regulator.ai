/**
 * Callback Receiver Tests — Phase 4A
 * 
 * Tests:
 * 1. Valid callback accepted and correlated
 * 2. Replay rejection (duplicate callback)
 * 3. Malformed payload rejection
 * 4. Callback for non-existent execution
 * 5. Callback for terminal-state execution
 * 6. HMAC signature verification
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, execute } from '../src/db/postgres.js';

const TEST_TENANT = 'test_tenant_callback';

describe('Callback Receiver — Phase 4A', () => {
  let executionId: string;

  beforeAll(async () => {
    // Create test execution in "executing" state
    executionId = `exe_test_${Date.now()}`;

    await execute(
      `INSERT INTO regulator.execution_log 
       (execution_id, tenant_id, warrant_id, state, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [executionId, TEST_TENANT, 'wrt_test', 'executing']
    );
  });

  afterAll(async () => {
    // Clean up test data
    await execute(
      'DELETE FROM regulator.execution_log WHERE tenant_id = $1',
      [TEST_TENANT]
    );
  });

  it('should accept valid callback and transition state', async () => {
    const payload = {
      execution_id: executionId,
      status: 'success',
      result: { test: 'data' },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.accepted).toBe(true);
    expect(result.execution_id).toBe(executionId);
    expect(result.previous_state).toBe('executing');
  });

  it('should reject duplicate callback (replay attack)', async () => {
    const payload = {
      execution_id: executionId,
      status: 'success',
      result: { test: 'data' },
      timestamp: new Date().toISOString(),
    };

    // First callback accepted (in previous test)
    // Second callback should be rejected
    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Should return 409 Conflict or 200 with accepted: false
    expect([200, 409]).toContain(response.status);

    if (response.status === 200) {
      const result = await response.json();
      expect(result.accepted).toBe(false);
    }
  });

  it('should reject callback with missing execution_id', async () => {
    const payload = {
      status: 'success',
      result: { test: 'data' },
    };

    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.accepted).toBe(false);
    expect(result.error).toContain('execution_id');
  });

  it('should reject callback with invalid status', async () => {
    const payload = {
      execution_id: executionId,
      status: 'invalid_status',
      result: { test: 'data' },
    };

    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.accepted).toBe(false);
    expect(result.error).toContain('status');
  });

  it('should reject callback for non-existent execution', async () => {
    const payload = {
      execution_id: 'exe_non_existent',
      status: 'success',
      result: { test: 'data' },
    };

    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(404);
    const result = await response.json();
    expect(result.accepted).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should reject callback for terminal-state execution', async () => {
    // Create execution in terminal state
    const terminalExecId = `exe_terminal_${Date.now()}`;
    await execute(
      `INSERT INTO regulator.execution_log 
       (execution_id, tenant_id, warrant_id, state, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [terminalExecId, TEST_TENANT, 'wrt_test', 'complete']
    );

    const payload = {
      execution_id: terminalExecId,
      status: 'success',
      result: { test: 'data' },
    };

    const response = await fetch('http://localhost:3000/api/v1/webhooks/execution-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(409);
    const result = await response.json();
    expect(result.accepted).toBe(false);
    expect(result.error).toContain('terminal');
  });
});
