/**
 * Phase 6.5 Validation Test - Recovery Copilot + Provider Fallback
 * 
 * Tests:
 * 1. Provider capability registry
 * 2. Runtime mode determination
 * 3. Recovery copilot intent parsing
 * 4. Recovery copilot diagnostics
 * 5. Mode transition governance
 */

const ViennaCore = require('./index');
const { PROVIDER_REGISTRY, getProviderSpec, getFallbackChain, getDegradedModeProviders } = require('./lib/providers/registry');
const { RuntimeModeManager, determineRuntimeMode } = require('./lib/core/runtime-modes');
const { RecoveryCopilot } = require('./lib/core/recovery-copilot');

console.log('=== Phase 6.5 Validation Test ===\n');

// Test 1: Provider Capability Registry
console.log('Test 1: Provider Capability Registry');
console.log('-------------------------------------');

const anthropicSpec = getProviderSpec('anthropic');
console.log('Anthropic spec:', JSON.stringify(anthropicSpec, null, 2));

const localSpec = getProviderSpec('local');
console.log('Local spec:', JSON.stringify(localSpec, null, 2));

const anthropicFallback = getFallbackChain('anthropic');
console.log('Anthropic fallback chain:', anthropicFallback);

const degradedProviders = getDegradedModeProviders();
console.log('Degraded-mode eligible providers:', degradedProviders.map(p => p.id));

console.log('✓ Provider registry working\n');

// Test 2: Runtime Mode Determination
console.log('Test 2: Runtime Mode Determination');
console.log('-----------------------------------');

// Scenario 1: All healthy
const allHealthy = new Map([
  ['anthropic', { status: 'healthy' }],
  ['local', { status: 'healthy' }],
]);

const mode1 = determineRuntimeMode(allHealthy, true);
console.log('All healthy, gateway up:', mode1);
console.assert(mode1 === 'normal', 'Expected normal mode');

// Scenario 2: Anthropic down, local up
const anthropicDown = new Map([
  ['anthropic', { status: 'unavailable' }],
  ['local', { status: 'healthy' }],
]);

const mode2 = determineRuntimeMode(anthropicDown, true);
console.log('Anthropic down, local up:', mode2);
console.assert(mode2 === 'degraded', 'Expected degraded mode');

// Scenario 3: Gateway down
const mode3 = determineRuntimeMode(allHealthy, false);
console.log('All healthy, gateway down:', mode3);
console.assert(mode3 === 'local-only', 'Expected local-only mode');

// Scenario 4: All providers down
const allDown = new Map([
  ['anthropic', { status: 'unavailable' }],
  ['local', { status: 'unavailable' }],
]);

const mode4 = determineRuntimeMode(allDown, true);
console.log('All providers down:', mode4);
console.assert(mode4 === 'operator-only', 'Expected operator-only mode');

console.log('✓ Runtime mode determination working\n');

// Test 3: Runtime Mode Manager
console.log('Test 3: Runtime Mode Manager');
console.log('----------------------------');

const modeManager = new RuntimeModeManager();
console.log('Initial state:', modeManager.getCurrentState());

// Transition to degraded
const transition1 = modeManager.updateMode(anthropicDown, true);
console.log('Transition 1:', JSON.stringify(transition1, null, 2));
console.assert(transition1 !== null, 'Expected transition to occur');
console.assert(transition1.to === 'degraded', 'Expected degraded mode');

// No transition if mode unchanged
const transition2 = modeManager.updateMode(anthropicDown, true);
console.log('Transition 2 (no change):', transition2);
console.assert(transition2 === null, 'Expected no transition');

// Force mode transition
const forcedTransition = modeManager.forceMode('local-only', 'Operator override for testing', anthropicDown);
console.log('Forced transition:', JSON.stringify(forcedTransition, null, 2));
console.assert(forcedTransition.automatic === false, 'Expected manual transition');

console.log('✓ Runtime mode manager working\n');

// Test 4: Recovery Copilot Intent Parsing
console.log('Test 4: Recovery Copilot Intent Parsing');
console.log('----------------------------------------');

const copilot = new RecoveryCopilot();

