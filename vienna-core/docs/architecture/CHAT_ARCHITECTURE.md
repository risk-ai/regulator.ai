# Vienna Chat Architecture

**Purpose:** Native conversational interface for Vienna Operator Shell.

**Constraint:** Chat is a control surface, not an execution authority. All side effects route through Vienna Core governance.

---

## Overview

The Vienna chat system provides a natural language interface for:
- Querying system state
- Requesting reasoning
- Submitting directives
- Issuing control commands
- Managing approval workflows

**Key insight:** Chat replaces the need to open OpenClaw separately while preserving Vienna Core as the sole authority for mutations.

---

## Message Classification

Every message is classified into one of **six** types:

### 1. Informational Query

**Examples:**
```
What is currently blocked?
Show me today's trading activity
How many objectives are executing?
What files are linked to obj_441?
```

**Handling:**
- Query Vienna state directly
- Return formatted response
- No side effects
- Fast path

**Response:**
```json
{
  "type": "informational",
  "answer": "3 objectives are currently blocked: obj_442 (recursion depth), obj_443 (rate limited), obj_444 (manual approval required)",
  "metadata": {
    "blocked_objectives": ["obj_442", "obj_443", "obj_444"]
  }
}
```

---

### 2. Reasoning Request

**Examples:**
```
Explain why objective obj_442 failed
Analyze this assignment and suggest a study plan
Review this trading strategy for risks
What went wrong during the last integrity check?
```

**Handling:**
- Spawn Vienna reasoning session
- Stream response
- May create objectives if reasoning produces actionable plan
- Longer responses

**Response:**
```json
{
  "type": "reasoning",
  "session_id": "reasoning_session_123",
  "response": "Objective obj_442 failed because...",
  "streaming": true,
  "artifacts": {
    "replay_events": ["event_501", "event_502"],
    "related_objectives": ["obj_441"]
  }
}
```

---

### 3. Structured Directive

**Examples:**
```
Organize these files by project
Generate my classwork plan for tonight
Pause trading until tomorrow
Update risk limits for strategy v1
```

**Handling:**
- Parse intent
- Generate directive preview
- Show preview to operator
- On confirmation, POST /api/v1/directives
- Vienna creates objective
- Return execution summary

**Response (preview):**
```json
{
  "type": "directive_preview",
  "directive_text": "Organize files by project",
  "risk_tier": "T0",
  "estimated_actions": 3,
  "affected_systems": ["files"],
  "preview": {
    "actions": [
      "Scan inbox folder",
      "Analyze file metadata",
      "Move files to project folders"
    ],
    "reversible": true
  },
  "requires_confirmation": true
}
```

**Response (after confirmation):**
```json
{
  "type": "directive_executed",
  "directive_id": "dir_991",
  "objective_id": "obj_501",
  "objective_title": "Organize files by project",
  "status": "executing",
  "link": "/objectives/obj_501"
}
```

---

### 4. Control Command

**Examples:**
```
Retry dead letter env_201
Cancel objective obj_442
Resume execution
Show objective obj_441
```

**Handling:**
- Map to specific API endpoint
- Show confirmation if destructive
- Execute immediately if safe
- Return result

**Response:**
```json
{
  "type": "command_executed",
  "command": "retry dead letter env_201",
  "result": {
    "success": true,
    "envelope_id": "env_201",
    "requeued_at": "2026-03-11T20:00:00Z",
    "message": "Envelope env_201 requeued successfully"
  }
}
```

---

### 5. Approval-Required Action

**Examples:**
```
[System detects T2 action]
Delete all trading data for strategy v1
Modify warrant policy for T1 actions
Override trading guard for 30 minutes
```

**Handling:**
- Detect high-risk action
- Generate approval prompt
- Show risk summary
- Require explicit approval
- On approval, route through Vienna Core
- Return execution result

**Response (approval prompt):**
```json
{
  "type": "approval_required",
  "action": "Override trading guard",
  "risk_tier": "T2",
  "risks": [
    "Bypasses trading safety checks",
    "Requires Metternich approval",
    "Limited to 60 minutes max"
  ],
  "requires": [
    "Operator confirmation",
    "Metternich approval ID",
    "Reason"
  ],
  "approval_id": "approval_request_123"
}
```

