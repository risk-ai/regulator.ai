# Recovery Playbook: Provider Unavailable

**Symptom:** LLM provider (Anthropic, OpenClaw, or local) marked as unavailable

**Triggers:**
- Provider health check fails
- Consecutive failures exceed threshold (default: 3)
- Provider enters cooldown period

---

## Diagnostic Steps

### 1. Check Provider Health Status

**Via recovery copilot:**
```
test provider anthropic
```

**Expected:** Status, last success/failure, cooldown state

**If unavailable:** Proceed to provider-specific diagnostics

---

### 2. Provider-Specific Diagnostics

#### Anthropic Provider

```bash
# Check API key presence
echo $ANTHROPIC_API_KEY | head -c 20

# Test direct API call
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

**Expected:** Valid API response

**Common failures:**
- Missing/invalid API key
- Rate limit exceeded (429)
- Network timeout

#### OpenClaw Provider

```bash
# Check gateway connectivity first (see gateway-disconnected.md)
curl http://localhost:18789/health

# Check OpenClaw session
openclaw status
```

**Expected:** Gateway healthy, session active

**Common failures:**
- Gateway disconnected
- Session expired
- OpenClaw daemon not running

#### Local Provider

```bash
# Check local model availability
# (Implementation depends on local LLM setup)
curl http://localhost:8080/health || echo "Local LLM not responding"
```

**Expected:** Local model server healthy

**Common failures:**
- Local model server not started
- Port conflict
- Model not loaded

---

## Recovery Actions

### Action 1: Wait for Cooldown

**When to use:** Provider in cooldown after consecutive failures

**Safe:** Yes, automatic

**Approval required:** No

**Execution:** Cooldown expires automatically, provider will retry on next health check

**Typical duration:** 60 seconds (configurable)

---

### Action 2: Manual Health Check

**When to use:** Force immediate health recheck outside cooldown

**Safe:** Yes, read-only

**Approval required:** No

**Execution:** Via ProviderManager API (not chat):

```javascript
await providerManager.runHealthChecks();
```

---

### Action 3: Fallback to Alternative Provider

**When to use:** Primary provider unavailable, fallback is healthy

**Safe:** Yes, degrades quality but maintains functionality

**Approval required:** No (automatic per policy)

**Execution:** Automatic via provider selection policy

**Fallback chain:**
- Anthropic → local
- OpenClaw → local
- Local → none (always-available)

---

### Action 4: Quarantine Provider

**When to use:** Provider consistently failing, want to force fallback

**Safe:** Yes, prevents repeated failures

**Approval required:** Yes (governance action)

**Execution:** Via runtime governance API (not chat):

```javascript
await runtimeModeManager.forceMode('degraded', 'Anthropic quarantined by operator');
```

---

## Provider-Specific Recovery

### Anthropic Recovery

1. Verify API key is set and valid
2. Check Anthropic status page: https://status.anthropic.com
3. Wait for rate limit reset if 429 error
4. Fallback to local provider if extended outage

### OpenClaw Recovery

1. Follow `gateway-disconnected.md` playbook
2. Verify OpenClaw session is active
3. Restart OpenClaw daemon if needed
4. Fallback to local provider if gateway issues persist

### Local Provider Recovery

1. Start/restart local model server
2. Verify model is loaded and responding
3. Check port availability (default: 8080)
4. If local provider critical, escalate to operator-only mode

---

## Escalation Criteria

Escalate if:

1. All providers unavailable (operator-only mode)
2. Local provider (always-available) fails health check
3. Fallback chain exhausted
4. Provider unavailable for >10 minutes with no clear cause

---

## Prevention

- Monitor provider health continuously (30s interval)
- Set appropriate cooldown periods to avoid retry storms
- Maintain fallback chain: premium → free → local
- Alert on degraded mode entry
- Log all provider failures for pattern analysis

---

## Related Playbooks

- `gateway-disconnected.md` — If OpenClaw gateway is the root cause
- `dlq-spike.md` — If provider failures cause task backlog
