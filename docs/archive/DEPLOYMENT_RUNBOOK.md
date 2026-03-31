# Vienna Console - Deployment Runbook (NUC Infrastructure)

**Version:** 2.0  
**Last Updated:** 2026-03-28  
**Infrastructure:** NUC (maxlawai) + Cloudflare Tunnel

---

## Pre-Deployment Checklist

### Code
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build:prod`)
- [ ] No console errors/warnings
- [ ] Git branch up to date with `main`
- [ ] Version bumped (if needed)

### Database
- [ ] Migrations run successfully
- [ ] Database backup created
- [ ] Connection string verified
- [ ] Permissions verified

### Environment
- [ ] All required env vars set
- [ ] Secrets rotated (if scheduled)
- [ ] SSL certificates valid
- [ ] DNS records verified

### Services
- [ ] Systemd services configured
- [ ] Cloudflare Tunnel connected
- [ ] Postgres running
- [ ] Ollama running (if used)

---

## Deployment Steps

### 1. Prepare

```bash
# SSH to NUC (if remote)
ssh maxlawai

# Navigate to repo
cd ~/.openclaw/workspace/regulator-ai-repo

# Pull latest changes
git pull origin main

# Check status
git status
git log --oneline -5
```

### 2. Backup

```bash
# Backup database
./scripts/backup-database.sh

# Verify backup
ls -lh ~/.openclaw/backups/ | tail -3
```

### 3. Build

```bash
# Install dependencies (if needed)
cd apps/console/server
npm install

# Run tests
npm test

# Build production bundle
npm run build:prod

# Verify build
ls -lh build/server.cjs
```

### 4. Deploy

```bash
# Restart service
sudo systemctl restart vienna-console

# Wait for startup
sleep 10

# Check status
sudo systemctl status vienna-console

# Check logs for errors
sudo journalctl -u vienna-console -n 50 --no-pager
```

### 5. Verify

```bash
# Health check (local)
curl http://localhost:3100/health | jq

# Health check (external via Cloudflare Tunnel)
curl https://console.regulator.ai/health | jq

# Detailed health
curl http://localhost:3100/api/v1/system/health/detailed | jq '{overall_status: .data.overall_status}'

# Test auth
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"vienna@regulator.ai","password":"<password>"}' | jq '{success}'

# Test dashboard
curl http://localhost:3100/api/v1/dashboard/bootstrap | jq '{success, objectives_count: (.data.objectives | length)}'

# Check metrics
curl http://localhost:3100/metrics | head -20

# Verify Cloudflare Tunnel
sudo systemctl status cloudflared-vienna
```

### 6. Monitor

```bash
# Watch logs
sudo journalctl -u vienna-console -f

# Check Cloudflare Tunnel
sudo journalctl -u cloudflared-vienna -f

# Monitor metrics
watch -n 5 'curl -s http://localhost:3100/health | jq'

# Check auto-deploy cron
crontab -l | grep vienna-auto-deploy
```

---

## Rollback Procedure

### Quick Rollback (Service Issue)

```bash
# Stop service
sudo systemctl stop vienna-console

# Restore previous build (if available)
cd ~/.openclaw/workspace/regulator-ai-repo/apps/console/server
git checkout HEAD~1
npm run build:prod

# Restart
sudo systemctl restart vienna-console

# Verify
curl http://localhost:3100/health
```

### Database Rollback

```bash
# Stop service
sudo systemctl stop vienna-console

# Restore database
gunzip -c ~/.openclaw/backups/vienna_prod_YYYYMMDD_HHMMSS.sql.gz | \
  sudo -u postgres psql -d vienna_prod

# Restart service
sudo systemctl restart vienna-console

# Verify
curl http://localhost:3100/health
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u vienna-console -n 100 --no-pager

# Check port
lsof -i:3100

# Check permissions
ls -la /home/maxlawai/.openclaw/workspace/regulator-ai-repo/apps/console/server/build/

# Try manual start
cd ~/.openclaw/workspace/regulator-ai-repo/apps/console/server
node build/server.cjs
```

### Database Connection Failed

```bash
# Check Postgres
systemctl status postgresql
sudo -u postgres psql -l

# Test connection
sudo -u postgres psql -d vienna_prod -c "SELECT 1"

# Check credentials
grep POSTGRES_URL ~/.openclaw/workspace/regulator-ai-repo/.env.console

# Grant permissions
sudo -u postgres psql -d vienna_prod -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO vienna"
```

### Cloudflare Tunnel Issues

```bash
# Check status
sudo systemctl status cloudflared-vienna

