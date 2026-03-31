# Console UX Expansion Plan

**Status:** In Progress  
**Date:** 2026-03-29  
**Goal:** Expand Intent and Execution layers with useful, practical functions users can actually use

---

## Current State Analysis

**Existing Handlers:**
- `sleep` - Test/delay function
- `health-check` - System health verification
- `restart-service` - Service management

**Existing Intent Types:**
- `restore_objective`
- `investigate_objective`
- `set_safe_mode`
- `test_execution`

**Gap:** Limited practical utility for users. Need real-world operational functions.

---

## Expansion Categories

### 1. System Management
**Use Case:** Operators need to monitor and control Vienna OS components

**New Functions:**
- [x] `health-check` (exists)
- [x] `restart-service` (exists)
- [ ] `view-logs` - Tail/search recent logs
- [ ] `check-disk-space` - Storage monitoring
- [ ] `list-processes` - Active process inventory
- [ ] `system-status` - Comprehensive system report

### 2. Data Operations
**Use Case:** Operators need to query and manipulate data

**New Functions:**
- [ ] `query-database` - SQL query execution (read-only)
- [ ] `export-data` - Export query results to CSV/JSON
- [ ] `backup-database` - Manual backup trigger
- [ ] `vacuum-analyze` - Database optimization

### 3. Agent Management
**Use Case:** Operators need to control and monitor agents

**New Functions:**
- [ ] `list-agents` - Show active agents
- [ ] `pause-agent` - Temporarily suspend agent
- [ ] `resume-agent` - Reactivate paused agent
- [ ] `restart-agent` - Force agent restart
- [ ] `view-agent-logs` - Agent-specific logs

### 4. Policy Management
**Use Case:** Operators need to update governance rules

**New Functions:**
- [ ] `create-policy` - Add new policy rule
- [ ] `update-policy` - Modify existing policy
- [ ] `disable-policy` - Temporarily disable rule
- [ ] `enable-policy` - Reactivate disabled rule
- [ ] `test-policy` - Dry-run policy evaluation

### 5. Audit & Compliance
**Use Case:** Operators need to review and report on system activity

**New Functions:**
- [ ] `audit-trail` - View recent actions
- [ ] `compliance-report` - Generate compliance summary
- [ ] `export-audit-log` - Download audit records
- [ ] `search-events` - Query event history

### 6. Configuration Management
**Use Case:** Operators need to modify system settings

**New Functions:**
- [ ] `get-config` - View current configuration
- [ ] `update-config` - Modify configuration value
- [ ] `reload-config` - Apply configuration changes
- [ ] `validate-config` - Check configuration validity

### 7. Notification & Alerting
**Use Case:** Operators need to manage alerts

**New Functions:**
- [ ] `list-alerts` - View active alerts
- [ ] `acknowledge-alert` - Mark alert as acknowledged
- [ ] `mute-alert` - Temporarily silence alert
- [ ] `create-alert-rule` - Define new alert condition

### 8. Integration Management
**Use Case:** Operators need to manage external integrations

**New Functions:**
- [ ] `list-integrations` - Show configured integrations
- [ ] `test-integration` - Verify integration connectivity
- [ ] `sync-integration` - Force integration sync
- [ ] `disable-integration` - Temporarily disable integration

---

## Implementation Priority

### Phase 1: Core Operations (Week 1)
**Priority:** High  
**User Impact:** Immediate operational utility

1. `system-status` - Comprehensive dashboard data
2. `view-logs` - Essential for troubleshooting
3. `list-agents` - Visibility into agent fleet
4. `audit-trail` - Compliance and debugging

### Phase 2: Data Management (Week 2)
**Priority:** Medium  
**User Impact:** Data analysis and export

1. `query-database` (read-only, safe queries)
2. `export-data` - CSV/JSON export
3. `backup-database` - Manual backup control

### Phase 3: Advanced Controls (Week 3)
**Priority:** Medium  
**User Impact:** Fine-grained control

1. `pause-agent` / `resume-agent`
2. `create-policy` / `update-policy`
3. `test-policy` (dry-run mode)

### Phase 4: Monitoring & Alerts (Week 4)
**Priority:** Low  
**User Impact:** Proactive monitoring

1. `list-alerts`
2. `create-alert-rule`
3. `compliance-report`

---

## Technical Implementation

### Action Type Registry

```sql
CREATE TABLE IF NOT EXISTS action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'system', 'data', 'agent', 'policy', etc.
  default_risk_tier TEXT DEFAULT 'T0',
  enabled BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Execution Handlers

**Location:** `/home/maxlawai/regulator.ai/apps/console/server/src/execution/handlers/`

**Template:**
```typescript
import { ExecutionHandler, ExecutionContext, ExecutionResult } from '../types';

export const systemStatusHandler: ExecutionHandler = {
  name: 'system-status',
  description: 'Get comprehensive system status report',
  
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    // Implementation
    return {
      success: true,
      data: {
        // Status data
      },
    };
  },
  
  validate(payload: any): boolean {
    // Input validation
    return true;
  },
};
```

---

## User Experience Flow

### Example: View System Status

**User Action:**
1. Navigate to "System" tab
2. Click "Status" card
3. View real-time metrics

**Behind the Scenes:**
```typescript
// Frontend
await intentApi.submit({
  intent_type: 'system-status',
  payload: {},
});

// Backend
const result = await systemStatusHandler.execute(context);

// Response
{
  success: true,
  data: {
    uptime: '3d 14h 22m',
    cpu_usage: '12%',
    memory_usage: '45%',
    disk_usage: '23%',
    active_agents: 5,
    pending_approvals: 2,
    last_backup: '2026-03-29T10:00:00Z',
  }
}
```

---

## Next Steps

1. ✅ Document expansion plan
2. [ ] Create action_types table migration
3. [ ] Implement Phase 1 handlers
4. [ ] Add UI components for new functions
5. [ ] Write integration tests
6. [ ] Deploy and validate

---

## Success Metrics

**Before:** 4 action types, limited utility  
**After:** 25+ action types, practical operational value

**User Feedback Targets:**
- "I can now monitor my system effectively"
- "Data export saves me hours"
- "Agent management is much easier"
- "Audit trail is essential for compliance"

---

**Status:** Ready to implement Phase 1

