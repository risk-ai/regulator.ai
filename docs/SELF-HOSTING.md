# Vienna OS Self-Hosting Guide

This guide covers security hardening, firewall configuration, and best practices for running Vienna OS on your own infrastructure.

> **Note:** The hosted version at [console.regulator.ai](https://console.regulator.ai) is fully managed and includes all security hardening out of the box. This guide is for teams deploying their own instance.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Docker Deployment](#docker-deployment)
3. [Firewall Configuration (ufw)](#firewall-configuration)
4. [Environment Variables](#environment-variables)
5. [Host Header Hardening](#host-header-hardening)
6. [Sandbox Isolation](#sandbox-isolation)
7. [TLS / HTTPS](#tls--https)
8. [Database Security](#database-security)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Security Checklist](#security-checklist)

---

## Prerequisites

- Linux server (Ubuntu 22.04+ recommended)
- Docker 24+ and Docker Compose
- PostgreSQL 15+ (or Neon account)
- Domain name with DNS configured
- Reverse proxy (nginx or Caddy)

---

## Docker Deployment

```bash
# Clone the repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Copy and edit environment file
cp apps/console-proxy/.env.example apps/console-proxy/.env
nano apps/console-proxy/.env

# Build and start
docker build -t vienna-os:latest -f Dockerfile .
docker run -d \
  --name vienna-os \
  --env-file apps/console-proxy/.env \
  -p 127.0.0.1:3100:3100 \  # Bind to localhost only — nginx proxies externally
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  vienna-os:latest
```

### Docker Security Options Explained

| Flag | Purpose |
|------|---------|
| `-p 127.0.0.1:3100:3100` | Bind to localhost only; requires nginx/Caddy reverse proxy |
| `--read-only` | Prevent container from writing to its filesystem |
| `--tmpfs /tmp` | Allow /tmp writes (needed for temp files) in RAM |
| `--security-opt no-new-privileges:true` | Prevent privilege escalation inside container |
| `--cap-drop ALL` | Drop all Linux capabilities; add back only what's needed |
| `--restart unless-stopped` | Auto-restart on crash |

---

## Firewall Configuration

### UFW (Uncomplicated Firewall) Setup

```bash
# Install ufw if not present
sudo apt install ufw -y

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if you've configured non-standard)
sudo ufw allow 22/tcp comment "SSH"

# Allow HTTPS (for nginx/Caddy reverse proxy)
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw allow 80/tcp comment "HTTP (redirect to HTTPS)"

# NEVER allow the Vienna OS port (3100) directly from the internet
# It should only be accessible via the reverse proxy on localhost
# sudo ufw deny 3100/tcp  # Already blocked by default deny incoming

# If using Neon (cloud DB), outbound is handled by docker/default allow outgoing
# If using local PostgreSQL, allow internal traffic only:
# sudo ufw allow from 127.0.0.1 to any port 5432 comment "PostgreSQL local"

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

**Expected output:**
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
```

### Rate Limiting SSH

```bash
# Limit SSH to 6 connections per 30 seconds (brute-force protection)
sudo ufw limit 22/tcp
```

### IP Allowlisting for Admin Access (Optional)

```bash
# Allow only specific IPs to reach the admin API endpoints
# Example: Allow your office IP to access /api/v1/admin/*
sudo ufw allow from 203.0.113.0/24 to any port 443 comment "Office IP"

# Then configure nginx to restrict /api/v1/admin to internal IPs
```

---

## Environment Variables

**Required:**
```bash
# JWT signing secret — generate with: openssl rand -hex 64
JWT_SECRET="<64-char-hex>"

# Database
POSTGRES_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Application URL
CONSOLE_URL="https://console.yourdomain.com"

# Host header allowlist (security hardening)
ALLOWED_HOSTS="console.yourdomain.com,api.yourdomain.com"
```

**Optional but recommended:**
```bash
# Stripe (billing)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PORTAL_URL="https://billing.stripe.com"

# Resend (email)
RESEND_API_KEY="re_..."

# Sentry (error tracking)
SENTRY_DSN="https://..."

# Session timeout (seconds, default 86400 = 24h)
SESSION_TIMEOUT="28800"  # 8 hours for production
```

---

## Host Header Hardening

Vienna OS validates the `Host` header against a configured allowlist to prevent [Host header injection attacks](https://portswigger.net/web-security/host-header).

### Configuration

Set `ALLOWED_HOSTS` in your `.env`:

```bash
# Only requests from these hosts are accepted
ALLOWED_HOSTS="console.yourdomain.com,api.yourdomain.com"
```

If `ALLOWED_HOSTS` is not set, all hosts are allowed (development mode). **Always configure this in production.**

### Allowlist Format

- Comma-separated hostnames (no protocol, no trailing slash)
- Port suffix optional: `localhost:3100`
- Requests to `*.vercel.app` are always allowed when running on Vercel
- Requests to `*.yourdomain.com` — configure explicitly

### nginx Host Header Forwarding

When using nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name console.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Don't forward arbitrary client Host headers
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

---

## Sandbox Isolation

Vienna OS uses a serverless (Vercel) or containerized model. Agent code does not execute on the Vienna OS server — the platform only governs action proposals. However, if you're running agent runtime code alongside Vienna OS:

### Container Isolation Best Practices

```bash
# Run agents in isolated Docker network
docker network create --driver bridge vienna-agents
docker network create --driver bridge vienna-core

# Core services (vienna-os, postgres) on internal network
# Agents on separate network; communicate via Vienna OS API only

# Example: agent with network restrictions
docker run -d \
  --name my-agent \
  --network vienna-agents \
  --cap-drop ALL \
  --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges:true \
  --memory="512m" \
  --cpus="0.5" \
  my-agent-image:latest
```

### seccomp Profile (Advanced)

For maximum isolation, apply a seccomp profile:

```bash
docker run --security-opt seccomp=/path/to/vienna-seccomp.json ...
```

A minimal seccomp profile (blocks dangerous syscalls like `ptrace`, `kexec_load`, `reboot`):

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "accept4", "access", "arch_prctl", "bind", "brk", "clock_gettime",
        "close", "connect", "dup2", "epoll_create1", "epoll_ctl", "epoll_wait",
        "execve", "exit", "exit_group", "fcntl", "fstat", "futex", "getcwd",
        "getdents64", "getpid", "getppid", "getrandom", "getsockopt",
        "gettimeofday", "lseek", "mmap", "mprotect", "munmap", "nanosleep",
        "openat", "pipe2", "poll", "prctl", "read", "recvfrom", "recvmsg",
        "rt_sigaction", "rt_sigprocmask", "rt_sigreturn", "sendmsg", "sendto",
        "set_robust_list", "setsockopt", "sigaltstack", "socket", "socketpair",
        "stat", "statx", "uname", "wait4", "write", "writev"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

---

## TLS / HTTPS

### Nginx + Certbot

```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d console.yourdomain.com

# Verify renewal
sudo certbot renew --dry-run
```

**nginx config (`/etc/nginx/sites-available/vienna-os`):**

```nginx
server {
    listen 80;
    server_name console.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name console.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/console.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/console.yourdomain.com/privkey.pem;

    # Strong TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 5s;
    }
}
```

---

## Database Security

```bash
# Use a dedicated user with minimum permissions
psql -U postgres -c "CREATE USER vienna_app WITH PASSWORD 'strong-random-password';"
psql -U postgres -c "GRANT CONNECT ON DATABASE neondb TO vienna_app;"
psql -U postgres -c "GRANT USAGE ON SCHEMA regulator TO vienna_app;"
psql -U postgres -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA regulator TO vienna_app;"
psql -U postgres -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA regulator TO vienna_app;"

# Never grant superuser or CREATE privileges to the application user
```

**Connection security:** Always use `sslmode=require` in `POSTGRES_URL`.

---

## Monitoring & Alerting

```bash
# Health check endpoint
curl https://console.yourdomain.com/api/v1/health

# Set up a cron job to monitor health
# /etc/cron.d/vienna-health-check:
*/5 * * * * root curl -sf https://console.yourdomain.com/api/v1/health > /dev/null || \
  /usr/bin/systemctl restart vienna-os 2>&1 | logger -t vienna-os-monitor
```

---

## Security Checklist

Before going to production:

### Infrastructure
- [ ] UFW enabled with default deny incoming
- [ ] Port 3100 not exposed publicly (only via reverse proxy)
- [ ] TLS configured with certificates auto-renewed
- [ ] SSH key-only authentication (password auth disabled)
- [ ] SSH on non-standard port or behind VPN

### Application
- [ ] `JWT_SECRET` set to a 64-char random hex string
- [ ] `ALLOWED_HOSTS` configured with production domains
- [ ] `NODE_ENV=production` set
- [ ] All default/demo credentials rotated
- [ ] Sentry DSN configured for error alerting

### Docker
- [ ] Container runs as non-root user
- [ ] `--read-only` filesystem
- [ ] `--cap-drop ALL` applied
- [ ] `--security-opt no-new-privileges:true`
- [ ] Memory and CPU limits set

### Database
- [ ] Dedicated app user (not superuser)
- [ ] `sslmode=require` in connection string
- [ ] Automated backups enabled
- [ ] POSTGRES_URL in `.env` (not in code)

### Monitoring
- [ ] Health check endpoint monitored externally
- [ ] Alerting configured for service restarts
- [ ] Log aggregation enabled
- [ ] Audit log retention policy configured

---

## Getting Help

- [Vienna OS Documentation](https://regulator.ai/docs)
- [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- [Support](mailto:support@regulator.ai)
