/**
 * Prometheus Metrics Exporter for Vienna OS
 * 
 * Exports governance pipeline metrics in Prometheus format
 * Compatible with Grafana for visualization
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';

// === Counters ===

export const intentSubmissions = new Counter({
  name: 'vienna_intent_submissions_total',
  help: 'Total number of intents submitted',
  labelNames: ['tenant_id', 'action_type', 'risk_tier']
});

export const executions = new Counter({
  name: 'vienna_executions_total',
  help: 'Total number of executions',
  labelNames: ['tenant_id', 'risk_tier', 'status']
});

export const policyEvaluations = new Counter({
  name: 'vienna_policy_evaluations_total',
  help: 'Total policy evaluations',
  labelNames: ['policy_id', 'decision']
});

export const approvals = new Counter({
  name: 'vienna_approvals_total',
  help: 'Total approval requests',
  labelNames: ['risk_tier', 'status']
});

export const attestations = new Counter({
  name: 'vienna_attestations_total',
  help: 'Total attestations created',
  labelNames: ['tenant_id']
});

export const errors = new Counter({
  name: 'vienna_errors_total',
  help: 'Total errors',
  labelNames: ['error_type', 'component']
});

// === Histograms (Latency) ===

export const executionLatency = new Histogram({
  name: 'vienna_execution_latency_seconds',
  help: 'Execution latency in seconds',
  labelNames: ['risk_tier', 'action_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

export const policyEvalLatency = new Histogram({
  name: 'vienna_policy_eval_latency_seconds',
  help: 'Policy evaluation latency',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});

export const approvalWaitTime = new Histogram({
  name: 'vienna_approval_wait_seconds',
  help: 'Time waiting for approval',
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800]
});

// === Gauges (Current State) ===

export const queueDepth = new Gauge({
  name: 'vienna_queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue_type']
});

export const activeExecutions = new Gauge({
  name: 'vienna_active_executions',
  help: 'Number of currently executing envelopes'
});

export const pendingApprovals = new Gauge({
  name: 'vienna_pending_approvals',
  help: 'Number of pending approvals',
  labelNames: ['risk_tier']
});

export const deadLetterQueueSize = new Gauge({
  name: 'vienna_dlq_size',
  help: 'Dead letter queue size'
});

// === Helper Functions ===

export function recordIntentSubmission(tenantId, actionType, riskTier) {
  intentSubmissions.inc({ tenant_id: tenantId, action_type: actionType, risk_tier: riskTier });
}

export function recordExecution(tenantId, riskTier, status, durationMs) {
  executions.inc({ tenant_id: tenantId, risk_tier: riskTier, status });
  executionLatency.observe({ risk_tier: riskTier, action_type: 'all' }, durationMs / 1000);
}

export function recordPolicyEvaluation(policyId, decision, durationMs) {
  policyEvaluations.inc({ policy_id: policyId, decision });
  policyEvalLatency.observe(durationMs / 1000);
}

export function recordApproval(riskTier, status, waitTimeMs) {
  approvals.inc({ risk_tier: riskTier, status });
  if (status === 'approved' || status === 'denied') {
    approvalWaitTime.observe(waitTimeMs / 1000);
  }
}

export function recordAttestation(tenantId) {
  attestations.inc({ tenant_id: tenantId });
}

export function recordError(errorType, component) {
  errors.inc({ error_type: errorType, component });
}

export function updateQueueDepth(queueType, depth) {
  queueDepth.set({ queue_type: queueType }, depth);
}

export function updateActiveExecutions(count) {
  activeExecutions.set(count);
}

export function updatePendingApprovals(riskTier, count) {
  pendingApprovals.set({ risk_tier: riskTier }, count);
}

export function updateDLQSize(size) {
  deadLetterQueueSize.set(size);
}

// === Metrics Endpoint ===

export function getMetrics() {
  return register.metrics();
}

export function resetMetrics() {
  register.clear();
}

// === Express Middleware ===

export function metricsMiddleware(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(getMetrics());
}
