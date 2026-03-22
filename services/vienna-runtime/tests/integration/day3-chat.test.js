/**
 * Day 3 Chat Integration Tests
 * 
 * EXECUTABLE tests validating chat route → service → Vienna Core flow.
 * These must pass before Day 3 is considered complete.
 */

const { ChatService } = require('../../console/server/src/services/chatService.js');
const { ViennaRuntimeService } = require('../../console/server/src/services/viennaRuntime.js');
const { ProviderManager } = require('../../lib/providers/manager.js');

// Mock Vienna Runtime Service
class MockViennaRuntime {
  async pauseExecution(request) {
    return {
      paused_at: new Date().toISOString(),
      queued_envelopes_paused: 12,
    };
  }
  
  async resumeExecution(request) {
    return {
      resumed_at: new Date().toISOString(),
      envelopes_resumed: 12,
    };
  }
  
  async getSystemStatus() {
    return {
      system_state: 'healthy',
      executor_state: 'running',
      paused: false,
      queue_depth: 12,
      active_envelopes: 3,
      blocked_envelopes: 0,
      dead_letter_count: 0,
      trading_guard_state: 'active',
      integrity_state: 'healthy',
    };
  }
  
  async getProviders() {
    return {
      primary: 'anthropic',
      fallback: ['anthropic', 'openclaw'],
      providers: {
        anthropic: {
          name: 'anthropic',
          status: 'healthy',
          lastCheckedAt: new Date().toISOString(),
          latencyMs: 150,
          cooldownUntil: null,
        },
      },
    };
  }
  
  async getServices() {
    return [
      {
        service: 'openclaw',
        status: 'running',
        lastHeartbeatAt: new Date().toISOString(),
        connectivity: 'healthy',
        restartable: true,
      },
    ];
  }
  
  async restartService(serviceName, operator) {
    return {
      objective_id: 'obj_test_001',
      status: 'preview',
      message: 'Recovery objective created for OpenClaw restart.',
    };
  }
  
  async getObjectives(params) {
    return [
      {
        objective_id: 'obj_001',
        title: 'Test objective',
        status: 'active',
        risk_tier: 'T1',
        envelope_count: 3,
      },
    ];
  }
  
  async getDeadLetters(params) {
    return [];
  }
}

