# Vienna Operator Shell — Extended API Contract

**Phase 8 expanded scope: Full operator shell across all domains.**

This document extends the base API contract with domain-specific endpoints and file artifact management.

---

## New API Endpoints

### Trading Endpoints

#### `GET /api/v1/trading/status`

**Purpose:** Trading guard state + autonomous window + strategy status

**Response:**
```typescript
{
  trading_guard: {
    state: 'active' | 'emergency_override' | 'disabled',
    override_expires_at?: string,
  },
  autonomous_window: {
    active: boolean,
    day: number,
    total_days: number,
    expires_at: string,
  },
  strategies: [
    {
      strategy_id: string,
      name: string,
      version: string,
      state: 'live' | 'shadow' | 'paused',
      daily_stats: {
        trades: number,
        notional: number,
        pnl: number,
      },
    },
  ],
  risk_limits: {
    trade_size_max: number,
    daily_notional_max: number,
    weekly_notional_max: number,
    max_trades_per_day: number,
  },
}
```

---

#### `GET /api/v1/trading/strategies`

**Purpose:** List all trading strategies

**Response:**
```typescript
{
  strategies: [
    {
      strategy_id: string,
      name: string,
      version: string,
      state: 'live' | 'shadow' | 'paused',
      model_type: string,
      last_run: string,
      total_trades: number,
      cumulative_pnl: number,
    },
  ],
}
```

---

#### `GET /api/v1/trading/orders`

**Purpose:** Recent orders

**Query params:**
- `limit` (default 50)
- `status` (all/pending/filled/cancelled)

**Response:**
```typescript
{
  orders: [
    {
      order_id: string,
      strategy_id: string,
      market: string,
      side: 'yes' | 'no',
      quantity: number,
      price: number,
      status: 'pending' | 'filled' | 'cancelled',
      placed_at: string,
      filled_at?: string,
      objective_id?: string,
    },
  ],
}
```

---

#### `GET /api/v1/trading/positions`

**Purpose:** Current positions

**Response:**
```typescript
{
  positions: [
    {
      market: string,
      side: 'yes' | 'no',
      quantity: number,
      avg_price: number,
      current_price: number,
      unrealized_pnl: number,
    },
  ],
}
```

---

### Fitness Endpoints

#### `GET /api/v1/fitness/plans`

**Purpose:** Get fitness plans

**Query params:**
- `date` (ISO date, default today)
- `range` (day/week/month)

**Response:**
```typescript
{
  plans: [
    {
      plan_id: string,
      date: string,
      plan_type: 'daily' | 'weekly',
      activities: [
        {
          time: string,
          activity_type: string,
          duration_minutes: number,
          description: string,
        },
      ],
      objective_id?: string,
      created_at: string,
    },
  ],
}
```

---

#### `POST /api/v1/fitness/plans`

**Purpose:** Request new fitness plan (creates Vienna directive)

**Request:**
```typescript
{
  plan_type: 'daily' | 'weekly',
  date: string,
  preferences?: {
    focus?: string,
    duration_target?: number,
  },
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  directive_id: string,
  objective_id: string,
  created_at: string,
}
```

---

#### `GET /api/v1/fitness/logs`

**Purpose:** Get workout logs

**Query params:**
- `start_date`
- `end_date`
- `limit`

**Response:**
```typescript
{
  logs: [
    {
      log_id: string,
      date: string,
      activity_type: string,
      duration_minutes: number,
      notes?: string,
      objective_id?: string,
      logged_at: string,
    },
  ],
}
```

---

#### `POST /api/v1/fitness/logs`

**Purpose:** Log workout (creates Vienna objective)

**Request:**
```typescript
{
  date: string,
  activity_type: string,
  duration_minutes: number,
  notes?: string,
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  log_id: string,
  objective_id: string,
  logged_at: string,
}
```

---

### Classwork Endpoints

#### `GET /api/v1/classwork/assignments`

**Purpose:** List assignments

**Query params:**
- `status` (all/pending/in_progress/complete)
- `due_before` (ISO date)

**Response:**
```typescript
{
  assignments: [
    {
      assignment_id: string,
      course: string,
      title: string,
      type: 'reading' | 'memo' | 'outline' | 'exam',
      due_date: string,
      status: 'pending' | 'in_progress' | 'complete',
      estimated_hours?: number,
      linked_files: string[],
      linked_objectives: string[],
    },
  ],
}
```

---

#### `POST /api/v1/classwork/assignments`

**Purpose:** Add assignment (creates Vienna objective)

