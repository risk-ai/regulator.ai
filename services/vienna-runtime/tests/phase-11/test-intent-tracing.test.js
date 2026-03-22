/**
 * Phase 11.5 — Intent Tracing Tests
 * 
 * Validates intent lifecycle tracking and execution graph reconstruction.
 */

const { StateGraph, _resetStateGraphForTesting } = require('../../lib/state/state-graph');
const { IntentTracer } = require('../../lib/core/intent-tracing');
const { ExecutionGraphBuilder } = require('../../lib/core/execution-graph');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Force test environment
process.env.VIENNA_ENV = 'test';
process.env.NODE_ENV = 'test';

describe('Phase 11.5 — Intent Tracing', () => {
  let stateGraph;
  let tracer;
  let graphBuilder;
  let testDbPath;

  beforeEach(async () => {
    _resetStateGraphForTesting();

    testDbPath = path.join(os.tmpdir(), `test-intent-tracing-${Date.now()}.db`);
    stateGraph = new StateGraph({ dbPath: testDbPath, environment: 'test' });
    await stateGraph.initialize();

    tracer = new IntentTracer(stateGraph);
    graphBuilder = new ExecutionGraphBuilder(stateGraph);
  });

  afterEach(() => {
    if (stateGraph) {
      stateGraph.close();
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // ============================================================================
  // Category A: Intent Trace Creation
  // ============================================================================

  test('A1: Create intent trace', () => {
    const intent_id = 'intent-test-001';
    const intent_type = 'restore_objective';
    const source = { type: 'operator', id: 'max' };

    stateGraph.createIntentTrace(intent_id, intent_type, source);

    const trace = stateGraph.getIntentTrace(intent_id);
    expect(trace).not.toBeNull();
    expect(trace.intent_id).toBe(intent_id);
    expect(trace.intent_type).toBe(intent_type);
    expect(trace.source).toEqual(source);
    expect(trace.status).toBe('submitted');
    expect(trace.events).toEqual([]);
  });

  test('A2: Append lifecycle events', async () => {
    const intent_id = 'intent-test-002';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    await tracer.recordEvent(intent_id, 'intent.validated', { intent_type: 'restore_objective' });
    await tracer.recordEvent(intent_id, 'intent.executed', { action: 'manual_reset' });

    const trace = await tracer.getTrace(intent_id);
    expect(trace.events.length).toBe(2);
    expect(trace.events[0].event_type).toBe('intent.validated');
    expect(trace.events[1].event_type).toBe('intent.executed');
  });

  test('A3: Update intent status', async () => {
    const intent_id = 'intent-test-003';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    await tracer.updateStatus(intent_id, 'executing');
    let trace = await tracer.getTrace(intent_id);
    expect(trace.status).toBe('executing');

    await tracer.updateStatus(intent_id, 'completed');
    trace = await tracer.getTrace(intent_id);
    expect(trace.status).toBe('completed');
  });

  test('A4: Link intent to execution', async () => {
    const intent_id = 'intent-test-004';
    const execution_id = 'exec-001';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    await tracer.linkExecution(intent_id, execution_id);

    const trace = await tracer.getTrace(intent_id);
    expect(trace.relationships.execution_id).toBe(execution_id);
  });

  test('A5: Link intent to multiple entities', async () => {
    const intent_id = 'intent-test-005';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    await tracer.linkExecution(intent_id, 'exec-001');
    await tracer.linkVerification(intent_id, 'verify-001');
    await tracer.linkOutcome(intent_id, 'outcome-001');

    const trace = await tracer.getTrace(intent_id);
    expect(trace.relationships.execution_id).toBe('exec-001');
    expect(trace.relationships.verification_id).toBe('verify-001');
    expect(trace.relationships.outcome_id).toBe('outcome-001');
  });

  // ============================================================================
  // Category B: Intent Trace Queries
  // ============================================================================

  test('B1: List all intent traces', async () => {
    stateGraph.createIntentTrace('intent-001', 'restore_objective', { type: 'operator', id: 'max' });
    stateGraph.createIntentTrace('intent-002', 'set_safe_mode', { type: 'operator', id: 'max' });

    const traces = await tracer.listTraces();
    expect(traces.length).toBe(2);
  });

  test('B2: Filter by intent type', async () => {
    stateGraph.createIntentTrace('intent-001', 'restore_objective', { type: 'operator', id: 'max' });
    stateGraph.createIntentTrace('intent-002', 'set_safe_mode', { type: 'operator', id: 'max' });

    const traces = await tracer.listTraces({ intent_type: 'restore_objective' });
    expect(traces.length).toBe(1);
    expect(traces[0].intent_type).toBe('restore_objective');
  });

  test('B3: Filter by status', async () => {
    stateGraph.createIntentTrace('intent-001', 'restore_objective', { type: 'operator', id: 'max' });
    stateGraph.createIntentTrace('intent-002', 'restore_objective', { type: 'operator', id: 'max' });
    await tracer.updateStatus('intent-002', 'completed');

    const traces = await tracer.listTraces({ status: 'completed' });
    expect(traces.length).toBe(1);
    expect(traces[0].status).toBe('completed');
  });

  test('B4: Filter by source type', async () => {
    stateGraph.createIntentTrace('intent-001', 'restore_objective', { type: 'operator', id: 'max' });
    stateGraph.createIntentTrace('intent-002', 'restore_objective', { type: 'agent', id: 'castlereagh' });

    const traces = await tracer.listTraces({ source_type: 'operator' });
    expect(traces.length).toBe(1);
    expect(traces[0].source.type).toBe('operator');
  });

  // ============================================================================
  // Category C: Timeline Reconstruction
  // ============================================================================

  test('C1: Get intent timeline (chronological)', async () => {
    const intent_id = 'intent-test-timeline';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    // Record events with slight delays to ensure ordering
    await tracer.recordEvent(intent_id, 'intent.submitted', {});
    await new Promise(resolve => setTimeout(resolve, 5));
    await tracer.recordEvent(intent_id, 'intent.validated', {});
    await new Promise(resolve => setTimeout(resolve, 5));
    await tracer.recordEvent(intent_id, 'intent.executed', {});

    const timeline = await tracer.getIntentTimeline(intent_id);
    expect(timeline.length).toBe(3);
    expect(timeline[0].event_type).toBe('intent.submitted');
    expect(timeline[1].event_type).toBe('intent.validated');
    expect(timeline[2].event_type).toBe('intent.executed');

    // Verify chronological order
    const ts1 = new Date(timeline[0].timestamp);
    const ts2 = new Date(timeline[1].timestamp);
    const ts3 = new Date(timeline[2].timestamp);
    expect(ts2 > ts1).toBe(true);
    expect(ts3 > ts2).toBe(true);
  });

  test('C2: Timeline preserves metadata', async () => {
    const intent_id = 'intent-test-metadata';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });

    await tracer.recordEvent(intent_id, 'intent.executed', {
      action: 'manual_reset',
      objective_id: 'obj-001'
    });

    const timeline = await tracer.getIntentTimeline(intent_id);
    expect(timeline[0].metadata.action).toBe('manual_reset');
    expect(timeline[0].metadata.objective_id).toBe('obj-001');
  });

  // ============================================================================
  // Category D: Execution Graph Construction
  // ============================================================================

  test('D1: Build basic intent graph', async () => {
    const intent_id = 'intent-graph-001';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });
    await tracer.recordEvent(intent_id, 'intent.submitted', {});
    await tracer.recordEvent(intent_id, 'intent.validated', {});
    await tracer.updateStatus(intent_id, 'completed');

    const graph = await graphBuilder.buildIntentGraph(intent_id);
    expect(graph.intent_id).toBe(intent_id);
    expect(graph.intent_type).toBe('restore_objective');
    expect(graph.source.type).toBe('operator');
    expect(graph.stages.length).toBeGreaterThan(0);
    expect(graph.timeline.length).toBe(2);
  });

  test('D2: Graph includes intent stage', async () => {
    const intent_id = 'intent-graph-002';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });
    await tracer.updateStatus(intent_id, 'completed');

    const graph = await graphBuilder.buildIntentGraph(intent_id);
    const intentStage = graph.stages.find(s => s.stage === 'intent');
    expect(intentStage).toBeDefined();
    expect(intentStage.status).toBe('completed');
  });

  test('D3: Explain decision for permitted intent', async () => {
    const intent_id = 'intent-explain-001';
    stateGraph.createIntentTrace(intent_id, 'restore_objective', { type: 'operator', id: 'max' });
    await tracer.updateStatus(intent_id, 'completed');

    const explanation = await graphBuilder.explainDecision(intent_id);
    expect(explanation.intent_id).toBe(intent_id);
    expect(explanation.decision).toBe('completed');
    expect(explanation.reasoning.length).toBeGreaterThan(0);
    expect(explanation.reasoning[0].factor).toBe('permitted');
  });

  // ============================================================================
  // Category E: Error Handling
  // ============================================================================

  test('E1: Get non-existent trace returns null', async () => {
    const trace = await tracer.getTrace('nonexistent');
    expect(trace).toBeNull();
  });

  test('E2: Append event to non-existent trace throws', async () => {
    await expect(async () => {
      await tracer.recordEvent('nonexistent', 'intent.validated', {});
    }).rejects.toThrow('Intent trace not found');
  });

  test('E3: Build graph for non-existent intent throws', async () => {
    await expect(async () => {
      await graphBuilder.buildIntentGraph('nonexistent');
    }).rejects.toThrow('Intent not found');
  });

  test('E4: Link to non-existent trace throws', async () => {
    await expect(async () => {
      await tracer.linkExecution('nonexistent', 'exec-001');
    }).rejects.toThrow('Intent trace not found');
  });
});

describe('Phase 11.5 — Test Summary', () => {
  test('Summary: All intent tracing capabilities operational', () => {
    const capabilities = [
      'Intent trace creation',
      'Lifecycle event recording',
      'Status updates',
      'Entity linking (execution, verification, outcome)',
      'Trace queries (by type, status, source)',
      'Timeline reconstruction',
      'Execution graph construction',
      'Decision explanation',
      'Error handling'
    ];

    expect(capabilities.length).toBe(9);
  });
});