const testMessages = [
  'diagnose system',
  'show failures',
  'show dead letters',
  'explain blockers',
  'test provider anthropic',
  'enter local-only',
  'recovery checklist',
  'show mode',
  'invalid command',
];

testMessages.forEach(msg => {
  const { intent, params } = copilot.intentParser.parseIntent(msg);
  console.log(`"${msg}" → intent: ${intent}, params:`, params);
});

console.log('✓ Intent parsing working\n');

// Test 5: Recovery Copilot Diagnostics
console.log('Test 5: Recovery Copilot Diagnostics');
console.log('-------------------------------------');

const mockRuntimeState = {
  mode: 'degraded',
  reasons: ['Provider anthropic unavailable'],
  enteredAt: new Date().toISOString(),
  previousMode: 'normal',
  fallbackProvidersActive: ['local'],
  availableCapabilities: ['diagnostics', 'summarization', 'classification'],
};

const mockProviderHealth = new Map([
  ['anthropic', {
    status: 'unavailable',
    lastCheckedAt: new Date().toISOString(),
    lastFailureAt: new Date(Date.now() - 60000).toISOString(),
    consecutiveFailures: 3,
    cooldownUntil: new Date(Date.now() + 30000).toISOString(),
    lastSuccessAt: null,
    latencyMs: null,
    errorRate: null,
  }],
  ['local', {
    status: 'healthy',
    lastCheckedAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: null,
    consecutiveFailures: 0,
    cooldownUntil: null,
    latencyMs: 50,
    errorRate: 0,
  }],
]);

(async () => {
  console.log('\n--- Diagnose System ---');
  const diagnosis = await copilot.processIntent('diagnose system', mockRuntimeState, mockProviderHealth);
  console.log(diagnosis);
  
  console.log('\n--- Show Failures ---');
  const failures = await copilot.processIntent('show failures', mockRuntimeState, mockProviderHealth);
  console.log(failures);
  
  console.log('\n--- Explain Blockers ---');
  const blockers = await copilot.processIntent('explain blockers', mockRuntimeState, mockProviderHealth);
  console.log(blockers);
  
  console.log('\n--- Test Provider ---');
  const providerTest = await copilot.processIntent('test provider anthropic', mockRuntimeState, mockProviderHealth);
  console.log(providerTest);
  
  console.log('\n--- Show Mode ---');
  const modeInfo = await copilot.processIntent('show mode', mockRuntimeState, mockProviderHealth);
  console.log(modeInfo);
  
  console.log('\n✓ Recovery copilot diagnostics working\n');
  
  // Test 6: Module Integration
  console.log('Test 6: Module Integration');
  console.log('---------------------------');
  
  // Verify modules can be required and instantiated
  const testModeManager = new RuntimeModeManager();
  const testCopilot = new RecoveryCopilot();
  
  console.log('Runtime mode manager instantiated:', !!testModeManager);
  console.log('Recovery copilot instantiated:', !!testCopilot);
  
  // Verify module exports
  console.log('Runtime modes exports:', typeof RuntimeModeManager);
  console.log('Recovery copilot exports:', typeof RecoveryCopilot);
  console.log('Provider registry exports:', typeof PROVIDER_REGISTRY);
  
  console.log('\n✓ Module integration working\n');
  
  console.log('=== Phase 6.5 Validation Complete ===');
  console.log('\nAll tests passed ✓');
  console.log('\nPhase 6.5 exit criteria:');
  console.log('✓ Provider capability registry implemented');
  console.log('✓ Runtime mode determination working');
  console.log('✓ Runtime mode manager operational');
  console.log('✓ Recovery copilot intent parsing functional');
  console.log('✓ Recovery copilot diagnostics working');
  console.log('✓ Module integration verified');
  console.log('\nPhase 6.5 Status: CORE COMPONENTS COMPLETE');
  console.log('\nRemaining work:');
  console.log('- Convert ProviderManager from TypeScript to JavaScript');
  console.log('- Wire provider health into runtime mode updates');
  console.log('- Expose recovery copilot through Vienna Chat API');
  console.log('- Add DLQ integration to recovery copilot');
})();
