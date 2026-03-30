# Backend Routes Inventory

**Date:** 2026-03-29  
**Total Routes:** 46 mounted  
**Status:** Documented for future cleanup

---

## ✅ **CORE ROUTES (PRODUCTION CRITICAL)**

### **Authentication & Authorization**
- `auth.ts` - Login, register, refresh tokens, logout
- `approvals.ts` - Approval workflows, pending requests
- `policies.ts` - Policy management, rule evaluation

### **Core Features**
- `agents.ts` - Agent registry, heartbeats, metadata
- `proposals.ts` - Proposal submission, status, history
- `executions.ts` - Execution tracking, results
- `actions.ts` - Action handlers (NEW: system-status, audit-trail, view-logs, query-database)
- `action-types.ts` - Action type registry

### **Governance & Compliance**
- `compliance.ts` - Compliance checks, violations
- `audit.ts` - Audit trail, event logging
- `events.ts` - Event streaming, subscriptions

### **System & Monitoring**
- `dashboard.ts` - Metrics, statistics, overview
- `system-health.ts` - Health checks, status
- `status.ts` - System status endpoints
- `providers.ts` - Provider health, availability

### **Integrations**
- `webhooks.ts` - Webhook management, delivery
- `integrations.ts` - Third-party integrations

---

## 🟡 **VIENNA CORE ROUTES (FRAMEWORK FEATURES)**

These routes support Vienna Core features but may have limited usage:

### **State Management**
- `runtime.ts` - Runtime state, configuration
- `execution.ts` - Execution ledger, claims
- `decisions.ts` - Decision tracking
- `artifacts.ts` - Execution artifacts

### **Agent Intelligence**
- `agent-intent.ts` - Intent bridge (NEW)
- `intent.ts` - Intent parsing
- `intents.ts` - Intent history
- `objectives.ts` - Objective tracking
- `managed-objectives.ts` - Managed objectives

### **Advanced Features**
- `fleet.ts` - Fleet management
- `services.ts` - Service registry
- `workflows.ts` - Workflow engine
- `directives.ts` - Directive system
- `models.ts` - Model registry

---

## ⚠️ **EXPERIMENTAL/OPTIONAL ROUTES**

These routes may have limited or no production usage:

### **Development Tools**
- `demo.ts` - Demo mode, testing
- `diagnostics.ts` - Debug tools, introspection
- `validation.ts` - Validation utilities
- `bootstrap.ts` - System bootstrap

### **Advanced Features (Usage Unknown)**
- `anomalies.ts` - Anomaly detection
- `incidents.ts` - Incident tracking
- `investigations.ts` - Investigation tools
- `reconciliation.ts` - State reconciliation
- `recovery.ts` - Recovery tools
- `replay.ts` - Event replay
- `simulation.ts` - Simulation mode

### **Legacy/Deprecated**
- `assistant.ts` - AI assistant (may be legacy)
- `chat.ts` - Chat interface (may be legacy)
- `commands.ts` - Command interface (may be legacy)
- `deadletters.ts` - Dead letter queue (may be unused)

### **Utilities**
- `files.ts` - File management
- `stream.ts` - SSE streaming

---

## 📊 **USAGE RECOMMENDATIONS**

### **Keep (20 routes)**
Core features + governance + monitoring

### **Audit for Usage (15 routes)**
Vienna Core features - check actual API calls in production

### **Consider Deprecation (11 routes)**
Experimental/optional features with no known usage

---

## 🔧 **CLEANUP PLAN**

### **Phase 1: Monitoring (Week 1)**
- Add request logging to track route usage
- Identify routes with zero requests over 7 days
- Document actual usage patterns

### **Phase 2: Deprecation (Week 2-3)**
- Mark unused routes as deprecated
- Add deprecation warnings in responses
- Document migration paths (if needed)

### **Phase 3: Removal (Week 4+)**
- Remove routes with zero usage after deprecation period
- Update API documentation
- Clean up TypeScript types

---

## 🎯 **OPTIMIZATION PRIORITIES**

### **High Priority**
1. Document API endpoints (Swagger/OpenAPI)
2. Add route-level metrics (request count, latency)
3. Identify unused routes via monitoring

### **Medium Priority**
4. Consolidate similar routes (e.g., intent.ts + intents.ts)
5. Remove experimental features with no users
6. Simplify route structure

### **Low Priority**
7. Refactor route handlers for consistency
8. Add integration tests for core routes
9. Performance optimization per route

---

**Next Steps:**
1. Add API request logging (see route usage)
2. Monitor for 1 week
3. Create removal plan based on data

**Owner:** Vienna (Technical Lead)  
**Last Updated:** 2026-03-29
