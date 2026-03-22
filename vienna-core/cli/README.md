# Vienna CLI Tools

Observability utilities for Vienna OS monitoring and inspection.

**Phase:** 10.5 Operator Visibility  
**Status:** Observation Window Safe (read-only)

---

## Tools

### 1. Objective Inspector

Detailed inspection of a single objective's state.

```bash
node cli/vienna-inspect-objective.js <objective_id>
```

**Example:**
```bash
node cli/vienna-inspect-objective.js gateway-health
```

**Output:**
- Identity (objective_id, type, target)
- Status (status, reconciliation_status, generation)
- Failure tracking (consecutive_failures, cooldown)
- Execution state (active, deadline, completion)
- Evaluation history
- Recent evaluations (last 5)
- Recent state transitions (last 10)

---

### 2. Watchdog Status

Display execution watchdog status and active attempts.

```bash
node cli/vienna-watchdog-status.js
```

**Output:**
- Watchdog runtime (running, interval)
- Active attempts count
- Expired deadlines (critical metric)
- Timeout metrics (last hour)
- Execution metrics (average duration)
- Active attempts detail (with deadline remaining)
- Health check summary

**Phase 10.3 Observation Focus:**
- Expired deadlines should be 0
- Watchdog should be running
- Timeout rate should remain low

---

### 3. Timeout Metrics

Calculate timeout and failure metrics over time window.

```bash
node cli/vienna-timeout-metrics.js [--hours=24]
```

**Examples:**
```bash
node cli/vienna-timeout-metrics.js              # Last 24 hours
node cli/vienna-timeout-metrics.js --hours=1    # Last hour
node cli/vienna-timeout-metrics.js --hours=168  # Last week
```

**Output:**
- Event counts (timeouts, cooldown entries, degraded transitions)
- Hourly rates (timeouts/hr, cooldowns/hr, degraded/hr)
- Execution durations (average, max)
- Timeout breakdown by objective
- Health assessment

**Observation Thresholds:**
- 🚨 CRITICAL: Timeouts/hour > 10% of objectives
- ⚠️  WARNING: Timeouts occurring but below threshold
- ✅ HEALTHY: No timeouts

---

## Usage Patterns

### Observation Window Monitoring

**Every 30 minutes:**
```bash
node cli/vienna-watchdog-status.js
```

**Watch for:**
- Expired deadlines > 0
- Timeout rate increasing
- Watchdog not running

**Every 2 hours:**
```bash
node cli/vienna-timeout-metrics.js --hours=2
```

**Watch for:**
- Timeout storm (>10% rate)
- Degraded transitions
- Increasing failure rates

**On-demand inspection:**
```bash
node cli/vienna-inspect-objective.js <objective_id>
```

**Use when:**
- Investigating specific objective behavior
- Debugging failure patterns
- Reviewing evaluation history

---

### Scripted Monitoring

**Automated health check:**
```bash
#!/bin/bash
# check-vienna-health.sh

echo "=== Watchdog Status ==="
node cli/vienna-watchdog-status.js

echo ""
echo "=== Timeout Metrics (Last Hour) ==="
node cli/vienna-timeout-metrics.js --hours=1

# Exit with error if critical issues detected
# (parse output for "CRITICAL" or "WARNING")
```

---

## Output Formats

All tools output human-readable formatted tables to stdout.

**For programmatic use:**
- Tools can be `require()`'d as modules
- Functions return structured data objects
- Example: `const { getTimeoutMetrics } = require('./cli/vienna-timeout-metrics');`

---

## Architecture Compliance

**Read-only:** All tools query State Graph only, no modifications  
**No runtime changes:** Does not import execution-watchdog.js for modification, only status queries  
**Safe during observation:** Can run continuously without affecting Phase 10.3 stability window

---

## Future Enhancements

- JSON output mode (`--format=json`)
- CSV export for metrics
- Alert threshold configuration
- Email/Slack notifications on threshold breach
- Historical trend analysis
- Comparison reports (baseline vs current)

---

## Contributing

When adding CLI tools:
1. Keep read-only (query State Graph, don't modify)
2. Provide both CLI and module exports
3. Include help text and usage examples
4. Follow formatting conventions (box drawing characters)
5. Include health assessment logic where relevant
