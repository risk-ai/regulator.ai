# Vienna Operator Shell — Authority Boundary Tests

**Purpose:** Prove that Vienna Operator Shell never bypasses Vienna Core governance.

**Principle:** These are not assumptions. These are explicit, named tests that must pass.

---

## Test Suite Overview

```
1. Chat Route Isolation
2. Provider Layer Isolation  
3. Command Execution Governance
4. Warrant Enforcement
5. Trading Guard Consultation
6. Recovery Governance
7. Adapter Non-Importability
8. Audit Trail Completeness
```

---

## Test 1: Chat Route Never Imports Adapters

**Purpose:** Prove chat route cannot mutate system directly.

**Location:** `console/server/src/routes/chat.test.ts`

```typescript
import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Authority Boundary: Chat Route Isolation', () => {
  test('chat.ts does not import adapters', () => {
    const chatRoutePath = path.join(__dirname, 'chat.ts');
    const content = fs.readFileSync(chatRoutePath, 'utf8');
    
    // Should NOT import from adapters/
    expect(content).not.toContain('from \'../../adapters');
    expect(content).not.toContain('from \'../../../lib/adapters');
    
    // Should NOT import filesystem adapters
    expect(content).not.toContain('\'fs\'');
    expect(content).not.toContain('\'child_process\'');
    
    // Should NOT import database adapters
    expect(content).not.toContain('\'sqlite3\'');
    expect(content).not.toContain('\'pg\'');
  });
  
  test('chat.ts only imports from allowed layers', () => {
    const chatRoutePath = path.join(__dirname, 'chat.ts');
    const content = fs.readFileSync(chatRoutePath, 'utf8');
    
    // Should import from services/ (allowed)
    // Should import from types/ (allowed)
    // Should NOT import from anywhere else
    
    const imports = content.match(/from ['"](.+?)['"]/g) || [];
    const disallowedImports = imports.filter(imp => {
      return !imp.includes('services/') &&
             !imp.includes('types/') &&
             !imp.includes('express') &&
             !imp.includes('@types');
    });
    
    expect(disallowedImports).toEqual([]);
  });
});
```

---

## Test 2: Provider Layer Never Mutates State

**Purpose:** Prove providers are reasoning engines only, not execution authorities.

**Location:** `vienna-core/lib/providers/provider.test.ts`

```typescript
describe('Authority Boundary: Provider Layer Isolation', () => {
  test('AnthropicProvider does not import adapters', () => {
    const providerPath = path.join(__dirname, 'anthropic/client.ts');
    const content = fs.readFileSync(providerPath, 'utf8');
    
    // Should NOT import adapters
    expect(content).not.toContain('from \'../../adapters');
    expect(content).not.toContain('from \'../adapters');
    
    // Should NOT import executor
    expect(content).not.toContain('from \'../executor');
    
    // Should NOT mutate state
    expect(content).not.toContain('fs.write');
    expect(content).not.toContain('exec(');
    expect(content).not.toContain('spawn(');
  });
  
  test('Provider sendMessage() does not execute system commands', async () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' });
    
    // Mock Anthropic client
    const mockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-3-7-sonnet',
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      },
    };
    
    provider['client'] = mockClient as any;
    
    // Send message
    const response = await provider.sendMessage({
      message: 'pause execution',
      operator: 'test',
    });
    
    // Provider should only return text, not execute actions
    expect(response.content).toBe('Response');
    expect(response.tool_calls).toBeUndefined();
  });
});
```

---

## Test 3: Commands Route Through Vienna Core

**Purpose:** Prove all mutating commands call Vienna Core methods.

**Location:** `console/server/src/services/chat.test.ts`

