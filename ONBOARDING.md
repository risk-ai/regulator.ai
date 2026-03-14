# Regulator.AI — Developer Onboarding Guide

**For:** Max Anderson (remote developer)  
**Project:** regulator.ai — Vienna Governance System  
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Neon Postgres · Drizzle ORM · Vercel  
**Architecture:** OpenClaw AI agent + local dev environment  

---

## Overview

This guide walks you through everything from zero to pushing live changes to https://regulator.ai. The workflow is:

```
Your Local Machine → GitHub (cloud repo) → Vercel (auto-deploys)
```

Every time you push code to the `main` branch on GitHub, Vercel automatically builds and deploys to https://regulator.ai. Push to any other branch and Vercel creates a **preview deployment** at a unique URL you can share for review.

You'll also be using **OpenClaw** as your AI development agent — it can read/write files, run commands, manage git, and help you build features.

---

## Part 1: Prerequisites

### 1.1 Install Required Software

You need these on your local machine:

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 22 LTS (or 18+) | https://nodejs.org — download the LTS installer |
| **Git** | Any recent | https://git-scm.com/downloads |
| **VS Code** | Latest | https://code.visualstudio.com (recommended, not required) |
| **npm** | Comes with Node.js | Verify: `npm --version` |

Verify everything works:

```bash
node --version    # Should show v22.x.x or v18+
npm --version     # Should show 10.x.x
git --version     # Should show git version 2.x.x
```

---

## Part 2: GitHub Account Setup

### 2.1 Create a GitHub Account

1. Go to https://github.com/signup
2. Enter your email, create a password, choose a username
   - **Username suggestion:** `maxanderson-dev` or `maxandersonlaw` or whatever you prefer
   - This is public — choose something professional
3. Complete the email verification
4. Skip the onboarding survey (or fill it out, up to you)

### 2.2 Set Up Git on Your Machine

Open your terminal (Terminal on Mac, PowerShell or Git Bash on Windows):

```bash
# Tell git who you are (use the email you signed up with)
git config --global user.name "Max Anderson"
git config --global user.email "your-email@example.com"

# Set default branch name to 'main'
git config --global init.defaultBranch main
```

### 2.3 Set Up GitHub Authentication

The easiest way is GitHub CLI (`gh`):

```bash
# Install GitHub CLI
# Mac:
brew install gh

# Windows:
winget install GitHub.cli

# Linux:
sudo apt install gh   # or see https://cli.github.com

# Then authenticate:
gh auth login
```

When prompted:
- Account: **GitHub.com**
- Protocol: **HTTPS**
- Authenticate: **Login with a web browser**
- Follow the browser flow to authorize