# Check logs
sudo journalctl -u cloudflared-vienna -n 50 --no-pager

# Test local connectivity
curl http://localhost:3100/health

# Restart tunnel
sudo systemctl restart cloudflared-vienna
```

### High Memory/CPU Usage

```bash
# Check process stats
top -b -n 1 | grep node

# Check memory
free -h

# Restart if needed
sudo systemctl restart vienna-console

# Check for leaks
node --inspect build/server.cjs
```

---

## Emergency Contacts

**On-Call:** Max Anderson  
**Backup:** N/A (single operator)  
**Escalation:** N/A

---

## Common Operations

### Update Environment Variables

```bash
# Edit config
nano ~/.openclaw/workspace/regulator-ai-repo/.env.console

# Restart service
sudo systemctl restart vienna-console

# Verify
sudo journalctl -u vienna-console -n 20 --no-pager
```

### Rotate Secrets

```bash
# Generate new secret
openssl rand -hex 32

# Update .env.console
nano ~/.openclaw/workspace/regulator-ai-repo/.env.console

# Restart
sudo systemctl restart vienna-console
```

### Manual Database Backup

```bash
# Run backup script
./scripts/backup-database.sh

# Or manual
sudo -u postgres pg_dump vienna_prod | gzip > ~/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### View Metrics

```bash
# Prometheus metrics
curl http://localhost:3100/metrics

# Health detailed
curl http://localhost:3100/api/v1/system/health/detailed | jq

# Queue state
curl http://localhost:3100/api/v1/system/status | jq '.data.queue'
```

---

## Performance Tuning

### Check Response Times

```bash
# Health endpoint
time curl -s http://localhost:3100/health > /dev/null

# Dashboard
time curl -s http://localhost:3100/api/v1/dashboard/bootstrap > /dev/null

# Average over 10 requests
for i in {1..10}; do time curl -s http://localhost:3100/health > /dev/null; done 2>&1 | grep real
```

### Database Optimization

```bash
# Vacuum and analyze
sudo -u postgres psql -d vienna_prod -c "VACUUM ANALYZE"

# Check index usage
sudo -u postgres psql -d vienna_prod -c "
  SELECT schemaname, tablename, indexname, idx_scan 
  FROM pg_stat_user_indexes 
  ORDER BY idx_scan DESC LIMIT 10
"

# Check table sizes
sudo -u postgres psql -d vienna_prod -c "
  SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
"
```

---

## Monitoring Setup

### Prometheus Scraping

Add to Prometheus config:

```yaml
scrape_configs:
  - job_name: 'vienna-console'
    static_configs:
      - targets: ['localhost:3100']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

Import metrics:
- `vienna_http_request_duration_seconds`
- `vienna_http_requests_total`
- `vienna_active_connections`
- `vienna_errors_total`

### Alerting Rules

```yaml
groups:
  - name: vienna_console
    rules:
      - alert: HighErrorRate
        expr: rate(vienna_errors_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: ServiceDown
        expr: up{job="vienna-console"} == 0
        for: 1m
        annotations:
          summary: "Vienna Console is down"
```

---

## Security Checklist

- [ ] HTTPS enabled (via Cloudflare)
- [ ] Auth required for all endpoints
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Secrets in environment (not code)
- [ ] Database passwords strong
- [ ] Backup encryption enabled
- [ ] Log rotation configured
- [ ] Regular security audits

---

## Post-Deployment

### Verify Everything

```bash
# Run full health check
curl http://localhost:3100/api/v1/system/health/detailed | jq

# Check metrics
curl http://localhost:3100/metrics | grep vienna_http_requests_total

# Test auth
curl -X POST http://localhost:3100/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test"}' | jq

# Monitor logs for 5 minutes
timeout 300 sudo journalctl -u vienna-console -f
```

### Document Changes

- Update CHANGELOG.md
- Tag release in git
- Update deployment docs
- Notify team (if applicable)

---

## Maintenance Windows

**Recommended:** Sunday 2AM-4AM EDT (low traffic)

**Pre-Maintenance:**
1. Announce maintenance window
2. Create database backup
3. Verify rollback procedure
4. Prepare communication templates

**During Maintenance:**
1. Put up maintenance page (if applicable)
2. Stop services
3. Perform updates
4. Test thoroughly
5. Resume services

**Post-Maintenance:**
1. Monitor for 30 minutes
2. Announce completion
3. Document changes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-27 | Initial runbook |

---

**Maintained by:** Vienna Team  
**Last Reviewed:** 2026-03-27