```typescript
describe('Authority Boundary: Command Execution Governance', () => {
  let chatService: ChatService;
  let mockVienna: jest.Mocked<ViennaRuntimeService>;
  
  beforeEach(() => {
    mockVienna = {
      pauseExecution: jest.fn().mockResolvedValue({}),
      resumeExecution: jest.fn().mockResolvedValue({}),
      cancelObjective: jest.fn().mockResolvedValue({}),
      retryDeadLetter: jest.fn().mockResolvedValue({}),
      submitDirective: jest.fn().mockResolvedValue({ objective_id: 'obj_123' }),
    } as any;
    
    chatService = new ChatService(
      new DeterministicCommandParser(mockVienna),
      new LayeredMessageClassifier(/* ... */),
      new ProviderManager(),
      mockVienna
    );
  });
  
  test('pause execution calls Vienna Core', async () => {
    const response = await chatService.handleMessage('pause execution', {
      operator: 'test',
    });
    
    expect(mockVienna.pauseExecution).toHaveBeenCalledWith({
      reason: 'Operator requested via chat',
      operator: 'test',
    });
    
    expect(response.status).toBe('executing');
  });
  
  test('resume execution calls Vienna Core', async () => {
    const response = await chatService.handleMessage('resume execution', {
      operator: 'test',
    });
    
    expect(mockVienna.resumeExecution).toHaveBeenCalledWith({
      operator: 'test',
    });
  });
  
  test('cancel objective calls Vienna Core', async () => {
    const response = await chatService.handleMessage('cancel objective obj_442', {
      operator: 'test',
    });
    
    expect(mockVienna.cancelObjective).toHaveBeenCalledWith('obj_442', {
      operator: 'test',
      reason: 'Cancelled via chat',
    });
  });
  
  test('retry envelope calls Vienna Core', async () => {
    const response = await chatService.handleMessage('retry envelope env_201', {
      operator: 'test',
    });
    
    expect(mockVienna.retryDeadLetter).toHaveBeenCalledWith('env_201', {
      operator: 'test',
      reason: 'Retried via chat',
    });
  });
  
  test('recovery directive creates governed objective', async () => {
    const response = await chatService.handleMessage('restart openclaw', {
      operator: 'test',
    });
    
    expect(mockVienna.submitDirective).toHaveBeenCalledWith({
      text: 'Restart OpenClaw gateway',
      risk_tier: 'T1',
      operator: 'test',
    });
    
    expect(response.classification).toBe('recovery');
    expect(response.linkedEntities?.objectiveId).toBe('obj_123');
  });
});
```

---

## Test 4: Warrant Enforcement Still Works

**Purpose:** Prove T1/T2 actions still require warrants.

**Location:** `vienna-core/lib/executor.test.ts`

```typescript
describe('Authority Boundary: Warrant Enforcement', () => {
  test('T1 action requires warrant', async () => {
    const executor = new QueuedExecutor();
    
    // Attempt T1 action without warrant
    const envelope = {
      envelope_id: 'env_test',
      risk_tier: 'T1',
      actions: [{ type: 'write_file', target: '/test' }],
    };
    
    await expect(executor.execute(envelope)).rejects.toThrow('Warrant required for T1 action');
  });
  
  test('T2 action requires warrant + approval', async () => {
    const executor = new QueuedExecutor();
    
    // Attempt T2 action without approval
    const envelope = {
      envelope_id: 'env_test',
      risk_tier: 'T2',
      actions: [{ type: 'emergency_override' }],
    };
    
    await expect(executor.execute(envelope)).rejects.toThrow('T2 action requires Metternich approval');
  });
  
  test('chat commands respect warrant requirements', async () => {
    // Create a mock Vienna runtime that enforces warrants
    const mockVienna = new ViennaRuntimeService();
    
    // T1 directive should create objective with warrant requirement
    const result = await mockVienna.submitDirective({
      text: 'Organize files by project',
      risk_tier: 'T1',
      operator: 'test',
    });
    
    const objective = await mockVienna.getObjective(result.objective_id);
    expect(objective.warrant_id).toBeDefined();
    expect(objective.approval_required).toBe(false); // T1 doesn't need approval
    
    // T2 directive should require approval
    const result2 = await mockVienna.submitDirective({
      text: 'Override trading guard',
      risk_tier: 'T2',
      operator: 'test',
    });
    
    const objective2 = await mockVienna.getObjective(result2.objective_id);
    expect(objective2.warrant_id).toBeDefined();
    expect(objective2.approval_required).toBe(true);
  });
});
```

---

## Test 5: Trading Guard Still Consulted

**Purpose:** Prove trading-related actions still check trading guard.

**Location:** `vienna-core/lib/trading-guard.test.ts`