Alternatively, you can use SSH keys (see https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

---

## Part 3: Get Access to the Repository

### 3.1 Request Access

Send your **GitHub username** to Whit. He will add you as a collaborator:

```bash
# Whit runs this (you don't need to):
gh api repos/risk-ai/regulator.ai/collaborators/YOUR_GITHUB_USERNAME \
  -X PUT -f permission=write
```

You'll receive an **invitation email** from GitHub. Click the link to accept it.

### 3.2 Verify Access

```bash
# After accepting the invite, verify you can see the repo:
gh repo view risk-ai/regulator.ai
```

You should see the repo description: "Vienna Governance System — AI agent governance control plane"

---

## Part 4: Clone the Repository

### 4.1 Choose Your Working Directory

Pick where you want the project to live on your machine:

```bash
# Mac/Linux — common locations:
cd ~/Projects
# or
cd ~/dev

# Windows:
cd C:\Users\YourName\Projects
```

### 4.2 Clone

```bash
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
```

### 4.3 Install Dependencies

```bash
npm install
```

This downloads all the Node.js packages the project needs (~300MB in `node_modules/`). Takes 1-2 minutes.

---

## Part 5: Environment Setup

### 5.1 Create Your Local Environment File

The project needs secret values (database URL, auth keys) that aren't stored in git. Create them from the template:

```bash
cp .env.example .env.local
```

### 5.2 Fill In the Values

Open `.env.local` in your editor and fill in:

```env
# Database — Whit will provide this
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Auth — generate a random secret
NEXTAUTH_SECRET=paste-a-random-string-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth — Whit will provide these
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**To generate NEXTAUTH_SECRET:**

```bash
# Mac/Linux:
openssl rand -base64 32

# Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

# Or just use any random string generator
```

> **⚠️ IMPORTANT:** Never commit `.env.local` to git. It's already in `.gitignore`.

### 5.3 Get Credentials from Whit

Send Whit a message asking for:
1. **DATABASE_URL** — the Neon Postgres connection string
2. **GOOGLE_CLIENT_ID** — for admin login (Google OAuth)
3. **GOOGLE_CLIENT_SECRET** — same

He'll send them securely. Paste them into your `.env.local`.

---

## Part 6: Run the Project Locally

### 6.1 Start the Dev Server

```bash
npm run dev
```

You should see:

```
  ▲ Next.js 14.2.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.1s
```

### 6.2 Open in Browser

Go to **http://localhost:3000** — you should see the Regulator.AI landing page with the purple/dark theme, seven services, risk tiers, etc.

### 6.3 Stop the Server

Press `Ctrl+C` in the terminal.

---

## Part 7: Making Changes

### 7.1 The Git Workflow

```
┌─────────────┐      git push      ┌──────────────┐    auto-deploy    ┌─────────────┐
│ Your Machine │  ──────────────►  │    GitHub     │  ──────────────►  │   Vercel     │
│  (local)     │                   │  (cloud repo) │                   │  (live site) │
└─────────────┘      git pull      └──────────────┘                    └─────────────┘
                 ◄──────────────
```

### 7.2 Option A: Push Directly to Main (simple, for small changes)

```bash
# 1. Make your changes (edit files in src/)

# 2. Check what changed
git status
git diff

# 3. Stage your changes
git add -A

# 4. Commit with a descriptive message
git commit -m "Add proposal queue to admin dashboard"

# 5. Push to GitHub → auto-deploys to regulator.ai
git push origin main
```

After pushing, Vercel will:
1. Detect the new commit (takes ~5 seconds)
2. Build the project (~30-60 seconds)
3. Deploy to https://regulator.ai (~10 seconds)

Total: your changes are live in **~1-2 minutes**.

### 7.3 Option B: Use Branches (recommended for bigger changes)

```bash
# 1. Create a feature branch
git checkout -b feature/admin-dashboard

# 2. Make changes, commit as many times as you want
git add -A
git commit -m "Add admin layout and nav"

git add -A
git commit -m "Add proposal list page"

# 3. Push the branch
git push origin feature/admin-dashboard

# 4. Vercel creates a preview deployment automatically
#    Check the URL in your GitHub PR or Vercel dashboard

# 5. When ready, create a Pull Request on GitHub
gh pr create --title "Add admin dashboard" --body "Implements the governance dashboard with proposal queue"

# 6. After review, merge the PR (on GitHub or via CLI)
gh pr merge --squash

# 7. Switch back to main and pull the merged changes
git checkout main
git pull origin main
```

### 7.4 Pulling Other People's Changes

Before starting work each day:

```bash
git pull origin main
npm install  # in case dependencies changed
```

---

## Part 8: OpenClaw Setup

OpenClaw is an AI agent that helps you develop. It can edit files, run commands, search the web, and more — directly from chat.

### 8.1 Install OpenClaw

```bash
npm install -g openclaw
```

### 8.2 Configure OpenClaw

```bash
openclaw configure
```

Follow the prompts to:
1. Set your API key (Whit will provide an Anthropic or OpenAI key, or you can use your own)
2. Choose your model (recommend: `claude-sonnet-4-20250514` for fast dev work)
3. Set your workspace to the regulator.ai directory

### 8.3 Start OpenClaw

```bash
cd ~/Projects/regulator.ai  # or wherever you cloned it
openclaw
```

### 8.4 Using OpenClaw for Development

Once OpenClaw is running, you can chat with it to build features. Examples:

**Build a feature:**
> "Create an admin dashboard at /admin with a sidebar nav and a proposals list page that reads from the regulator.proposals table"

**Fix a bug:**
> "The build is failing with a TypeScript error in src/app/admin/page.tsx — fix it"

**Run commands:**
> "Run npm run build and show me any errors"

**Git operations:**
> "Commit all changes with the message 'Add admin dashboard' and push to main"

**Ask questions:**
> "Explain how the Drizzle schema in src/db/schema.ts maps to the Vienna architecture"

OpenClaw will:
- Read and write files in your project
- Run terminal commands (build, test, git, etc.)
- Create new pages, components, API routes
- Fix TypeScript errors
- Commit and push changes

### 8.5 OpenClaw Workspace Files

OpenClaw uses workspace files for context. The key ones in this project:

| File | Purpose |
|---|---|
| `SETUP.md` | Project architecture and setup reference |
| `ONBOARDING.md` | This file |
| `.env.example` | Template for environment variables |
| `src/db/schema.ts` | Database schema — the core data model |

When you start OpenClaw, it reads these files to understand the project. You can update them as the project evolves.

### 8.6 Recommended OpenClaw Workflow

```
1. Start OpenClaw in the project directory
2. Describe what you want to build
3. Let OpenClaw scaffold it (files, routes, components)
4. Review the changes in VS Code
5. Test locally (npm run dev → check browser)
6. Ask OpenClaw to commit and push
7. Check the Vercel preview/production deploy
```

---

## Part 9: Project Structure Reference

```
regulator.ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark navy theme)
│   │   ├── page.tsx            # Landing page (public)
│   │   ├── globals.css         # Global styles
│   │   ├── admin/              # Governance dashboard (TODO)
│   │   │   ├── layout.tsx      # Admin layout with sidebar
│   │   │   ├── page.tsx        # Dashboard overview
│   │   │   ├── proposals/      # Proposal queue
│   │   │   ├── policies/       # Policy management
│   │   │   ├── warrants/       # Warrant history
│   │   │   └── audit/          # Audit log viewer
│   │   └── api/                # API routes (server-side)
│   │       ├── proposals/      # Proposal CRUD + state machine
│   │       ├── policies/       # Policy CRUD
│   │       └── audit/          # Audit log queries
│   ├── db/
│   │   ├── schema.ts           # Database schema (Drizzle ORM)
│   │   └── index.ts            # Database connection
│   ├── lib/                    # Core business logic (TODO)
│   │   ├── governance-kernel.ts
│   │   ├── policy-engine.ts
│   │   ├── warrant-authority.ts
│   │   └── verification.ts
│   └── components/             # Reusable UI components (TODO)
├── drizzle/                    # Database migrations
├── .env.local                  # Your local secrets (git-ignored)
├── .env.example                # Template for env vars
├── drizzle.config.ts           # Drizzle ORM config
├── tailwind.config.ts          # Tailwind CSS config (dark navy theme)
├── SETUP.md                    # Architecture reference
└── ONBOARDING.md               # This file
```

---

## Part 10: Useful Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server at localhost:3000 |
| `npm run build` | Production build (catches TypeScript errors) |
| `npm run lint` | Check code style with ESLint |
| `npm run start` | Run the production build locally |
| `npx drizzle-kit push` | Push schema changes to Neon database |
| `npx drizzle-kit studio` | Open visual database browser |
| `git status` | See what files changed |
| `git log --oneline -10` | See recent commits |
| `gh pr list` | List open pull requests |
| `gh pr create` | Create a pull request |

---

## Part 11: Key Links

| What | URL |
|---|---|
| **Live site** | https://regulator.ai |
| **GitHub repo** | https://github.com/risk-ai/regulator.ai |
| **Vercel dashboard** | https://vercel.com/ai-ventures-portfolio/regulator-ai |
| **Neon database** | https://console.neon.tech (ask Whit for access) |
| **OpenClaw docs** | https://docs.openclaw.ai |
| **Next.js docs** | https://nextjs.org/docs |
| **Tailwind docs** | https://tailwindcss.com/docs |
| **Drizzle docs** | https://orm.drizzle.team/docs/overview |

---

## Part 12: Design System

The project uses a consistent dark navy theme:

| Element | Value |
|---|---|
| Background (darkest) | `bg-navy-900` / `#0B0F19` |
| Background (cards) | `bg-navy-800` / `#111826` |
| Borders | `border-navy-700` / `#1E293B` |
| Primary accent | Purple (`purple-400` to `purple-600`) |
| Text (primary) | `text-white` |
| Text (secondary) | `text-slate-400` |
| Text (muted) | `text-slate-500` / `text-slate-600` |
| Success | Emerald (`emerald-400`) |
| Warning | Amber (`amber-400`) |
| Danger | Red (`red-400`) |
| Info | Blue (`blue-400`) |

