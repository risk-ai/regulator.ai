# Vienna Session Startup Sequence

**Date:** 2026-03-11 20:44 EDT  
**Status:** Current as of Vienna Phase 2 Complete  

---

## What Actually Runs

When you create a new OpenClaw session that uses Vienna, the following sequence executes:

### 1. OpenClaw Gateway Session Initialization

**Location:** OpenClaw main runtime (not Vienna-specific)

**Actions:**
1. Session created with unique session ID
2. Model selected (default: `anthropic/claude-sonnet-4-5`)
3. Workspace path resolved: `/home/maxlawai/.openclaw/workspace`
4. Context files loaded from workspace:
   - `AGENTS.md` (Vienna orchestrator config)
   - `SOUL.md` (persona and tone)
   - `TOOLS.md` (tool registry reference)
   - `IDENTITY.md` (Vienna role definition)
   - `USER.md` (Max's preferences)
   - `HEARTBEAT.md` (health check stub)
   - `MEMORY.md` (persistent memory index)

### 2. Agent Definition Load

**File:** `AGENTS.md`

**Loaded instructions:**
- Vienna mission and persona
- Agent architecture (Talleyrand, Metternich, Castlereagh, Hardenberg, Alexander)
- Routing policy (when to delegate vs execute)
- Decision tiers (T0/T1/T2)
- Model policy (Haiku/Sonnet/Opus usage rules)
- Cost discipline guidelines
- Delegation rules
- Evidence standards
- Safety constraints
- Execution rules
- Session rotation policy

### 3. Startup Protocol Execution

**Triggered by:** User message or `/new` command

**Vienna reads (in order):**
1. `VIENNA_RUNTIME_STATE.md` — Operating mode, NBA trading status, autonomous window
2. `VIENNA_DAILY_STATE_LOG.md` — Recent activity, P&L, blockers
3. Cron status check: `crontab -l | grep clv` — Verify scheduled jobs
4. (Optional) Latest database activity verification

**Purpose:** Establish situational awareness before any action

### 4. Greeting Generation

**Vienna responds with:**
- Composed, disciplined greeting (per SOUL.md persona)
- Current operational status if relevant
- Readiness confirmation
- Request for instruction

**Example:**
> "🏛 Vienna operational. NBA v1 live trading continues autonomously — day 1 of 7, no blockers detected. What do you need?"

---

## What Does NOT Run Automatically

**Common misconceptions:**

❌ **Vienna Control Panel does NOT auto-start**
- The web UI (`http://100.120.116.10:5174`) is a separate service
- Must be manually started via `npm run dev` in client folder
- Or launched via `cd console/server && npm start` for full stack

❌ **Subagents do NOT spawn on session start**
- Talleyrand, Metternich, Castlereagh, etc. only spawn when delegated work
- Session startup = Vienna only, agents dormant

❌ **No automatic health checks**
- Vienna doesn't run system diagnostics unless asked
- Startup protocol only reads state files
- Active monitoring requires explicit request

❌ **No automatic memory recall**
- Memory search (`memory_search`) only runs when needed
- Startup doesn't pre-load full memory context
- On-demand retrieval keeps context small

---

## Vienna Control Panel (Separate Service)

**What it is:** Web-based operator interface for Vienna Core runtime

**Components:**
1. **Backend Server** (`console/server/`)
   - Express API on port 3100
   - Vienna Core runtime wrapper
   - File operations API
   - Chat service
   - Authentication
   - SSE event stream

2. **Frontend Client** (`console/client/`)
   - React + Vite dev server on port 5174
   - Files Workspace (browse, edit, upload)
   - Command Bar (attach files, submit objectives)
   - Envelope Visualizer (execution lineage)
   - Dashboard (future: metrics, health)

**Startup sequence (manual):**

```bash
# Terminal 1: Start backend
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server
npm run dev
# Server runs on http://localhost:3100

# Terminal 2: Start frontend
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/client
npm run dev
# UI available at http://100.120.116.10:5174
```

**What backend does on startup:**
1. Load `.env` configuration (auth credentials, workspace path)
2. Initialize AuthService (session management)
3. Import Vienna Core dynamically (`index.js`)
4. Initialize Vienna Core with Phase 7.3 config:
   - Queue options (max 1000 envelopes, concurrency 1)
   - Recursion options (max depth 5, max 50 envelopes/objective)
   - Replay log directory
5. Initialize Phase 7.3 async components (envelope queue)
6. Initialize Provider Manager bridge (Anthropic + OpenClaw fallback)
7. Initialize Chat History Service (SQLite database)
8. Create ViennaRuntimeService wrapper
9. Create ChatService, ObjectivesService, BootstrapService
10. Mount Express routes:
    - `/api/v1/auth/*` (login, logout, session)
    - `/api/v1/files/*` (list, read, write, upload, delete, search)
    - `/api/v1/commands/*` (submit objectives)
    - `/api/v1/objectives/*` (query objectives)
    - `/api/v1/envelopes/*` (query envelopes)
    - `/api/v1/chat/*` (chat completions)
    - `/api/v1/stream` (SSE event stream)
    - `/health` (simple health check)
11. Start SSE event stream
12. Listen on port 3100

**Health endpoints:**
- `/health` — Simple health check (backend only)
- `/api/v1/system/health` — NOT YET IMPLEMENTED (planned for Phase 8C)

---

## Current State After Session Start

**In OpenClaw session (Telegram/Webchat/Slack):**
- ✅ Vienna active and ready
- ✅ Startup protocol complete
- ✅ Runtime state loaded
- ✅ Trading guard status known
- ✅ Can execute commands immediately

**Vienna Control Panel:**
- ❌ Backend NOT running (unless manually started)
- ❌ Frontend NOT accessible (unless Vite dev server running)
- ❌ No web UI available by default

**To activate Control Panel:**
```bash
# One-time setup (if not already done)
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server
npm install

cd /home/maxlawai/.openclaw/workspace/vienna-core/console/client
npm install

# Start backend (keep running)
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server
npm run dev &

# Start frontend (keep running)
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/client
npm run dev &

# Access UI
open http://100.120.116.10:5174
```

---

## Session vs Control Panel

**Two separate interfaces to Vienna:**

| Feature | OpenClaw Session | Control Panel |
|---------|------------------|---------------|
| **Interface** | Text chat (Telegram/Slack/Web) | Web UI (React) |
| **Access** | Message Vienna directly | Browser at :5174 |
| **Startup** | Automatic with /new | Manual (npm run dev) |
| **Commands** | Natural language | UI + command bar |
| **File ops** | Via exec/read/write tools | Visual file tree |
| **Delegation** | sessions_spawn calls | (Future: agent dashboard) |
| **Status** | Ask Vienna | (Future: real-time dashboard) |

**Both use the same Vienna Core runtime when backend is running.**

---

## Recommendations

### For Active Development

Run Control Panel backend + frontend concurrently:

```bash
# Option A: Two terminals
# Terminal 1
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/server && npm run dev

# Terminal 2  
cd /home/maxlawai/.openclaw/workspace/vienna-core/console/client && npm run dev

# Option B: Background processes
cd /home/maxlawai/.openclaw/workspace/vienna-core
nohup npm run dev --prefix console/server > server.log 2>&1 &
nohup npm run dev --prefix console/client > client.log 2>&1 &
```

### For Quick Fixes / Text Ops

Just use OpenClaw session (this chat interface):
- Faster for file edits, script execution
- No UI overhead
- Direct tool access

### For Visual Work / Exploration

Use Control Panel:
- File browsing (tree view)
- Command submission with attachments
- Envelope visualization
- (Future: real-time execution dashboard)

---

## Files Page Empty Issue (Current)

**Status:** Investigating

**Expected behavior:** File tree shows workspace contents  
**Actual behavior:** Empty file list  

**Fix applied:** Added `credentials: 'include'` to API client  
**Verification needed:** Browser test at `http://100.120.116.10:5174/files`

**Debug checklist:**
1. ✅ Backend running (curl test succeeded)
2. ✅ Authentication working (login endpoint tested)
3. ✅ API response correct (200 status, full file list)
4. ✅ Credentials flag added to fetch
5. ⏳ Browser verification pending

**Next step:** Open browser DevTools → Network tab → verify `/api/v1/files/list` includes session cookie

---

## Summary

**On /new or session reset:**
1. OpenClaw loads Vienna context files
2. Vienna reads startup files (runtime state, daily log, cron)
3. Vienna greets and waits for instruction

**Control Panel (separate):**
1. Must be manually started (two npm processes)
2. Backend wraps Vienna Core with web API
3. Frontend provides visual interface
4. Both must run for UI to work

**Current active work:** Fixing Files Workspace display (credentials issue)

---

**Last updated:** 2026-03-11 20:44 EDT  
**Accurate as of:** Vienna Phase 2 Complete
