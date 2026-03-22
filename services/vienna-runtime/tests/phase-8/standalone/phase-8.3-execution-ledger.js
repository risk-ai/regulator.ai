/**
 * Phase 8.3 — Execution Ledger Tests
 * 
 * Tests for:
 * - Execution ledger events (append-only)
 * - Execution ledger summary (derived projection)
 * - Event → summary projection logic
 * - Query API
 * - Rebuild capability
 * - Integrity guarantees
 * 
 * Test categories:
 * A. Write-path tests (5 tests)
 * B. Projection tests (5 tests)
 * C. Query tests (5 tests)
 * D. Rebuild tests (3 tests)
 * E. Integrity tests (2 tests)
 * 
 * Total: 20 tests minimum
 */

const { StateGraph } = require('../../../lib/state/state-graph.js');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

// Test environment database path
const TEST_DB_PATH = path.join(
  process.env.HOME,
  '.openclaw',
  'runtime',
  'test',
  'state',
  'phase-8.3-ledger-test.db'
);

// Ensure test environment
process.env.VIENNA_ENV = 'test';

// Clean test database before tests
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

let stateGraph;

// Setup
async function setup() {
  stateGraph = new StateGraph({
    dbPath: TEST_DB_PATH,
    environment: 'test'
  });
  await stateGraph.initialize();
}

// Teardown
function teardown() {
  if (stateGraph) {
    stateGraph.close();
  }
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

// Helper: create event
function createEvent(executionId, eventType, stage, sequenceNum, payload = {}) {
  const event = {
    event_id: `evt_${nanoid(12)}`,
    execution_id: executionId,
    plan_id: payload.plan_id || null,
    verification_id: payload.verification_id || null,
    warrant_id: payload.warrant_id || null,
    outcome_id: payload.outcome_id || null,
    event_type: eventType,
    stage: stage,
    actor_type: 'operator',
    actor_id: 'conductor',
    environment: 'test',
    risk_tier: payload.risk_tier || 'T0',
    objective: payload.objective || null,
    target_type: payload.target_type || null,
    target_id: payload.target_id || null,
    event_timestamp: new Date().toISOString(),
    sequence_num: sequenceNum,
    status: payload.status || null,
    payload_json: payload,
    evidence_json: payload.evidence || null,
    summary: payload.summary || null
  };
  
  return event;
}

// ============================================================
// CATEGORY A: Write-path tests
// ============================================================

async function testA1_AppendFirstEventCreatesSummary() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event = createEvent(executionId, 'intent_received', 'intent', 0, {
    raw_request: 'show status',
    summary: 'Intent received: show status'
  });
  
  const result = stateGraph.appendLedgerEvent(event);
  
  if (result.changes !== 1) {
    throw new Error('Event insert failed');
  }
  
  // Check that summary was created
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (!summary) {
    throw new Error('Summary not created');
  }
  
  if (summary.execution_id !== executionId) {
    throw new Error('Summary execution_id mismatch');
  }
  
  if (summary.event_count !== 1) {
    throw new Error('Summary event_count should be 1');
  }
  
  if (summary.current_stage !== 'intent') {
    throw new Error('Summary current_stage should be intent');
  }
  
  console.log('✅ A1: Append first event creates summary');
}

async function testA2_AppendSubsequentEventUpdatesSummary() {
  const executionId = `exec_${nanoid(12)}`;
  
  // First event
  const event1 = createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'Intent received'
  });
  stateGraph.appendLedgerEvent(event1);
  
  // Second event
  const event2 = createEvent(executionId, 'plan_created', 'plan', 1, {
    objective: 'test_objective',
    risk_tier: 'T1',
    summary: 'Plan created'
  });
  stateGraph.appendLedgerEvent(event2);
  
  // Check summary
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.event_count !== 2) {
    throw new Error('Summary event_count should be 2');
  }
  
  if (summary.current_stage !== 'plan') {
    throw new Error('Summary current_stage should be plan');
  }
  
  if (summary.objective !== 'test_objective') {
    throw new Error('Summary objective should be set');
  }
  
  if (summary.risk_tier !== 'T1') {
    throw new Error('Summary risk_tier should be T1');
  }
  
  console.log('✅ A2: Append subsequent event updates summary');
}

