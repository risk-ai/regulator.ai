# Vienna Deterministic Command Core

**Goal:** Ensure Vienna Operator Shell remains operational even when all LLM providers fail.

**Principle:** Core operator actions must work deterministically without LLM dependency.

---

## Problem Statement

**Before:** Chat classification and command execution required LLM availability.

**Risk:** All providers down → Vienna shell becomes non-functional.

**Solution:** Deterministic local command interpreter as first-class fallback.

---

## Deterministic Command Set

**Core commands that MUST work without LLM:**

### System Control
```
pause execution
resume execution
run integrity check
```

### Status Queries
```
show status
show health
show providers
show services
```

### Objective Management
```
list objectives
list blocked objectives
show objective <id>
cancel objective <id>
```

### Execution Management
```
list active executions
list dead letters
retry envelope <id>
show queue
```

### Service Management
```
restart openclaw
reconnect openclaw
show openclaw status
```

### Provider Management
```
list providers
test provider <name>
switch provider <name>
```

---

## Architecture

```
Chat Message
  ↓
Deterministic Command Parser (first)
  ↓
  ├─ Match? → Execute deterministically → Return result
  └─ No match → Provider Manager (LLM classification)
```

**Key:** Deterministic path runs **before** provider manager, not as fallback.

---

## Command Parser Implementation

**Location:** `vienna-core/lib/commands/`