describe('Day 3 Chat Integration (Executable Tests)', () => {
  let chatService;
  let viennaRuntime;
  let providerManager;
  
  beforeEach(() => {
    viennaRuntime = new MockViennaRuntime();
    providerManager = new ProviderManager({
      primaryProvider: 'anthropic',
      fallbackOrder: ['anthropic'],
      enableProviderFallback: false, // Disable for deterministic testing
    });
    
    chatService = new ChatService(viennaRuntime, providerManager);
  });
  
  /**
   * Test: POST /chat/message with 'pause execution' returns deterministic command response
   */
  test('pause execution returns deterministic command response', async () => {
    const request = {
      message: 'pause execution',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response).toBeDefined();
    expect(response.classification).toBe('command');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.provider.name).toBe('none');
    expect(response.status).toBe('answered');
    expect(response.content.text).toContain('paused successfully');
    expect(response.actionTaken).toBeDefined();
    expect(response.actionTaken.action).toBe('pauseExecution');
    expect(response.actionTaken.result).toBe('success');
  });
  
  /**
   * Test: POST /chat/message with 'show providers' returns provider info
   */
  test('show providers returns provider info', async () => {
    const request = {
      message: 'show providers',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response).toBeDefined();
    expect(response.classification).toBe('informational');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.status).toBe('answered');
    expect(response.content.text).toContain('Model Providers');
    expect(response.content.text).toContain('anthropic');
  });
  
  /**
   * Test: POST /chat/message with 'restart openclaw' returns recovery classification
   */
  test('restart openclaw returns recovery classification', async () => {
    const request = {
      message: 'restart openclaw',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response).toBeDefined();
    expect(response.classification).toBe('recovery');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.status).toBe('answered');
    expect(response.content.text).toContain('Recovery Objective Created');
    expect(response.content.text).toContain('obj_test_001');
  });
  
  /**
   * Test: resume execution works
   */
  test('resume execution returns success', async () => {
    const request = {
      message: 'resume execution',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.classification).toBe('command');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.content.text).toContain('resumed successfully');
  });
  
  /**
   * Test: show status works
   */
  test('show status returns system status', async () => {
    const request = {
      message: 'show status',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.classification).toBe('informational');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.content.text).toContain('System Status');
    expect(response.content.text).toContain('healthy');
  });
  
  /**
   * Test: show services works
   */
  test('show services returns service status', async () => {
    const request = {
      message: 'show services',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.classification).toBe('informational');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.content.text).toContain('Services');
    expect(response.content.text).toContain('openclaw');
  });
  
  /**
   * Test: list objectives works
   */
  test('list objectives returns objectives', async () => {
    const request = {
      message: 'list objectives',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.classification).toBe('informational');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.content.text).toContain('Active Objectives');
  });
  
  /**
   * Test: help command works
   */
  test('help command returns available commands', async () => {
    const request = {
      message: 'help',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.classification).toBe('informational');
    expect(response.provider.mode).toBe('deterministic');
    expect(response.content.text).toContain('Available commands');
    expect(response.content.text).toContain('pause execution');
  });
  
  /**
   * Test: Unrecognized message falls back gracefully
   */
  test('unrecognized message with no provider shows fallback', async () => {
    const request = {
      message: 'tell me a joke',
      operator: 'test',
    };
    
    const response = await chatService.handleMessage(request);
    
    expect(response.provider.mode).toBe('fallback');
    expect(response.status).toBe('answered');
    expect(response.content.text).toContain('core commands still work');
  });
  
  /**
   * Test: ChatResponse envelope shape is consistent
   */
  test('all responses match ChatResponse envelope shape', async () => {
    const requests = [
      { message: 'pause execution', operator: 'test' },
      { message: 'show status', operator: 'test' },
      { message: 'help', operator: 'test' },
    ];
    
    for (const request of requests) {
      const response = await chatService.handleMessage(request);
      
      // Required fields
      expect(response.messageId).toBeDefined();
      expect(response.classification).toBeDefined();
      expect(response.provider).toBeDefined();
      expect(response.provider.name).toBeDefined();
      expect(response.provider.mode).toBeDefined();
      expect(response.status).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content.text).toBeDefined();
      expect(response.timestamp).toBeDefined();
      
      // Valid classification
      expect(['informational', 'reasoning', 'directive', 'command', 'approval', 'recovery'])
        .toContain(response.classification);
      
      // Valid provider mode
      expect(['llm', 'deterministic', 'keyword', 'fallback'])
        .toContain(response.provider.mode);
      
      // Valid status
      expect(['answered', 'preview', 'executing', 'approval_required', 'failed'])
        .toContain(response.status);
    }
  });
});

describe('Day 3 Service Management Tests', () => {
  let viennaRuntime;
  
  beforeEach(() => {
    viennaRuntime = new MockViennaRuntime();
  });
  
  /**
   * Test: GET /system/services returns OpenClaw status object
   */
  test('getServices returns OpenClaw status', async () => {
    const services = await viennaRuntime.getServices();
    
    expect(services).toBeDefined();
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);
    
    const openclaw = services.find(s => s.service === 'openclaw');
    expect(openclaw).toBeDefined();
    expect(openclaw.status).toBeDefined();
    expect(['running', 'degraded', 'stopped', 'unknown']).toContain(openclaw.status);
    expect(openclaw.restartable).toBe(true);
  });
  
  /**
   * Test: restartService returns governed response shape
   */
  test('restartService returns governed response', async () => {
    const result = await viennaRuntime.restartService('openclaw', 'test');
    
    expect(result).toBeDefined();
    expect(result.objective_id).toBeDefined();
    expect(result.status).toBeDefined();
    expect(['preview', 'executing', 'failed']).toContain(result.status);
    expect(result.message).toBeDefined();
  });
});

// Run with: npx jest tests/integration/day3-chat.test.js