**Request:**
```typescript
{
  course: string,
  title: string,
  type: 'reading' | 'memo' | 'outline' | 'exam',
  due_date: string,
  description?: string,
  estimated_hours?: number,
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  assignment_id: string,
  objective_id: string,
  created_at: string,
}
```

---

#### `GET /api/v1/classwork/plans`

**Purpose:** Get study plans

**Query params:**
- `date` (ISO date, default today)

**Response:**
```typescript
{
  plans: [
    {
      plan_id: string,
      date: string,
      time_blocks: [
        {
          start_time: string,
          end_time: string,
          assignment_id: string,
          task: string,
        },
      ],
      objective_id?: string,
      created_at: string,
    },
  ],
}
```

---

#### `POST /api/v1/classwork/plans`

**Purpose:** Request study plan (creates Vienna directive)

**Request:**
```typescript
{
  date: string,
  available_hours: number,
  priority_assignments?: string[],
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  directive_id: string,
  objective_id: string,
  created_at: string,
}
```

---

### File Endpoints

#### `GET /api/v1/files`

**Purpose:** List files

**Query params:**
- `folder` (inbox/classwork/trading/fitness)
- `tag` (filter by tag)
- `search` (filename search)
- `limit`
- `offset`

**Response:**
```typescript
{
  files: [
    {
      file_id: string,
      filename: string,
      upload_date: string,
      size_bytes: number,
      mime_type: string,
      folder: string,
      tags: string[],
      processing_state: 'pending' | 'processing' | 'complete' | 'failed',
      processing_objective_id?: string,
      linked_objectives: string[],
      uploaded_by: string,
    },
  ],
  total: number,
  has_more: boolean,
}
```

---

#### `POST /api/v1/files/upload`

**Purpose:** Upload file (creates Vienna ingestion objective)

**Request:** `multipart/form-data`
- `file` (binary)
- `folder` (optional)
- `tags` (optional, comma-separated)
- `operator` (required)

**Response:**
```typescript
{
  success: boolean,
  file_id: string,
  filename: string,
  size_bytes: number,
  processing_objective_id: string,
  uploaded_at: string,
}
```

---

#### `GET /api/v1/files/:fileId`

**Purpose:** Get file metadata

**Response:**
```typescript
{
  file_id: string,
  filename: string,
  upload_date: string,
  size_bytes: number,
  mime_type: string,
  storage_path: string,
  folder: string,
  tags: string[],
  processing_state: 'pending' | 'processing' | 'complete' | 'failed',
  processing_objective_id?: string,
  processing_results?: {
    document_type?: string,
    extracted_text?: string,
    suggested_folder?: string,
    suggested_tags?: string[],
  },
  linked_objectives: string[],
  metadata: Record<string, unknown>,
  uploaded_by: string,
}
```

---

#### `PUT /api/v1/files/:fileId`

**Purpose:** Update file metadata

**Request:**
```typescript
{
  folder?: string,
  tags?: string[],
  metadata?: Record<string, unknown>,
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  file_id: string,
  updated_at: string,
}
```

---

#### `DELETE /api/v1/files/:fileId`

**Purpose:** Delete file (creates Vienna deletion objective)

**Request:**
```typescript
{
  operator: string,
  reason: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  file_id: string,
  objective_id: string,
  deleted_at: string,
}
```

---

#### `GET /api/v1/files/:fileId/objectives`

**Purpose:** Get objectives that reference this file

**Response:**
```typescript
{
  file_id: string,
  objectives: [
    {
      objective_id: string,
      title: string,
      status: string,
      created_at: string,
    },
  ],
}
```

---

#### `POST /api/v1/files/:fileId/process`

**Purpose:** Manually trigger file processing (creates Vienna objective)

**Request:**
```typescript
{
  processing_type: 'analyze' | 'extract' | 'organize',
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  file_id: string,
  objective_id: string,
  started_at: string,
}
```

---

### Command Endpoints

#### `POST /api/v1/commands/parse`

**Purpose:** Parse command string (validation only, no execution)

**Request:**
```typescript
{
  command: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  parsed: {
    command_type: string,
    parameters: Record<string, unknown>,
    target_endpoint?: string,
  },
  error?: string,
}
```

---

#### `POST /api/v1/commands/execute`

**Purpose:** Execute structured command

**Request:**
```typescript
{
  command: string,
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  result: unknown,
  message?: string,
  error?: string,
}
```

**Supported commands:**
```
pause execution
resume execution
show objective <id>
show agent <name>
retry envelope <id>
cancel objective <id>
list objectives [status]
list agents
```

