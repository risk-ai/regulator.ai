# Vienna OS Presentation Mode — Quick Start

**⏱ Time to activate: 2 minutes**

---

## One-Command Setup

```bash
cd vienna-core/console
./enable-presentation-mode.sh
cd server
npm start
```

**Done.** Open `http://100.120.116.10:5174`

---

## What You'll See

### 1. Premium Navigation Bar

- Glass effect with backdrop blur
- Gradient border on active tab
- Live status indicators ("Operational", "Phase 12")
- Smooth animations

### 2. Hero Section

```
╔══════════════════════════════════════════════╗
║  Governed AI Operating System                ║
║  Complete execution traceability with        ║
║  architectural enforcement                   ║
║                                              ║
║  Status: ✓ All Systems Operational          ║
╚══════════════════════════════════════════════╝
```

With animated gradient border.

### 3. Key Metrics (4 Cards)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 🎯 Active   │ ⚡ Execut.  │ ✓ Success   │ ⏱ Avg Time │
│    Obj.     │   (24h)     │   Rate      │             │
│             │             │             │             │
│    3        │   127       │  98.4%      │   1.2s      │
│  +1 today   │  avg 130    │  +2.1%      │   -0.3s     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

Hover for glow effects.

### 4. System Health Panel

```
Vienna Core         ████████████████████ 100%
State Graph         ████████████████████ 100%
Execution Pipeline  ███████████████████░  98%
Provider Health     ██████████████████░░  95%
Audit Trail         ████████████████████ 100%
```

Animated progress bars with gradient colors.

### 5. Activity Timeline

```
● 2m ago  — Objective Evaluated
           Gateway health check completed

● 8m ago  — Plan Executed
           Service restart workflow completed

● 15m ago — Policy Evaluated
           Rate limit check passed
```

Pulsing dots, hover highlights.

### 6. Governance Pipeline

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ 💭   │ → │ 📋   │ → │ ⚖️   │ → │ 🔑   │ → │ ⚡   │ → │ ✓    │ → │ 📜   │
│Intent│   │ Plan │   │Policy│   │Warrant│  │Execute│  │Verify│   │Ledger│
└──────┘    └──────┘    └──────┘    └──────┘    └──────┘    └──────┘    └──────┘
```

Glowing boxes, gradient arrows.

### 7. Phase Progress

```
Phase 12: Operator Workspace       ████████████ Complete ✓
Phase 11: Intent Gateway           ████████████ Complete ✓
Phase 10: Control Plane            ████████████ Complete ✓
Phase 9:  Objective Orchestration  ████████████ Complete ✓
Phase 8:  Governance Spine         ████████████ Complete ✓
```

Green progress bars with glow.

---

## Pro Tips

### Before Your Presentation

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Zoom to 90%** for better readability on projector
3. **Close other tabs** for clean screen
4. **Disable notifications** (Do Not Disturb)
5. **Use full screen** (F11)

### During Presentation

**Opening (30 seconds):**
1. Show navigation bar
2. Point to "Operational" badge
3. Read hero heading aloud

**Core Demo (2 minutes):**
1. Metrics: "127 executions today, 98.4% success"
2. Health: "All core systems at 100%"
3. Pipeline: Walk through 7 stages
4. Timeline: "Real-time monitoring"

**Closing (30 seconds):**
1. Phase progress: "Complete architecture"
2. Navigation: "Full control plane"
3. Status: "Production-ready"

### Talking Points

**"This is Vienna OS — a governed AI operating system."**

**"Notice the pipeline: every action goes through 7 governance stages."**

**"We're seeing 127 successful executions today with 98.4% reliability."**

**"All 12 development phases are complete and operational."**

**"This is production-ready, architecturally-enforced AI governance."**

---

## Keyboard Shortcuts

- **F11** — Full screen
- **Ctrl+Shift+R** — Hard refresh
- **Ctrl +/-** — Zoom in/out
- **Ctrl+0** — Reset zoom
- **Alt+Tab** — Switch to slides
- **Win+P** — Projector settings

---

## Troubleshooting

**Blank screen?**
```bash
# Check server is running:
cd vienna-core/console/server
npm start

# Check port 5174 is accessible
curl http://localhost:5174
```

**Styles look wrong?**
```bash
# Rebuild frontend:
cd vienna-core/console/client
npm run build

# Clear browser cache
# Ctrl+Shift+R
```

**Can't see presentation mode?**
```bash
# Verify main.tsx has correct import:
grep "AppPresentation" client/src/main.tsx

# Should show:
# import { App } from './AppPresentation.js';
```

---

## Revert After Presentation

```bash
cd vienna-core/console
./disable-presentation-mode.sh
cd server
npm start
```

Everything back to normal.

---

## Emergency Fallback

If presentation mode breaks mid-demo:

1. **Keep talking** — explain the concept verbally
2. **Switch to slides** — have backup slides ready
3. **Blame the demo gods** — "live demos are always risky"
4. **Focus on architecture** — draw pipeline on whiteboard
5. **Quick revert** — run disable script

**Pro tip:** Test presentation mode 30 minutes before your actual presentation.

---

## Questions to Anticipate

**Q: "Is this connected to a real system?"**
A: "The UI is real, the metrics are demo data. It connects to our full backend with one config change."

**Q: "Can I try it?"**
A: "Absolutely. It's running at [URL] right now. I can give you access after the demo."

**Q: "How long did this take to build?"**
A: "The governance architecture is 12 phases over 3 months. The UI makeover was an afternoon."

**Q: "What's the tech stack?"**
A: "React + TypeScript frontend, Node.js backend, SQLite for state, all open source."

**Q: "Why SQLite?"**
A: "Simplicity and reliability. No database server to manage, perfect for edge deployment."

---

**You're ready. Go impress them. 🚀**
