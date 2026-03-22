# Vienna Core Deployment Log

## Phase 6 Deployment — March 12, 2026 14:32 EDT

### Services Status

✅ **Backend Server**
- Process: `tsx watch src/server.ts`
- Port: 3100
- Health: OK
- Uptime: 47s
- PID: 133817

✅ **Frontend Dev Server**
- Process: `vite`
- Port: 5174
- Health: OK
- Title: Vienna Operator Shell
- PID: 133790

### Phase 6 Modules Initialized

✅ **Phase 6.10 — Audit Trail**
```
[AuditLog] Initialized { maxEvents: 10000 }
```
- Endpoint: `/api/v1/audit`
- Frontend: `AuditPanel.tsx`

✅ **Phase 6.11 — Workflow Engine**
```
[WorkflowEngine] Initialized with 3 built-in workflows
```
- Endpoints: `/api/v1/workflows/*`
- Built-in workflows:
  - openclaw_diagnose
  - openclaw_recovery
  - provider_health_check

✅ **Phase 6.12 — Model Control Layer**
```
[ModelRegistry] Initialized with 4 models
[ModelRouter] Initialized
```
- Endpoints: `/api/v1/models/*`
- Models:
  - Claude Sonnet 4.5 (anthropic)
  - Claude Haiku 4 (anthropic)
  - Qwen 2.5 0.5B (ollama)
  - Qwen 2.5 3B (ollama)

### Fixes Applied

✅ **Frontend API Client**
- Fixed duplicate `/api/v1` prefix in audit API
- Change: `/api/v1/audit` → `/audit` (apiClient already prepends `/api/v1`)

### Services Access

**Backend API:**
```
http://localhost:3100/health
http://localhost:3100/api/v1/audit
http://localhost:3100/api/v1/workflows
http://localhost:3100/api/v1/models
```

**Frontend UI:**
```
http://localhost:5174/
http://100.120.116.10:5174/ (Tailscale)
```

### Deployment Steps Executed

1. ✅ Backend server restart (tsx watch auto-reload)
2. ✅ Frontend Vite dev server restart
3. ✅ Phase 6 modules verification
4. ✅ API endpoint verification
5. ✅ Frontend API client fix
6. ✅ Health checks passing

### Log Files

- Backend: `/tmp/vienna-server.log`
- Frontend: `/tmp/vienna-client.log`

### Process Management

**To view logs:**
```bash
tail -f /tmp/vienna-server.log
tail -f /tmp/vienna-client.log
```

**To restart backend:**
```bash
cd ~/.openclaw/workspace/vienna-core/console/server
pkill -f "tsx.*server.ts"
npm run dev > /tmp/vienna-server.log 2>&1 &
```

**To restart frontend:**
```bash
cd ~/.openclaw/workspace/vienna-core/console/client
pkill -f vite
npm run dev > /tmp/vienna-client.log 2>&1 &
```

### Verification Commands

**Check services:**
```bash
ps aux | grep -E "(tsx|vite)" | grep -v grep
```

**Test backend:**
```bash
curl http://localhost:3100/health | jq '.'
```

**Test frontend:**
```bash
curl -I http://localhost:5174/
```

### Next Steps

1. ✅ Services deployed and verified
2. ⏭️ Test audit panel in browser
3. ⏭️ Test workflow creation via API
4. ⏭️ Test model routing via API
5. ⏭️ Production build when ready

### Known Issues

- TypeScript unused variable warnings (non-blocking)
- Frontend auto-refresh might cause session issues (auth required)

### Production Deployment Checklist

When ready for production:
- [ ] Run `npm run build` in client directory
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up reverse proxy (nginx/caddy)
- [ ] Configure systemd service units
- [ ] Set up SSL certificates
- [ ] Configure log rotation
- [ ] Set up monitoring/alerting

---

**Deployment completed:** 2026-03-12 14:32 EDT  
**Deployed by:** Vienna Runtime Operator  
**Status:** ✅ OPERATIONAL
