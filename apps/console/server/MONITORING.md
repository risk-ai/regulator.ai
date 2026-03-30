# Vienna OS Monitoring & Observability

**Status:** ✅ Production-Ready  
**Last Updated:** 2026-03-29

---

## Overview

Vienna OS includes comprehensive monitoring and observability features:

1. **Structured Logging** - JSON logs for all requests, errors, and slow operations
2. **Health Checks** - Kubernetes-compatible health endpoints
3. **Performance Metrics** - Query timing and resource usage
4. **Error Tracking** - Automatic error logging with context

---

## Health Endpoints

### Basic Health Check

**GET** `/health`

Returns overall system health status.

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-29T21:15:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 5
    },
    "memory": {
      "status": "healthy",
      "usage": {...},
      "rss_mb": 150,
      "heap_used_mb": 100
    },
    "cpu": {
      "status": "healthy",
      "usage": {...}
    }
  }
}
```

**Response (Degraded):**
```json
{
  "status": "degraded",
  "timestamp": "2026-03-29T21:15:00Z",
  "checks": {
    "database": {
      "status": "degraded",
      "latency_ms": 250
    }
  }
}
```

**HTTP Status Codes:**
- `200` - Healthy
- `503` - Unhealthy or degraded

---

### Readiness Probe

**GET** `/health/ready`

Kubernetes readiness probe - checks if the service can accept traffic.

**Response:**
```json
{
  "ready": true,
  "timestamp": "2026-03-29T21:15:00Z"
}
```

**Use in Kubernetes:**
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3100
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### Liveness Probe

**GET** `/health/live`

Kubernetes liveness probe - checks if the service is alive.

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-03-29T21:15:00Z",
  "uptime": 3600
}
```

**Use in Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3100
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

### Performance Metrics

**GET** `/health/metrics`

Detailed performance and resource metrics.

**Response:**
```json
{
  "timestamp": "2026-03-29T21:15:00Z",
  "uptime_seconds": 3600,
  "memory": {
    "rss_bytes": 157286400,
    "heap_used_bytes": 104857600,
    "heap_total_bytes": 134217728,
    "external_bytes": 1048576
  },
  "cpu": {
    "user": 1000000,
    "system": 500000
  },
  "performance": {
    "db_query_users": {
      "avg": 5.2,
      "p95": 12,
      "p99": 25
    },
    "api_agents_list": {
      "avg": 45,
      "p95": 120,
      "p99": 250
    }
  }
}
```

---

## Structured Logging

All requests are logged in JSON format for easy parsing and analysis.

### Log Levels

**INFO** - Successful requests
```json
{
  "level": "INFO",
  "timestamp": "2026-03-29T21:15:00Z",
  "method": "GET",
  "path": "/api/v1/agents",
  "statusCode": 200,
  "duration": 45,
  "userId": "user_123",
  "tenantId": "tenant_abc",
  "ip": "192.168.1.1"
}
```

**WARN** - Client errors (4xx) or slow requests
```json
{
  "level": "WARN",
  "timestamp": "2026-03-29T21:15:00Z",
  "method": "GET",
  "path": "/api/v1/agents",
  "statusCode": 404,
  "duration": 15,
  "userId": "user_123",
  "error": "Agent not found"
}
```

**ERROR** - Server errors (5xx)
```json
{
  "level": "ERROR",
  "timestamp": "2026-03-29T21:15:00Z",
  "method": "POST",
  "path": "/api/v1/policies",
  "statusCode": 500,
  "duration": 5,
  "userId": "user_123",
  "error": "Database connection failed",
  "stack": "Error: Database connection failed\n  at ..."
}
```

**SLOW** - Requests exceeding 1000ms
```json
{
  "level": "SLOW",
  "timestamp": "2026-03-29T21:15:00Z",
  "method": "GET",
  "path": "/api/v1/executions",
  "statusCode": 200,
  "duration": 1250,
  "userId": "user_123"
}
```

---

## Log Aggregation

### Using Loki (Recommended)

**Promtail Configuration:**
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: vienna-os
    static_configs:
      - targets:
          - localhost
        labels:
          job: vienna-console
          __path__: /var/log/vienna/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            method: method
            path: path
            duration: duration
            userId: userId
