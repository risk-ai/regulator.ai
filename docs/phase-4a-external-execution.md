# Phase 4A: Credentialed External Execution

**Status:** Implementation  
**Author:** Aiden (COO, ai.ventures)  
**Date:** 2026-04-02  
**Scope:** Minimum viable external execution path — credential vault, HTTP adapter, callback receiver

---

## Overview

Vienna OS has a working execution kernel: intent → plan → approve → execute → verify → attest. But execution is currently filesystem-bound. Phase 4A completes the missing path to real-world external execution.

**Goal:** Vienna can execute a managed action against a real HTTP endpoint, complete a delegated execution through a callback, and never leak credentials.

## Non-Goals

- Fancy credential management UI
- Rotation automation
- Multi-provider vault abstraction (HashiCorp, AWS KMS, etc.)
- Generic SDK/connector layer
- Retry strategies beyond simple timeout
- New adapter families beyond HTTP
- Any UI work

---

## 1. Credential Store

### Schema

The `regulator.adapter_configs` table already exists with an `encrypted_credentials` column. We extend it minimally:

```sql
-- No new table needed. Existing adapter_configs schema:
-- id, tenant_id, adapter_type, name, endpoint_url, headers, auth_type, 
-- encrypted_credentials, enabled, created_at, updated_at

-- Add: credential_alias for human-readable reference
ALTER TABLE regulator.adapter_configs 
  ADD COLUMN IF NOT EXISTS credential_alias VARCHAR(128),
  ADD COLUMN IF NOT EXISTS auth_mode VARCHAR(32) DEFAULT 'bearer',
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- Add unique constraint on tenant + alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_adapter_configs_tenant_alias 
  ON regulator.adapter_configs(tenant_id, credential_alias) 
  WHERE credential_alias IS NOT NULL;
```

### Auth Modes

| `auth_mode` | Behavior |
|---|---|
| `bearer` | `Authorization: Bearer <token>` |
| `api_key_header` | Custom header with API key (header name from config) |
| `basic` | `Authorization: Basic base64(user:pass)` |
| `hmac` | HMAC-SHA256 signature of request body |

### Encryption Model

- Algorithm: AES-256-GCM
- Key derivation: `VIENNA_CREDENTIAL_KEY` env var (32-byte hex or base64)
- Each credential gets a unique 12-byte IV, stored alongside ciphertext
- Auth tag (16 bytes) appended to ciphertext
- Storage format in `encrypted_credentials`: `iv:ciphertext:authTag` (all base64)
- Key is **never** logged, persisted to DB, or included in any API response

```
encrypt(plaintext, key) → base64(iv) + ':' + base64(ciphertext+authTag)
decrypt(stored, key)    → plaintext (in memory only)
```

### Service Methods

```typescript
interface CredentialService {
  create(tenantId: string, config: AdapterConfigInput): Promise<AdapterConfig>;
  get(tenantId: string, id: string): Promise<AdapterConfigRedacted>;      // never returns raw secret
  getByAlias(tenantId: string, alias: string): Promise<AdapterConfigRedacted>;
  resolve(tenantId: string, id: string): Promise<ResolvedCredentials>;    // returns decrypted — executor only
  rotate(tenantId: string, id: string, newCredentials: string): Promise<void>;
  disable(tenantId: string, id: string, reason: string): Promise<void>;
  list(tenantId: string): Promise<AdapterConfigRedacted[]>;
}
```

`resolve()` is the only method that ever returns plaintext credentials. It is called exclusively by the execution adapter layer, never by API routes.

---

## 2. Credential Injection Layer

### Resolution Flow

```
execution_step.adapter_config_id → adapter_configs row → decrypt(encrypted_credentials) → inject into request
```

### Contract

1. Step config references credential by `adapter_config_id` or `credential_alias`
2. At execution time, executor calls `credentialService.resolve(tenantId, id)`
3. Resolved secret material exists only in memory, only for the duration of the HTTP call
4. After the call completes, the secret reference is dereferenced (GC-eligible)