```typescript
interface DeterministicCommand {
  pattern: RegExp;
  handler: (match: RegExpMatchArray, context: Context) => Promise<CommandResult>;
  category: 'control' | 'query' | 'management';
}

interface CommandResult {
  type: 'deterministic';
  classification: MessageClassification;
  response: string;
  data?: unknown;
  action_taken?: {
    action: string;
    objective_id?: string;
    result: 'success' | 'failed';
  };
}

class DeterministicCommandParser {
  private commands: DeterministicCommand[] = [];
  
  constructor(private vienna: ViennaRuntimeService) {
    this.registerCommands();
  }
  
  private registerCommands() {
    // System control
    this.register({
      pattern: /^pause execution$/i,
      handler: async (match, context) => {
        await this.vienna.pauseExecution({
          reason: 'Operator requested via chat',
          operator: context.operator,
        });
        return {
          type: 'deterministic',
          classification: 'command',
          response: '✓ Execution paused successfully.',
          action_taken: {
            action: 'pause_execution',
            result: 'success',
          },
        };
      },
      category: 'control',
    });
    
    this.register({
      pattern: /^resume execution$/i,
      handler: async (match, context) => {
        await this.vienna.resumeExecution({
          operator: context.operator,
        });
        return {
          type: 'deterministic',
          classification: 'command',
          response: '✓ Execution resumed successfully.',
          action_taken: {
            action: 'resume_execution',
            result: 'success',
          },
        };
      },
      category: 'control',
    });
    
    // Status queries
    this.register({
      pattern: /^show status$/i,
      handler: async (match, context) => {
        const status = await this.vienna.getSystemStatus();
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `System: ${status.system_state}\nExecutor: ${status.executor_state}\nQueue: ${status.queue_depth} envelopes\nActive: ${status.active_envelopes}\nBlocked: ${status.blocked_envelopes}`,
          data: status,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^show providers$/i,
      handler: async (match, context) => {
        const providers = await this.vienna.getProviderStatuses();
        const lines = Object.entries(providers).map(([name, status]) => 
          `${name}: ${status.status} ${status.latencyMs ? `(${status.latencyMs}ms)` : ''}`
        );
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Providers:\n${lines.join('\n')}`,
          data: providers,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^show services$/i,
      handler: async (match, context) => {
        const services = await this.vienna.getServiceStatuses();
        const lines = Object.entries(services).map(([name, status]) => 
          `${name}: ${status.status}`
        );
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Services:\n${lines.join('\n')}`,
          data: services,
        };
      },
      category: 'query',
    });
    
    // Objective management
    this.register({
      pattern: /^list objectives$/i,
      handler: async (match, context) => {
        const objectives = await this.vienna.getObjectives({ limit: 10 });
        const lines = objectives.map(obj => 
          `${obj.objective_id}: ${obj.title} (${obj.status})`
        );
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Objectives (${objectives.length}):\n${lines.join('\n')}`,
          data: objectives,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^list blocked objectives$/i,
      handler: async (match, context) => {
        const objectives = await this.vienna.getObjectives({ status: 'blocked' });
        const lines = objectives.map(obj => 
          `${obj.objective_id}: ${obj.title}`
        );
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Blocked objectives (${objectives.length}):\n${lines.join('\n')}`,
          data: objectives,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^show objective (\w+)$/i,
      handler: async (match, context) => {
        const objectiveId = match[1];
        const objective = await this.vienna.getObjective(objectiveId);
        if (!objective) {
          return {
            type: 'deterministic',
            classification: 'informational',
            response: `Objective ${objectiveId} not found.`,
          };
        }
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Objective ${objective.objective_id}\nTitle: ${objective.title}\nStatus: ${objective.status}\nRisk Tier: ${objective.risk_tier}\nEnvelopes: ${objective.envelope_count}`,
          data: objective,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^cancel objective (\w+)$/i,
      handler: async (match, context) => {
        const objectiveId = match[1];
        await this.vienna.cancelObjective(objectiveId, {
          operator: context.operator,
          reason: 'Cancelled via chat',
        });
        return {
          type: 'deterministic',
          classification: 'command',
          response: `✓ Objective ${objectiveId} cancelled.`,
          action_taken: {
            action: 'cancel_objective',
            objective_id: objectiveId,
            result: 'success',
          },
        };
      },
      category: 'management',
    });
    
    // Execution management
    this.register({
      pattern: /^list dead letters$/i,
      handler: async (match, context) => {
        const deadLetters = await this.vienna.getDeadLetters({ state: 'pending_review' });
        const lines = deadLetters.map(dl => 
          `${dl.envelope_id}: ${dl.action_type} (${dl.attempts} attempts)`
        );
        return {
          type: 'deterministic',
          classification: 'informational',
          response: `Dead letters (${deadLetters.length}):\n${lines.join('\n')}`,
          data: deadLetters,
        };
      },
      category: 'query',
    });
    
    this.register({
      pattern: /^retry envelope (\w+)$/i,
      handler: async (match, context) => {
        const envelopeId = match[1];
        await this.vienna.retryDeadLetter(envelopeId, {
          operator: context.operator,
          reason: 'Retried via chat',
        });
        return {
          type: 'deterministic',
          classification: 'command',
          response: `✓ Envelope ${envelopeId} requeued.`,
          action_taken: {
            action: 'retry_envelope',
            envelope_id: envelopeId,
            result: 'success',
          },
        };
      },
      category: 'management',
    });
    
    // Service management
    this.register({
      pattern: /^restart openclaw$/i,
      handler: async (match, context) => {
        // Create recovery objective
        const result = await this.vienna.submitDirective({
          text: 'Restart OpenClaw gateway',
          risk_tier: 'T1',
          operator: context.operator,
        });
        return {
          type: 'deterministic',
          classification: 'recovery',
          response: `Recovery objective created: ${result.objective_id}. Attempting to restart OpenClaw...`,
          action_taken: {
            action: 'restart_service',
            objective_id: result.objective_id,
            result: 'success',
          },
        };
      },
      category: 'management',
    });
  }
  
  private register(command: DeterministicCommand) {
    this.commands.push(command);
  }
  
  async tryParse(message: string, context: Context): Promise<CommandResult | null> {
    const normalizedMessage = message.trim();
    
    for (const command of this.commands) {
      const match = normalizedMessage.match(command.pattern);
      if (match) {
        try {
          const result = await command.handler(match, context);
          return result;
        } catch (error) {
          return {
            type: 'deterministic',
            classification: 'command',
            response: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    }
    
    return null;
  }
  
  getAvailableCommands(): string[] {
    return this.commands.map(cmd => cmd.pattern.source);
  }
}
```

---

## Layered Classification

```typescript
class LayeredMessageClassifier {
  constructor(
    private deterministicParser: DeterministicCommandParser,
    private keywordClassifier: KeywordClassifier,
    private providerManager: ProviderManager
  ) {}
  
  async classify(message: string, context: Context): Promise<ClassificationResult> {
    // Layer 1: Deterministic command parser (no LLM needed)
    const deterministicResult = await this.deterministicParser.tryParse(message, context);
    if (deterministicResult) {
      return {
        classification: deterministicResult.classification,
        mode: 'deterministic',
        provider: 'none',
        confident: true,
      };
    }
    
    // Layer 2: Keyword/rule-based classifier (no LLM needed)
    const keywordResult = this.keywordClassifier.classify(message);
    if (keywordResult.confident) {
      return {
        classification: keywordResult.classification,
        mode: 'keyword',
        provider: 'none',
        confident: true,
      };
    }
    
    // Layer 3: Provider-assisted classification (LLM needed)
    try {
      const provider = await this.providerManager.getHealthyProvider();
      if (provider) {
        const classification = await provider.classifyMessage(message, context);
        return {
          classification,
          mode: 'llm',
          provider: provider.name,
          confident: true,
        };
      }
    } catch (error) {
      console.warn('Provider classification failed:', error);
    }
    
    // Fallback: Use keyword result even if not confident
    return {
      classification: keywordResult.classification,
      mode: 'fallback',
      provider: 'none',
      confident: false,
    };
  }
}
```

---

## Keyword Classifier

```typescript
class KeywordClassifier {
  classify(message: string): { classification: MessageClassification; confident: boolean } {
    const lowerMessage = message.toLowerCase();
    
    // High-confidence patterns
    if (lowerMessage.match(/^(pause|resume|retry|cancel|show|list)/)) {
      return { classification: 'command', confident: true };
    }
    
    if (lowerMessage.includes('restart') ||
        lowerMessage.includes('recover') ||
        lowerMessage.includes('restore')) {
      return { classification: 'recovery', confident: true };
    }
    
    // Medium-confidence patterns
    if (lowerMessage.includes('why') || 
        lowerMessage.includes('explain') || 
        lowerMessage.includes('analyze') ||
        lowerMessage.includes('how')) {
      return { classification: 'reasoning', confident: false };
    }
    
    if (lowerMessage.includes('organize') || 
        lowerMessage.includes('generate') || 
        lowerMessage.includes('create') ||
        lowerMessage.includes('update')) {
      return { classification: 'directive', confident: false };
    }
    
    if (lowerMessage.includes('override') || 
        lowerMessage.includes('delete all') || 
        lowerMessage.includes('emergency')) {
      return { classification: 'approval', confident: true };
    }
    
    // Default
    return { classification: 'informational', confident: false };
  }
}
```

---

## Integration with Chat Service

```typescript
class ChatService {
  constructor(
    private deterministicParser: DeterministicCommandParser,
    private layeredClassifier: LayeredMessageClassifier,
    private providerManager: ProviderManager,
    private vienna: ViennaRuntimeService
  ) {}
  
  async handleMessage(message: string, context: Context): Promise<ChatResponse> {
    // Try deterministic parser first
    const deterministicResult = await this.deterministicParser.tryParse(message, context);
    if (deterministicResult) {
      return this.buildResponse(deterministicResult, context);
    }
    
    // Classify message (layered)
    const classificationResult = await this.layeredClassifier.classify(message, context);
    
    // Handle based on classification
    switch (classificationResult.classification) {
      case 'informational':
        return this.handleQuery(message, context, classificationResult);
      
      case 'reasoning':
        return this.handleReasoning(message, context, classificationResult);
      
      case 'directive':
        return this.handleDirective(message, context, classificationResult);
      
      case 'command':
        return this.handleCommand(message, context, classificationResult);
      
      case 'approval':
        return this.handleApproval(message, context, classificationResult);
      
      case 'recovery':
        return this.handleRecovery(message, context, classificationResult);
      
      default:
        return this.buildErrorResponse('Unknown classification', context);
    }
  }
  
  private buildResponse(result: CommandResult, context: Context): ChatResponse {
    return {
      messageId: generateMessageId(),
      classification: result.classification,
      provider: {
        name: 'none',
        mode: 'deterministic',
      },
      status: result.action_taken ? 'executing' : 'answered',
      content: {
        text: result.response,
      },
      linkedEntities: result.action_taken ? {
        objectiveId: result.action_taken.objective_id,
      } : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Structured Chat Response Envelope

```typescript
interface ChatResponse {
  // Message identification
  messageId: string;
  threadId?: string;
  
  // Classification
  classification: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
  
  // Provider metadata
  provider: {
    name: 'anthropic' | 'openclaw' | 'local' | 'none';
    model?: string;
    mode: 'llm' | 'deterministic' | 'keyword' | 'fallback';
  };
  
  // Response status
  status: 'answered' | 'preview' | 'executing' | 'approval_required' | 'failed';
  
  // Content
  content: {
    text: string;
    summary?: string;
    markdown?: boolean;
  };
  
  // Linked entities
  linkedEntities?: {
    objectiveId?: string;
    envelopeId?: string;
    decisionId?: string;
    fileId?: string;
    service?: string;
  };
  
  // Action metadata
  actionTaken?: {
    action: string;
    result: 'success' | 'failed' | 'pending';
    error?: string;
  };
  
  // Preview/approval data
  preview?: {
    riskTier: 'T0' | 'T1' | 'T2';
    estimatedActions: number;
    affectedSystems: string[];
    reversible: boolean;
    confirmationToken: string;
  };
  
  // Audit reference
  auditRef?: string;
  
  // Context metadata
  context?: {
    page?: string;
    selectedObjective?: string;
    selectedFile?: string;
  };
  
  // Timestamp
  timestamp: string;
}
```

---

## No-Provider Mode UI

**When all providers unavailable:**

```
┌─────────────────────────────────────┐
│ ⚠️ LLM providers unavailable        │
│                                     │
│ Deterministic commands still work:  │
│ • pause execution                   │
│ • resume execution                  │
│ • show status                       │
│ • list objectives                   │
│ • show providers                    │
│ • restart openclaw                  │
│                                     │
│ [View Full Command List]            │
└─────────────────────────────────────┘
```

**Chat panel in no-provider mode:**

```
User: show status
Vienna (deterministic): System: healthy
Executor: running
Queue: 12 envelopes

User: explain why obj_442 failed
Vienna (fallback): ⚠️ LLM providers unavailable. 
Cannot provide detailed explanation.
Try: show objective obj_442
```

---

## Command Discovery

**Help command:**

```
User: help
Vienna (deterministic): Available deterministic commands:

System Control:
• pause execution
• resume execution
• run integrity check

Status Queries:
• show status
• show health
• show providers
• show services

Objective Management:
• list objectives
• list blocked objectives
• show objective <id>
• cancel objective <id>

Execution Management:
• list active executions
• list dead letters
• retry envelope <id>

Service Management:
• restart openclaw
• show openclaw status

For full capabilities, ensure LLM providers are available.
```

---

## Testing

### Test 1: Deterministic Commands Work Without Providers

```typescript
// Disable all providers
await providerManager.disableAll();

// Should still work
const response1 = await chat.handleMessage('pause execution', context);
expect(response1.provider.mode).toBe('deterministic');
expect(response1.status).toBe('executing');

const response2 = await chat.handleMessage('show status', context);
expect(response2.provider.mode).toBe('deterministic');
expect(response2.status).toBe('answered');
```

---

### Test 2: Layered Classification

```typescript
// Deterministic match
const result1 = await classifier.classify('pause execution', context);
expect(result1.mode).toBe('deterministic');

// Keyword match
const result2 = await classifier.classify('why did this fail', context);
expect(result2.mode).toBe('keyword');
expect(result2.classification).toBe('reasoning');

// LLM match (provider available)
const result3 = await classifier.classify('generate a study plan for tonight', context);
expect(result3.mode).toBe('llm');
expect(result3.classification).toBe('directive');
```

---

### Test 3: Graceful Degradation

```typescript
// All providers unavailable
await providerManager.disableAll();

// Commands still work
const response1 = await chat.handleMessage('pause execution', context);
expect(response1.status).toBe('executing');

// Reasoning requests degrade gracefully
const response2 = await chat.handleMessage('explain why obj_442 failed', context);
expect(response2.provider.mode).toBe('fallback');
expect(response2.content.text).toContain('LLM providers unavailable');
```

---

## Benefits

✅ **Deterministic core** — Critical commands always work  
✅ **No LLM dependency** — Shell operational during provider outages  
✅ **Layered classification** — Efficient, no circular dependencies  
✅ **Clear degradation** — Operator knows when LLM unavailable  
✅ **Structured responses** — Consistent envelope format  
✅ **Command discovery** — Help system shows available commands  

---

## Week 1 Priority

**Day 2 deliverables:**
1. ✅ Deterministic command parser
2. ✅ Keyword classifier
3. ✅ Layered classification
4. ✅ Structured chat response envelope
5. ✅ No-provider mode tests

**Critical test:** All providers down → core commands still work.

---

**Deterministic core makes Vienna shell genuinely trustworthy.**