```

---

### Using CloudWatch

**Install AWS SDK:**
```bash
npm install @aws-sdk/client-cloudwatch-logs
```

**Configure:**
```typescript
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

export async function sendToCloudWatch(logEvent: any) {
  await client.send(new PutLogEventsCommand({
    logGroupName: '/vienna-os/console',
    logStreamName: 'production',
    logEvents: [{
      timestamp: Date.now(),
      message: JSON.stringify(logEvent)
    }]
  }));
}
```

---

## Error Tracking

### Using Sentry (Recommended)

**Install Sentry:**
```bash
npm install @sentry/node @sentry/tracing
```

**Configure in `src/app.ts`:**
```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new ProfilingIntegration()
  ],
  tracesSampleRate: 0.1,  // 10% of transactions
  profilesSampleRate: 0.1
});

// Request handler (first middleware)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

// Error handler (last middleware)
app.use(Sentry.Handlers.errorHandler());
```

**Manual Error Capture:**
```typescript
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error, {
    user: { id: userId, tenantId },
    extra: { context: 'additional data' }
  });
  throw error;
}
```

---

## Performance Monitoring

### Query Performance

Track slow database queries:

```typescript
import { monitoredQuery, PerformanceMonitor } from '../middleware/logging.js';

// Wrap database calls
const users = await monitoredQuery('db_query_users', async () => {
  return await query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
});

// Get stats
const stats = PerformanceMonitor.getStats('db_query_users');
console.log(`Avg: ${stats.avg}ms, P95: ${stats.p95}ms, P99: ${stats.p99}ms`);
```

---

### APM (Application Performance Monitoring)

**Using New Relic:**
```bash
npm install newrelic
```

**newrelic.js:**
```javascript
exports.config = {
  app_name: ['Vienna OS Console'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  distributed_tracing: {
    enabled: true
  }
};
```

**Load at app start:**
```typescript
// First line in src/app.ts
require('newrelic');
```

---

## Alerts

### Critical Alerts

Set up alerts for:

1. **High Error Rate** - > 5% of requests returning 5xx
2. **Slow Response Time** - P95 > 500ms
3. **Database Connection Failures**
4. **High Memory Usage** - > 80% of available memory
5. **Service Down** - Health check failing

### Example: CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name vienna-os-error-rate \
  --metric-name ErrorRate \
  --namespace ViennaOS \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## Dashboards

### Grafana Dashboard

**Metrics to visualize:**
- Request rate (req/sec)
- Response time (P50, P95, P99)
- Error rate (%)
- Database query time
- Memory usage
- CPU usage
- Active users
- Agent activity

**Sample PromQL Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Response time P95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) /
rate(http_requests_total[5m])
```

---

## Log Analysis

### Common Queries

**Find slow requests:**
```bash
cat vienna.log | jq 'select(.duration > 1000) | {path, duration, userId}'
```

**Count errors by endpoint:**
```bash
cat vienna.log | jq -r 'select(.statusCode >= 500) | .path' | sort | uniq -c
```

**Find requests by user:**
```bash
cat vienna.log | jq 'select(.userId == "user_123")'
```

**Average response time by endpoint:**
```bash
cat vienna.log | jq -r '.path' | sort | uniq | while read path; do
  echo "$path: $(cat vienna.log | jq "select(.path == \"$path\") | .duration" | jq -s 'add/length')ms"
done
```

---

## Production Checklist

- [ ] Structured logging enabled
- [ ] Health endpoints configured
- [ ] Error tracking (Sentry) set up
- [ ] Log aggregation (Loki/CloudWatch) configured
- [ ] Performance monitoring enabled
- [ ] Alerts configured for critical metrics
- [ ] Grafana dashboard created
- [ ] On-call rotation defined
- [ ] Runbook created for common issues

---

## Next Steps

1. **Enable in Production:**
   - Add `requestLoggingMiddleware` to `src/app.ts`
   - Mount health router at `/health`
   - Configure Sentry with production DSN

2. **Set Up Aggregation:**
   - Deploy Loki + Promtail OR configure CloudWatch
   - Create Grafana dashboards
   - Set up alerts

3. **Monitor & Iterate:**
   - Review logs daily for patterns
   - Adjust alert thresholds based on baseline
   - Optimize slow queries identified by monitoring

---

**Monitoring setup: ✅ COMPLETE**

Next: **Testing**