---

### Conversation Endpoints

#### `POST /api/v1/conversations/start`

**Purpose:** Start Vienna conversation session

**Request:**
```typescript
{
  initial_message: string,
  operator: string,
  context?: {
    page?: string,
    objective_id?: string,
    file_id?: string,
  },
}
```

**Response:**
```typescript
{
  success: boolean,
  conversation_id: string,
  session_id: string,
  response: string,
  created_at: string,
}
```

---

#### `POST /api/v1/conversations/:id/message`

**Purpose:** Send message in existing conversation

**Request:**
```typescript
{
  message: string,
  operator: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  conversation_id: string,
  response: string,
  objective_created?: {
    objective_id: string,
    title: string,
  },
  timestamp: string,
}
```

---

### System Endpoints

#### `GET /api/v1/system/config`

**Purpose:** Get system configuration

**Response:**
```typescript
{
  risk_tiers: {
    T0: { description: string, warrant_required: boolean },
    T1: { description: string, warrant_required: boolean },
    T2: { description: string, warrant_required: boolean },
  },
  budget_limits: {
    daily_model_cost: number,
    daily_haiku_calls: number,
    daily_sonnet_calls: number,
    daily_opus_calls: number,
  },
  rate_limits: {
    agent_reasoning_per_minute: number,
    directive_submission_per_minute: number,
  },
  trading_constraints: {
    max_trade_size: number,
    max_daily_notional: number,
    max_weekly_notional: number,
    max_trades_per_day: number,
  },
  version: string,
  environment: string,
}
```

---

#### `PUT /api/v1/system/config`

**Purpose:** Update system configuration (creates Vienna directive)

**Request:**
```typescript
{
  section: 'budget_limits' | 'rate_limits' | 'trading_constraints',
  updates: Record<string, unknown>,
  operator: string,
  reason: string,
}
```

**Response:**
```typescript
{
  success: boolean,
  directive_id: string,
  objective_id: string,
  updated_at: string,
}
```

---

### Agent Detail Endpoints

#### `GET /api/v1/agents/:id/tasks`

**Purpose:** Get agent task history

**Query params:**
- `limit` (default 20)
- `status` (all/completed/failed)

**Response:**
```typescript
{
  agent_id: string,
  tasks: [
    {
      task_id: string,
      objective_id: string,
      task_type: string,
      status: 'pending' | 'executing' | 'completed' | 'failed',
      started_at: string,
      completed_at?: string,
      duration_ms?: number,
      model_used: string,
      tokens_used?: number,
    },
  ],
}
```

---

#### `GET /api/v1/agents/:id/reasoning`

**Purpose:** Get agent reasoning outputs

**Query params:**
- `limit` (default 20)

**Response:**
```typescript
{
  agent_id: string,
  reasoning_outputs: [
    {
      reasoning_id: string,
      objective_id?: string,
      prompt: string,
      response: string,
      structured_output?: Record<string, unknown>,
      timestamp: string,
      approval_outcome?: 'approved' | 'rejected',
    },
  ],
}
```

---

## New SSE Events

### Trading Events

```typescript
// Trading guard state changed
{
  type: 'trading.guard.updated',
  payload: {
    state: 'active' | 'emergency_override' | 'disabled',
    override_expires_at?: string,
  },
}

// Order placed
{
  type: 'trading.order.placed',
  payload: {
    order_id: string,
    strategy_id: string,
    market: string,
    side: 'yes' | 'no',
    quantity: number,
    price: number,
    objective_id: string,
  },
}

// Order filled
{
  type: 'trading.order.filled',
  payload: {
    order_id: string,
    filled_at: string,
    fill_price: number,
  },
}

// Strategy state updated
{
  type: 'trading.strategy.updated',
  payload: {
    strategy_id: string,
    state: 'live' | 'shadow' | 'paused',
  },
}
```

---

### Fitness Events

```typescript
// Fitness plan created
{
  type: 'fitness.plan.created',
  payload: {
    plan_id: string,
    date: string,
    objective_id: string,
  },
}

// Workout logged
{
  type: 'fitness.log.added',
  payload: {
    log_id: string,
    date: string,
    activity_type: string,
    duration_minutes: number,
  },
}
```

---

### Classwork Events

```typescript
// Assignment created
{
  type: 'classwork.assignment.created',
  payload: {
    assignment_id: string,
    course: string,
    title: string,
    due_date: string,
  },
}

// Study plan generated
{
  type: 'classwork.plan.generated',
  payload: {
    plan_id: string,
    date: string,
    objective_id: string,
  },
}
```

