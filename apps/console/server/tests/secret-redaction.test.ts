/**
 * Secret Redaction Tests — Phase 4A
 * 
 * Verifies that no secrets leak through any persistence path.
 */

import { redactSecrets, findLeakedSecrets, ResolvedSecretMap } from '../src/services/secretRedaction.js';

describe('redactSecrets', () => {
  const secrets: ResolvedSecretMap = {
    'sk-live-abc123def456': 'config-001',
    'my-api-key-value': 'config-002',
  };

  // ---- Key-based redaction ----

  test('redacts authorization header', () => {
    const input = { authorization: 'Bearer sk-live-abc123def456' };
    const result = redactSecrets(input, secrets);
    expect(result.authorization).toBe('[REDACTED:authorization]');
  });

  test('redacts x-api-key header', () => {
    const input = { 'x-api-key': 'my-api-key-value' };
    const result = redactSecrets(input, secrets);
    expect(result['x-api-key']).toBe('[REDACTED:x-api-key]');
  });

  test('redacts token field', () => {
    const input = { token: 'secret-value' };
    const result = redactSecrets(input, secrets);
    expect(result.token).toBe('[REDACTED:token]');
  });

  test('redacts password field', () => {
    const input = { password: 'hunter2' };
    const result = redactSecrets(input, secrets);
    expect(result.password).toBe('[REDACTED:password]');
  });

  test('redacts api_key field', () => {
    const input = { api_key: 'key123' };
    const result = redactSecrets(input, secrets);
    expect(result.api_key).toBe('[REDACTED:api_key]');
  });

  test('redacts nested sensitive keys', () => {
    const input = {
      request: {
        headers: {
          authorization: 'Bearer xyz',
          'content-type': 'application/json',
        },
      },
    };
    const result = redactSecrets(input, secrets);
    expect(result.request.headers.authorization).toBe('[REDACTED:authorization]');
    expect(result.request.headers['content-type']).toBe('application/json');
  });

  // ---- Value-based redaction ----

  test('redacts known secret values by exact match', () => {
    const input = {
      some_field: 'sk-live-abc123def456',
      other_field: 'not-a-secret',
    };
    const result = redactSecrets(input, secrets);
    expect(result.some_field).toBe('[REDACTED:credential:config-001]');
    expect(result.other_field).toBe('not-a-secret');
  });

  test('redacts secret values in arrays', () => {
    const input = {
      items: ['safe', 'sk-live-abc123def456', 'also-safe'],
    };
    const result = redactSecrets(input, secrets);
    expect(result.items[0]).toBe('safe');
    expect(result.items[1]).toBe('[REDACTED:credential:config-001]');
    expect(result.items[2]).toBe('also-safe');
  });

  test('redacts Bearer token patterns', () => {
    const input = { value: 'Bearer sk-unknown-token-123' };
    const result = redactSecrets(input);
    expect(result.value).toBe('[REDACTED:value]');
  });

  test('redacts Stripe key patterns', () => {
    const input = { key: 'sk_live_1234567890abcdefghij' };
    const result = redactSecrets(input);
    expect(result.key).toBe('[REDACTED:value]');
  });

  test('redacts GitHub PAT patterns', () => {
    const input = { tok: 'ghp_abcdefghijklmnopqrstuvwxyz' };
    const result = redactSecrets(input);
    expect(result.tok).toBe('[REDACTED:value]');
  });

  test('redacts Slack token patterns', () => {
    const input = { tok: 'xoxb-123456-abcdef-ghijkl' };
    const result = redactSecrets(input);
    expect(result.tok).toBe('[REDACTED:value]');
  });

  // ---- Safety ----

  test('does not mutate input', () => {
    const input = { authorization: 'Bearer token123', safe: 'value' };
    const original = JSON.stringify(input);
    redactSecrets(input, secrets);
    expect(JSON.stringify(input)).toBe(original);
  });

  test('handles null and undefined', () => {
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
  });

  test('handles primitive values', () => {
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(true)).toBe(true);
    expect(redactSecrets('safe-string')).toBe('safe-string');
  });

  test('handles deeply nested objects', () => {
    const deep: any = { a: { b: { c: { d: { e: { token: 'secret' } } } } } };
    const result = redactSecrets(deep, secrets);
    expect(result.a.b.c.d.e.token).toBe('[REDACTED:token]');
  });

  test('handles circular references gracefully', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = redactSecrets(obj);
    expect(result.a).toBe(1);
    expect(result.self).toBe('[REDACTED:circular]');
  });

  test('preserves non-sensitive fields', () => {
    const input = {
      status: 200,
      body: { message: 'ok', count: 5 },
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret',
      },
    };
    const result = redactSecrets(input, secrets);
    expect(result.status).toBe(200);
    expect(result.body.message).toBe('ok');
    expect(result.body.count).toBe(5);
    expect(result.headers['content-type']).toBe('application/json');
    expect(result.headers.authorization).toBe('[REDACTED:authorization]');
  });

  // ---- Simulated persistence paths ----

  test('execution_log.steps result is clean after redaction', () => {
    const executionLog = {
      steps: [{
        name: 'http-call',
        result: {
          success: true,
          status_code: 200,
          headers: {
            authorization: 'Bearer sk-live-abc123def456',
            'content-type': 'application/json',
          },
          body: { data: 'response', token_echo: 'sk-live-abc123def456' },
        },
      }],
    };
    const result = redactSecrets(executionLog, secrets);
    const leaks = findLeakedSecrets(result, secrets);
    expect(leaks).toEqual([]);
  });

  test('execution timeline is clean after redaction', () => {
    const timeline = [
      { state: 'executing', detail: 'Calling https://api.example.com with Bearer sk-live-abc123def456' },
      { state: 'complete', detail: 'Success' },
    ];
    const result = redactSecrets(timeline, secrets);
    const leaks = findLeakedSecrets(result, secrets);
    expect(leaks).toEqual([]);
  });

  test('audit_log.details is clean after redaction', () => {
    const auditEntry = {
      event: 'execution.step.completed',
      details: {
        adapter_config_id: 'config-001',
        request: {
          url: 'https://api.example.com/v1/test',
          headers: { authorization: 'Bearer sk-live-abc123def456' },
          body: { data: 'test' },
        },
        response: {
          status: 200,
          body: { ok: true },
        },
      },
    };
    const result = redactSecrets(auditEntry, secrets);
    const leaks = findLeakedSecrets(result, secrets);
    expect(leaks).toEqual([]);
  });
});

describe('findLeakedSecrets', () => {
  const secrets: ResolvedSecretMap = {
    'my-secret-123': 'config-001',
  };

  test('detects leaked secret values', () => {
    const obj = { data: { nested: 'my-secret-123' } };
    const leaks = findLeakedSecrets(obj, secrets);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks[0]).toContain('config-001');
  });

  test('detects unredacted sensitive keys', () => {
    const obj = { authorization: 'Bearer token' };
    const leaks = findLeakedSecrets(obj);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks[0]).toContain('authorization');
  });

  test('returns empty for clean objects', () => {
    const obj = {
      status: 200,
      authorization: '[REDACTED:authorization]',
      data: { message: 'ok' },
    };
    const leaks = findLeakedSecrets(obj, secrets);
    expect(leaks).toEqual([]);
  });
});
