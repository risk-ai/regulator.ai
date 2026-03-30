# Vienna OS Production Runbook

**Last Updated:** 2026-03-29  
**On-Call:** Max Anderson  
**Status Page:** https://status.regulator.ai (TBD)

---

## Quick Reference

**Service URLs:**
- Production: https://console.regulator.ai
- Health: https://console.regulator.ai/health
- Metrics: https://console.regulator.ai/health/metrics
- Sentry: https://sentry.io/organizations/vienna-os

**Database:**
- Provider: Neon (PostgreSQL)
- Connection: `POSTGRES_URL` (in environment)

**Deployment:**
- Platform: Vercel
- Deploy: `vercel deploy --prod`
- Logs: `vercel logs` or Vercel dashboard

---

## Common Issues

### 1. Service Down (500 Errors)

**Symptoms:**
- `/health` returns 503
- All API requests return 500
- Sentry shows spike in errors

**Diagnosis:**
```bash
# Check health endpoint
curl https://console.regulator.ai/health

# Check Vercel logs
vercel logs --prod

# Check database connectivity
curl https://console.regulator.ai/health | jq '.checks.database'
```

**Possible Causes:**

#### A. Database Connection Failure

**Check:**
```bash
# Verify POSTGRES_URL is set
vercel env ls

# Test database connection
psql "$POSTGRES_URL" -c "SELECT 1"
```

**Fix:**
1. Check Neon dashboard for outages
2. Verify POSTGRES_URL is correct
3. Check connection pool limits
4. Restart service: `vercel --prod`

#### B. Memory Exhaustion

**Check:**
```bash
curl https://console.regulator.ai/health/metrics | jq '.memory'
```

**Fix:**
1. Check for memory leaks in Sentry
2. Review slow queries causing memory buildup
3. Increase Vercel function memory limit
4. Add Redis caching to reduce memory usage

#### C. Vienna Core Failure

**Check logs for:**
```
StateGraph not initialized
Vienna Core unavailable
```

**Fix:**
1. Check Vienna Core logs
2. Verify state graph database file exists
3. Restart service

---

### 2. Slow Response Times

**Symptoms:**
- P95 > 500ms
- Users reporting lag
- Slow query alerts firing

**Diagnosis:**
```bash
# Check current metrics
curl https://console.regulator.ai/health/metrics | jq '.performance'

# Query slow logs
cat vienna.log | jq 'select(.duration > 1000) | {path, duration, userId}'
```

**Fixes:**

#### A. Database Slow Queries

```bash
# Find slow queries in PostgreSQL
psql "$POSTGRES_URL" -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
"
```

**Solutions:**
- Add missing indexes
- Optimize query (use EXPLAIN ANALYZE)
- Add pagination to large result sets
- Cache frequently accessed data

#### B. External API Latency

**Check provider health:**
```bash
curl https://console.regulator.ai/health | jq '.provider_health'
```

**Solutions:**
- Switch to backup provider
- Increase timeout limits
- Add retry logic with exponential backoff

#### C. High Traffic

**Check request rate:**
```bash
# Requests per minute
cat vienna.log | jq -r '.timestamp' | cut -c1-16 | uniq -c
```

**Solutions:**
- Enable rate limiting (already configured)
- Add Redis caching
- Scale Vercel functions
- Add CDN for static assets

---

### 3. Authentication Failures

**Symptoms:**
- Users can't log in
- "Unauthorized" errors
- JWT validation failures

**Diagnosis:**
```bash
# Check auth errors
cat vienna.log | jq 'select(.path == "/api/v1/auth/login" and .statusCode != 200)'
```

**Possible Causes:**

#### A. JWT Secret Changed

**Check:**
```bash
# Verify JWT_SECRET is set
vercel env ls | grep JWT_SECRET
```

**Fix:**
- Ensure JWT_SECRET matches across deployments
- If changed, all users need to re-login

#### B. Database Connection Issue

**Check:**
```bash
# Verify user lookup works
psql "$POSTGRES_URL" -c "SELECT COUNT(*) FROM users"
```

**Fix:**
- Check database connectivity
- Verify users table exists
- Check for schema migrations needed

#### C. Rate Limiting

**Check:**
```bash
# Auth rate limit violations
cat vienna.log | jq 'select(.path =~ "/auth" and .statusCode == 429)'
```

**Fix:**
- Verify rate limit settings (5 req/15min for auth)
- Whitelist trusted IPs if needed
- Check for brute force attacks

---

### 4. Data Isolation Issues (Cross-Tenant Leakage)

**Symptoms:**
- User A sees User B's data
- Wrong tenant_id in responses
- Security audit alerts

**CRITICAL: Stop all traffic immediately**

**Diagnosis:**
```bash
# Run tenant isolation tests
npm test -- tenant-isolation

# Check for missing tenant filters
grep -r "SELECT.*FROM.*WHERE" src/ | grep -v "tenant_id"
```

**Fix:**
1. Immediately deploy fix
2. Notify affected users
3. Audit access logs for actual data leakage
4. Document incident for security review

**Prevention:**
- All tests must pass before deployment
- Code review required for data queries
- Automated security scanning in CI