async function testA3_SequenceUniquenessEnforced() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event1 = createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'First event'
  });
  stateGraph.appendLedgerEvent(event1);
  
  // Try to insert duplicate sequence_num
  const event2 = createEvent(executionId, 'intent_classified', 'intent', 0, {
    summary: 'Duplicate sequence'
  });
  
  let threw = false;
  try {
    stateGraph.appendLedgerEvent(event2);
  } catch (error) {
    threw = true;
  }
  
  if (!threw) {
    throw new Error('Should have thrown on duplicate sequence_num');
  }
  
  console.log('✅ A3: Sequence uniqueness enforced');
}

async function testA4_InvalidEventRejected() {
  let threw = false;
  
  try {
    stateGraph.appendLedgerEvent({
      event_id: `evt_${nanoid(12)}`,
      execution_id: `exec_${nanoid(12)}`,
      // Missing required fields: event_type, stage, event_timestamp, sequence_num
    });
  } catch (error) {
    threw = true;
  }
  
  if (!threw) {
    throw new Error('Should have thrown on invalid event');
  }
  
  console.log('✅ A4: Invalid event rejected');
}

async function testA5_PayloadEvidenceStoredIntact() {
  const executionId = `exec_${nanoid(12)}`;
  
  const payload = {
    objective: 'recover_gateway',
    steps: ['check_health', 'restart', 'verify'],
    metadata: { confidence: 0.95 }
  };
  
  const evidence = {
    service_active: true,
    port_open: true,
    healthcheck_status: 200
  };
  
  const fullPayload = {
    ...payload,
    evidence: evidence,
    summary: 'Verification completed'
  };
  
  const event = createEvent(executionId, 'verification_completed', 'verification', 0, fullPayload);
  
  stateGraph.appendLedgerEvent(event);
  
  const events = stateGraph.getExecutionLedgerEvents(executionId);
  
  if (events.length !== 1) {
    throw new Error('Event not found');
  }
  
  const stored = events[0];
  
  // Verify payload fields are preserved
  if (stored.payload_json.objective !== payload.objective) {
    throw new Error('Payload objective not preserved');
  }
  
  if (JSON.stringify(stored.payload_json.steps) !== JSON.stringify(payload.steps)) {
    throw new Error('Payload steps not preserved');
  }
  
  if (JSON.stringify(stored.payload_json.metadata) !== JSON.stringify(payload.metadata)) {
    throw new Error('Payload metadata not preserved');
  }
  
  // Verify evidence is preserved
  if (JSON.stringify(stored.evidence_json) !== JSON.stringify(evidence)) {
    throw new Error('Evidence not stored intact');
  }
  
  console.log('✅ A5: Payload and evidence stored intact');
}

// ============================================================
// CATEGORY B: Projection tests
// ============================================================

async function testB1_ApprovalRequestedSetsApprovalPending() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event = createEvent(executionId, 'approval_requested', 'policy', 0, {
    summary: 'Approval requested'
  });
  
  stateGraph.appendLedgerEvent(event);
  
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.approval_required !== 1) {
    throw new Error('approval_required should be 1');
  }
  
  if (summary.approval_status !== 'pending') {
    throw new Error('approval_status should be pending');
  }
  
  console.log('✅ B1: approval_requested sets approval pending');
}

async function testB2_ExecutionFailedSetsWorkflowStatus() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event1 = createEvent(executionId, 'execution_started', 'execution', 0, {
    summary: 'Execution started'
  });
  stateGraph.appendLedgerEvent(event1);
  
  const event2 = createEvent(executionId, 'execution_failed', 'execution', 1, {
    status: 'failed',
    error: 'Service not found',
    summary: 'Execution failed'
  });
  stateGraph.appendLedgerEvent(event2);
  
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.execution_status !== 'failed') {
    throw new Error('execution_status should be failed');
  }
  
  if (summary.workflow_status !== 'execution_failed') {
    throw new Error('workflow_status should be execution_failed');
  }
  
  if (!summary.completed_at) {
    throw new Error('completed_at should be set');
  }
  
  console.log('✅ B2: execution_failed sets workflow_status');
}

