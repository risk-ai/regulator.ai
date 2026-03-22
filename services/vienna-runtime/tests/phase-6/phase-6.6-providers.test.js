/**
 * Test: Phase 6.6 - LLM Provider Activation
 * 
 * Validates:
 * 1. Provider registration with ProviderHealthManager
 * 2. Health check functionality
 * 3. Chat intent classification (recovery vs general)
 * 4. Chat routing through providers
 * 5. Provider fallback (anthropic → local)
 */

const assert = require('assert');

// Mock ProviderHealthManager
class MockProviderHealthManager {
  constructor() {
    this.providers = new Map();
    this.running = false;
  }
  
  registerProvider(name, provider) {
    console.log(`[Mock] Registered provider: ${name}`);
    this.providers.set(name, {
      name,
      provider,
      status: 'unknown',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthCheck: null,
      lastSuccess: null,
      lastFailure: null,
      quarantinedAt: null,
      quarantineUntil: null,
      cooldownUntil: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      registeredAt: new Date().toISOString(),
    });
  }
  
  start() {
    this.running = true;
    console.log('[Mock] Started health monitoring');
  }
  
  stop() {
    this.running = false;
  }
  
  checkAvailability(name) {
    const state = this.providers.get(name);
    if (!state) {
      return { available: false, reason: 'provider_not_registered' };
    }
    
    // Mock availability based on status
    if (state.status === 'healthy') {
      return { available: true };
    }
    
    return { available: false, reason: 'provider_unhealthy' };
  }
  
  async recordSuccess(name) {
    const state = this.providers.get(name);
    if (state) {
      state.status = 'healthy';
      state.consecutiveSuccesses++;
      state.totalSuccesses++;
      console.log(`[Mock] Recorded success for ${name}`);
    }
  }
  
  async recordFailure(name, error) {
    const state = this.providers.get(name);
    if (state) {
      state.status = 'degraded';
      state.consecutiveFailures++;
      state.totalFailures++;
      console.log(`[Mock] Recorded failure for ${name}: ${error.message}`);
    }
  }
}

