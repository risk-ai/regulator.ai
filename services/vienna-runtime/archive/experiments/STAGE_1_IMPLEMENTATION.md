# Vienna Operator Shell — Stage 1 Implementation Guide

**Goal:** Global layout + dashboard + SSE + native Vienna chat

**Timeline:** Week 1

**Status:** Ready to implement

**Product vision:** Build Vienna-native OpenClaw replacement UI with native chat as primary interaction.

---

## Stage 1 Scope

Build the foundational operator shell with:

1. ✅ Global layout system (status bar, nav, drawer)
2. ✅ Dashboard page with live updates
3. ✅ SSE integration
4. ✅ Dashboard bootstrap endpoint
5. ✅ **Native Vienna chat panel** (first-class feature)
6. ✅ Basic chat message classification
7. ✅ Informational queries + control commands

---

## Components to Build

### Backend

1. **No new routes required** — already have `/api/v1/dashboard` and `/api/v1/stream`
2. **Wire ViennaRuntimeService** — implement `bootstrapDashboard()`
3. **Command parser** — basic structured command recognition

### Frontend

1. **Global layout components**
   - `AppShell.tsx` — master layout
   - `TopStatusBar.tsx` — health, executor, queue, trading guard
   - `LeftNav.tsx` — navigation sidebar
   - `InspectionDrawer.tsx` — right-side detail panel
   - `CommandBar.tsx` — bottom command interface

2. **Dashboard page**
   - `DashboardPage.tsx` — main operator control page
   - `ObjectiveCard.tsx` — objective summary cards
   - `DecisionCard.tsx` — actionable decision items
   - `RecentEvents.tsx` — event timeline

3. **State management**
   - `useDashboardStore.ts` — Zustand store
   - `useDashboardBootstrap.ts` — initial load hook
   - `useViennaStream.ts` — SSE integration (already implemented)

4. **Routing**
   - React Router v6 setup
   - Route definitions for all pages (Stage 1 only renders dashboard)

---

## Implementation Order

### Step 1: Backend — Vienna Core Integration

**File:** `console/server/src/services/viennaRuntime.ts`

**Implement:**

```typescript
async bootstrapDashboard(): Promise<DashboardBootstrapResponse> {
  // Parallel fetch all dashboard state
  const [
    status,
    objectives,
    activeEnvelopes,
    queueState,
    decisions,
    deadLetters,
    agents,
    metrics,
    health,
    integrity,
  ] = await Promise.all([
    this.getSystemStatus(),
    this.getObjectives({ limit: 10 }),
    this.getActiveEnvelopes(),
    this.getQueueState(),
    this.getDecisions(),
    this.getDeadLetters({ state: 'pending_review' }),
    this.getAgents(),
    this.getExecutionMetrics(),
    this.getHealth(),
    this.checkIntegrity('system'),
  ]);

  return {
    status,
    objectives,
    active_execution: activeEnvelopes,
    queue_state: queueState,
    decisions,
    dead_letters: deadLetters,
    agents,
    metrics,
    health,
    integrity,
    bootstrapped_at: new Date().toISOString(),
  };
}
```

**Wire to Vienna Core:**

```typescript
async getSystemStatus(): Promise<SystemStatus> {
  const health = await this.executor.getHealth();
  const controlState = await this.executor.getExecutionControlState();
  const queueState = await this.executor.getQueueState();
  const tradingGuard = await this.tradingGuard.getState();
  const integrity = await this.executor.checkIntegrity();

  return {
    system_state: health.state,
    executor_state: controlState.paused ? 'paused' : 'running',
    paused: controlState.paused,
    pause_reason: controlState.pause_reason,
    queue_depth: queueState.total,
    active_envelopes: queueState.executing,
    blocked_envelopes: queueState.blocked,
    dead_letter_count: await this.getDeadLetterCount(),
    integrity_state: integrity.state,
    trading_guard_state: tradingGuard.state,
    trading_override_expires_at: tradingGuard.override_expires_at,
    nba_autonomous_window: await this.getNBAAutonomousWindow(),
    health: {
      state: health.state,
      latency_ms_avg: health.latency_ms_avg,
      stalled_executions: health.stalled_executions,
      last_check: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };
}
```

**Test:**

```bash
curl http://localhost:3100/api/v1/dashboard | jq
```

Should return full dashboard state.

---

### Step 2: Frontend — Global Layout