### What Gets Persisted (execution_log, execution_steps, timeline)

- ✅ `adapter_config_id` (reference only)
- ✅ `credential_alias` (human label)
- ✅ `auth_mode` (bearer, api_key_header, etc.)
- ✅ HTTP status code, response body (if non-sensitive)
- ❌ **NEVER:** raw token, password, API key, authorization header value, HMAC secret

---

## 3. Redaction Policy

### Hard Rules

Redaction is applied **before** any persistence call. Not after. Not as cleanup.

1. `execution_log.steps[].result` — redact any field matching sensitive patterns
2. `execution_log.timeline[]` — no secret material in detail/state fields
3. `execution_log.result` — redact response headers containing auth tokens
4. `execution_steps.result` — redact adapter response if it echoes credentials
5. `execution_ledger_events.payload_json` — redact before insert
6. `audit_log.details` — redact before insert

### Sensitive Patterns (redact these values)

- Any key matching: `authorization`, `token`, `secret`, `password`, `api_key`, `apikey`, `credential`, `bearer`, `x-api-key`
- Any value that matches the encrypted credential's plaintext (exact match check against resolved value)
- HTTP `Authorization` header value in response echo

### Redaction Format

```
"authorization": "[REDACTED:credential:abc123]"
```

Where `abc123` is the adapter_config_id (for audit traceability without secret exposure).

### Implementation

A `redactSecrets(obj, resolvedSecrets)` function that:
1. Deep-walks any object
2. Replaces values matching sensitive key patterns with `[REDACTED:key_name]`
3. Replaces any value that exactly matches a known resolved secret with `[REDACTED:credential:<config_id>]`
4. Returns a new object (no mutation)

This function is called at every persistence boundary:
- Before `INSERT INTO execution_log`
- Before `INSERT INTO execution_steps`
- Before `INSERT INTO execution_ledger_events`
- Before `INSERT INTO audit_log`

---

## 4. HTTP Adapter Contract

### Request

```typescript
interface HttpAdapterRequest {
  adapter_config_id: string;         // references adapter_configs
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;                       // may contain template vars from step params
  headers?: Record<string, string>;  // non-auth headers
  body?: any;                        // JSON body
  timeout_ms?: number;               // default: 30000, max: 120000
  expected_status?: number[];        // default: [200, 201, 202, 204]
}
```

### Response (persisted after redaction)

```typescript
interface HttpAdapterResponse {
  success: boolean;
  status_code: number;
  headers: Record<string, string>;   // redacted
  body: any;                         // response body (redacted if echoes secrets)
  latency_ms: number;
  error?: string;                    // timeout, connection refused, etc.
  adapter_config_id: string;         // for traceability
  auth_mode: string;                 // what auth was used
}
```

### Auth Injection (in-memory only)

```typescript
function injectAuth(request: HttpRequest, credentials: ResolvedCredentials, authMode: string): HttpRequest {
  switch (authMode) {
    case 'bearer':
      request.headers['Authorization'] = `Bearer ${credentials.token}`;
      break;
    case 'api_key_header':
      request.headers[credentials.header_name] = credentials.api_key;
      break;
    case 'basic':
      request.headers['Authorization'] = `Basic ${btoa(credentials.username + ':' + credentials.password)}`;
      break;
    case 'hmac':
      const sig = hmacSign(request.body, credentials.secret);
      request.headers['X-Signature'] = sig;
      break;
  }
  return request;
}
```

---

## 5. Callback Receiver Contract

### Route

```
POST /api/v1/webhooks/execution-callback
```

### Request

```json
{
  "execution_id": "exe_abc123",
  "status": "success" | "failure",
  "result": { ... },
  "error": "optional error message",
  "timestamp": "ISO-8601"
}
```

### Verification

1. **Correlation:** `execution_id` must exist and be in `executing` or `awaiting_callback` state
2. **Replay rejection:** If execution is already in a terminal state (`complete`, `failed`, `cancelled`), reject with 409
3. **Duplicate rejection:** Idempotency key from `execution_id + status` — second identical callback returns 200 but no state change
4. **Signature verification:** If `adapter_configs.headers` includes a `X-Callback-Secret`, verify HMAC of body
5. **Malformed rejection:** Missing `execution_id` or `status` → 400

