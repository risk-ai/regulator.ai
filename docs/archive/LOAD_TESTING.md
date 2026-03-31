# Load Testing Guide

**Vienna OS v8.5.0 — Performance Validation**

**Last Updated:** 2026-03-28  
**Target:** Governance pipeline under load

---

## Quick Start

```bash
# 1. Create test API key
cd ~/regulator.ai
node scripts/create-api-key.js --tenant test-tenant --name "Load Test Key"

# 2. Run load test (10 RPS for 30s)
VIENNA_API_KEY="your-key-here" node scripts/load-test.js \
  --url http://localhost:3100 \
  --rps 10 \
  --duration 30 \
  --output human

# 3. Run stress test (100 RPS for 60s)
VIENNA_API_KEY="your-key-here" node scripts/load-test.js \
  --url http://localhost:3100 \
  --rps 100 \
  --duration 60 \
  --output json > load-test-results.json
```

---

## Prerequisites

### 1. API Key Creation

Vienna OS requires API authentication for intent submission. Create a test key:

```bash
cd ~/regulator.ai/services/vienna-lib

# Option A: Using State Graph directly
node -e "
const { getStateGraph } = require('./state/state-graph.js');
const sg = getStateGraph();
await sg.initialize();

const apiKey = await sg.createAPIKey({
  tenant_id: 'test-tenant',
  key_name: 'Load Test Key',
  permissions: ['intent.submit', 'execution.read'],
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
});

console.log('API Key:', apiKey.key_id);
console.log('Secret:', apiKey.secret);
"
```

**Save the secret!** You'll need it for load testing.

### 2. Environment Setup

```bash
# Set API key for load testing
export VIENNA_API_KEY="your-api-key-secret-here"

# Optional: Test against remote endpoint
export LOAD_TEST_URL="https://console.regulator.ai"
```

---

## Load Test Script

### Basic Usage

```bash
node scripts/load-test.js [options]
```

### Options

```
--url <url>          Target URL (default: http://localhost:3100)
--rps <number>       Requests per second (default: 10)
--duration <sec>     Test duration in seconds (default: 30)
--output <format>    Output format: human|json|csv (default: human)
--tier <T0|T1|T2>    Risk tier distribution (default: mixed)
--key <api-key>      API key (or use VIENNA_API_KEY env var)
--workers <number>   Concurrent workers (default: CPU count)
```

### Example Tests

**Warm-up Test (low load):**
```bash
VIENNA_API_KEY=$KEY node scripts/load-test.js \
  --rps 5 \
  --duration 10 \
  --output human
```

**Sustained Load (moderate):**
```bash
VIENNA_API_KEY=$KEY node scripts/load-test.js \
  --rps 50 \
  --duration 120 \
  --output json > sustained-load.json
```

**Stress Test (high load):**
```bash
VIENNA_API_KEY=$KEY node scripts/load-test.js \
  --rps 200 \
  --duration 60 \
  --output json > stress-test.json
```

**Tier-Specific Test (T2 only):**
```bash
VIENNA_API_KEY=$KEY node scripts/load-test.js \
  --rps 10 \
  --duration 30 \
  --tier T2 \
  --output human
```

---

## Metrics Collected

### Latency Metrics
- **p50 (median):** 50th percentile response time
- **p95:** 95th percentile (captures slow requests)
- **p99:** 99th percentile (worst-case latency)
- **max:** Maximum observed latency

### Throughput Metrics
- **Total requests:** Total intents submitted
- **Successful:** HTTP 200/201 responses
- **Failed:** HTTP 4xx/5xx responses
- **Actual RPS:** Achieved requests per second

### Error Metrics
- **Error rate:** Percentage of failed requests
- **Timeout rate:** Requests exceeding timeout
- **Connection errors:** Network/socket failures

### Governance Metrics
- **Policy evaluations:** Total policy checks
- **Approval requests:** T1/T2 approvals created
- **Quota blocks:** Requests blocked by quota
- **Budget blocks:** Requests blocked by budget

