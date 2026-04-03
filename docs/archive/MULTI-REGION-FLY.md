# Multi-Region Deployment Guide

Vienna OS supports multi-region deployments for global performance, data residency compliance, and high availability.

## Architecture Overview

### Supported Regions

| Region | Location | Fly.io Code | Database Env | GDPR | Primary |
|--------|----------|-------------|--------------|------|---------|
| us-east | Washington, DC | `iad` | `POSTGRES_URL_US_EAST` | No | Yes |
| eu-west | Amsterdam, NL | `ams` | `POSTGRES_URL_EU_WEST` | Yes | No |
| ap-southeast | Singapore | `sin` | `POSTGRES_URL_AP_SOUTHEAST` | No | No |

### Request Flow

```
Client Request
     ↓
[Fly.io Edge Location]
     ↓
[Region Detection]
     ↓
[Fly-Replay Header] → Route to nearest region
     ↓
[Vienna OS Console]
     ↓
[Region-specific Database]
```

## How Multi-Region Works with Fly.io

### 1. DNS Routing
- `console.regulator.ai` resolves to Fly.io's global anycast network
- Fly.io routes requests to the nearest edge location
- Edge locations communicate with the closest region running Vienna OS

### 2. Region Detection
Vienna OS automatically detects the optimal region using:
- `Fly-Region` header: Current processing region
- `CF-IPCountry` header: Client's country code (from Cloudflare)
- Geographic routing rules

### 3. Fly-Replay Mechanism
When a request needs to be processed in a different region:
```javascript
// Set in response headers
res.setHeader('fly-replay', `region=${targetRegion.fly_region}`);
```

Fly.io automatically replays the request to the target region with the same:
- HTTP method and path
- Headers and body
- Client IP information

## Data Residency

### GDPR Compliance
- **EU West (Amsterdam)**: Fully GDPR compliant
- **US East & AP Southeast**: Not GDPR compliant

### Tenant Data Residency Rules

1. **Tenant Configuration**
   ```sql
   -- Tenants table includes data residency settings
   ALTER TABLE tenants ADD COLUMN data_residency_region VARCHAR(20);
   ALTER TABLE tenants ADD COLUMN requires_gdpr BOOLEAN DEFAULT FALSE;
   ```

2. **Enforcement**
   - Tenant data must stay in configured region
   - GDPR tenants can only use `eu-west` region
   - Cross-region queries are blocked for restricted tenants

3. **Data Classification**
   - **Personal Data**: Must respect residency rules
   - **Metadata**: Can be replicated globally
   - **Audit Logs**: Stored in tenant's primary region

### Example Data Residency Configuration
```typescript
// Tenant requiring GDPR compliance
{
  tenantId: "acme-corp-eu",
  dataResidencyRegion: "eu-west",
  requiresGDPR: true
}

// US-based tenant with flexible residency
{
  tenantId: "startup-us",
  dataResidencyRegion: null, // Allow any region
  requiresGDPR: false
}
```

## Adding a New Region

### 1. Infrastructure Setup
```bash
# Deploy to new region
flyctl deploy --region xyz

# Configure database
flyctl postgres create --region xyz --name vienna-xyz
```

### 2. Environment Variables
Add region-specific database URL:
```bash
flyctl secrets set POSTGRES_URL_XYZ="postgresql://..."
```

### 3. Update Region Configuration
Add new region to `regionService.ts`:
```typescript
{
  id: 'new-region',
  name: 'New Region Name',
  fly_region: 'xyz',
  postgres_url_env: 'POSTGRES_URL_XYZ',
  status: 'active',
  location: {
    country: 'Country',
    city: 'City',
    timezone: 'Timezone/Name'
  },
  features: {
    gdpr_compliant: false, // Set to true if GDPR compliant
    primary_region: false
  }
}
```

### 4. Database Migration
Run migrations in new region:
```bash
# Connect to region-specific database
POSTGRES_URL=$POSTGRES_URL_XYZ npm run migrate
```

### 5. Health Checks
The system automatically:
- Monitors new region health
- Routes traffic when healthy
- Fails over when unhealthy

## DNS Configuration