**File:** `console/client/src/components/layout/AppShell.tsx`

```tsx
import { Outlet } from 'react-router-dom';
import { TopStatusBar } from './TopStatusBar';
import { LeftNav } from './LeftNav';
import { InspectionDrawer } from './InspectionDrawer';
import { CommandBar } from './CommandBar';
import { useDashboardStore } from '../../store/useDashboardStore';

export function AppShell() {
  const drawerOpen = useDashboardStore(state => state.drawerOpen);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Status Bar */}
      <TopStatusBar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation */}
        <LeftNav />

        {/* Main Workspace */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>

        {/* Inspection Drawer */}
        {drawerOpen && <InspectionDrawer />}
      </div>

      {/* Command Bar */}
      <CommandBar />
    </div>
  );
}
```

---

**File:** `console/client/src/components/layout/TopStatusBar.tsx`

```tsx
import { useDashboardStore } from '../../store/useDashboardStore';

export function TopStatusBar() {
  const status = useDashboardStore(state => state.status);

  if (!status) return null;

  return (
    <div className="h-12 bg-gray-900 text-white flex items-center px-6 space-x-6 border-b border-gray-700">
      {/* System Health */}
      <StatusBadge
        label="System"
        value={status.system_state}
        variant={getHealthVariant(status.system_state)}
      />

      {/* Executor */}
      <StatusBadge
        label="Executor"
        value={status.executor_state}
        variant={status.paused ? 'warning' : 'success'}
      />

      {/* Queue Depth */}
      <StatusPill label="Queue" value={status.queue_depth} />

      {/* Active Objectives */}
      <StatusPill label="Active" value={status.active_envelopes} />

      {/* Dead Letters */}
      {status.dead_letter_count > 0 && (
        <StatusPill
          label="Dead Letters"
          value={status.dead_letter_count}
          variant="danger"
        />
      )}

      {/* Trading Guard */}
      <StatusBadge
        label="Trading Guard"
        value={status.trading_guard_state}
        variant={getTradingGuardVariant(status.trading_guard_state)}
      />

      {/* Integrity */}
      <StatusBadge
        label="Integrity"
        value={status.integrity_state}
        variant={getIntegrityVariant(status.integrity_state)}
      />
    </div>
  );
}

function StatusBadge({ label, value, variant }: {
  label: string;
  value: string;
  variant: 'success' | 'warning' | 'danger';
}) {
  const colors = {
    success: 'bg-green-900/50 text-green-300',
    warning: 'bg-yellow-900/50 text-yellow-300',
    danger: 'bg-red-900/50 text-red-300',
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[variant]}`}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({ label, value, variant = 'neutral' }: {
  label: string;
  value: number;
  variant?: 'neutral' | 'danger';
}) {
  const colors = {
    neutral: 'text-gray-300',
    danger: 'text-red-400',
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-mono text-sm ${colors[variant]}`}>{value}</span>
    </div>
  );
}
```

---

**File:** `console/client/src/components/layout/LeftNav.tsx`

```tsx
import { NavLink } from 'react-router-dom';

export function LeftNav() {
  return (
    <nav className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="h-12 flex items-center px-6 border-b border-gray-700">
        <h1 className="text-white font-semibold">Vienna</h1>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-auto py-4">
        <NavSection title="Main">
          <NavItem to="/" icon="📊" label="Dashboard" />
        </NavSection>

        <NavSection title="Domains">
          <NavItem to="/trading" icon="📈" label="Trading" />
          <NavItem to="/fitness" icon="💪" label="Fitness" />
          <NavItem to="/classwork" icon="📚" label="Classwork" />
        </NavSection>

        <NavSection title="System">
          <NavItem to="/files" icon="📁" label="Files" />
          <NavItem to="/objectives" icon="🎯" label="Objectives" />
          <NavItem to="/agents" icon="🤖" label="Agents" />
          <NavItem to="/replay" icon="⏮️" label="Replay" />
          <NavItem to="/system" icon="⚙️" label="System" />
        </NavSection>
      </div>
    </nav>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="px-6 mb-2 text-xs font-semibold text-gray-500 uppercase">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-6 py-2 text-sm ${
          isActive
            ? 'bg-gray-800 text-white border-l-2 border-blue-500'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`
      }
    >
      <span className="mr-3">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
```

---

**File:** `console/client/src/components/layout/CommandBar.tsx`

```tsx
import { useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';

export function CommandBar() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    try {
      // TODO: Implement command parser
      // For now, just echo
      setOutput(`Command received: ${input}`);
      setInput('');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-900">
      {/* Command Output */}
      {output && (
        <div className="px-6 py-2 text-sm text-gray-300 border-b border-gray-700">
          {output}
        </div>
      )}

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="flex items-center px-6 py-3">
        <span className="text-gray-500 mr-2">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command or ask Vienna..."
          className="flex-1 bg-transparent text-white focus:outline-none"
        />
      </form>
    </div>
  );
}
```

---

### Step 3: Frontend — Dashboard Page

**File:** `console/client/src/pages/DashboardPage.tsx`

```tsx
import { useDashboardStore } from '../store/useDashboardStore';

export function DashboardPage() {
  const objectives = useDashboardStore(state => state.objectives.slice(0, 5));
  const decisions = useDashboardStore(state => state.decisions);
  const status = useDashboardStore(state => state.status);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      {/* Active Objectives */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4">Active Objectives</h2>
        <div className="space-y-3">
          {objectives.map(obj => (
            <ObjectiveCard key={obj.objective_id} objective={obj} />
          ))}
        </div>
      </section>

      {/* Decisions Needing Attention */}
      {decisions.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-white mb-4">Decisions Needing Attention</h2>
          <div className="space-y-3">
            {decisions.map(decision => (
              <DecisionCard key={decision.decision_id} decision={decision} />
            ))}
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <section>
        <h2 className="text-lg font-medium text-white mb-4">Quick Stats</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Queue Depth" value={status?.queue_depth ?? 0} />
          <StatCard label="Active" value={status?.active_envelopes ?? 0} />
          <StatCard label="Blocked" value={status?.blocked_envelopes ?? 0} />
          <StatCard label="Dead Letters" value={status?.dead_letter_count ?? 0} />
        </div>
      </section>
    </div>
  );
}

function ObjectiveCard({ objective }: { objective: ObjectiveSummary }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-white font-medium">{objective.title}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {objective.status} • {objective.risk_tier} • {objective.envelope_count} envelopes
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(objective.status)}`}>
          {objective.status}
        </span>
      </div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: DecisionItem }) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
      <h3 className="text-yellow-200 font-medium">{decision.title}</h3>
      <p className="text-sm text-yellow-300/70 mt-1">{decision.description}</p>
      <div className="mt-3 flex space-x-2">
        {decision.actions.map(action => (
          <button
            key={action.action_id}
            className="px-3 py-1 rounded text-sm bg-yellow-800/50 hover:bg-yellow-800 text-yellow-200"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-mono text-white mt-1">{value}</div>
    </div>
  );
}
```

---

### Step 4: State Management

**File:** `console/client/src/store/useDashboardStore.ts`

```typescript
import { create } from 'zustand';
import type {
  SystemStatus,
  ObjectiveSummary,
  EnvelopeExecution,
  DecisionItem,
  DeadLetterItem,
  AgentSummary,
  QueueSnapshot,
  ExecutionMetrics,
  HealthSnapshot,
  IntegritySnapshot,
  SSEEvent,
} from '../api/types';

interface DashboardState {
  // State
  status: SystemStatus | null;
  objectives: ObjectiveSummary[];
  activeEnvelopes: EnvelopeExecution[];
  queueState: QueueSnapshot | null;
  decisions: DecisionItem[];
  deadLetters: DeadLetterItem[];
  agents: AgentSummary[];
  metrics: ExecutionMetrics | null;
  health: HealthSnapshot | null;
  integrity: IntegritySnapshot | null;

  // UI state
  selectedObjectiveId: string | null;
  selectedEnvelopeId: string | null;
  drawerOpen: boolean;

  // Loading state
  loading: boolean;
  error: string | null;

  // Actions
  bootstrap: () => Promise<void>;
  applyEvent: (event: SSEEvent) => void;
  selectObjective: (id: string | null) => void;
  selectEnvelope: (id: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  status: null,
  objectives: [],
  activeEnvelopes: [],
  queueState: null,
  decisions: [],
  deadLetters: [],
  agents: [],
  metrics: null,
  health: null,
  integrity: null,
  selectedObjectiveId: null,
  selectedEnvelopeId: null,
  drawerOpen: false,
  loading: false,
  error: null,

  // Bootstrap
  bootstrap: async () => {
    set({ loading: true, error: null });
    
    try {
      const dashboard = await dashboardApi.bootstrap();
      
      set({
        status: dashboard.status,
        objectives: dashboard.objectives,
        activeEnvelopes: dashboard.active_execution,
        queueState: dashboard.queue_state,
        decisions: dashboard.decisions,
        deadLetters: dashboard.dead_letters,
        agents: dashboard.agents,
        metrics: dashboard.metrics,
        health: dashboard.health,
        integrity: dashboard.integrity,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      });
    }
  },

  // Apply SSE event
  applyEvent: (event) => {
    const state = get();

    switch (event.type) {
      case 'system.status.updated':
        set({ status: event.payload as SystemStatus });
        break;

      case 'objective.updated':
        const updatedObjective = event.payload as any;
        set({
          objectives: state.objectives.map(obj =>
            obj.objective_id === updatedObjective.objective_id
              ? { ...obj, ...updatedObjective.changes }
              : obj
          ),
        });
        break;

      case 'objective.created':
        set({ objectives: [...state.objectives, event.payload as ObjectiveSummary] });
        break;

      case 'decision.created':
        set({ decisions: [...state.decisions, event.payload as DecisionItem] });
        break;

      case 'deadletter.created':
        set({ deadLetters: [...state.deadLetters, event.payload as DeadLetterItem] });
        break;

      // Add more cases as needed
    }
  },

  // UI actions
  selectObjective: (id) => set({ selectedObjectiveId: id, drawerOpen: !!id }),
  selectEnvelope: (id) => set({ selectedEnvelopeId: id, drawerOpen: !!id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
```

---

**File:** `console/client/src/hooks/useDashboardBootstrap.ts`

```typescript
import { useEffect } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { useViennaStream } from '../api/stream';

export function useDashboardBootstrap() {
  const bootstrap = useDashboardStore(state => state.bootstrap);
  const applyEvent = useDashboardStore(state => state.applyEvent);

  // Bootstrap on mount
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Subscribe to SSE stream
  useViennaStream({
    onEvent: applyEvent,
    onConnect: () => console.log('Vienna stream connected'),
    onDisconnect: () => console.log('Vienna stream disconnected'),
    reconnect: true,
  });
}
```

---

### Step 5: Routing Setup

**File:** `console/client/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { useDashboardBootstrap } from './hooks/useDashboardBootstrap';

function App() {
  useDashboardBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          {/* More routes in later stages */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Step 6: Vienna Chat Backend

**File:** `console/server/src/routes/chat.ts`

```typescript
import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type {
  SuccessResponse,
  ErrorResponse,
  ChatMessageRequest,
  ChatMessageResponse,
} from '../types/api.js';

export function createChatRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * POST /api/v1/chat/message
   * Send message to Vienna
   */
  router.post('/message', async (req: Request, res: Response) => {
    try {
      const request: ChatMessageRequest = req.body;
      
      if (!request.message || !request.operator) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required fields: message, operator',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      // Classify message
      const classification = await vienna.classifyChatMessage(request.message, request.context);
      
      // Handle based on classification
      let response: ChatMessageResponse;
      
      switch (classification) {
        case 'informational':
          response = await vienna.handleQuery(request.message, request.context);
          break;
          
        case 'command':
          response = await vienna.handleCommand(request.message, request.context);
          break;
          
        case 'reasoning':
          response = await vienna.handleReasoning(request.message, request.context);
          break;
          
        case 'directive':
          response = await vienna.handleDirective(request.message, request.context);
          break;
          
        case 'approval':
          response = await vienna.handleApprovalRequest(request.message, request.context);
          break;
          
        default:
          response = {
            message_id: generateMessageId(),
            classification: 'informational',
            response: 'I couldn\'t understand that message. Try rephrasing or use a structured command.',
            timestamp: new Date().toISOString(),
          };
      }
      
      const result: SuccessResponse<ChatMessageResponse> = {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      };
      
      res.json(result);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CHAT_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/chat/history
   * Get chat history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const { limit, before } = req.query;
      
      const history = await vienna.getChatHistory({
        limit: limit ? parseInt(limit as string) : 50,
        before: before as string | undefined,
      });
      
      const result: SuccessResponse = {
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      };
      
      res.json(result);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HISTORY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
```

---

**File:** `console/server/src/services/chatService.ts`

```typescript
/**
 * Chat Service
 * Message classification and handling
 */

export class ChatService {
  constructor(private vienna: ViennaRuntimeService) {}

  async classifyMessage(message: string, context?: ChatContext): Promise<MessageClassification> {
    // Simple keyword-based classification for Stage 1
    // TODO: Improve with NLP in later stages
    
    const lowerMessage = message.toLowerCase();
    
    // Command patterns
    if (lowerMessage.match(/^(pause|resume|retry|cancel|show|list)/)) {
      return 'command';
    }
    
    // Directive patterns
    if (lowerMessage.includes('organize') || 
        lowerMessage.includes('generate') || 
        lowerMessage.includes('create') ||
        lowerMessage.includes('update')) {
      return 'directive';
    }
    
    // Reasoning patterns
    if (lowerMessage.includes('why') || 
        lowerMessage.includes('explain') || 
        lowerMessage.includes('analyze') ||
        lowerMessage.includes('how')) {
      return 'reasoning';
    }
    
    // Approval patterns
    if (lowerMessage.includes('override') || 
        lowerMessage.includes('delete all') || 
        lowerMessage.includes('emergency')) {
      return 'approval';
    }
    
    // Default to informational
    return 'informational';
  }

  async handleQuery(message: string, context?: ChatContext): Promise<ChatMessageResponse> {
    // Simple query handling for Stage 1
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('blocked')) {
      const blocked = await this.vienna.getBlockedEnvelopes();
      return {
        message_id: generateMessageId(),
        classification: 'informational',
        response: `${blocked.length} objectives are currently blocked.`,
        timestamp: new Date().toISOString(),
      };
    }
    
    if (lowerMessage.includes('status')) {
      const status = await this.vienna.getSystemStatus();
      return {
        message_id: generateMessageId(),
        classification: 'informational',
        response: `System is ${status.system_state}. Executor is ${status.executor_state}. Queue depth: ${status.queue_depth}.`,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Default response
    return {
      message_id: generateMessageId(),
      classification: 'informational',
      response: 'I can help you with system status, blocked objectives, trading activity, and more. What would you like to know?',
      timestamp: new Date().toISOString(),
    };
  }

  async handleCommand(message: string, context?: ChatContext): Promise<ChatMessageResponse> {
    // Parse simple commands
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.startsWith('pause execution')) {
      await this.vienna.pauseExecution({
        reason: 'Operator requested via chat',
        operator: context?.operator || 'unknown',
      });
      
      return {
        message_id: generateMessageId(),
        classification: 'command',
        response: '✓ Execution paused successfully.',
        command_result: {
          success: true,
          message: 'Execution paused',
        },
        timestamp: new Date().toISOString(),
      };
    }
    
    if (lowerMessage.startsWith('resume execution')) {
      await this.vienna.resumeExecution({
        operator: context?.operator || 'unknown',
      });
      
      return {
        message_id: generateMessageId(),
        classification: 'command',
        response: '✓ Execution resumed successfully.',
        command_result: {
          success: true,
          message: 'Execution resumed',
        },
        timestamp: new Date().toISOString(),
      };
    }
    
    // Command not recognized
    return {
      message_id: generateMessageId(),
      classification: 'command',
      response: 'Command not recognized. Try: pause execution, resume execution, retry envelope <id>',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

### Step 7: Vienna Chat Frontend

**File:** `console/client/src/components/chat/ChatPanel.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { chatApi } from '../../api/chat';
import { useDashboardStore } from '../../store/useDashboardStore';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage: ChatMessage = {
      message_id: `temp_${Date.now()}`,
      role: 'operator',
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send to backend
      const response = await chatApi.sendMessage(input, 'max', {
        page: window.location.pathname,
      });
      
      // Add Vienna response
      const viennaMessage: ChatMessage = {
        message_id: response.message_id,
        role: 'vienna',
        content: response.response,
        classification: response.classification,
        timestamp: response.timestamp,
      };
      
      setMessages(prev => [...prev, viennaMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        message_id: `error_${Date.now()}`,
        role: 'vienna',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-white font-medium">Vienna Chat</h2>
        <button
          onClick={() => setMessages([])}
          className="text-gray-400 hover:text-white text-sm"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Ask Vienna anything...</p>
            <p className="text-xs mt-2">Try: "What's currently blocked?" or "Show status"</p>
          </div>
        )}
        
        {messages.map(msg => (
          <ChatMessage key={msg.message_id} message={msg} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            disabled={loading}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: ChatMessage }) {
  const isOperator = message.role === 'operator';
  
  return (
    <div className={`flex ${isOperator ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
        isOperator 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-800 text-gray-100'
      }`}>
        {/* Classification badge */}
        {message.classification && !isOperator && (
          <div className="mb-1">
            <ClassificationBadge type={message.classification} />
          </div>
        )}
        
        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        
        {/* Timestamp */}
        <div className={`text-xs mt-1 ${
          isOperator ? 'text-blue-200' : 'text-gray-500'
        }`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function ClassificationBadge({ type }: { type: string }) {
  const badges = {
    informational: { icon: '🔍', label: 'Query', color: 'bg-blue-900/50 text-blue-300' },
    reasoning: { icon: '🤔', label: 'Reasoning', color: 'bg-purple-900/50 text-purple-300' },
    directive: { icon: '📝', label: 'Directive', color: 'bg-green-900/50 text-green-300' },
    command: { icon: '⚡', label: 'Command', color: 'bg-yellow-900/50 text-yellow-300' },
    approval: { icon: '⚠️', label: 'Approval', color: 'bg-red-900/50 text-red-300' },
  };
  
  const badge = badges[type as keyof typeof badges] || badges.informational;
  
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
```

---

**File:** `console/client/src/api/chat.ts`

```typescript
/**
 * Chat API
 */

import { apiClient } from './client.js';

export interface ChatContext {
  page?: string;
  objective_id?: string;
  envelope_id?: string;
  file_id?: string;
}

export interface ChatMessageRequest {
  message: string;
  context?: ChatContext;
  operator: string;
}

export interface ChatMessageResponse {
  message_id: string;
  classification: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval';
  response: string;
  streaming?: boolean;
  directive_preview?: any;
  command_result?: any;
  approval_prompt?: any;
  timestamp: string;
}

export interface ChatMessage {
  message_id: string;
  role: 'operator' | 'vienna';
  content: string;
  classification?: string;
  timestamp: string;
}

export const chatApi = {
  /**
   * Send message to Vienna
   */
  sendMessage: (message: string, operator: string, context?: ChatContext) =>
    apiClient.post<ChatMessageResponse>('/chat/message', { message, operator, context }),

  /**
   * Get chat history
   */
  getHistory: (limit?: number, before?: string) =>
    apiClient.get<{ messages: ChatMessage[]; has_more: boolean }>('/chat/history', {
      limit,
      before,
    }),

  /**
   * Clear chat history
   */
  clear: (operator: string, before?: string) =>
    apiClient.post<{ success: boolean; cleared_count: number }>('/chat/clear', {
      operator,
      before,
    }),
};
```

---

### Step 8: Update Dashboard with Chat

**File:** `console/client/src/pages/DashboardPage.tsx` (updated)

```tsx
import { useDashboardStore } from '../store/useDashboardStore';
import { ChatPanel } from '../components/chat/ChatPanel';

export function DashboardPage() {
  const objectives = useDashboardStore(state => state.objectives.slice(0, 5));
  const decisions = useDashboardStore(state => state.decisions);
  const status = useDashboardStore(state => state.status);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium text-white mb-4">Active Objectives</h2>
          <div className="space-y-3">
            {objectives.map(obj => (
              <ObjectiveCard key={obj.objective_id} objective={obj} />
            ))}
          </div>
        </section>

        {decisions.length > 0 && (
          <section>
            <h2 className="text-lg font-medium text-white mb-4">Decisions Needing Attention</h2>
            <div className="space-y-3">
              {decisions.map(decision => (
                <DecisionCard key={decision.decision_id} decision={decision} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-medium text-white mb-4">Quick Stats</h2>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Queue Depth" value={status?.queue_depth ?? 0} />
            <StatCard label="Active" value={status?.active_envelopes ?? 0} />
            <StatCard label="Blocked" value={status?.blocked_envelopes ?? 0} />
            <StatCard label="Dead Letters" value={status?.dead_letter_count ?? 0} />
          </div>
        </section>
      </div>

      {/* Right Column — Vienna Chat */}
      <div className="h-[calc(100vh-12rem)]">
        <ChatPanel />
      </div>
    </div>
  );
}
```

---

## Validation Checklist

### Backend

- [ ] `/api/v1/dashboard` returns complete bootstrap data
- [ ] All fields derive from Vienna Core (no console-local state)
- [ ] SSE stream accepts connections
- [ ] SSE emits heartbeat every 30s
- [ ] Status endpoint shows current Vienna state
- [ ] **Chat endpoint `/api/v1/chat/message` accepts messages**
- [ ] **Message classification works (informational/command/reasoning/directive/approval)**
- [ ] **Informational queries return accurate answers**
- [ ] **Commands execute actions (pause/resume)**

### Frontend

- [ ] Dashboard loads on `http://localhost:3000`
- [ ] Top status bar shows live system state
- [ ] Left navigation renders all sections
- [ ] Dashboard shows objectives + decisions
- [ ] SSE updates UI in real time
- [ ] Inspection drawer opens/closes
- [ ] **Chat panel renders on dashboard (right column)**
- [ ] **Chat accepts text input and displays messages**
- [ ] **Chat shows classification badges**
- [ ] **Chat messages scroll properly**
- [ ] **Chat "Clear" button works**

### Integration

- [ ] Full page load requires only 1 HTTP request (`/dashboard`)
- [ ] SSE reconnects automatically on disconnect
- [ ] UI reflects Vienna Core state accurately
- [ ] No console errors in browser
- [ ] Layout responsive (desktop focus for v1)
- [ ] **Chat messages route through Vienna Core (not direct execution)**
- [ ] **Chat commands create audit trail**
- [ ] **Chat works on dashboard without opening OpenClaw**

---

## Testing Steps

### 1. Backend Integration Test

```bash
cd console/server
npm install
npm run dev
```

```bash
# In another terminal
curl http://localhost:3100/api/v1/dashboard | jq .status
curl -N http://localhost:3100/api/v1/stream
```

Should see status and SSE heartbeats.

---

### 2. Frontend Standalone Test

```bash
cd console/client
npm install
npm run dev
```

Visit `http://localhost:5173`

Should see layout, but API calls will fail (backend not running).

---

### 3. Full Stack Test

With both backend and frontend running:

1. Visit `http://localhost:5173`
2. Verify dashboard loads
3. Open browser console, check for SSE connection
4. Open Network tab, verify only 1 initial HTTP request
5. Verify top status bar shows live data
6. **Chat panel visible on right side of dashboard**
7. **Type "What's blocked?" in chat → should get response**
8. **Type "pause execution" in chat → should pause execution**
9. **Type "resume execution" in chat → should resume execution**
10. **Verify chat messages show classification badges**
11. **Verify chat clear button works**

---

### 4. Chat-Specific Tests

```bash
# Test chat endpoint directly
curl -X POST http://localhost:3100/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is currently blocked?",
    "operator": "max"
  }' | jq

# Should return:
# {
#   "success": true,
#   "data": {
#     "message_id": "msg_123",
#     "classification": "informational",
#     "response": "3 objectives are currently blocked.",
#     "timestamp": "2026-03-11T20:00:00Z"
#   }
# }
```

```bash
# Test command execution
curl -X POST http://localhost:3100/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "pause execution",
    "operator": "max"
  }' | jq

# Should return command executed response
```

---

## Known Limitations (Stage 1)

- **Chat classification is keyword-based** (not NLP, improved in later stages)
- **Limited command vocabulary** (only pause/resume/status/blocked for now)
- **No directive preview UI yet** (just informational queries + basic commands)
- **No approval workflows yet** (T2 actions not supported)
- **No multi-turn conversation context** (each message independent)
- Inspection drawer is empty (no detail content)
- Only dashboard page renders (other routes are stubs)
- No domain workspaces yet
- No file system yet

**These are expected.** Stage 1 focuses on:
1. ✅ Global layout
2. ✅ Dashboard with objectives + decisions
3. ✅ SSE integration
4. ✅ **Native Vienna chat (primary new feature)**
5. ✅ Basic message classification
6. ✅ Informational queries
7. ✅ Control commands (pause/resume)

---

## Next: Stage 2

After Stage 1 validates, proceed to Stage 2:

- Objectives page
- Objective detail page
- Execution inspection
- Decision inbox
- Dead letter management
- Pause/resume controls

See `OPERATOR_SHELL_ARCHITECTURE.md` for full roadmap.