async function testB3_VerificationFailedSetsObjectiveAchievedFalse() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event = createEvent(executionId, 'verification_failed', 'verification', 0, {
    status: 'failed',
    objective_achieved: false,
    summary: 'Verification failed'
  });
  
  stateGraph.appendLedgerEvent(event);
  
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.verification_status !== 'failed') {
    throw new Error('verification_status should be failed');
  }
  
  if (summary.objective_achieved !== 0) {
    throw new Error('objective_achieved should be 0');
  }
  
  if (summary.workflow_status !== 'verification_failed') {
    throw new Error('workflow_status should be verification_failed');
  }
  
  console.log('✅ B3: verification_failed sets objective_achieved false');
}

async function testB4_WorkflowOutcomeFinalizedComputesDuration() {
  const executionId = `exec_${nanoid(12)}`;
  
  const startTime = new Date('2026-03-12T22:00:00Z');
  const endTime = new Date('2026-03-12T22:00:06Z');
  
  const event1 = createEvent(executionId, 'execution_started', 'execution', 0, {
    summary: 'Execution started'
  });
  event1.event_timestamp = startTime.toISOString();
  stateGraph.appendLedgerEvent(event1);
  
  const event2 = createEvent(executionId, 'workflow_outcome_finalized', 'outcome', 1, {
    workflow_status: 'completed',
    objective_achieved: true,
    final_summary: 'Workflow completed',
    summary: 'Workflow finalized'
  });
  event2.event_timestamp = endTime.toISOString();
  stateGraph.appendLedgerEvent(event2);
  
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.workflow_status !== 'completed') {
    throw new Error('workflow_status should be completed');
  }
  
  if (summary.objective_achieved !== 1) {
    throw new Error('objective_achieved should be 1');
  }
  
  if (!summary.duration_ms) {
    throw new Error('duration_ms should be set');
  }
  
  // Should be 6000ms (6 seconds)
  if (summary.duration_ms !== 6000) {
    throw new Error(`duration_ms should be 6000, got ${summary.duration_ms}`);
  }
  
  console.log('✅ B4: workflow_outcome_finalized computes duration');
}

async function testB5_SummaryReflectsLastEvent() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event1 = createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'First event'
  });
  stateGraph.appendLedgerEvent(event1);
  
  const event2 = createEvent(executionId, 'plan_created', 'plan', 1, {
    summary: 'Second event'
  });
  stateGraph.appendLedgerEvent(event2);
  
  const event3 = createEvent(executionId, 'execution_started', 'execution', 2, {
    summary: 'Third event'
  });
  stateGraph.appendLedgerEvent(event3);
  
  const summary = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (summary.last_event_type !== 'execution_started') {
    throw new Error('last_event_type should be execution_started');
  }
  
  if (summary.event_count !== 3) {
    throw new Error('event_count should be 3');
  }
  
  console.log('✅ B5: Summary reflects last event');
}

// ============================================================
// CATEGORY C: Query tests
// ============================================================

