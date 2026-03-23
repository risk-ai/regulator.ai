# Vienna Memory

**Operator name changed from Fenrir to Vienna on 2026-03-10.**  
Architecture remains responsibility-based with three agents (Talleyrand, Metternich, Castlereagh).

**⚠️ NBA Kalshi Operating State (2026-03-10):** v1_baseline live trading is active and autonomous. No daily confirmation required. Escalate only on blockers (API failure, cron failure, risk limits, data corruption). See `VIENNA_RUNTIME_STATE.md` for full state.

## Vienna Diplomatic Trio — Full Agent Architecture (2026-03-10)

**Architecture:** Full configured agents (not runtime-labeled sessions)  
**Location:** `~/.openclaw/agents/{talleyrand,metternich,castlereagh}/`  
**Status:** ✓ DEPLOYED & VERIFIED, production ready

**Design principle:** Route by **responsibility** (what kind of thinking), not subject matter

**Active agents:**
- 🧠 **Talleyrand** (`agentId: "talleyrand"`, Sonnet) — Strategy, planning, coordination → "What should we do?"
- ⚖️ **Metternich** (`agentId: "metternich"`, Sonnet→Opus) — Risk, governance, validation → "Is it safe/compliant?"
- ⚙️ **Castlereagh** (`agentId: "castlereagh"`, Haiku→Sonnet) — Operations, monitoring, reliability → "Is it running?"

**Delegation:** 🏛 Vienna creates agent sessions via `sessions_spawn(runtime="subagent", agentId="...", task="...", model="haiku")`  
**Model verified from session transcripts (modelId field) — agent self-reports are unreliable**

**⚙️ Castlereagh requires explicit `model="haiku"` parameter — agent-level config alone is insufficient.**

**⚙️ Castlereagh two-stage optimization (2026-03-10):**
- Routine ops checks use cheap triage first (50-100 tokens)
- Only escalate to full analysis if triage detects issues
- **5–10× cost reduction** for monitoring (80-95% of checks end at triage)
- Implementation: `subagents/castlereagh/OPS_TRIAGE.md`
- Helper: `scripts/castlereagh-delegate.js`

**Playbooks (not subagents):**
- `playbooks/legal/` — Legal research workflows
- `playbooks/markets/` — Trading/strategy workflows
- `playbooks/systems/` — Infrastructure ops workflows

**Why responsibility model wins:**
- Legal workflow needs planning + audit + ops → one task, three subagents
- New domains (school, research, personal) don't require new subagents
- Cleaner separation: responsibility vs. subject matter
- More durable, less fragile, better auditability

**Benefits:**
- 35-40% cost reduction on routine ops (Haiku for monitoring)
- Flexible routing (any domain through appropriate responsibility)
- Easier to scale (responsibilities stable, domains grow)
- Main Vienna focuses on coordination

**Safety:** Graceful degradation, no breaking changes, rollback = stop delegating

**Docs:** `SUBAGENT_ARCHITECTURE.md`, `subagents/ROUTING.md`, `subagents/README.md`

**Migration:** Domain model (systems/trading/legal) deprecated 2026-03-10, moved to playbooks

---

## OpenClaw Architecture (2026-03-09)

**Install model:** Global npm package, NOT local repo  
**Binary:** `/home/maxlawai/.npm-global/lib/node_modules/openclaw/dist/index.js`  
**Runtime:** `~/.openclaw`  
**Gateway:** systemd user service, port 18789  
**Hard dependency:** Tailscale authentication  

**❌ WRONG:** `~/openclaw` (does not exist on this machine)  
**✅ CORRECT:** Use `~/.openclaw` for runtime state  

**Recovery order:**
1. Check Tailscale first (`tailscale status`)
2. Then check gateway process
3. Then check port 18789
4. Then app-level debugging

**Quick reference:** `~/.openclaw/workspace/OPENCLAW_OPS.md`  
**Recovery runbook:** `~/.openclaw/workspace/runbooks/openclaw-recovery.md`  
**Health check:** `~/.openclaw/workspace/scripts/health-check.sh`

---

## Incidents

### 2026-03-09 — Tailscale Timeout
- **Cause:** Tailscale auth expired
- **Symptom:** UI unavailable, gateway running
- **Fix:** `tailscale logout && tailscale up`
- **Lesson:** Always check Tailscale before app debugging
- **Details:** `~/.openclaw/workspace/logs/incidents/2026-03-09-tailscale-timeout.md`