---

## Performance Targets

### Latency Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| p50    | <50ms  | <100ms     | >200ms   |
| p95    | <200ms | <500ms     | >1000ms  |
| p99    | <500ms | <1000ms    | >2000ms  |

### Throughput Targets

| Load      | RPS Target | Success Rate |
|-----------|------------|--------------|
| Light     | 10 RPS     | >99%         |
| Moderate  | 50 RPS     | >95%         |
| Heavy     | 100 RPS    | >90%         |
| Stress    | 200+ RPS   | >80%         |

### Resource Targets

| Resource       | Target   | Max Acceptable |
|----------------|----------|----------------|
| CPU (avg)      | <50%     | <80%           |
| Memory (avg)   | <2GB     | <4GB           |
| DB connections | <20      | <50            |
| Queue depth    | <100     | <1000          |

---

## Interpreting Results

### Good Performance

```
✓ p50: 35ms
✓ p95: 120ms
✓ p99: 250ms
✓ Success rate: 99.2%
✓ Throughput: 48.7 RPS (target: 50 RPS)
```

**Indicators:**
- p50 < 50ms
- p95 < 200ms
- Success rate > 95%
- No timeout errors
- Actual RPS close to target

### Degraded Performance

```
⚠ p50: 180ms
⚠ p95: 850ms
⚠ p99: 1500ms
⚠ Success rate: 92%
⚠ Throughput: 42 RPS (target: 50 RPS)
```

**Indicators:**
- p95 > 500ms
- Success rate 90-95%
- Actual RPS < 90% of target
- Occasional timeouts

**Action:** Investigate slow paths, check DB query performance, review adapter latency.

### Failed Performance

```
✗ p50: 500ms
✗ p95: 2000ms
✗ p99: 5000ms
✗ Success rate: 75%
✗ Throughput: 25 RPS (target: 50 RPS)
```

**Indicators:**
- p50 > 200ms
- p95 > 1000ms
- Success rate < 90%
- High timeout rate
- Actual RPS < 50% of target

**Action:** Critical performance issue. Check for:
- Database connection pool exhaustion
- Memory leaks
- Blocking I/O
- Unoptimized queries
- Resource contention

---

## Troubleshooting

### High Latency (p95 > 500ms)

**Possible causes:**
1. Slow database queries
2. Adapter timeout
3. Blocking I/O in executor
4. Insufficient resources

**Diagnosis:**
```bash
# Check database query times
sqlite3 ~/.openclaw/workspace/vienna-core/state/state.db \
  "SELECT * FROM query_performance ORDER BY duration_ms DESC LIMIT 10;"

# Check adapter latency
grep "adapter_latency" ~/.openclaw/workspace/vienna-core/logs/*.log \
  | jq '.adapter_latency_ms' | sort -n

# Check resource usage
htop
```

---

### High Error Rate (> 5%)

**Possible causes:**
1. Quota exhaustion
2. Budget limits hit
3. Policy denials
4. Adapter failures

**Diagnosis:**
```bash
# Check error distribution
grep "error" load-test-results.json | jq '.error_code' | sort | uniq -c

# Check quota state
sqlite3 ~/.openclaw/workspace/vienna-core/state/state.db \
  "SELECT * FROM quota_state WHERE tenant_id='test-tenant';"

# Check budget state
sqlite3 ~/.openclaw/workspace/vienna-core/state/state.db \
  "SELECT * FROM cost_ledger WHERE tenant_id='test-tenant' \
   ORDER BY created_at DESC LIMIT 10;"
```

---

### Low Throughput (< 80% target)

**Possible causes:**
1. Insufficient worker concurrency
2. Network bottleneck
3. Rate limiting
4. Resource exhaustion

**Diagnosis:**
```bash
# Increase workers
node scripts/load-test.js --workers 16 --rps 100

# Check network latency
ping -c 10 console.regulator.ai

# Check system limits
ulimit -n  # file descriptors
ulimit -u  # max processes
```