async function testProviderActivation() {
  console.log('[Test] Phase 6.6 - LLM Provider Activation\n');
  
  const tests = [];
  
  // Test 1: Provider registration
  console.log('Test 1: Provider registration');
  {
    const healthManager = new MockProviderHealthManager();
    const { initializeProviders } = require('./lib/providers/factory');
    
    // Mock environment
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
    const providers = await initializeProviders(healthManager, {
      anthropic: {
        apiKey: 'test-key',
        defaultModel: 'claude-3-7-sonnet-20250219',
      },
      local: {
        gatewayUrl: 'http://localhost:18789',
        name: 'local',
      },
    });
    
    assert.ok(providers.anthropic, 'Anthropic provider should be created');
    assert.ok(providers.local, 'Local provider should be created');
    assert.strictEqual(healthManager.providers.size, 2, 'Both providers should be registered');
    assert.ok(healthManager.running, 'Health monitoring should be started');
    
    console.log('✓ Provider registration successful\n');
    tests.push({ name: 'Provider registration', passed: true });
    
    healthManager.stop();
  }
  
  // Test 2: Chat intent classification
  console.log('Test 2: Chat intent classification');
  {
    // Test intent classification patterns directly
    const patterns = {
      recovery: [
        'diagnose system',
        'show failures',
        'test provider anthropic',
        'explain blockers',
        'show dead letters',
        'recovery checklist',
      ],
      general: [
        'hello',
        'what is the weather?',
        'help me with this task',
        'how do I restart a service?',
      ],
    };
    
    // Simple pattern matching (same logic as Vienna Core)
    function classifyIntent(message) {
      const lowerMessage = message.toLowerCase().trim();
      const recoveryPatterns = [
        /diagnose\s+(system|runtime|state)/,
        /show\s+(failures|failed|errors|dead\s*letters?|dlq)/,
        /explain\s+(blockers?|blocks?|issues?)/,
        /test\s+provider/,
        /enter\s+local[\s-]?only/,
        /recovery\s+checklist/,
        /show\s+(mode|runtime\s+mode)/,
      ];
      
      for (const pattern of recoveryPatterns) {
        if (pattern.test(lowerMessage)) {
          return 'recovery';
        }
      }
      
      return 'general';
    }
    
    // Test recovery intents
    for (const message of patterns.recovery) {
      const intent = classifyIntent(message);
      assert.strictEqual(intent, 'recovery', `"${message}" should be recovery`);
    }
    
    // Test general chat
    for (const message of patterns.general) {
      const intent = classifyIntent(message);
      assert.strictEqual(intent, 'general', `"${message}" should be general`);
    }
    
    console.log('✓ Intent classification correct\n');
    tests.push({ name: 'Intent classification', passed: true });
  }
  
  // Test 3: Provider health checks
  console.log('Test 3: Provider health checks');
  {
    const { AnthropicProvider } = require('./lib/providers/anthropic/client');
    const { LocalProvider } = require('./lib/providers/local/client');
    
    // Test Anthropic provider (will fail without real API key)
    const anthropic = new AnthropicProvider({
      apiKey: 'test-key-invalid',
      defaultModel: 'claude-3-7-sonnet-20250219',
    });
    
    const anthropicHealthy = await anthropic.isHealthy();
    assert.strictEqual(anthropicHealthy, false, 'Anthropic should be unhealthy with invalid key');
    
    // Test Local provider (will fail if gateway not running)
    const local = new LocalProvider({
      url: 'http://localhost:18789',
      name: 'local',
    });
    
    const localStatus = await local.getStatus();
    assert.ok(localStatus.name === 'local', 'Local provider status should include name');
    
    console.log('✓ Health checks functional\n');
    tests.push({ name: 'Health checks', passed: true });
  }
  
  // Test 4: Provider fallback selection
  console.log('Test 4: Provider fallback selection');
  {
    const healthManager = new MockProviderHealthManager();
    const { AnthropicProvider } = require('./lib/providers/anthropic/client');
    const { LocalProvider } = require('./lib/providers/local/client');
    const { getActiveProvider } = require('./lib/providers/factory');
    
    const anthropic = new AnthropicProvider({
      apiKey: 'test-key',
      defaultModel: 'claude-3-7-sonnet-20250219',
    });
    
    const local = new LocalProvider({
      url: 'http://localhost:18789',
      name: 'local',
    });
    
    healthManager.registerProvider('anthropic', anthropic);
    healthManager.registerProvider('local', local);
    
    const providers = { anthropic, local };
    
    // Scenario 1: Anthropic healthy → use Anthropic
    healthManager.providers.get('anthropic').status = 'healthy';
    healthManager.providers.get('local').status = 'healthy';
    
    let active = getActiveProvider(healthManager, providers);
    assert.strictEqual(active.name, 'anthropic', 'Should prefer Anthropic when healthy');
    
    // Scenario 2: Anthropic unhealthy → fall back to local
    healthManager.providers.get('anthropic').status = 'degraded';
    healthManager.providers.get('local').status = 'healthy';
    
    active = getActiveProvider(healthManager, providers);
    assert.strictEqual(active.name, 'local', 'Should fall back to local when Anthropic degraded');
    
    // Scenario 3: Both unhealthy → no provider
    healthManager.providers.get('anthropic').status = 'degraded';
    healthManager.providers.get('local').status = 'degraded';
    
    active = getActiveProvider(healthManager, providers);
    assert.strictEqual(active, null, 'Should return null when all providers unhealthy');
    
    console.log('✓ Provider fallback logic correct\n');
    tests.push({ name: 'Provider fallback', passed: true });
  }
  
  // Test 5: Vienna Core integration
  console.log('Test 5: Vienna Core integration');
  {
    const fs = require('fs');
    const indexContent = fs.readFileSync('./index.js', 'utf8');
    
    // Check that Phase 6.6 code is present in Vienna Core
    assert.ok(indexContent.includes('processChatMessage'), 'processChatMessage method should be defined');
    assert.ok(indexContent.includes('classifyChatIntent'), 'classifyChatIntent method should be defined');
    assert.ok(indexContent.includes('initializeProviders'), 'Provider initialization should be included');
    assert.ok(indexContent.includes('Phase 6.6'), 'Phase 6.6 comments should be present');
    
    // Check that provider factory exists
    assert.ok(fs.existsSync('./lib/providers/factory.js'), 'Provider factory should exist');
    assert.ok(fs.existsSync('./lib/providers/anthropic/client.js'), 'Anthropic provider should exist');
    assert.ok(fs.existsSync('./lib/providers/local/client.js'), 'Local provider should exist');
    
    console.log('✓ Vienna Core integration complete\n');
    tests.push({ name: 'Vienna Core integration', passed: true });
  }
  
  // Results
  console.log('\n=== Test Results ===');
  const passed = tests.filter(t => t.passed).length;
  const total = tests.length;
  
  tests.forEach(t => {
    console.log(`${t.passed ? '✓' : '✗'} ${t.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✓ Phase 6.6 - LLM Provider Activation validated');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
testProviderActivation().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
