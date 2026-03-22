# Vienna OS

**Governed AI Operating System**

Vienna OS is a governed execution layer for autonomous AI operations. It enforces architectural boundaries so AI agents cannot execute system commands directly—all actions must pass through Vienna's governed pipeline with operator approval.

## Core Rule

```
AI explains
Runtime executes
Operator approves
```

## Architecture

```
Intent → Plan → Policy → Approval (T1/T2) → Warrant → Execution → Verification → Ledger
```

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run development server
cd console/server && npm run dev

# In separate terminal, run client
cd console/client && npm run dev
```

### Environment Variables

Create `.env` in `console/server/`:

```bash
NODE_ENV=production
PORT=3100
SESSION_SECRET=your-secret-here
ANTHROPIC_API_KEY=your-key-here
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:0.5b
```

## Deployment

### Vercel (Frontend Only)

The frontend builds automatically deploy to Vercel. Backend must run separately.

```bash
# Vercel will run:
cd console/client && npm ci && npm run build
```

### Full Stack Deployment

For complete deployment including backend:

1. Deploy backend to your infrastructure
2. Configure CORS to allow Vercel frontend domain
3. Set backend URL in client environment

## Features

- **Phase 17 Complete:** Full operator approval workflow
- **Governed Execution:** T1/T2 actions require operator review
- **Audit Trail:** Complete execution history with forensic reconstruction
- **Policy Engine:** Constraint-based governance with 10 constraint types
- **Verification Layer:** Post-execution validation independent from execution
- **Multi-Step Plans:** Governed orchestration with per-step enforcement

## Status

- **Backend:** Node.js + Express + SQLite
- **Frontend:** React + TypeScript + Vite
- **Test Coverage:** 71/71 tests passing (approval workflow)
- **Production:** Ready for controlled deployment

## Documentation

See `/docs` for complete architecture documentation.

## License

Private - Max Anderson / Vienna OS Project