---

### 5. High Error Rate

**Symptoms:**
- Sentry alert: Error rate > 5%
- Multiple 500 errors in logs

**Diagnosis:**
```bash
# Group errors by type
cat vienna.log | jq -r 'select(.statusCode >= 500) | .error' | sort | uniq -c | sort -rn

# Check Sentry for stack traces
# https://sentry.io/organizations/vienna-os/issues/
```

**Common Errors:**

#### A. Uncaught Exceptions

**Fix:**
1. Review Sentry stack trace
2. Add error handling
3. Deploy fix
4. Monitor for recurrence

#### B. External API Failures

**Fix:**
1. Check provider status pages
2. Enable fallback providers
3. Add circuit breaker pattern
4. Improve error messages to users

#### C. Input Validation Failures

**Fix:**
1. Add validation middleware
2. Return 400 instead of 500
3. Add input sanitization
4. Update API documentation

---

## Deployment Process

### Standard Deployment

```bash
# 1. Run tests locally
npm test

# 2. Build
npm run build

# 3. Deploy to production
vercel deploy --prod

# 4. Verify deployment
curl https://console.regulator.ai/health

# 5. Monitor for 15 minutes
vercel logs --prod --follow
```

### Rollback Procedure

```bash
# 1. Get list of deployments
vercel ls

# 2. Promote previous deployment
vercel promote <deployment-url>

# 3. Verify health
curl https://console.regulator.ai/health

# 4. Investigate issue in dev environment
```

---

## Monitoring Dashboards

### Key Metrics to Watch

**System Health:**
- Uptime (target: 99.9%)
- Error rate (target: < 1%)
- P95 response time (target: < 200ms)
- Memory usage (alert if > 80%)

**Business Metrics:**
- Active users
- Agent registrations
- Policy creations
- Approval requests

**Database:**
- Connection pool utilization
- Query latency
- Slow queries (> 100ms)

---

## Alerts

### Critical (Page Immediately)

1. **Service Down**
   - `/health` returns 503
   - Action: Follow "Service Down" runbook

2. **High Error Rate**
   - > 5% of requests return 5xx
   - Action: Check Sentry, follow "High Error Rate" runbook

3. **Database Connection Failure**
   - Cannot connect to PostgreSQL
   - Action: Check Neon status, verify POSTGRES_URL

### Warning (Slack Notification)

1. **Slow Response Time**
   - P95 > 500ms
   - Action: Investigate slow queries

2. **High Memory Usage**
   - > 80% memory used
   - Action: Check for leaks, consider scaling

3. **Rate Limit Violations**
   - Unusual spike in 429 responses
   - Action: Check for abuse

---

## Escalation

### Level 1: Auto-Resolution
- Health checks failing: Auto-restart
- Slow queries: Auto-log and alert

### Level 2: On-Call Engineer
- Service down > 5 minutes
- Error rate > 5%
- Database connection failures

### Level 3: CTO (Max Anderson)
- Security incidents
- Data breaches
- Service down > 30 minutes

---

## Maintenance Windows

**Preferred:**
- Sunday 2-4 AM EST (lowest traffic)

**Process:**
1. Announce maintenance 24 hours in advance
2. Deploy status page notice
3. Perform maintenance
4. Verify all services healthy
5. Update status page

---

## Post-Incident Review

**After any production incident:**

1. **Document:**
   - What happened?
   - When did it start/end?
   - Who was affected?
   - What was the impact?

2. **Root Cause:**
   - Why did it happen?
   - What was missed?
   - How was it detected?

3. **Prevention:**
   - What can prevent recurrence?
   - What monitoring is needed?
   - What process changes?

4. **Action Items:**
   - Assign owners
   - Set deadlines
   - Track completion

**Template:** Create issue in GitHub with label `incident`

---

## Useful Commands

### Check Production Status
```bash
# Health check
curl https://console.regulator.ai/health | jq

# Metrics
curl https://console.regulator.ai/health/metrics | jq '.performance'

# Deployment info
vercel ls --prod

# Live logs
vercel logs --prod --follow
```

### Database Operations
```bash
# Connect to production DB
psql "$POSTGRES_URL"

# Check table sizes
psql "$POSTGRES_URL" -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Find slow queries
psql "$POSTGRES_URL" -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

### Log Analysis
```bash
# Recent errors
vercel logs --prod | grep ERROR

# Request rate per minute
vercel logs --prod | grep "INFO" | cut -c1-16 | uniq -c

# Slowest requests
cat vienna.log | jq 'select(.duration > 1000) | {path, duration}' | jq -s 'sort_by(.duration) | reverse | .[0:10]'
```

---

## Contact Information

**Engineering:**
- Max Anderson (CEO/Product): max@regulator.ai
- Vienna (Technical Lead): OpenClaw agent

**External:**
- Neon Support: support@neon.tech
- Vercel Support: https://vercel.com/support
- Sentry Support: support@sentry.io

**Emergency:**
- Max Anderson: [phone number]

---

**Last Updated:** 2026-03-29  
**Next Review:** 2026-04-05