async function testC1_QueryByObjective() {
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  const execution3 = `exec_${nanoid(12)}`;
  
  // Create executions with different objectives
  stateGraph.appendLedgerEvent(createEvent(execution1, 'plan_created', 'plan', 0, {
    objective: 'recover_gateway',
    summary: 'Plan 1'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution2, 'plan_created', 'plan', 0, {
    objective: 'recover_gateway',
    summary: 'Plan 2'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution3, 'plan_created', 'plan', 0, {
    objective: 'restart_service',
    summary: 'Plan 3'
  }));
  
  // Query by objective
  const results = stateGraph.listExecutionLedgerSummaries({ objective: 'recover_gateway' });
  
  if (results.length !== 2) {
    throw new Error(`Should have 2 results, got ${results.length}`);
  }
  
  if (!results.some(r => r.execution_id === execution1)) {
    throw new Error('Should include execution1');
  }
  
  if (!results.some(r => r.execution_id === execution2)) {
    throw new Error('Should include execution2');
  }
  
  console.log('✅ C1: Query by objective');
}

async function testC2_QueryByRiskTier() {
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  const execution3 = `exec_${nanoid(12)}`;
  
  stateGraph.appendLedgerEvent(createEvent(execution1, 'plan_created', 'plan', 0, {
    risk_tier: 'T0',
    summary: 'T0 plan'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution2, 'plan_created', 'plan', 0, {
    risk_tier: 'T1',
    summary: 'T1 plan'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution3, 'plan_created', 'plan', 0, {
    risk_tier: 'T1',
    summary: 'T1 plan 2'
  }));
  
  const results = stateGraph.listExecutionLedgerSummaries({ risk_tier: 'T1' });
  
  if (results.length !== 2) {
    throw new Error(`Should have 2 T1 results, got ${results.length}`);
  }
  
  console.log('✅ C2: Query by risk_tier');
}

async function testC3_QueryFailedWorkflows() {
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  const execution3 = `exec_${nanoid(12)}`;
  
  stateGraph.appendLedgerEvent(createEvent(execution1, 'execution_failed', 'execution', 0, {
    status: 'failed',
    summary: 'Failed'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution2, 'workflow_outcome_finalized', 'outcome', 0, {
    workflow_status: 'completed',
    summary: 'Completed'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution3, 'verification_failed', 'verification', 0, {
    status: 'failed',
    summary: 'Verification failed'
  }));
  
  const failedExecution = stateGraph.listExecutionLedgerSummaries({ workflow_status: 'execution_failed' });
  const failedVerification = stateGraph.listExecutionLedgerSummaries({ workflow_status: 'verification_failed' });
  
  if (failedExecution.length !== 1) {
    throw new Error('Should have 1 execution_failed');
  }
  
  if (failedVerification.length !== 1) {
    throw new Error('Should have 1 verification_failed');
  }
  
  console.log('✅ C3: Query failed workflows');
}

async function testC4_QueryByTargetId() {
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  
  stateGraph.appendLedgerEvent(createEvent(execution1, 'plan_created', 'plan', 0, {
    target_type: 'service',
    target_id: 'openclaw-gateway',
    summary: 'Gateway plan'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(execution2, 'plan_created', 'plan', 0, {
    target_type: 'service',
    target_id: 'vienna-backend',
    summary: 'Backend plan'
  }));
  
  const results = stateGraph.listExecutionLedgerSummaries({ target_id: 'openclaw-gateway' });
  
  if (results.length !== 1) {
    throw new Error('Should have 1 result for openclaw-gateway');
  }
  
  if (results[0].execution_id !== execution1) {
    throw new Error('Should be execution1');
  }
  
  console.log('✅ C4: Query by target_id');
}

async function testC5_QueryTimeRange() {
  // Clear data for clean test
  clearLedgerData();
  
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  const execution3 = `exec_${nanoid(12)}`;
  
  const time1 = new Date('2026-03-12T20:00:00Z').toISOString();
  const time2 = new Date('2026-03-12T21:00:00Z').toISOString();
  const time3 = new Date('2026-03-12T22:00:00Z').toISOString();
  
  const event1 = createEvent(execution1, 'intent_received', 'intent', 0, { summary: 'Event 1' });
  event1.event_timestamp = time1;
  stateGraph.appendLedgerEvent(event1);
  
  const event2 = createEvent(execution2, 'intent_received', 'intent', 0, { summary: 'Event 2' });
  event2.event_timestamp = time2;
  stateGraph.appendLedgerEvent(event2);
  
  const event3 = createEvent(execution3, 'intent_received', 'intent', 0, { summary: 'Event 3' });
  event3.event_timestamp = time3;
  stateGraph.appendLedgerEvent(event3);
  
  // Query after 21:00
  const results = stateGraph.listExecutionLedgerSummaries({
    started_after: '2026-03-12T20:30:00Z'
  });
  
  if (results.length !== 2) {
    throw new Error(`Should have 2 results after 20:30, got ${results.length}`);
  }
  
  console.log('✅ C5: Query time range');
}

// ============================================================
// CATEGORY D: Rebuild tests
// ============================================================

async function testD1_RebuildSingleSummary() {
  const executionId = `exec_${nanoid(12)}`;
  
  // Create multiple events
  stateGraph.appendLedgerEvent(createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'Intent'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'plan_created', 'plan', 1, {
    objective: 'test_objective',
    risk_tier: 'T1',
    summary: 'Plan'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'execution_completed', 'execution', 2, {
    status: 'success',
    summary: 'Execution'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'workflow_outcome_finalized', 'outcome', 3, {
    workflow_status: 'completed',
    objective_achieved: true,
    summary: 'Outcome'
  }));
  
  // Get original summary
  const original = stateGraph.getExecutionLedgerSummary(executionId);
  
  // Rebuild
  const rebuilt = stateGraph.rebuildExecutionLedgerSummary(executionId);
  
  // Verify rebuilt matches original
  if (rebuilt.execution_id !== original.execution_id) {
    throw new Error('execution_id mismatch');
  }
  
  if (rebuilt.event_count !== original.event_count) {
    throw new Error('event_count mismatch');
  }
  
  if (rebuilt.workflow_status !== original.workflow_status) {
    throw new Error('workflow_status mismatch');
  }
  
  if (rebuilt.objective_achieved !== original.objective_achieved) {
    throw new Error('objective_achieved mismatch');
  }
  
  console.log('✅ D1: Rebuild single summary from events');
}

async function testD2_RebuildAllSummaries() {
  // Clear data for clean test
  clearLedgerData();
  
  const execution1 = `exec_${nanoid(12)}`;
  const execution2 = `exec_${nanoid(12)}`;
  const execution3 = `exec_${nanoid(12)}`;
  
  // Create executions
  stateGraph.appendLedgerEvent(createEvent(execution1, 'intent_received', 'intent', 0, { summary: 'E1' }));
  stateGraph.appendLedgerEvent(createEvent(execution2, 'intent_received', 'intent', 0, { summary: 'E2' }));
  stateGraph.appendLedgerEvent(createEvent(execution3, 'intent_received', 'intent', 0, { summary: 'E3' }));
  
  // Rebuild all
  const result = stateGraph.rebuildAllExecutionLedgerSummaries();
  
  if (result.rebuilt !== 3) {
    throw new Error(`Should have rebuilt 3, got ${result.rebuilt}`);
  }
  
  if (result.failed.length !== 0) {
    throw new Error('Should have 0 failed');
  }
  
  // Verify summaries still exist
  const summary1 = stateGraph.getExecutionLedgerSummary(execution1);
  const summary2 = stateGraph.getExecutionLedgerSummary(execution2);
  const summary3 = stateGraph.getExecutionLedgerSummary(execution3);
  
  if (!summary1 || !summary2 || !summary3) {
    throw new Error('Summaries not found after rebuild');
  }
  
  console.log('✅ D2: Rebuild all summaries');
}

async function testD3_RebuiltSummaryMatchesOriginalProjection() {
  const executionId = `exec_${nanoid(12)}`;
  
  // Create complete workflow
  stateGraph.appendLedgerEvent(createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'Intent received'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'plan_created', 'plan', 1, {
    objective: 'recover_gateway',
    risk_tier: 'T1',
    target_type: 'service',
    target_id: 'openclaw-gateway',
    summary: 'Plan created'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'execution_started', 'execution', 2, {
    summary: 'Execution started'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'execution_completed', 'execution', 3, {
    status: 'success',
    summary: 'Execution completed'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'verification_completed', 'verification', 4, {
    status: 'success',
    objective_achieved: true,
    summary: 'Verification completed'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'workflow_outcome_finalized', 'outcome', 5, {
    workflow_status: 'completed',
    objective_achieved: true,
    final_summary: 'Gateway recovered successfully',
    summary: 'Workflow finalized'
  }));
  
  // Get original
  const original = stateGraph.getExecutionLedgerSummary(executionId);
  
  // Rebuild
  const rebuilt = stateGraph.rebuildExecutionLedgerSummary(executionId);
  
  // Verify all fields match
  const fieldsToCheck = [
    'execution_id', 'objective', 'risk_tier', 'target_type', 'target_id',
    'current_stage', 'execution_status', 'verification_status', 'workflow_status',
    'objective_achieved', 'event_count', 'last_event_type'
  ];
  
  for (const field of fieldsToCheck) {
    if (original[field] !== rebuilt[field]) {
      throw new Error(`Field ${field} mismatch: ${original[field]} vs ${rebuilt[field]}`);
    }
  }
  
  console.log('✅ D3: Rebuilt summary matches original projection');
}

// ============================================================
// CATEGORY E: Integrity tests
// ============================================================

async function testE1_EventsRemainAppendOnly() {
  const executionId = `exec_${nanoid(12)}`;
  
  const event = createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'Original summary'
  });
  
  stateGraph.appendLedgerEvent(event);
  
  const events1 = stateGraph.getExecutionLedgerEvents(executionId);
  const originalEventId = events1[0].event_id;
  const originalSummary = events1[0].summary;
  
  // Try to append another event (should create new event, not modify existing)
  const event2 = createEvent(executionId, 'plan_created', 'plan', 1, {
    summary: 'New event'
  });
  
  stateGraph.appendLedgerEvent(event2);
  
  // Verify original event unchanged
  const events2 = stateGraph.getExecutionLedgerEvents(executionId);
  
  if (events2.length !== 2) {
    throw new Error('Should have 2 events');
  }
  
  const originalEvent = events2.find(e => e.event_id === originalEventId);
  
  if (!originalEvent) {
    throw new Error('Original event not found');
  }
  
  if (originalEvent.summary !== originalSummary) {
    throw new Error('Original event was modified');
  }
  
  console.log('✅ E1: Events remain append-only');
}

async function testE2_SummaryCanBeDeletedAndRebuilt() {
  const executionId = `exec_${nanoid(12)}`;
  
  // Create events
  stateGraph.appendLedgerEvent(createEvent(executionId, 'intent_received', 'intent', 0, {
    summary: 'Intent'
  }));
  
  stateGraph.appendLedgerEvent(createEvent(executionId, 'plan_created', 'plan', 1, {
    objective: 'test_objective',
    summary: 'Plan'
  }));
  
  // Get original summary
  const original = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (!original) {
    throw new Error('Original summary not found');
  }
  
  // Delete summary (simulate corruption)
  stateGraph.db.prepare('DELETE FROM execution_ledger_summary WHERE execution_id = ?').run(executionId);
  
  const deleted = stateGraph.getExecutionLedgerSummary(executionId);
  
  if (deleted) {
    throw new Error('Summary should be deleted');
  }
  
  // Rebuild from events
  const rebuilt = stateGraph.rebuildExecutionLedgerSummary(executionId);
  
  if (!rebuilt) {
    throw new Error('Rebuild failed');
  }
  
  if (rebuilt.objective !== original.objective) {
    throw new Error('Objective not preserved');
  }
  
  if (rebuilt.event_count !== original.event_count) {
    throw new Error('Event count not preserved');
  }
  
  console.log('✅ E2: Summary can be deleted and rebuilt without data loss');
}

// ============================================================
// Test Runner
// ============================================================

// Helper: Clear all ledger data
function clearLedgerData() {
  stateGraph.db.prepare('DELETE FROM execution_ledger_events').run();
  stateGraph.db.prepare('DELETE FROM execution_ledger_summary').run();
}

async function runTests() {
  console.log('\n=== Phase 8.3 — Execution Ledger Tests ===\n');
  
  await setup();
  
  try {
    // Category A: Write-path tests
    console.log('Category A: Write-path tests');
    await testA1_AppendFirstEventCreatesSummary();
    await testA2_AppendSubsequentEventUpdatesSummary();
    await testA3_SequenceUniquenessEnforced();
    await testA4_InvalidEventRejected();
    await testA5_PayloadEvidenceStoredIntact();
    
    // Clear data before next category
    clearLedgerData();
    
    // Category B: Projection tests
    console.log('\nCategory B: Projection tests');
    await testB1_ApprovalRequestedSetsApprovalPending();
    await testB2_ExecutionFailedSetsWorkflowStatus();
    await testB3_VerificationFailedSetsObjectiveAchievedFalse();
    await testB4_WorkflowOutcomeFinalizedComputesDuration();
    await testB5_SummaryReflectsLastEvent();
    
    // Clear data before next category
    clearLedgerData();
    
    // Category C: Query tests
    console.log('\nCategory C: Query tests');
    await testC1_QueryByObjective();
    await testC2_QueryByRiskTier();
    await testC3_QueryFailedWorkflows();
    await testC4_QueryByTargetId();
    await testC5_QueryTimeRange();
    
    // Clear data before next category
    clearLedgerData();
    
    // Category D: Rebuild tests
    console.log('\nCategory D: Rebuild tests');
    await testD1_RebuildSingleSummary();
    await testD2_RebuildAllSummaries();
    await testD3_RebuiltSummaryMatchesOriginalProjection();
    
    // Clear data before next category
    clearLedgerData();
    
    // Category E: Integrity tests
    console.log('\nCategory E: Integrity tests');
    await testE1_EventsRemainAppendOnly();
    await testE2_SummaryCanBeDeletedAndRebuilt();
    
    console.log('\n=== ✅ All 20 tests passed ===\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    teardown();
  }
}

// Run tests
runTests();
