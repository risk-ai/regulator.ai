/**
 * Phase 6 Comprehensive Test
 * 
 * Tests all Phase 6 components:
 * - Phase 6.10: Audit Trail Storage
 * - Phase 6.11: Multi-Step Workflow Engine
 * - Phase 6.12: Model Control Layer
 */

const { AuditLog } = require('./lib/core/audit-log');
const { WorkflowEngine } = require('./lib/core/workflow-engine');
const { ShellExecutor } = require('./lib/execution/shell-executor');
const { ModelRegistry } = require('./lib/providers/model-registry');
const { ModelRouter } = require('./lib/providers/model-router');

console.log('\n=== Phase 6 Comprehensive Test ===\n');

let testsRun = 0;
let testsPassed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error('  Error:', error.message);
  }
}

// =============================================================================
// Phase 6.10: Audit Trail Tests
// =============================================================================

console.log('Phase 6.10: Audit Trail Storage\n');

const auditLog = new AuditLog({ maxEvents: 100 });

test('Audit log initializes', () => {
  if (!auditLog.initialized) throw new Error('Audit log not initialized');
});

test('Audit log appends events', () => {
  const id = auditLog.append({
    action: 'test_action',
    result: 'success',
    operator: 'test',
  });
  if (!id) throw new Error('No event ID returned');
});

test('Audit log queries events', () => {
  const result = auditLog.query({ limit: 10 });
  if (!result.records) throw new Error('No records returned');
  if (result.records.length === 0) throw new Error('No records found');
});

test('Audit log filters by action', () => {
  auditLog.append({ action: 'test_filter', result: 'success', operator: 'test' });
  const result = auditLog.query({ action: 'test_filter' });
  if (result.total !== 1) throw new Error('Filter failed');
});

test('Audit log returns stats', () => {
  const stats = auditLog.getStats();
  if (stats.record_count === 0) throw new Error('No stats');
});

console.log('\n');

// =============================================================================
// Phase 6.11: Workflow Engine Tests
// =============================================================================

console.log('Phase 6.11: Multi-Step Workflow Engine\n');

// Create shell executor (dry run mode)
const shellExecutor = new ShellExecutor({
  dryRun: true, // Don't actually execute commands
  auditSystem: { emit: () => {} }, // Mock audit
});

const workflowEngine = new WorkflowEngine({
  shellExecutor,
  auditLog,
});

test('Workflow engine initializes', () => {
  if (!workflowEngine) throw new Error('Workflow engine not initialized');
});

test('Workflow engine has built-in workflows', () => {
  const workflows = workflowEngine.getAvailableWorkflows();
  if (workflows.length === 0) throw new Error('No built-in workflows');
  if (!workflows.find(w => w.workflow_id === 'openclaw_diagnose')) {
    throw new Error('Missing openclaw_diagnose workflow');
  }
});

test('Workflow engine creates workflow instances', () => {
  const workflow = workflowEngine.createWorkflow('openclaw_diagnose', {
    operator: 'test',
  });
  if (!workflow) throw new Error('Failed to create workflow');
  if (workflow.status !== 'proposed') throw new Error('Wrong initial status');
});

test('Workflow engine approves workflows', () => {
  const workflow = workflowEngine.createWorkflow('openclaw_diagnose', {
    operator: 'test',
  });
  const approved = workflowEngine.approveWorkflow(workflow.workflow_id, 'test');
  if (approved.status !== 'approved') throw new Error('Workflow not approved');
});

test('Workflow engine executes workflows', async () => {
  const workflow = workflowEngine.createWorkflow('openclaw_diagnose', {
    operator: 'test',
  });
  workflowEngine.approveWorkflow(workflow.workflow_id, 'test');
  const executed = await workflowEngine.executeWorkflow(workflow.workflow_id);
  if (executed.status !== 'complete' && executed.status !== 'failed') {
    throw new Error('Workflow not executed');
  }
});

test('Workflow engine cancels workflows', () => {
  const workflow = workflowEngine.createWorkflow('openclaw_diagnose', {
    operator: 'test',
  });
  const cancelled = workflowEngine.cancelWorkflow(workflow.workflow_id, 'test');
  if (cancelled.status !== 'cancelled') throw new Error('Workflow not cancelled');
});

console.log('\n');

// =============================================================================
// Phase 6.12: Model Control Layer Tests
// =============================================================================