**Response (after approval):**
```json
{
  "type": "approved_action_executed",
  "action": "Emergency override activated",
  "override_id": "override_501",
  "expires_at": "2026-03-11T20:30:00Z",
  "audit_event_id": "audit_991"
}
```

---

### 6. Recovery Directive

**Examples:**
```
Vienna, OpenClaw appears down. Restore connectivity.
Vienna, restart the gateway service
Vienna, recover from network failure
```

**Handling:**
- Parse recovery intent
- Create recovery objective
- Execute service recovery through governed pipeline
- Report result

**Response:**
```json
{
  "type": "recovery",
  "response": "Recovery objective created: obj_recovery_501. Attempting to restore OpenClaw gateway...",
  "objective_id": "obj_recovery_501",
  "service": "openclaw",
  "recovery_type": "restart",
  "timestamp": "2026-03-11T20:00:00Z"
}
```

**Recovery flow:**
```
1. User: "Vienna, OpenClaw appears down. Restore connectivity."
2. Message classified as 'recovery'
3. Vienna creates recovery objective
4. Executor runs service adapter (OpenClawServiceAdapter.restart())
5. Service restored
6. Verification step confirms connectivity
7. Vienna reports: "✓ OpenClaw gateway restored successfully."
```

**Constraint:** Recovery actions still route through Vienna Core governance (never direct system mutations).

---

## API Endpoints

### POST /api/v1/chat/message

**Purpose:** Send message to Vienna

**Request:**
```typescript
{
  message: string;
  context?: {
    page?: string;            // Current page (dashboard/trading/...)
    objective_id?: string;    // Selected objective
    envelope_id?: string;     // Selected envelope
    file_id?: string;         // Selected file
  };
  operator: string;
}
```

**Response:**
```typescript
{
  message_id: string;
  classification: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
  response: string;
  streaming?: boolean;
  
  // For directive preview
  directive_preview?: {
    directive_text: string;
    risk_tier: RiskTier;
    estimated_actions: number;
    affected_systems: string[];
    actions: string[];
    reversible: boolean;
    requires_confirmation: boolean;
    confirmation_token: string;
  };
  
  // For command execution
  command_result?: {
    success: boolean;
    message: string;
    artifacts?: {
      objective_id?: string;
      envelope_id?: string;
    };
  };
  
  // For approval
  approval_prompt?: {
    action: string;
    risk_tier: RiskTier;
    risks: string[];
    requires: string[];
    approval_id: string;
  };
  
  timestamp: string;
}
```

---

### POST /api/v1/chat/confirm

**Purpose:** Confirm directive or approval action

**Request:**
```typescript
{
  confirmation_token: string;
  operator: string;
  reason?: string;  // Required for T1/T2
  metternich_approval_id?: string;  // Required for T2
}
```

**Response:**
```typescript
{
  success: boolean;
  directive_id?: string;
  objective_id?: string;
  message: string;
  execution_summary: {
    objective_title: string;
    status: string;
    envelopes: number;
    link: string;
  };
}
```

---

### GET /api/v1/chat/history

**Purpose:** Get chat history

**Query params:**
- `limit` (default 50)
- `before` (message_id for pagination)

**Response:**
```typescript
{
  messages: [
    {
      message_id: string;
      role: 'operator' | 'vienna';
      content: string;
      classification?: string;
      artifacts?: {
        objective_id?: string;
        directive_id?: string;
        links?: string[];
      };
      timestamp: string;
    },
  ],
  has_more: boolean;
}
```

---

### GET /api/v1/chat/stream

**Purpose:** SSE stream for real-time message updates

**SSE events:**
```
message.streaming
message.complete
directive.confirmed
command.executed
approval.granted
```

**Example event:**
```
event: message.streaming
data: {"message_id":"msg_123","chunk":"Analyzing objective obj_442..."}

event: message.complete
data: {"message_id":"msg_123","complete":true}
```

---

### DELETE /api/v1/chat/clear

**Purpose:** Clear chat history

