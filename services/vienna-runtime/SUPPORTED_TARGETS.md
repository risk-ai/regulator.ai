# Vienna OS Supported Remediation Targets

**Last Updated:** 2026-03-13  
**Phase:** 9.7.3  
**Status:** Production baseline

## Current Support Matrix

| Target ID | Target Type | Objective Type | Remediation Plan | Status |
|-----------|-------------|----------------|------------------|--------|
| `openclaw-gateway` | service | maintain_health | gateway_recovery | ✅ SUPPORTED |

## Supported Target: openclaw-gateway

### Target Specification

**Target ID:** `openclaw-gateway`  
**Target Type:** `service`  
**Service Type:** `daemon`  
**Objective Type:** `maintain_health`  
**Remediation Plan:** `gateway_recovery`

### Desired State

```json
{
  "service_active": true,
  "service_healthy": true
}
```

### Observation Method

**Observer:** `_observeService` (objective-evaluator.js)  
**Source:** State Graph `services` table  
**Checks:**
- `service_exists` — Service record exists in State Graph
- `service_active` — Service status === 'running'
- `service_healthy` — Service health === 'healthy'

### Remediation Plan: gateway_recovery

**Plan ID:** Generated dynamically (e.g., `plan_mmp9nfah_b7868a4e`)  
**Defined in:** `lib/execution/remediation-plans.js`

**Steps:**
1. **restart** — `system_service_restart` on openclaw-gateway
2. **stability_wait** — `sleep` 3000ms
3. **health_check** — `health_check` on openclaw-gateway

**Preconditions:**
- `service_exists:openclaw-gateway`
- `service_unhealthy:openclaw-gateway`

**Postconditions:**
- `service_active:openclaw-gateway`
- `service_healthy:openclaw-gateway`

**Risk Tier:** T1 (requires warrant)

**Verification:**
- **Check:** `systemd_active` on openclaw-gateway
- **Expected:** `active`
- **Strength:** `strong`

### Deployment Requirements

**State Graph:**
```javascript
stateGraph.createService({
  service_id: 'openclaw-gateway',
  service_name: 'openclaw-gateway',
  service_type: 'daemon',
  status: 'running',
  health: 'healthy',
  metadata: { ... }
});
```

**Allowlist:**
```javascript
// lib/execution/handlers/restart-service.js
const ALLOWED_SERVICES = new Set([
  'openclaw-gateway'
]);
```

**Objective:**
```javascript
const objective = createObjective({
  name: 'maintain_gateway_health',
  description: 'Ensure openclaw-gateway remains active and healthy',
  objective_type: 'maintain_health',
  target_type: 'service',
  target_id: 'openclaw-gateway',
  desired_state: {
    service_active: true,
    service_healthy: true
  },
  evaluation_interval: '30s',
  remediation_plan: '<plan_id>',
  verification_strength: 'full_validation'
});
```

### Test Coverage

**Controlled execution:** `test-phase-9.7.3-controlled.js`  
**Autonomous loop:** `test-phase-9.7.3-autonomous.js`

Both tests use `VIENNA_TEST_STUB_ACTIONS=true` to prevent real service disruption.

### Known Limitations

1. **Single target:** Only openclaw-gateway supported
2. **No branching:** Linear plan execution (restart → sleep → check)
3. **No retry logic:** Plan fails on first action failure
4. **No circuit breaker:** No automatic suppression after repeated failures
5. **Manual approval required:** T1 actions require operator approval (Phase 7.5 dashboard integration pending)

### Production Deployment Checklist

Before deploying autonomous remediation for openclaw-gateway:

- [ ] State Graph seeded with service record
- [ ] Objective created with valid plan reference
- [ ] Evaluation interval configured (recommend 30s-60s)
- [ ] Approval workflow tested (T1 action approval)
- [ ] Monitoring dashboard operational (Phase 10)
- [ ] Alert mechanism configured for failed remediations
- [ ] Runbook for manual intervention prepared

## Unsupported Targets (Future Work)

| Target ID | Target Type | Status | Blockers |
|-----------|-------------|--------|----------|
| `vienna-console` | service | PLANNED | Phase 9.8 |
| `kalshi-cron` | service | PLANNED | Phase 9.8, trading safety validation |
| `anthropic-provider` | provider | PLANNED | Phase 10, provider-specific observers |
| `ollama-provider` | provider | PLANNED | Phase 10, provider-specific observers |
| `state-graph-db` | resource | DEFERRED | Backup/restore plan required |

## Adding a New Target (Procedure)

### Step 1: Define Remediation Plan

**File:** `lib/execution/remediation-plans.js`

```javascript
function createMyServiceRecoveryPlan(service) {
  return {
    objective: `Recover ${service}`,
    steps: [
      { step_id: 'restart', action: { type: 'system_service_restart', target: service } },
      { step_id: 'verify', action: { type: 'health_check', target: service } }
    ],
    preconditions: [`service_exists:${service}`, `service_unhealthy:${service}`],
    postconditions: [`service_active:${service}`, `service_healthy:${service}`],
    risk_tier: 'T1',
    verification_spec: { checks: [...] }
  };
}
```

### Step 2: Update Allowlist

**File:** `lib/execution/handlers/restart-service.js`

```javascript
const ALLOWED_SERVICES = new Set([
  'openclaw-gateway',
  'my-new-service'  // ADD HERE
]);
```

### Step 3: Seed State Graph

```javascript
stateGraph.createService({
  service_id: 'my-new-service',
  service_name: 'my-new-service',
  service_type: 'daemon',
  status: 'running',
  health: 'healthy'
});
```

### Step 4: Create Objective

```javascript
const objective = createObjective({
  name: 'maintain_my_service_health',
  objective_type: 'maintain_health',
  target_type: 'service',
  target_id: 'my-new-service',
  desired_state: { service_active: true, service_healthy: true },
  evaluation_interval: '30s',
  remediation_plan: '<plan_id>'
});
```

### Step 5: Test

```bash
VIENNA_ENV=test VIENNA_TEST_STUB_ACTIONS=true node test-my-service.js
```

### Step 6: Update Documentation

- Update `SUPPORTED_TARGETS.md` (this file) with new target
- Update `ACTION_BOUNDARY.md` if new action types added
- Add entry to `VIENNA_RUNTIME_STATE.md`

## Version History

- **2026-03-13 (Phase 9.7.3):** Initial target support
  - 1 supported target: openclaw-gateway
  - gateway_recovery plan operational
  - Test coverage: controlled + autonomous

---

**Current production support: 1 target (openclaw-gateway)**  
**Next phase: Add vienna-console + kalshi-cron (Phase 9.8)**
