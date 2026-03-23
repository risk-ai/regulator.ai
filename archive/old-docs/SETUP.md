# regulator.ai — Project Setup Guide

## Overview

**regulator.ai** is the Vienna Governance System — an enterprise-grade governance control plane for autonomous agent systems. It separates reasoning authority from execution authority through cryptographically signed warrants.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Neon Postgres (Drizzle ORM) · Vercel  
**Domain:** regulator.ai (NS pointed to Vercel ✅)  
**GitHub:** github.com/risk-ai/regulator.ai  
**Vercel Team:** ai-ventures-portfolio (team_A3ikqFKQQCoIb04fs71VzgxN)

---

## Part 1: Initial Setup (done once, by project creator)

### 1.1 Create GitHub Repository

```bash
# From the workspace machine (AN-CTRL-00)
cd /home/agentsnet/.openclaw/workspace

# Create the repo on GitHub
gh repo create risk-ai/regulator.ai --public --description "Vienna Governance System — AI agent governance control plane" --clone

cd regulator.ai
```

### 1.2 Initialize Next.js Project

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git

# Install dependencies
npm install @neondatabase/serverless drizzle-orm
npm install -D drizzle-kit
```

### 1.3 Initial Commit & Push

```bash
git add -A
git commit -m "Initial Next.js 14 scaffold"
git push origin main
```

### 1.4 Create Vercel Project

```bash
# Via Vercel CLI
npx vercel link --yes --project regulator-ai --scope ai-ventures-portfolio

# Or via API:
curl -X POST "https://api.vercel.com/v10/projects?teamId=team_A3ikqFKQQCoIb04fs71VzgxN" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "regulator-ai",
    "framework": "nextjs",
    "gitRepository": {
      "type": "github",
      "repo": "risk-ai/regulator.ai"
    }
  }'
```

### 1.5 Add Domain to Vercel

```bash
# Add regulator.ai domain to the Vercel project
curl -X POST "https://api.vercel.com/v10/projects/regulator-ai/domains?teamId=team_A3ikqFKQQCoIb04fs71VzgxN" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "regulator.ai"}'

# Also add www redirect
curl -X POST "https://api.vercel.com/v10/projects/regulator-ai/domains?teamId=team_A3ikqFKQQCoIb04fs71VzgxN" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "www.regulator.ai", "redirect": "regulator.ai", "redirectStatusCode": 308}'
```

### 1.6 Set Environment Variables on Vercel

```bash
# DATABASE_URL (Neon — use existing DB with a new 'regulator' schema, or create new project)
# NEXTAUTH_SECRET (generate: openssl rand -base64 32)
# NEXTAUTH_URL=https://regulator.ai
# GOOGLE_CLIENT_ID (from GCP OAuth — ai-ventures admin app, add regulator.ai to authorized domains)
# GOOGLE_CLIENT_SECRET

# Set via API:
for KEY in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  curl -X POST "https://api.vercel.com/v10/projects/regulator-ai/env?teamId=team_A3ikqFKQQCoIb04fs71VzgxN" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$KEY\",\"value\":\"<VALUE>\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}"
done
```

### 1.7 Verify DNS Propagation

```bash
# Check nameservers have propagated (may take 15-60 min)
nslookup -type=NS regulator.ai
# Should return: ns1.vercel-dns.com, ns2.vercel-dns.com

# Once propagated, Vercel auto-provisions SSL
curl -I https://regulator.ai
```

---

## Part 2: Local Development (this machine — AN-CTRL-00)

### 2.1 Clone & Install

```bash
cd /home/agentsnet/.openclaw/workspace
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
npm install
```

### 2.2 Set Up Local Environment

```bash
# Create .env.local with:
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://neondb_owner:<password>@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from GCP console>
GOOGLE_CLIENT_SECRET=<from GCP console>
EOF
```

### 2.3 Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### 2.4 Deploy

```bash
# Every push to main auto-deploys to Vercel
git add -A
git commit -m "your changes"
git push origin main
# Vercel builds and deploys automatically
```

---

## Part 3: Remote Developer Setup (Robert / Max / external contributor)

### Prerequisites
- Node.js 18+ (recommend 22 LTS)
- Git
- GitHub account with access to `risk-ai/regulator.ai` repo
- A code editor (VS Code recommended)

### 3.1 Get Repository Access

Ask the repo admin (Whit / @fraudnetnyc) to add you as a collaborator:
```bash
gh repo add-collaborator risk-ai/regulator.ai <github-username> --permission write
```

Or fork the repo if working via PRs:
```bash
gh repo fork risk-ai/regulator.ai --clone
```

### 3.2 Clone & Install

```bash
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
npm install
```

### 3.3 Get Environment Variables

Request `.env.local` values from the project admin. You need:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | Vercel dashboard or project admin |
| `NEXTAUTH_SECRET` | Session encryption key | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev | Set this yourself |
| `GOOGLE_CLIENT_ID` | OAuth client ID | GCP Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Same as above |

Create `.env.local`:
```bash
cp .env.example .env.local
# Edit with your values
```

### 3.4 Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3.5 Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes, test locally
npm run dev

# Lint & type-check before pushing
npm run lint
npm run build

# Push and create PR
git push origin feature/your-feature
gh pr create --title "Your feature" --body "Description"
```