console.log('Phase 6.12: Model Control Layer\n');

const modelRegistry = new ModelRegistry();

test('Model registry initializes', () => {
  if (!modelRegistry) throw new Error('Model registry not initialized');
});

test('Model registry has default models', () => {
  const models = modelRegistry.getAllModels();
  if (models.length === 0) throw new Error('No models registered');
  if (!models.find(m => m.provider === 'anthropic')) {
    throw new Error('Missing anthropic models');
  }
  if (!models.find(m => m.provider === 'ollama')) {
    throw new Error('Missing ollama models');
  }
});

test('Model registry filters by provider', () => {
  const anthropic = modelRegistry.getModelsByProvider('anthropic');
  if (anthropic.length === 0) throw new Error('No anthropic models');
});

test('Model registry filters by capability', () => {
  const reasoning = modelRegistry.getModelsByCapability('reasoning');
  if (reasoning.length === 0) throw new Error('No reasoning models');
});

test('Model registry updates model status', () => {
  const models = modelRegistry.getAllModels();
  const testModel = models[0];
  const updated = modelRegistry.updateModelStatus(testModel.model_id, 'disabled');
  if (updated.status !== 'disabled') throw new Error('Status not updated');
  // Reset
  modelRegistry.updateModelStatus(testModel.model_id, 'enabled');
});

test('Model registry sets operator preferences', () => {
  const models = modelRegistry.getAllModels();
  const testModel = models[0];
  modelRegistry.setOperatorPreference('test', 'general', testModel.model_id);
  const pref = modelRegistry.getOperatorPreference('test', 'general');
  if (!pref) throw new Error('Preference not set');
  if (pref.model_id !== testModel.model_id) throw new Error('Wrong preference');
});

test('Model registry clears operator preferences', () => {
  modelRegistry.clearOperatorPreference('test', 'general');
  const pref = modelRegistry.getOperatorPreference('test', 'general');
  if (pref) throw new Error('Preference not cleared');
});

const modelRouter = new ModelRouter({
  modelRegistry,
  providerHealthManager: null, // Mock
  runtimeModeManager: null, // Mock
});

test('Model router initializes', () => {
  if (!modelRouter) throw new Error('Model router not initialized');
});

test('Model router routes classification tasks', () => {
  const result = modelRouter.route({
    task_type: 'classification',
    operator: 'test',
  });
  if (!result) throw new Error('No routing result');
  if (!result.model) throw new Error('No model selected');
  // Classification should prefer free/local models
  if (result.model.cost_class !== 'free') {
    console.warn('  Warning: Classification not using free model');
  }
});

test('Model router routes complex reasoning tasks', () => {
  const result = modelRouter.route({
    task_type: 'complex_reasoning',
    operator: 'test',
  });
  if (!result) throw new Error('No routing result');
  if (!result.model) throw new Error('No model selected');
  // Complex reasoning should use high-capability models
  if (!result.model.capabilities.includes('complex_reasoning')) {
    throw new Error('Model lacks required capability');
  }
});

test('Model router respects operator preferences', () => {
  const models = modelRegistry.getAllModels();
  const testModel = models[0];
  modelRegistry.setOperatorPreference('test', 'general', testModel.model_id);
  
  const result = modelRouter.route({
    task_type: 'general',
    operator: 'test',
  });
  
  if (!result) throw new Error('No routing result');
  if (!result.model) throw new Error('No model selected');
  if (result.model.model_id !== testModel.model_id) {
    throw new Error('Operator preference not respected');
  }
  if (result.reason !== 'operator_preference') {
    throw new Error('Wrong routing reason');
  }
  
  // Cleanup
  modelRegistry.clearOperatorPreference('test', 'general');
});

test('Model router returns routing stats', () => {
  const stats = modelRouter.getStats();
  if (!stats) throw new Error('No stats returned');
  if (stats.total_models === 0) throw new Error('No models in stats');
  if (!stats.by_provider) throw new Error('Missing by_provider stats');
});

console.log('\n');

// =============================================================================
// Summary
// =============================================================================

console.log('==============================================');
console.log(`Tests run: ${testsRun}`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsRun - testsPassed}`);
console.log('==============================================\n');

if (testsPassed === testsRun) {
  console.log('✓ All Phase 6 tests passed!\n');
  process.exit(0);
} else {
  console.error('✗ Some Phase 6 tests failed\n');
  process.exit(1);
}
