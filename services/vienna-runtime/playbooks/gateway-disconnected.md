# Recovery Playbook: Gateway Disconnected

**Symptom:** Vienna runtime cannot connect to OpenClaw gateway

**Triggers:**
- Gateway health check fails
- Runtime enters local-only mode due to gateway unavailability

---

## Diagnostic Steps

### 1. Check Tailscale Status

```bash
tailscale status
```

**Expected:** Tailscale should show as connected and authenticated

**If failed:** Run `tailscale logout && tailscale up`

**Reason:** OpenClaw gateway requires Tailscale authentication

---

### 2. Check Gateway Process

```bash
systemctl --user status openclaw-gateway
```

**Expected:** Service should be active (running)

**If failed:** Restart service with `systemctl --user restart openclaw-gateway`

---

### 3. Check Gateway Port

```bash
curl -s http://localhost:18789/health || echo "Gateway not responding"
```

**Expected:** Should return gateway health response

**If failed:** Gateway process may be running but not serving requests

---

### 4. Check Network Connectivity

```bash
ping -c 3 100.64.0.1
```

**Expected:** Should reach Tailscale network

**If failed:** Network issue, check Tailscale routing

---

## Recovery Actions

### Action 1: Restart Tailscale

```bash
tailscale logout
tailscale up
```

**When to use:** Tailscale auth expired or connection stale

**Safe:** Yes, no data loss

**Approval required:** No (operator can execute directly)

---

### Action 2: Restart Gateway

```bash
systemctl --user restart openclaw-gateway
sleep 5
systemctl --user status openclaw-gateway
```

**When to use:** Gateway process crashed or unresponsive

**Safe:** Yes, interrupts in-flight requests only

**Approval required:** No (operator can execute directly)

---

### Action 3: Fallback to Local-Only

**When to use:** Gateway cannot be recovered quickly

**Safe:** Yes, degrades to local provider only

**Approval required:** Yes (runtime mode transition)

**Execution:** Use Vienna runtime mode API, not chat command

---

## Escalation Criteria

Escalate to manual intervention if:

1. Tailscale won't authenticate after logout/login
2. Gateway service won't start after restart
3. Port 18789 is bound but not responding
4. Network routing to Tailscale broken

---

## Prevention

- Monitor gateway heartbeat every 30s
- Alert on 3 consecutive gateway failures
- Maintain local provider as always-available fallback
- Keep Tailscale session fresh with periodic auth checks

---

## Related Playbooks

- `provider-unavailable.md` — If Anthropic/OpenClaw providers fail
- `executor-degraded.md` — If executor fails but gateway is healthy