---

## Troubleshooting

### "Permission denied" when pushing

You haven't been added as a collaborator yet. Send your GitHub username to Whit and accept the invitation email.

### "npm install" fails

Make sure you have Node.js 18+ installed:
```bash
node --version
```

If it's older, download the latest LTS from https://nodejs.org.

### Build fails with TypeScript errors

```bash
# Check the specific error:
npm run build

# Common fix: the error message will tell you the file and line number.
# Ask OpenClaw to fix it:
# "The build fails with [paste error]. Fix it."
```

### Can't connect to database

Check your `.env.local` has the correct `DATABASE_URL`. Make sure:
- It starts with `postgresql://`
- It ends with `?sslmode=require`
- There are no extra spaces or line breaks

### Port 3000 already in use

```bash
# Find what's using port 3000:
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill it, or use a different port:
npm run dev -- --port 3001
```

### Vercel deploy failed

Check the build logs:
1. Go to https://vercel.com/ai-ventures-portfolio/regulator-ai
2. Click the latest deployment
3. Click "Building" → "Build Logs"
4. The error will be at the bottom

Usually it's a TypeScript error that didn't show up locally. Run `npm run build` locally first to catch these.

---

## Getting Help

- **Whit (project admin):** For access, credentials, and project decisions
- **OpenClaw:** For coding help, debugging, and building features — just ask it
- **GitHub Issues:** File bugs or feature requests at https://github.com/risk-ai/regulator.ai/issues

---

*Last updated: March 14, 2026*
