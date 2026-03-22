# Vienna OS Deployment Guide

**Version:** 2.0.0  
**Status:** Production Ready  
**Last Updated:** 2026-03-21

---

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: 22.x)
- npm or pnpm
- SQLite 3
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/MaxAnderson-code/vienna-os.git
cd vienna-os

# Install dependencies
npm install

# Start development servers
npm run dev

# Or start separately
npm run dev:server  # Backend on http://localhost:3100
npm run dev:client  # Frontend on http://localhost:5174
```

### Build for Production

```bash
# Build both frontend and backend
npm run build

# Or build separately
npm run build:client
npm run build:server

# Start production server
npm start
```

---

## Deployment Options

### Option 1: Fly.io (Recommended)

**Best for:** Full Node.js runtime, persistent storage, background processes

#### Prerequisites
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# Authenticate
flyctl auth login
```

#### Deploy

```bash
# Create app (first time only)
flyctl apps create vienna-os

# Create persistent volume for SQLite
flyctl volumes create vienna_data --size 10 --region iad

# Set secrets
flyctl secrets set \
  VIENNA_OPERATOR_PASSWORD="your-secure-password" \
  VIENNA_SESSION_SECRET="$(openssl rand -hex 32)" \
  ANTHROPIC_API_KEY="your-anthropic-key"

# Deploy
flyctl deploy

# Check status
flyctl status
flyctl logs
```

#### Environment Variables (Fly.io)

**Required:**
- `VIENNA_OPERATOR_PASSWORD` - Admin password
- `VIENNA_SESSION_SECRET` - Session encryption key (32+ bytes)

**Optional:**
- `ANTHROPIC_API_KEY` - For AI features
- `OLLAMA_BASE_URL` - Local Ollama endpoint
- `DATABASE_PATH` - SQLite database path (default: `/app/runtime/prod/state/state.db`)

#### Update fly.toml (if needed)

```toml
app = "your-app-name"  # Change this
primary_region = "iad"  # Or your preferred region

[mounts]
  source = "vienna_data"
  destination = "/app/runtime"
```

---

### Option 2: Vercel

**Best for:** Quick deployment, serverless, automatic HTTPS

**Note:** Vercel has 10s timeout limit for serverless functions. For long-running operations, use Fly.io.

#### Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Environment Variables (Vercel)

Set via Vercel dashboard or CLI:

```bash
vercel env add VIENNA_OPERATOR_PASSWORD production
vercel env add VIENNA_SESSION_SECRET production
vercel env add ANTHROPIC_API_KEY production
```

**Important:** Vercel uses ephemeral filesystem. Database resets on each deployment. Consider:
- External database (Turso, PlanetScale)
- Persistent volume service
- Or use Fly.io for stateful deployments

---

### Option 3: Docker

**Best for:** Any cloud provider, Kubernetes, self-hosting

#### Build Image

```bash
# Build
docker build -t vienna-os:latest .

# Run
docker run -d \
  -p 3100:3100 \
  -e VIENNA_OPERATOR_PASSWORD="your-password" \
  -e VIENNA_SESSION_SECRET="$(openssl rand -hex 32)" \
  -e ANTHROPIC_API_KEY="your-key" \
  -v vienna-data:/app/runtime \
  --name vienna-os \
  vienna-os:latest

# Check logs
docker logs -f vienna-os

# Health check
curl http://localhost:3100/health
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vienna-os:
    build: .
    ports:
      - "3100:3100"
    environment:
      - NODE_ENV=production
      - VIENNA_OPERATOR_PASSWORD=${VIENNA_OPERATOR_PASSWORD}
      - VIENNA_SESSION_SECRET=${VIENNA_SESSION_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - vienna-data:/app/runtime
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  vienna-data:
```

Run:
```bash
docker-compose up -d
```

---

### Option 4: Railway

**Best for:** Simple deployment, built-in database options

#### Deploy

1. Go to https://railway.app
2. Create new project → "Deploy from GitHub repo"
3. Select `vienna-os` repository
4. Set environment variables:
   - `VIENNA_OPERATOR_PASSWORD`
   - `VIENNA_SESSION_SECRET`
   - `ANTHROPIC_API_KEY`
5. Deploy

Railway will auto-detect the Dockerfile and deploy.

---

### Option 5: Render

**Best for:** Free tier, PostgreSQL included

#### Deploy

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Docker (uses Dockerfile)
5. Add environment variables
6. Create service

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VIENNA_OPERATOR_PASSWORD` | Admin password for operator access | `P@ssw0rd123!` |
| `VIENNA_SESSION_SECRET` | Session encryption key | `$(openssl rand -hex 32)` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3100` |
| `HOST` | Server host | `0.0.0.0` |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OLLAMA_BASE_URL` | Ollama endpoint | `http://localhost:11434` |
| `DATABASE_PATH` | SQLite database path | `/app/runtime/prod/state/state.db` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

---

## Post-Deployment

### 1. Verify Health

```bash
# Check health endpoint
curl https://your-domain.com/health

# Expected response:
{
  "success": true,
  "data": {
    "runtime": { "status": "healthy" },
    "providers": { "chat_available": true }
  }
}
```

### 2. Access Dashboard

Navigate to: `https://your-domain.com`

Login with your `VIENNA_OPERATOR_PASSWORD`

