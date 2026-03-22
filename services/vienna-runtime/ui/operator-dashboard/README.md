# Vienna Operator Dashboard

Read-only monitoring interface for Vienna OS reconciliation runtime.

**Phase:** 10.5 Operator Visibility  
**Status:** Observation Window Safe (no runtime modifications)

---

## Purpose

Expose runtime state for monitoring Phase 10.3 execution timeout behavior.

**Core Views:**
1. **Objective Monitor** — Status, reconciliation state, failure tracking
2. **Execution Lease Monitor** — Active attempts with deadline tracking
3. **Circuit Breaker View** — Failure counts, cooldown, degraded state
4. **Event Timeline** — Recent reconciliation lifecycle events

---

## Usage

### Full Dashboard (All Views)

```bash
node ui/operator-dashboard/dashboard.js
```

### Auto-Refresh Mode

```bash
node ui/operator-dashboard/dashboard.js --refresh=5
```

### Single View

```bash
node ui/operator-dashboard/dashboard.js --view=objectives
node ui/operator-dashboard/dashboard.js --view=leases
node ui/operator-dashboard/dashboard.js --view=breakers
node ui/operator-dashboard/dashboard.js --view=timeline
```

### Filter Timeline by Objective

```bash
node ui/operator-dashboard/dashboard.js --objective=gateway-health
```

---

## Individual View Scripts

### Objective Monitor

```bash
node ui/operator-dashboard/objective-monitor.js
```

Displays:
- objective_id, status, reconciliation_status, generation
- consecutive_failures, cooldown_remaining, execution_deadline
- last_transition timestamp

### Execution Lease Monitor

```bash
node ui/operator-dashboard/execution-lease-monitor.js
```

Displays:
- Active execution attempts (reconciliation_status = 'reconciling')
- Deadline tracking with seconds remaining
- Warnings for expiring/expired deadlines

### Circuit Breaker View

```bash
node ui/operator-dashboard/circuit-breaker-view.js
```

Displays:
- Objectives in failure state (failures > 0 or cooldown/degraded)
- Consecutive failures, attempts remaining
- Cooldown remaining, degraded state
- Last failure reason

### Event Timeline

```bash
node ui/operator-dashboard/event-timeline.js
node ui/operator-dashboard/event-timeline.js gateway-health
```

Displays:
- Recent reconciliation lifecycle events
- Chronological order (most recent first)
- Objective filter support

---

## Observation Window Purpose

This dashboard helps monitor Phase 10.3 execution timeout behavior:

**Watch for:**
- Timeout volume (should remain rare)
- Expired deadlines (should never linger in `reconciling`)
- Watchdog behavior (should be deterministic)
- Timeout outcomes (should cleanly land in `cooldown` or `degraded`)
- Stale-result mutation (should never occur)

**Clean 24-hour window criteria:** Phase 10.3 moves from "deployed" to "stable"

---

## Architecture Compliance

**Read-only:** All views query State Graph only, no modifications  
**No runtime changes:** Does not modify execution-watchdog.js, reconciliation-gate.js, remediation-trigger-integrated.js, or failure-policy-schema.js  
**Safe during observation:** Can run continuously without invalidating stability window

---

## Data Sources

- **State Graph:** `managed_objectives` table (status, reconciliation state, failure tracking)
- **Objective History:** `managed_objective_history` table (lifecycle events)
- **Execution Ledger:** `execution_ledger_summary` and `execution_ledger_events` (future enhancement)

---

## Future Enhancements (Post-Observation)

- Web UI version (integrate with Vienna console)
- Real-time event streaming
- Execution ledger integration
- Timeout metrics aggregation
- Alert thresholds and notifications
- Historical trend graphs

---

## Contributing

When adding views:
1. Keep read-only (no State Graph writes)
2. No runtime logic modifications
3. Focus on clarity over styling
4. Include CLI entry point for standalone use
