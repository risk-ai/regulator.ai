# Vienna OS — Docker Setup

Run Vienna OS locally with Docker Compose.

---

## Quick Start

```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker compose up

# Backend API: http://localhost:3100
# Frontend UI: http://localhost:5173
# Database: localhost:5432
```

**Default credentials:**
- Email: `demo@regulator.ai`
- Password: `vienna-dev`

---

## Services

### 1. PostgreSQL Database
- **Image:** `postgres:16-alpine`
- **Port:** `5432`
- **Database:** `vienna_dev`
- **User:** `vienna`
- **Password:** `vienna_dev`

Data persists in Docker volume `postgres_data`.

### 2. Backend API (console-proxy)
- **Build:** `Dockerfile` (Node.js 20 Alpine)
- **Port:** `3100`
- **Endpoints:** `/api/v1/*`
- **Health:** `http://localhost:3100/api/v1/health`

### 3. Frontend Console (console)
- **Build:** `apps/console/Dockerfile` (Vite + nginx)
- **Port:** `5173` (mapped to nginx port 80 inside container)
- **URL:** `http://localhost:5173`

---

## Environment Variables

Edit `docker-compose.yml` or create `.env`:

```bash
# Backend
DATABASE_URL=postgres://vienna:vienna_dev@postgres:5432/vienna_dev
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_...  # Optional
RESEND_API_KEY=re_...          # Optional

# Frontend
VITE_API_URL=http://localhost:3100
```

---

## Production Deployment

### Build Production Images

```bash
# Backend
docker build -t vienna-backend:latest .

# Frontend
docker build -t vienna-frontend:latest -f apps/console/Dockerfile apps/console
```

### Run with Production Config

```bash
docker run -d \
  --name vienna-backend \
  -p 3100:3100 \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e JWT_SECRET=production-secret \
  vienna-backend:latest

docker run -d \
  --name vienna-frontend \
  -p 80:80 \
  vienna-frontend:latest
```

### Managed PostgreSQL

For production, use a managed database (Neon, Supabase, AWS RDS):

```bash
docker run -d \
  -p 3100:3100 \
  -e DATABASE_URL=postgresql://user:pass@neon.tech/vienna_prod \
  -e JWT_SECRET=production-secret \
  -e STRIPE_SECRET_KEY=sk_live_... \
  vienna-backend:latest
```

---

## Commands

### Start Services

```bash
# Foreground (see logs)
docker compose up

# Background
docker compose up -d

# Rebuild images
docker compose up --build
```

### Stop Services

```bash
# Stop (keeps volumes)
docker compose down

# Stop + remove volumes (⚠️ deletes database)
docker compose down -v
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

### Run Migrations

```bash
# Inside backend container
docker compose exec backend node run-migrations.js

# Or from host with DATABASE_URL pointing to container
export DATABASE_URL=postgres://vienna:vienna_dev@localhost:5432/vienna_dev
node apps/console-proxy/run-migrations.js
```

### Inspect Database

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U vienna -d vienna_dev

# List tables
\dt

# Query tenants
SELECT * FROM tenants;
```

---

## Troubleshooting

### Backend won't start

**Check database connection:**

```bash
docker compose logs postgres
docker compose logs backend
```

**Ensure PostgreSQL is healthy:**

```bash
docker compose ps
# Should show postgres as "healthy"
```

**Reset database:**

```bash
docker compose down -v
docker compose up
```

### Frontend can't reach backend

**Check CORS configuration:**

Frontend URL must be in `CORS_ORIGIN` env variable.

Default: `http://localhost:5173,http://localhost:3100`

**Check backend health:**

```bash
curl http://localhost:3100/api/v1/health
# Should return: {"status":"healthy"}
```

### Port conflicts

**If port 3100 or 5173 is already in use:**

Edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:3100"  # Use port 8080 on host

  frontend:
    ports:
      - "8000:80"    # Use port 8000 on host
```

Then update `VITE_API_URL` to match.

---

## Self-Hosting

### Recommended Stack

**Small team (< 10 agents):**
- **Compute:** Single VPS (2 CPU, 4GB RAM)
- **Database:** Neon.tech (free tier)
- **Deploy:** Docker on Ubuntu 22.04

**Medium team (10-100 agents):**
- **Compute:** 2-3 containers (backend + frontend + worker)
- **Database:** Managed PostgreSQL (Neon/Supabase)
- **Deploy:** Docker Swarm or Kubernetes
- **Monitoring:** Prometheus + Grafana

**Enterprise (100+ agents):**
- **Compute:** Kubernetes cluster
- **Database:** Multi-region PostgreSQL (RDS/CloudSQL)
- **CDN:** Cloudflare for frontend
- **Monitoring:** Datadog/New Relic
- **Support:** Contact hello@regulator.ai

### Minimal VPS Setup (Ubuntu 22.04)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repo
git clone https://github.com/risk-ai/vienna-os.git
cd vienna-os

# Configure environment
cp .env.example .env
nano .env  # Edit DATABASE_URL, JWT_SECRET, etc.

# Start
docker compose up -d

# Monitor
docker compose logs -f
```

**Expose with Caddy (automatic HTTPS):**

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Configure Caddyfile
cat > /etc/caddy/Caddyfile <<EOF
console.yourdomain.com {
  reverse_proxy localhost:5173
}

api.yourdomain.com {
  reverse_proxy localhost:3100
}
EOF

# Reload Caddy
systemctl reload caddy
```

---

## Support

- **Documentation:** https://regulator.ai/docs
- **Discord:** https://discord.gg/vienna-os
- **Email:** hello@regulator.ai

---

## License

Business Source License 1.1 — See [LICENSE](LICENSE)