### 3. Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Phase validation tests
npm run test:phase15
npm run test:phase16
npm run test:phase17
```

### 4. Monitor Logs

**Fly.io:**
```bash
flyctl logs -a vienna-os
```

**Docker:**
```bash
docker logs -f vienna-os
```

**Vercel:**
```bash
vercel logs
```

---

## Database Management

### SQLite (Default)

**Location:** `/app/runtime/prod/state/state.db`

**Backup:**
```bash
# Fly.io
flyctl ssh console -a vienna-os
sqlite3 /app/runtime/prod/state/state.db ".backup /tmp/backup.db"
flyctl sftp get /tmp/backup.db ./backup-$(date +%Y%m%d).db

# Docker
docker exec vienna-os sqlite3 /app/runtime/prod/state/state.db ".backup /tmp/backup.db"
docker cp vienna-os:/tmp/backup.db ./backup-$(date +%Y%m%d).db
```

**Restore:**
```bash
# Fly.io
flyctl sftp put backup.db /app/runtime/prod/state/state.db

# Docker
docker cp backup.db vienna-os:/app/runtime/prod/state/state.db
docker restart vienna-os
```

### Migrations

Migrations run automatically on startup. Located in:
- `lib/state/migrations/`

To run manually:
```bash
node scripts/run-migrations.js
```

---

## Scaling

### Fly.io

**Horizontal scaling:**
```bash
flyctl scale count 3 -a vienna-os
```

**Vertical scaling:**
```bash
flyctl scale vm shared-cpu-2x -a vienna-os
flyctl scale memory 4096 -a vienna-os
```

### Docker

**Multiple instances with load balancer:**

Update `docker-compose.yml`:
```yaml
services:
  vienna-os:
    deploy:
      replicas: 3
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - vienna-os
```

---

## Security Checklist

- [ ] Strong `VIENNA_OPERATOR_PASSWORD` set
- [ ] Unique `VIENNA_SESSION_SECRET` (32+ bytes)
- [ ] HTTPS enabled
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Database backups automated
- [ ] Environment variables stored securely (not in code)
- [ ] CORS origins restricted in production
- [ ] Regular security updates scheduled

---

## Troubleshooting

### Application won't start

**Check:**
1. Environment variables set correctly
2. Port 3100 not already in use
3. Node.js version ≥18
4. Dependencies installed: `npm install`

**Logs:**
```bash
# Fly.io
flyctl logs -a vienna-os

# Docker
docker logs vienna-os

# Local
npm start 2>&1 | tee error.log
```

### Database locked errors

**Solution:**
- Ensure only one instance accessing SQLite
- Use external database for multi-instance deployments
- Check file permissions

### Health check failing

**Check:**
1. Server is running: `curl http://localhost:3100/health`
2. Database is accessible
3. Required environment variables set

### Out of memory

**Solutions:**
- Increase memory allocation (Fly.io: `flyctl scale memory 2048`)
- Optimize queries
- Enable database connection pooling

---

## Performance Optimization

### Recommended Settings

**Fly.io:**
- CPU: 2 shared cores minimum
- Memory: 2048 MB minimum
- Region: Closest to users

**Docker:**
- Memory limit: 2GB+
- CPU limit: 2 cores+

### Caching

Vienna OS includes built-in caching for:
- Warrant validation
- Policy decisions
- State graph queries

No additional configuration needed.

---

## Monitoring

### Built-in Endpoints

- `/health` - Application health
- `/api/v1/system/now` - System status
- `/api/v1/managed-objectives` - Objectives status

### Recommended Monitoring

**Fly.io:**
- Built-in metrics dashboard
- `flyctl metrics -a vienna-os`

**External:**
- Sentry (error tracking)
- Datadog (APM)
- Prometheus + Grafana

---

## Backup Strategy

### Recommended Schedule

- **Hourly:** Database snapshots (retain 24)
- **Daily:** Full backups (retain 7)
- **Weekly:** Long-term archives (retain 4)

### Automated Backup Script

```bash
#!/bin/bash
# backup-vienna.sh

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/vienna"
mkdir -p "$BACKUP_DIR"

# Backup database
sqlite3 /app/runtime/prod/state/state.db ".backup $BACKUP_DIR/vienna-$DATE.db"

# Compress
gzip "$BACKUP_DIR/vienna-$DATE.db"

# Retain last 7 days
find "$BACKUP_DIR" -name "vienna-*.db.gz" -mtime +7 -delete

echo "Backup complete: vienna-$DATE.db.gz"
```

Add to cron:
```bash
0 * * * * /path/to/backup-vienna.sh
```

---

## Rollback Procedure

### Fly.io

```bash
# List releases
flyctl releases -a vienna-os

# Rollback to previous
flyctl releases rollback <version> -a vienna-os
```

### Docker

```bash
# List images
docker images vienna-os

# Rollback
docker stop vienna-os
docker rm vienna-os
docker run -d --name vienna-os vienna-os:<previous-tag>
```

### Database Rollback

```bash
# Restore from backup
cp backup-YYYYMMDD.db /app/runtime/prod/state/state.db
# Restart application
```

---

## Support

**Documentation:** https://github.com/MaxAnderson-code/vienna-os  
**Issues:** https://github.com/MaxAnderson-code/vienna-os/issues  
**Security:** Report via GitHub Security tab

---

## License

MIT License - See LICENSE file

---

**Last Updated:** 2026-03-21  
**Vienna OS Version:** 2.0.0  
**Deployment Guide Version:** 1.0