---

### File Events

```typescript
// File uploaded
{
  type: 'file.uploaded',
  payload: {
    file_id: string,
    filename: string,
    folder: string,
    objective_id: string, // processing objective
  },
}

// File processing started
{
  type: 'file.processing',
  payload: {
    file_id: string,
    processing_type: string,
  },
}

// File processing completed
{
  type: 'file.processed',
  payload: {
    file_id: string,
    processing_state: 'complete' | 'failed',
    results?: {
      document_type?: string,
      suggested_folder?: string,
      suggested_tags?: string[],
    },
  },
}
```

---

### Agent Events

```typescript
// Agent task started
{
  type: 'agent.task.started',
  payload: {
    agent_id: string,
    task_id: string,
    objective_id: string,
  },
}

// Agent task completed
{
  type: 'agent.task.completed',
  payload: {
    agent_id: string,
    task_id: string,
    objective_id: string,
    duration_ms: number,
  },
}
```

---

## Extended DTO Types

### FileArtifact

```typescript
interface FileArtifact {
  file_id: string;
  filename: string;
  upload_date: string;
  size_bytes: number;
  mime_type: string;
  
  storage_path: string;
  folder: 'inbox' | 'classwork' | 'trading' | 'fitness';
  tags: string[];
  
  processing_state: 'pending' | 'processing' | 'complete' | 'failed';
  processing_objective_id?: string;
  processing_results?: {
    document_type?: string;
    extracted_text?: string;
    suggested_folder?: string;
    suggested_tags?: string[];
  };
  
  linked_objectives: string[];
  metadata: Record<string, unknown>;
  
  uploaded_by: string;
}
```

---

### TradingStatus

```typescript
interface TradingStatus {
  trading_guard: {
    state: 'active' | 'emergency_override' | 'disabled';
    override_expires_at?: string;
  };
  autonomous_window: {
    active: boolean;
    day: number;
    total_days: number;
    expires_at: string;
  };
  strategies: TradingStrategy[];
  risk_limits: {
    max_trade_size: number;
    max_daily_notional: number;
    max_weekly_notional: number;
    max_trades_per_day: number;
  };
}
```

---

### FitnessPlan

```typescript
interface FitnessPlan {
  plan_id: string;
  date: string;
  plan_type: 'daily' | 'weekly';
  activities: Array<{
    time: string;
    activity_type: string;
    duration_minutes: number;
    description: string;
  }>;
  objective_id?: string;
  created_at: string;
}
```

---

### ClassworkAssignment

```typescript
interface ClassworkAssignment {
  assignment_id: string;
  course: string;
  title: string;
  type: 'reading' | 'memo' | 'outline' | 'exam';
  due_date: string;
  status: 'pending' | 'in_progress' | 'complete';
  estimated_hours?: number;
  linked_files: string[];
  linked_objectives: string[];
}
```

---

### ConversationSession

```typescript
interface ConversationSession {
  conversation_id: string;
  session_id: string;
  operator: string;
  started_at: string;
  last_message_at: string;
  messages: Array<{
    role: 'operator' | 'vienna';
    content: string;
    timestamp: string;
  }>;
  context?: {
    page?: string;
    objective_id?: string;
    file_id?: string;
  };
}
```

---

## Implementation Priority

### Phase 8A (Week 1)
- Global layout + dashboard (already defined)
- SSE integration (already defined)
- Command parser (basic structured commands)

### Phase 8B (Week 2)
- Objectives + execution (already defined)
- System controls (already defined)

### Phase 8C (Week 3)
- Trading workspace endpoints
- Fitness workspace endpoints
- Classwork workspace endpoints

### Phase 8D (Week 4)
- File endpoints
- File upload + processing
- Objective linking

### Phase 8E (Week 5)
- Conversation endpoints
- Agent detail endpoints
- System config endpoints

---

## Governance Validation

**Every new endpoint must:**

1. **Route through Vienna Core**
   - No direct adapter calls
   - No direct queue mutation
   - No warrant issuance from console

2. **Create audit trail**
   - Emit replay event
   - Include operator context
   - Log to audit stream

3. **Respect rate limits**
   - Agent reasoning: 5/min
   - Directive submission: 10/min
   - File upload: 20/min

4. **Validate authorization**
   - Operator identity required
   - Reason required for T1/T2 actions
   - Approval required for emergency override

5. **Maintain consistency**
   - All state derived from Vienna Core
   - No console-local state divergence
   - Restart preserves correctness
