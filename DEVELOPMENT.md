# Vienna OS - Development Guide

Quick start for developers contributing to Vienna OS.

## Prerequisites

- Node.js 22+ (LTS)
- PostgreSQL 17+
- pnpm (recommended) or npm
- Docker (optional, for local Postgres)

## Quick Start

```bash
# Clone
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Install dependencies
pnpm install

# Set up environment
cp apps/console/server/.env.example apps/console/server/.env
# Edit .env with your values

# Run database migrations
pnpm migrate

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Project Structure

```
regulator.ai/
├── apps/
│   └── console/
│       ├── client/          # React frontend
│       └── server/          # Express backend
├── services/
│   └── vienna-lib/          # Vienna Core governance engine
├── scripts/                 # Deployment & utility scripts
└── docs/                    # Documentation
```

## Development Workflow

### Running Locally

```bash
# Frontend only (Vite dev server)
cd apps/console/client
pnpm dev

# Backend only (with hot reload)
cd apps/console/server
pnpm dev

# Both (recommended)
pnpm dev  # from root
```

### Database

```bash
# Create local database
createdb vienna_dev

# Run migrations
pnpm migrate

# Backup
./scripts/backup-database.sh

# Restore
gunzip -c backup.sql.gz | psql vienna_dev
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific test file
pnpm test src/tests/auth.test.ts
```

### Building

```bash
# Production build
pnpm build

# Build frontend only
cd apps/console/client && pnpm build

# Build backend only
cd apps/console/server && pnpm build:prod
```

## Environment Variables

### Required

```env
POSTGRES_URL=postgresql://user:pass@localhost:5432/vienna_dev
VIENNA_SESSION_SECRET=<random-32-byte-hex>
VIENNA_OPERATOR_PASSWORD=<secure-password>
```

### Optional

```env
ANTHROPIC_API_KEY=sk-ant-...
DISABLE_AUTH=true  # For development only
NODE_ENV=development
PORT=3100
HOST=0.0.0.0
```

## API Development

### Adding a New Route

1. Create route file in `apps/console/server/src/routes/`
2. Define router with Express
3. Mount in `app.ts`
4. Add tests in `src/tests/`

Example:

```typescript
// src/routes/my-feature.ts
import { Router } from 'express';

export function createMyFeatureRouter() {
  const router = Router();
  
  router.get('/api/v1/my-feature', async (req, res) => {
    res.json({ success: true, data: {} });
  });
  
  return router;
}

// src/app.ts
import { createMyFeatureRouter } from './routes/my-feature.js';
app.use(createMyFeatureRouter());
```

### Adding Middleware

Create in `src/middleware/`, then apply in `app.ts`:

```typescript
app.use(myMiddleware());
```

## Database Schema Changes

1. Update `services/vienna-lib/state/schema.postgres.sql`
2. Create migration in `services/vienna-lib/state/migrations/`
3. Test locally
4. Commit both files

## Debugging

### Server Logs

```bash
# If running via systemd
sudo journalctl -u vienna-console -f

# If running locally
pnpm dev  # logs to console
```

### Database Queries

```bash
psql vienna_dev
\dt  # List tables
\d table_name  # Describe table
```

### Health Checks

```bash
# Basic health
curl http://localhost:3100/health

# Detailed diagnostics
curl http://localhost:3100/api/v1/system/health/detailed

# Metrics
curl http://localhost:3100/metrics
```

## Common Tasks

### Add a New Provider

1. Create adapter in `services/vienna-lib/adapters/`
2. Register in provider manager
3. Add health check
4. Update config

### Add a New Test

```typescript
// src/tests/my-feature.test.ts
import { describe, it, expect } from '@jest/globals';

describe('MyFeature', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
```

### Update Dependencies

```bash
# Check outdated
pnpm outdated

# Update all
pnpm update

# Update specific package
pnpm update package-name
```

## Performance

### Monitoring

- Metrics: `http://localhost:3100/metrics`
- Health: `http://localhost:3100/health`
- Logs: `sudo journalctl -u vienna-console`

### Profiling

```bash
# Node profiler
node --prof apps/console/server/build/server.cjs

# Memory snapshots
node --inspect apps/console/server/build/server.cjs
```

## Security

### Before Committing

- [ ] No secrets in code
- [ ] No API keys in .env files (use .env.example)
- [ ] Run tests
- [ ] Check for security vulnerabilities: `pnpm audit`

### GitHub Push Protection

Repository has secret scanning enabled. If blocked:
1. Remove the secret from code
2. Rotate the credential
3. Commit without the secret

## Deployment

### Local Deployment

```bash
# Build
pnpm build

# Run production build
NODE_ENV=production node apps/console/server/build/server.cjs
```

### Vercel Deployment (Production)

Vienna OS Console is deployed on Vercel serverless with automatic scaling.

**Deployment process:**
```bash
# Deploy to production (automatic via GitHub push to main)
git push origin main

# Or manual deploy via Vercel CLI
vercel --prod

# Check deployment status
vercel ls
vercel inspect <deployment-url>
```

**Infrastructure:**
- **Platform:** Vercel Serverless Functions + Edge Network
- **Console API:** console.regulator.ai (serverless API routes)
- **Marketing Site:** regulator.ai (Next.js SSR/ISR)
- **Database:** Neon Postgres Launch plan (auto-scaling)
- **Auto-deploy:** Push to `main` triggers production deployment
- **Scaling:** Automatic (handles 500+ concurrent users)

## Troubleshooting

### Port Already in Use

```bash
lsof -ti:3100 | xargs kill -9
```

### Database Connection Failed

```bash
# Check Postgres is running
systemctl status postgresql

# Test connection
psql -U vienna -d vienna_dev -c "SELECT 1"
```

### Build Fails

```bash
# Clean node_modules
rm -rf node_modules package-lock.json
pnpm install

# Clean build artifacts
rm -rf apps/console/client/dist apps/console/server/build
pnpm build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run tests: `pnpm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## Resources

- [Architecture Docs](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- [Discord Community](https://discord.gg/clawd)

## Getting Help

- **Issues:** https://github.com/risk-ai/regulator.ai/issues
- **Discord:** https://discord.gg/clawd
- **Email:** support@regulator.ai

---

Last updated: 2026-03-27  
Maintained by: Vienna Team