```typescript
describe('Authority Boundary: Trading Guard Consultation', () => {
  test('trading directive consults guard', async () => {
    const tradingGuard = new TradingGuard();
    const mockConsult = jest.spyOn(tradingGuard, 'consult');
    
    const vienna = new ViennaRuntimeService({ tradingGuard });
    
    // Submit trading-related directive
    await vienna.submitDirective({
      text: 'Place NBA trade',
      risk_tier: 'T1',
      operator: 'test',
      metadata: { domain: 'trading' },
    });
    
    expect(mockConsult).toHaveBeenCalled();
  });
  
  test('emergency override requires approval', async () => {
    const vienna = new ViennaRuntimeService();
    
    // Attempt emergency override without approval
    await expect(
      vienna.submitDirective({
        text: 'Override trading guard',
        risk_tier: 'T2',
        operator: 'test',
      })
    ).rejects.toThrow('Emergency override requires Metternich approval');
  });
  
  test('chat cannot bypass trading guard', async () => {
    const chatService = new ChatService(/* ... */);
    
    // Try to submit trading action via chat
    const response = await chatService.handleMessage(
      'Place a $100 trade on NBA game',
      { operator: 'test' }
    );
    
    // Should create directive with trading guard check
    expect(response.status).toBe('preview'); // Not immediate execution
    expect(response.preview?.riskTier).toBe('T1');
  });
});
```

---

## Test 6: Recovery Actions Create Objectives

**Purpose:** Prove recovery directives don't bypass governance.

**Location:** `console/server/src/services/chat.test.ts`

```typescript
describe('Authority Boundary: Recovery Governance', () => {
  test('restart openclaw creates objective', async () => {
    const mockVienna = {
      submitDirective: jest.fn().mockResolvedValue({ objective_id: 'obj_recovery_501' }),
    } as any;
    
    const parser = new DeterministicCommandParser(mockVienna);
    const result = await parser.tryParse('restart openclaw', { operator: 'test' });
    
    expect(result).toBeDefined();
    expect(result?.classification).toBe('recovery');
    
    expect(mockVienna.submitDirective).toHaveBeenCalledWith({
      text: 'Restart OpenClaw gateway',
      risk_tier: 'T1',
      operator: 'test',
    });
  });
  
  test('recovery action emits audit event', async () => {
    const mockAuditLog = jest.fn();
    const vienna = new ViennaRuntimeService({ auditLog: mockAuditLog });
    
    await vienna.submitDirective({
      text: 'Restart OpenClaw gateway',
      risk_tier: 'T1',
      operator: 'test',
    });
    
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'directive_submitted',
        operator: 'test',
        risk_tier: 'T1',
      })
    );
  });
});
```

---

## Test 7: Adapter Non-Importability

**Purpose:** Prove console code cannot import adapters.

**Location:** `console/server/src/architecture.test.ts`

```typescript
describe('Authority Boundary: Adapter Non-Importability', () => {
  test('no console file imports adapters', () => {
    const consoleDir = path.join(__dirname, '../');
    const files = glob.sync('**/*.ts', { cwd: consoleDir });
    
    files.forEach(file => {
      const content = fs.readFileSync(path.join(consoleDir, file), 'utf8');
      
      expect(content).not.toContain('from \'../../adapters');
      expect(content).not.toContain('from \'../../../lib/adapters');
      expect(content).not.toContain('from \'vienna-core/lib/adapters');
    });
  });
  
  test('ViennaRuntimeService is only bridge to core', () => {
    const serviceDir = path.join(__dirname, '../services');
    const files = glob.sync('**/*.ts', { cwd: serviceDir, ignore: ['viennaRuntime.ts'] });
    
    files.forEach(file => {
      const content = fs.readFileSync(path.join(serviceDir, file), 'utf8');
      
      // Other services should not import Vienna Core directly
      expect(content).not.toContain('from \'vienna-core/lib');
    });
  });
});
```

---

## Test 8: Audit Trail Completeness

**Purpose:** Prove all chat actions generate audit events.

**Location:** `console/server/src/services/chat.test.ts`