### Response

```json
{
  "accepted": true,
  "execution_id": "exe_abc123",
  "previous_state": "executing",
  "new_state": "verifying"
}
```

### State Transition on Callback

```
executing/awaiting_callback → callback received → verifying → complete/failed
```

The callback triggers the same verification + attestation flow as managed execution completion.

---

## 6. Execution Step Resolution (Updated)

Current step execution flow:
```
step → check tier → "No adapter for tier X — passthrough"
```

Updated flow:
```
step → check adapter_config_id → resolve credentials → execute via HTTP adapter → redact → persist
```

If `adapter_config_id` is null, behavior stays the same (passthrough for native/internal actions).

---

## 7. File Locations

| File | Owner | Purpose |
|---|---|---|
| `apps/console/server/src/services/credentialService.ts` | Aiden | Encrypt/decrypt, CRUD, resolve |
| `apps/console/server/src/services/credentialCrypto.ts` | Aiden | AES-256-GCM encrypt/decrypt utility |
| `apps/console/server/src/services/secretRedaction.ts` | Aiden | Deep-walk redaction |
| `apps/console/server/src/execution/handlers/http-adapter.ts` | Vienna | HTTP adapter with auth injection |
| `apps/console/server/src/routes/execution-callbacks.ts` | Vienna | Callback receiver route |
| `apps/console/server/src/execution/adapter-resolver.ts` | Vienna | Wire adapter_config_id → adapter |
| `scripts/demo/demo-managed-http.js` | Vienna | Managed HTTP execution demo |
| `scripts/demo/demo-delegated-callback.js` | Vienna | Delegated callback demo |
| `scripts/demo/demo-failure.js` | Vienna | Failure containment demo |
| `apps/console/server/tests/credential-redaction.test.ts` | Aiden | Redaction tests |
| `apps/console/server/tests/credential-service.test.ts` | Aiden | Service tests |
| `apps/console/server/tests/http-adapter.test.ts` | Vienna | Adapter tests |
| `apps/console/server/tests/callback-receiver.test.ts` | Vienna | Callback tests |
| `database/migrations/004_phase_4a_credentials.sql` | Aiden | Schema migration |

---

## 8. Ambiguities When Credentials Enter the System

1. **Timeline detail field:** Currently free-form text. Must be constrained to never include request/response bodies verbatim if they contain auth headers.
2. **SSE events:** The event stream pushes execution updates to the console UI. Ensure SSE payloads go through redaction before broadcast.
3. **Error messages:** HTTP errors sometimes echo the request (e.g., "Invalid Authorization: Bearer sk-..."). The error field in execution_steps must be redacted.
4. **Adapter config in step params:** Steps currently store `params` as JSONB. If someone puts a credential directly in params instead of using a reference, it would be persisted. The redaction layer catches this by pattern-matching sensitive keys, but the real fix is validation: reject step creation if params contain known sensitive keys.

---

## Definition of Done

- [ ] `credentialCrypto.ts` — encrypt/decrypt with AES-256-GCM
- [ ] `credentialService.ts` — CRUD + resolve (never exposes plaintext via API)
- [ ] `secretRedaction.ts` — deep-walk redaction at all persistence boundaries
- [ ] Migration applied (credential_alias, auth_mode, disabled columns)
- [ ] HTTP adapter executes real outbound calls with injected credentials
- [ ] Callback receiver correlates, rejects replays, verifies signatures
- [ ] Adapter resolver wires adapter_config_id to HTTP adapter in execution flow
- [ ] Demo: managed HTTP success against real endpoint
- [ ] Demo: delegated execution with real callback
- [ ] Demo: failure with clean containment
- [ ] Tests: encryption, redaction, tenant isolation, replay rejection
- [ ] No secrets in any persisted surface (verified by test)