---

## Continuous Load Testing

### Scheduled Tests

```bash
# Add to crontab for daily load testing
crontab -e

# Daily stress test at 2 AM
0 2 * * * VIENNA_API_KEY=$KEY node /path/to/scripts/load-test.js \
  --rps 100 --duration 300 --output json > /var/log/vienna-load-test.json
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Load Test
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Run Load Test
        env:
          VIENNA_API_KEY: ${{ secrets.VIENNA_API_KEY }}
        run: |
          node scripts/load-test.js \
            --rps 50 \
            --duration 120 \
            --output json > results.json
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

---

## Best Practices

### Before Testing
1. ✅ Create dedicated test tenant
2. ✅ Generate fresh API key
3. ✅ Set realistic quota/budget limits
4. ✅ Verify baseline performance
5. ✅ Document current system state

### During Testing
1. ✅ Monitor system resources (CPU, memory, disk)
2. ✅ Watch queue depth in real-time
3. ✅ Check logs for errors
4. ✅ Observe approval workflow (if testing T1/T2)
5. ✅ Validate governance enforcement

### After Testing
1. ✅ Analyze results (compare to targets)
2. ✅ Clean up test data
3. ✅ Revoke test API keys
4. ✅ Document findings
5. ✅ Track performance trends over time

---

## Example: Complete Load Test Run

```bash
#!/bin/bash
# complete-load-test.sh

set -e

echo "Vienna OS Load Test Suite"
echo "=========================="

# 1. Create test key
echo "Creating API key..."
API_KEY=$(node scripts/create-api-key.js --tenant load-test --name "Load Test $(date +%Y%m%d)")
export VIENNA_API_KEY=$API_KEY

# 2. Warm-up test
echo "Running warm-up test (5 RPS x 10s)..."
node scripts/load-test.js --rps 5 --duration 10 --output json > warmup.json

# 3. Light load test
echo "Running light load test (10 RPS x 30s)..."
node scripts/load-test.js --rps 10 --duration 30 --output json > light-load.json

# 4. Moderate load test
echo "Running moderate load test (50 RPS x 60s)..."
node scripts/load-test.js --rps 50 --duration 60 --output json > moderate-load.json

# 5. Stress test
echo "Running stress test (100 RPS x 60s)..."
node scripts/load-test.js --rps 100 --duration 60 --output json > stress-test.json

# 6. Analyze results
echo "Analyzing results..."
node scripts/analyze-load-tests.js warmup.json light-load.json moderate-load.json stress-test.json

# 7. Cleanup
echo "Cleaning up..."
node scripts/revoke-api-key.js --key $API_KEY

echo "Load test suite complete!"
```

---

## Performance Benchmarks (Reference)

**Hardware:** NUC15CRH (16GB RAM, 6-core CPU)  
**Database:** SQLite (local)  
**Network:** Localhost

| Test        | RPS | Duration | p50  | p95   | p99   | Success |
|-------------|-----|----------|------|-------|-------|---------|
| Baseline    | 10  | 30s      | 12ms | 35ms  | 50ms  | 100%    |
| Light       | 25  | 60s      | 18ms | 55ms  | 90ms  | 99.8%   |
| Moderate    | 50  | 120s     | 32ms | 120ms | 250ms | 99.2%   |
| Heavy       | 100 | 60s      | 65ms | 280ms | 500ms | 97.5%   |
| Stress      | 200 | 30s      | 150ms| 650ms | 1200ms| 92.0%   |

**Notes:**
- T0 actions (no approval required)
- Local SQLite database
- No adapter external API calls
- Single-machine deployment

---

## References

- `scripts/load-test.js` — Load testing script
- `scripts/create-api-key.js` — API key generation
- `CANONICAL_EXECUTION_PATH.md` — Execution flow
- `PRODUCTION_CERTIFICATION.md` — Performance targets

**For questions:** Check documentation or escalate to Max/Metternich.