**Request:**
```typescript
{
  operator: string;
  before?: string;  // Clear messages before this date (ISO 8601)
}
```

**Response:**
```typescript
{
  success: boolean;
  cleared_count: number;
}
```

---

## Message Processing Pipeline

### 1. Classification

```typescript
async classifyMessage(message: string, context?: Context): Promise<Classification> {
  // Intent detection
  const intent = await detectIntent(message);
  
  // Entity extraction
  const entities = await extractEntities(message);
  
  // Context integration
  const enriched = enrichWithContext(entities, context);
  
  // Classification
  if (isQuery(intent)) return 'informational';
  if (isReasoningRequest(intent)) return 'reasoning';
  if (isDirective(intent)) return 'directive';
  if (isCommand(intent)) return 'command';
  if (isHighRisk(intent)) return 'approval';
  
  // Default to informational
  return 'informational';
}
```

---

### 2. Informational Queries

```typescript
async handleQuery(message: string, context?: Context): Promise<string> {
  // Parse query
  const query = parseQuery(message);
  
  // Route to appropriate service
  if (query.type === 'objectives') {
    return await queryObjectives(query.filters);
  }
  if (query.type === 'trading') {
    return await queryTradingStatus();
  }
  if (query.type === 'files') {
    return await queryFiles(query.filters);
  }
  
  // General Vienna query
  return await viennaRuntime.query(message, context);
}
```

---

### 3. Reasoning Requests

```typescript
async handleReasoning(message: string, context?: Context): Promise<ReasoningResponse> {
  // Spawn Vienna reasoning session
  const sessionId = await viennaRuntime.startReasoningSession({
    prompt: message,
    context,
    operator: context.operator,
  });
  
  // Stream response
  const stream = viennaRuntime.streamReasoning(sessionId);
  
  return {
    type: 'reasoning',
    session_id: sessionId,
    streaming: true,
    stream,
  };
}
```

---

### 4. Structured Directives

```typescript
async handleDirective(message: string, context?: Context): Promise<DirectivePreview> {
  // Parse directive intent
  const directive = await parseDirective(message);
  
  // Generate preview
  const preview = await viennaRuntime.previewDirective({
    text: directive.text,
    risk_tier: directive.risk_tier,
    affected_systems: directive.systems,
  });
  
  // Generate confirmation token
  const token = generateConfirmationToken(directive);
  
  return {
    type: 'directive_preview',
    directive_text: directive.text,
    risk_tier: preview.risk_tier,
    estimated_actions: preview.actions.length,
    actions: preview.actions,
    reversible: preview.reversible,
    requires_confirmation: true,
    confirmation_token: token,
  };
}

async confirmDirective(token: string, operator: string): Promise<DirectiveResult> {
  // Validate token
  const directive = validateConfirmationToken(token);
  
  // Submit to Vienna Core
  const result = await viennaRuntime.submitDirective({
    text: directive.text,
    risk_tier: directive.risk_tier,
    operator,
  });
  
  return {
    success: true,
    directive_id: result.directive_id,
    objective_id: result.objective_id,
    execution_summary: {
      objective_title: result.title,
      status: 'executing',
      link: `/objectives/${result.objective_id}`,
    },
  };
}
```

---

### 5. Control Commands

```typescript
async handleCommand(message: string, context?: Context): Promise<CommandResult> {
  // Parse command
  const command = parseCommand(message);
  
  // Map to API action
  const action = mapCommandToAction(command);
  
  // Execute
  switch (action.type) {
    case 'pause_execution':
      return await viennaRuntime.pauseExecution({
        reason: action.reason,
        operator: context.operator,
      });
      
    case 'retry_dead_letter':
      return await viennaRuntime.retryDeadLetter(action.envelope_id, {
        operator: context.operator,
        reason: 'Operator requested via chat',
      });
      
    case 'cancel_objective':
      return await viennaRuntime.cancelObjective(action.objective_id, {
        operator: context.operator,
        reason: action.reason,
      });
      
    // ... more commands
  }
}
```

---

## Context Awareness

Chat understands current operator context:

### Page Context