```typescript
describe('Authority Boundary: Audit Trail Completeness', () => {
  let mockAuditLog: jest.Mock;
  let chatService: ChatService;
  
  beforeEach(() => {
    mockAuditLog = jest.fn();
    const mockVienna = {
      pauseExecution: jest.fn().mockImplementation(async (params) => {
        mockAuditLog({ action: 'pause_execution', ...params });
      }),
      submitDirective: jest.fn().mockImplementation(async (params) => {
        mockAuditLog({ action: 'directive_submitted', ...params });
        return { objective_id: 'obj_123' };
      }),
    } as any;
    
    chatService = new ChatService(
      new DeterministicCommandParser(mockVienna),
      new LayeredMessageClassifier(/* ... */),
      new ProviderManager(),
      mockVienna
    );
  });
  
  test('pause execution emits audit event', async () => {
    await chatService.handleMessage('pause execution', { operator: 'test' });
    
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'pause_execution',
        operator: 'test',
      })
    );
  });
  
  test('directive submission emits audit event', async () => {
    await chatService.handleMessage('organize files', { operator: 'test' });
    
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'directive_submitted',
        operator: 'test',
      })
    );
  });
  
  test('chat message stored with action metadata', async () => {
    const mockChatStore = jest.fn();
    
    const response = await chatService.handleMessage('pause execution', {
      operator: 'test',
    });
    
    // Response should include action metadata for storage
    expect(response.actionTaken).toBeDefined();
    expect(response.actionTaken?.action).toBe('pause_execution');
    expect(response.auditRef).toBeDefined();
  });
});
```

---

## Integration Test: End-to-End Governance

**Purpose:** Prove entire flow respects authority boundary.

**Location:** `console/server/src/integration.test.ts`

```typescript
describe('Authority Boundary: End-to-End Integration', () => {
  test('chat command → Vienna Core → executor → audit', async () => {
    // Full integration test
    const app = createTestApp();
    
    // Send chat message
    const response = await request(app)
      .post('/api/v1/chat/message')
      .send({
        message: 'pause execution',
        operator: 'test',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('executing');
    
    // Verify Vienna Core was called
    const executorState = await getExecutorState();
    expect(executorState.paused).toBe(true);
    
    // Verify audit trail exists
    const auditLog = await getAuditLog();
    const pauseEvent = auditLog.find(e => e.action === 'pause_execution');
    expect(pauseEvent).toBeDefined();
    expect(pauseEvent.operator).toBe('test');
  });
  
  test('no direct mutations possible', async () => {
    // Try to directly mutate queue
    const queue = getExecutorQueue();
    const originalDepth = queue.depth;
    
    // Send chat message (should NOT directly mutate queue)
    await chatService.handleMessage('list objectives', { operator: 'test' });
    
    // Queue should be unchanged
    expect(queue.depth).toBe(originalDepth);
  });
});
```

---

## CI/CD Integration

**Run tests in CI:**

```yaml
# .github/workflows/authority-tests.yml
name: Authority Boundary Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:authority-boundary
      
      # Fail build if authority tests fail
      - name: Validate Authority Boundary
        run: |
          npm run test:authority-boundary -- --coverage
          if [ $? -ne 0 ]; then
            echo "❌ Authority boundary tests failed"
            exit 1
          fi
```

---

## Test Coverage Requirements

**Week 1 must pass:**
- [ ] Test 1: Chat Route Isolation
- [ ] Test 2: Provider Layer Isolation
- [ ] Test 3: Commands Route Through Vienna Core
- [ ] Test 6: Recovery Actions Create Objectives
- [ ] Test 7: Adapter Non-Importability

**Week 2 additions:**
- [ ] Test 4: Warrant Enforcement
- [ ] Test 5: Trading Guard Consultation
- [ ] Test 8: Audit Trail Completeness

**Week 3 integration:**
- [ ] Full end-to-end governance test

---

## Manual Validation Checklist

**Before deployment:**

- [ ] Run `npm run test:authority-boundary`
- [ ] Verify all tests pass
- [ ] Check no console files import adapters
- [ ] Verify audit trail for sample commands
- [ ] Test with all providers down (commands still work)
- [ ] Test recovery directive (creates objective, not direct mutation)

---

## Success Criteria

**Week 1 successful only if:**

✅ All authority boundary tests pass  
✅ No console code imports adapters  
✅ All commands route through Vienna Core  
✅ Recovery creates objectives (not direct mutations)  
✅ Audit trail complete for all actions  
✅ Tests run in CI and fail build on violations  

**These are not assumptions. These are proven invariants.**