### Primary Domain
- **Domain**: `console.regulator.ai`
- **DNS Provider**: Cloudflare (recommended)
- **Record Type**: CNAME → `vienna-console.fly.dev`

### Regional Endpoints (Optional)
For direct regional access:
- `us-east.console.regulator.ai` → `iad.vienna-console.fly.dev`
- `eu-west.console.regulator.ai` → `ams.vienna-console.fly.dev`
- `ap-southeast.console.regulator.ai` → `sin.vienna-console.fly.dev`

### Fly.io Configuration
```toml
# fly.toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[http_service.concurrency]
  type = "requests"
  hard_limit = 1000
  soft_limit = 800

[[http_service.checks]]
  interval = "10s"
  timeout = "5s"
  grace_period = "5s"
  method = "GET"
  path = "/health"
  protocol = "http"
```

## Failover Strategy

### Automatic Failover
1. **Health Check Failure**: Region marked as `unavailable`
2. **Traffic Rerouting**: New requests route to healthy regions
3. **Database Failover**: Read replicas promote to primary (manual)
4. **Client Notification**: Status page updates automatically

### Regional Failure Scenarios

| Scenario | Impact | Recovery |
|----------|---------|----------|
| Single region down | 33% capacity loss | Automatic rerouting |
| Primary region down | Leadership election | Manual intervention |
| Database corruption | Data loss risk | Point-in-time recovery |
| Network partition | Split-brain risk | Manual resolution |

### Recovery Process
1. **Identify Failed Region**
   ```bash
   flyctl status --app vienna-console
   ```

2. **Check Database Health**
   ```bash
   flyctl postgres status --app vienna-db-iad
   ```

3. **Manual Failover (if needed)**
   ```bash
   # Promote replica to primary
   flyctl postgres failover --app vienna-db-iad
   ```

4. **Update Region Status**
   ```typescript
   // In admin interface or direct DB
   UPDATE regions SET status = 'maintenance' WHERE id = 'us-east';
   ```

## Monitoring & Alerts

### Key Metrics
- **Request Latency**: P50, P95, P99 per region
- **Error Rate**: 4xx/5xx responses per region
- **Request Count**: Throughput per region
- **Health Check Status**: Up/down per region
- **Database Connections**: Active connections per region

### Alerting Rules
```yaml
# Example AlertManager configuration
groups:
- name: vienna-multiregion
  rules:
  - alert: RegionDown
    expr: vienna_region_health == 0
    for: 60s
    labels:
      severity: critical
    annotations:
      summary: "Vienna region {{ $labels.region }} is down"
      
  - alert: HighLatency
    expr: vienna_request_latency_p95 > 2000
    for: 300s
    labels:
      severity: warning
    annotations:
      summary: "High latency in region {{ $labels.region }}"
```

### Monitoring Dashboard
Access regional metrics at:
- `/admin/metrics/regions` - Regional performance dashboard
- `/admin/health` - Real-time health status
- `/api/regions/metrics` - Raw metrics API

## Best Practices

### Development
- Test multi-region scenarios locally using Docker Compose
- Validate data residency rules in staging
- Use feature flags for region-specific functionality

### Security
- Encrypt inter-region communication
- Audit cross-region data access
- Implement region-aware access controls

### Performance
- Cache static assets in all regions
- Use read replicas for reporting queries
- Batch cross-region operations

### Compliance
- Document data flows for audits
- Implement data classification
- Regular compliance reviews

## Troubleshooting

### Common Issues

**Issue**: Request stuck in wrong region
```bash
# Check Fly-Replay headers
curl -H "Fly-Region: iad" https://console.regulator.ai/health -v
```

**Issue**: Database connection failures
```bash
# Test regional database connectivity
POSTGRES_URL=$POSTGRES_URL_EU_WEST psql -c "SELECT 1;"
```

**Issue**: Data residency violations
```sql
-- Check tenant region configuration
SELECT tenant_id, data_residency_region, requires_gdpr 
FROM tenants 
WHERE data_residency_region IS NOT NULL;
```

### Debug Endpoints
- `GET /debug/region` - Current region information
- `GET /debug/health` - Detailed health check results
- `GET /debug/routing` - Request routing decision tree

---

For additional support, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Hardening](./SECURITY-HARDENING.md)