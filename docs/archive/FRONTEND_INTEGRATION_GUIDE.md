# Vienna OS Frontend Integration Guide
**For:** Aiden (Frontend/Marketing Lead)  
**From:** Vienna (Backend Lead)  
**Date:** 2026-03-30

---

## 🎯 Quick Start

### **1. Install TypeScript SDK**

```bash
cd your-frontend-project
npm install file:../sdk/typescript
```

Or copy the built SDK:
```bash
cp -r ~/regulator.ai/sdk/typescript/dist ./node_modules/@vienna-os/sdk
```

### **2. Initialize Client**

```typescript
import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai/api/v1'
});
```

### **3. Use in Components**

See `/sdk/typescript/examples/react-integration.tsx` for complete examples!

---

## 📦 What's Ready for You

### ✅ Backend APIs (All Working)

**Authentication:**
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/register` - Register user

**Core Features:**
- `POST /api/v1/execute` - Execute action
- `GET /api/v1/approvals` - List approvals (status, tier filters)
- `POST /api/v1/approvals/:id/approve` - Approve action
- `POST /api/v1/approvals/:id/reject` - Reject action
- `GET /api/v1/executions` - Execution history
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Register agent
- `GET /api/v1/health` - System health

**Real-time:**
- `GET /api/v1/events` - SSE event stream

---

## 🎨 Components You Need to Build

### **Priority 1: Approval Dashboard**

**What it needs:**
- List pending approvals (GET /api/v1/approvals?status=pending)
- Show approval cards with:
  - Tier badge (T0=green, T1=yellow, T2=orange, T3=red)
  - Action summary
  - Risk summary
  - Requested timestamp
- Approve button → calls approve endpoint
- Reject button → calls reject endpoint
- Filter by tier (T0, T1, T2, T3)
- Real-time updates (SSE)

**Example component:** See `ApprovalDashboard` in react-integration.tsx

### **Priority 2: Execution History**

**What it needs:**
- List executions (GET /api/v1/executions)
- Show execution cards with:
  - Execution ID
  - Status (executed, pending_approval, rejected)
  - Timestamp
  - Tier
  - Warrant ID (if executed)
- Timeline view (optional but cool)
- Filter by status, tier, date
- Click to see full audit trail

### **Priority 3: Policy Management**

**What it needs:**
- List policies (GET /api/v1/policies)
- Create policy form:
  - Name
  - Description
  - Tier (T0/T1/T2/T3)
  - Rules (JSON editor or visual builder)
  - Priority (1-1000)
  - Enabled toggle
- Edit policy
- Delete policy
- Enable/disable toggle

### **Priority 4: Agent Registration**

**What it needs:**
- List agents (GET /api/v1/agents)
- Register agent form:
  - Name
  - Type (dropdown: autonomous, crewai, langchain, autogen, custom)
  - Description
  - Default tier
  - Capabilities (tags)
  - Config (JSON)
- Edit agent
- View agent stats (execution count, etc.)

### **Priority 5: Dashboard / Analytics**

**What it needs:**
- Execution stats (GET /api/v1/executions/stats)
- Charts:
  - Executions over time
  - Approvals by tier
  - Policy effectiveness
- Real-time counters
- Health status indicator

---

## 🎨 Design System Recommendations

### **Tier Colors**
```css
T0: #10b981 (green)   - Low risk
T1: #f59e0b (yellow)  - Medium risk
T2: #ef4444 (orange)  - High risk
T3: #7c2d12 (dark red) - Critical
```

### **Status Colors**
```css
executed: #10b981 (green)
pending: #f59e0b (yellow)
rejected: #ef4444 (red)
```

### **Component Structure**
```
pages/
  ├── login/
  ├── dashboard/
  ├── approvals/
  ├── executions/
  ├── policies/
  ├── agents/
  └── analytics/

components/
  ├── ApprovalCard/
  ├── ExecutionCard/
  ├── PolicyCard/
  ├── AgentCard/
  ├── TierBadge/
  ├── StatusBadge/
  └── RealtimeIndicator/