Every PR gets a **Vercel preview deployment** automatically — reviewers can test the changes at a unique URL before merging.

### 3.6 Useful Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (catches type errors)
npm run lint         # ESLint check
npm run start        # Start production server locally
npx drizzle-kit push # Push schema changes to Neon
npx drizzle-kit studio # Visual DB browser
```

---

## Part 4: Database Schema Setup

### 4.1 Create Regulator Schema in Neon

Using the existing Neon database (shared with biography.ai and ai.ventures):

```sql
-- Connect to Neon and create schema
CREATE SCHEMA IF NOT EXISTS regulator;
```

### 4.2 Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['regulator'],
})
```

### 4.3 Core Tables (initial)

```typescript
// src/db/schema.ts
import { pgSchema, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core'

export const regulator = pgSchema('regulator')

export const proposals = regulator.table('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: text('agent_id').notNull(),
  action: text('action').notNull(),
  payload: jsonb('payload'),
  riskTier: integer('risk_tier').notNull().default(0),
  state: text('state').notNull().default('submitted'),
  // submitted → validated → policy_checked → authorized → executing → executed → verified → archived
  warrant: jsonb('warrant'),
  result: jsonb('result'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const policies = regulator.table('policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  rules: jsonb('rules').notNull(), // policy-as-code
  riskTier: integer('risk_tier'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

export const auditLog = regulator.table('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id'),
  event: text('event').notNull(),
  actor: text('actor').notNull(), // agent or system
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const warrants = regulator.table('warrants', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id').notNull(),
  signature: text('signature').notNull(), // cryptographic signature
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false),
  issuedBy: text('issued_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## Part 5: Project Structure

```
regulator.ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark theme)
│   │   ├── page.tsx            # Landing page
│   │   ├── admin/              # Governance dashboard
│   │   │   ├── layout.tsx      # Admin layout with nav
│   │   │   ├── page.tsx        # Dashboard overview
│   │   │   ├── proposals/      # Proposal queue
│   │   │   ├── policies/       # Policy management
│   │   │   ├── warrants/       # Warrant history
│   │   │   └── audit/          # Audit log viewer
│   │   └── api/
│   │       ├── proposals/      # CRUD + state machine
│   │       ├── policies/       # Policy CRUD
│   │       ├── warrants/       # Warrant issuance
│   │       ├── verify/         # Execution verification
│   │       └── audit/          # Audit log queries
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema
│   │   └── index.ts            # DB connection
│   ├── lib/
│   │   ├── governance-kernel.ts # State machine
│   │   ├── policy-engine.ts     # Policy evaluation
│   │   ├── warrant-authority.ts # Cryptographic signing
│   │   └── verification.ts     # Execution verification
│   └── components/
│       ├── AdminNav.tsx
│       ├── ProposalCard.tsx
│       ├── PolicyEditor.tsx
│       └── AuditTimeline.tsx
├── drizzle/                    # Migration files
├── .env.local                  # Local env (git-ignored)
├── .env.example                # Template for env vars
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Quick Reference

| What | Where |
|---|---|
| **Live site** | https://regulator.ai |
| **GitHub repo** | https://github.com/risk-ai/regulator.ai |
| **Vercel dashboard** | https://vercel.com/ai-ventures-portfolio/regulator-ai |
| **Neon database** | `regulator` schema in shared Neon project |
| **Identity Digital** | Registrar: ewi805033 (regulator.ai NS → Vercel ✅) |
| **Domain expires** | 2027-05-07 |
| **Design system** | Dark navy theme (bg-[#0B0F19], bg-[#111826]) — matches ai.ventures |

---

## Deployment Checklist

- [x] Domain registered (Identity Digital)
- [x] NS pointed to Vercel (ns1/ns2.vercel-dns.com)
- [x] Database segment updated (SELL → BUILD)
- [ ] GitHub repo created
- [ ] Next.js project initialized
- [ ] Vercel project created & linked
- [ ] Domain added to Vercel project
- [ ] SSL provisioned (auto after DNS propagation)
- [ ] Environment variables set
- [ ] Neon `regulator` schema created
- [ ] Drizzle schema pushed
- [ ] Landing page live
- [ ] Admin dashboard scaffolded
- [ ] Remote developer onboarded