```typescript
// User on /trading page
User: "What's the current status?"
→ Chat interprets as trading status query

// User on /classwork page  
User: "What's due this week?"
→ Chat interprets as classwork deadlines query

// User on /files page, file selected
User: "What objectives reference this?"
→ Chat queries objectives linked to selected file
```

---

### Selection Context

```typescript
// Objective selected in inspection drawer
User: "Why did this fail?"
→ Chat queries failure reason for selected objective

// Envelope selected
User: "Retry this"
→ Chat retries selected envelope
```

---

### Conversation Context

```typescript
// Multi-turn conversation
User: "Show me blocked objectives"
Vienna: "3 objectives blocked: obj_442, obj_443, obj_444"
User: "Why is obj_442 blocked?"
→ Chat understands "obj_442" refers to previously mentioned objective
```

---

## UI Components

### Chat Panel (Dashboard)

**Location:** Right side of dashboard, persistent

**Layout:**
```
┌─────────────────────────────────┐
│  Vienna Chat                 [×] │
├─────────────────────────────────┤
│                                 │
│  User: What's blocked?          │
│  🔍 Query                       │
│                                 │
│  Vienna: 3 objectives blocked:  │
│  • obj_442 (recursion depth)    │
│  • obj_443 (rate limited)       │
│  • obj_444 (manual approval)    │
│  ──────────────────────────────│
│                                 │
│  User: Retry obj_442            │
│  ⚡ Command                     │
│                                 │
│  Vienna: Retrying obj_442...    │
│  ✓ Requeued successfully        │
│                                 │
├─────────────────────────────────┤
│  Type message...                │
└─────────────────────────────────┘
```

**Features:**
- Collapsible (minimize to tab on side)
- Resizable
- Message history scrolls
- Classification badges (🔍 Query, 🤔 Reasoning, 📝 Directive, ⚡ Command, ⚠️ Approval)
- Inline action buttons (Confirm, Cancel, View Objective)
- Markdown support
- Code blocks
- Links to objectives/envelopes/files
- Copy message button
- Clear history button

---

### Directive Preview Modal

**Triggered by:** Directive message classification

**Layout:**
```
┌──────────────────────────────────────┐
│  Directive Preview                [×] │
├──────────────────────────────────────┤
│  Organize files by project           │
│                                      │
│  Risk Tier: T0                       │
│  Estimated Actions: 3                │
│  Affected Systems: files             │
│  Reversible: Yes                     │
│                                      │
│  Actions:                            │
│  1. Scan inbox folder                │
│  2. Analyze file metadata            │
│  3. Move files to project folders    │
│                                      │
│  [Cancel]           [Confirm]        │
└──────────────────────────────────────┘
```

---

### Approval Prompt Modal

**Triggered by:** High-risk action detection

**Layout:**
```
┌──────────────────────────────────────┐
│  ⚠️ Approval Required             [×] │
├──────────────────────────────────────┤
│  Override trading guard              │
│                                      │
│  Risk Tier: T2                       │
│                                      │
│  Risks:                              │
│  • Bypasses trading safety checks    │
│  • Requires Metternich approval      │
│  • Limited to 60 minutes max         │
│                                      │
│  Required:                           │
│  • Operator confirmation             │
│  • Metternich approval ID            │
│  • Reason                            │
│                                      │
│  Metternich Approval ID:             │
│  [__________________________]        │
│                                      │
│  Reason:                             │
│  [__________________________]        │
│                                      │
│  [Cancel]           [Approve]        │
└──────────────────────────────────────┘
```

---

### Execution Summary

**Triggered by:** Directive/command completion

**Layout:**
```
┌──────────────────────────────────────┐
│  Execution Summary                   │
├──────────────────────────────────────┤
│  ✓ Directive created successfully    │
│                                      │
│  Objective: obj_501                  │
│  Title: Organize files by project    │
│  Status: Executing                   │
│  Envelopes: 3                        │
│                                      │
│  [View Objective]  [View Replay]     │
└──────────────────────────────────────┘
```

---

## Message Storage

**Location:** SQLite database