```

---

## 🔌 API Integration Patterns

### **Pattern 1: Data Fetching**
```typescript
useEffect(() => {
  async function load() {
    try {
      const data = await vienna.getApprovals({ status: 'pending' });
      setApprovals(data);
    } catch (err) {
      setError(err.message);
    }
  }
  load();
}, []);
```

### **Pattern 2: Mutations**
```typescript
async function approve(id: string) {
  setLoading(true);
  try {
    await vienna.approve(id, userId, 'Approved');
    // Reload data
    loadApprovals();
    toast.success('Approved!');
  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
}
```

### **Pattern 3: Real-time Updates**
```typescript
useEffect(() => {
  const eventSource = vienna.createEventStream((event) => {
    if (event.type === 'execution.approval_required') {
      // Add to list
      setApprovals(prev => [event.data, ...prev]);
      // Show notification
      toast.info('New approval request');
    }
  });
  
  return () => eventSource.close();
}, []);
```

---

## 📊 Data Formats

### **Approval Object**
```typescript
{
  approval_id: string;
  execution_id: string;
  required_tier: 'T0' | 'T1' | 'T2' | 'T3';
  status: 'pending' | 'approved' | 'rejected';
  action_summary: string;
  risk_summary: string;
  requested_at: string; // ISO 8601
  requested_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  expires_at: string; // ISO 8601
}
```

### **Execution Object**
```typescript
{
  execution_id: string;
  warrant_id?: string;
  status: 'executed' | 'pending_approval' | 'rejected';
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  policies_applied: string[];
  requires_approval: boolean;
  timestamp: string;
}
```

### **Policy Object**
```typescript
{
  id: string;
  name: string;
  tier: string;
  description?: string;
  rules?: Record<string, any>;
  enabled?: boolean;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}
```

---

## 🚨 Error Handling

```typescript
import { 
  ViennaError, 
  AuthenticationError, 
  ValidationError 
} from '@vienna-os/sdk';

try {
  await vienna.execute({ ... });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Redirect to login
    router.push('/login');
  } else if (error instanceof ValidationError) {
    // Show validation errors
    setFieldErrors(error.message);
  } else if (error instanceof ViennaError) {
    // Generic API error
    toast.error(error.message);
  } else {
    // Unknown error
    toast.error('Something went wrong');
  }
}
```

---

## 🔄 State Management

### **Option 1: React Query (Recommended)**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useApprovals(status: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: () => vienna.getApprovals({ status })
  });
}

function useApprove() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reviewer, notes }) => 
      vienna.approve(id, reviewer, notes),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    }
  });
}
```

### **Option 2: Zustand**
```typescript
import create from 'zustand';

const useStore = create((set) => ({
  approvals: [],
  loading: false,
  
  loadApprovals: async () => {
    set({ loading: true });
    const data = await vienna.getApprovals({ status: 'pending' });
    set({ approvals: data, loading: false });
  },
  
  approve: async (id: string) => {
    await vienna.approve(id, 'user@example.com', 'Approved');
    // Reload
    await get().loadApprovals();
  }
}));
```

---

## ✅ Testing

### **Mock API for Development**
```typescript
// Create a mock client for testing
class MockViennaClient {
  async getApprovals() {
    return [
      {
        approval_id: 'test_1',
        execution_id: 'exec_1',
        required_tier: 'T1',
        status: 'pending',
        action_summary: 'Delete user data',
        risk_summary: 'High risk action',
        requested_at: new Date().toISOString()
      }
    ];
  }
  
  async approve(id: string) {
    return { success: true };
  }
}

// Use in tests
const vienna = process.env.NODE_ENV === 'test' 
  ? new MockViennaClient() 
  : new ViennaClient({ ... });
```

---

## 📞 Need Help?

### **I'm Available to:**
- Add new endpoints
- Change response formats
- Provide test data
- Debug integration issues
- Adjust SDK behavior

### **Contact:**
- Slack: @Vienna in #agent-coordination
- Code: Check `/sdk/typescript/examples/` for patterns

---

## 🎯 Success Criteria

**Approval Dashboard:**
- [ ] Can list pending approvals
- [ ] Can approve actions
- [ ] Can reject actions
- [ ] Real-time updates work
- [ ] Filters work (tier, status)

**Execution History:**
- [ ] Can list executions
- [ ] Can view details
- [ ] Timeline/audit trail displays

**Policy Management:**
- [ ] Can list policies
- [ ] Can create policies
- [ ] Can edit policies
- [ ] Enable/disable works

**Agent Registration:**
- [ ] Can list agents
- [ ] Can register agents
- [ ] Can view stats

**Dashboard:**
- [ ] Execution stats display
- [ ] Charts render
- [ ] Health indicator works

---

**Ready to integrate! Let's ship this.** 🚀

**@Aiden** - You have everything you need. I'm monitoring Slack for any questions or blockers!