**Schema:**
```sql
CREATE TABLE chat_messages (
  message_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,  -- 'operator' | 'vienna'
  content TEXT NOT NULL,
  classification TEXT,  -- 'informational' | 'reasoning' | 'directive' | 'command' | 'approval'
  
  -- Context
  context_page TEXT,
  context_objective_id TEXT,
  context_file_id TEXT,
  
  -- Artifacts
  directive_id TEXT,
  objective_id TEXT,
  envelope_id TEXT,
  session_id TEXT,
  
  -- Metadata
  operator TEXT,
  timestamp TEXT NOT NULL,
  
  FOREIGN KEY (directive_id) REFERENCES directives(directive_id),
  FOREIGN KEY (objective_id) REFERENCES objectives(objective_id)
);

CREATE INDEX idx_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX idx_messages_operator ON chat_messages(operator);
```

---

## Rate Limiting

**Chat messages:** 20 per minute per operator

**Reasoning requests:** 5 per minute per operator

**Directives:** 10 per minute per operator

**Rationale:** Prevent accidental loops, DoS, prompt injection attacks.

---

## Security

### Input Validation

- Sanitize all user input
- Prevent SQL injection
- Prevent command injection
- Limit message length (10KB max)

### Command Validation

- Verify operator identity
- Check authorization for T1/T2 actions
- Validate confirmation tokens
- Expire tokens after 5 minutes

### Audit Trail

- Log all messages
- Log all directive confirmations
- Log all approval grants
- Emit replay events for mutations

---

## Error Handling

### Classification Failure

```json
{
  "type": "error",
  "message": "I couldn't understand that message. Try rephrasing or use a structured command.",
  "suggestions": [
    "pause execution",
    "show objectives",
    "explain obj_442"
  ]
}
```

---

### Execution Failure

```json
{
  "type": "error",
  "message": "Failed to execute directive: API timeout",
  "error_code": "EXECUTION_TIMEOUT",
  "retry_available": true,
  "support_link": "/system"
}
```

---

### Authorization Failure

```json
{
  "type": "error",
  "message": "T2 action requires Metternich approval",
  "error_code": "APPROVAL_REQUIRED",
  "required_approvals": ["metternich"],
  "request_approval_link": "/system"
}
```

---

## Implementation Priority

### Phase 1 (Week 1)

- [x] Basic chat UI (panel on dashboard)
- [x] POST /api/v1/chat/message endpoint
- [x] Message classification (basic)
- [x] Informational queries
- [x] Command execution (pause/resume)
- [x] Message history storage
- [x] SSE streaming

---

### Phase 2 (Week 2)

- [ ] Directive preview modal
- [ ] POST /api/v1/chat/confirm endpoint
- [ ] Context awareness (page + selection)
- [ ] Execution summary UI
- [ ] Links to objectives/envelopes

---

### Phase 3 (Week 3)

- [ ] Reasoning requests
- [ ] Multi-turn conversations
- [ ] Conversation context memory
- [ ] Full-page chat route (`/chat`)

---

### Phase 4 (Week 4)

- [ ] Approval workflows
- [ ] Approval prompt modal
- [ ] T2 action handling
- [ ] Metternich approval integration

---

### Phase 5 (Week 5)

- [ ] File upload via chat
- [ ] Domain-specific chat commands
- [ ] Advanced message formatting
- [ ] Chat history search

---

## Testing

### Unit Tests

- Message classification
- Command parsing
- Directive preview generation
- Context enrichment

### Integration Tests

- End-to-end message flow
- Directive confirmation → objective creation
- Approval workflow → execution
- SSE streaming

### Manual Tests

- Chat on dashboard loads
- Messages classify correctly
- Directives create objectives
- Commands execute actions
- Approvals require confirmation
- SSE updates in real time

---

## Success Criteria

- [ ] Chat panel renders on dashboard
- [ ] Messages classify into 5 types correctly
- [ ] Informational queries return accurate answers
- [ ] Directives show preview before execution
- [ ] Commands execute immediately
- [ ] High-risk actions trigger approval flow
- [ ] All actions route through Vienna Core
- [ ] No direct mutations from chat
- [ ] SSE streams responses in real time
- [ ] Message history persists across sessions

---

**Vienna Chat: Natural language interface to Vienna, governed by Vienna Core authority.**
