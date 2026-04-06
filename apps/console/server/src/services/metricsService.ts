/**
 * Prometheus Metrics Service — Vienna OS
 * 
 * Builds on existing prom-client metrics middleware to add Vienna-specific
 * governance pipeline metrics. The base HTTP metrics are in middleware/metrics.ts.
 * This service adds intent, approval, policy, warrant, and agent counters.
 */

import { Router, Request, Response } from 'express';
import promClient from 'prom-client';

// ─── Governance Pipeline Metrics ───

const intentsSubmitted = new promClient.Counter({
  name: 'vienna_intents_submitted_total',
  help: 'Total intents submitted to the governance pipeline',
  labelNames: ['risk_tier'],
});

const intentsApproved = new promClient.Counter({
  name: 'vienna_intents_approved_total',
  help: 'Total intents approved',
  labelNames: ['risk_tier'],
});

const intentsDenied = new promClient.Counter({
  name: 'vienna_intents_denied_total',
  help: 'Total intents denied',
  labelNames: ['risk_tier'],
});

const intentProcessingDuration = new promClient.Histogram({
  name: 'vienna_intent_processing_duration_seconds',
  help: 'Intent processing duration from submission to resolution',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const approvalsPending = new promClient.Gauge({
  name: 'vienna_approvals_pending',
  help: 'Number of approvals currently pending review',
});

const approvalLatency = new promClient.Histogram({
  name: 'vienna_approval_latency_seconds',
  help: 'Time from approval request to resolution',
  buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600],
});

const agentsActive = new promClient.Gauge({
  name: 'vienna_agents_active',
  help: 'Number of active agents in the fleet',
});

const policyEvaluationsTotal = new promClient.Counter({
  name: 'vienna_policy_evaluations_total',
  help: 'Total policy evaluations',
  labelNames: ['result'],
});

const policyEvaluationDuration = new promClient.Histogram({
  name: 'vienna_policy_evaluation_duration_seconds',
  help: 'Policy evaluation duration',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
});

const warrantsIssued = new promClient.Counter({
  name: 'vienna_warrants_issued_total',
  help: 'Total execution warrants issued',
  labelNames: ['risk_tier'],
});

const warrantsRevoked = new promClient.Counter({
  name: 'vienna_warrants_revoked_total',
  help: 'Total warrants revoked',
});

const anomaliesDetected = new promClient.Counter({
  name: 'vienna_anomalies_detected_total',
  help: 'Total anomalies detected by the anomaly detection service',
  labelNames: ['severity'],
});

// ─── Export metrics for use in route handlers ───

// Named export used by intent.ts, approvals.ts, etc.
export const metrics = {
  intentsSubmitted,
  intentsApproved,
  intentsDenied,
  intentProcessingDuration,
  approvalsPending,
  approvalLatency,
  agentsActive,
  policyEvaluationsTotal,
  policyEvaluationDuration,
  warrantsIssued,
  warrantsRevoked,
  anomaliesDetected,
};

// Alias for explicit naming
export const viennaMetrics = {
  intentsSubmitted,
  intentsApproved,
  intentsDenied,
  intentProcessingDuration,
  approvalsPending,
  approvalLatency,
  agentsActive,
  policyEvaluationsTotal,
  policyEvaluationDuration,
  warrantsIssued,
  warrantsRevoked,
  anomaliesDetected,
};

/**
 * Vienna-specific metrics API router.
 * Returns governance metrics as JSON (for the console dashboard).
 */
export function createViennaMetricsRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/metrics/vienna
   * Returns Vienna governance metrics as JSON
   */
  router.get('/vienna', async (_req: Request, res: Response) => {
    try {
      const allMetrics = await promClient.register.getMetricsAsJSON();
      const filtered = allMetrics.filter(m => m.name.startsWith('vienna_'));
      
      res.json({
        success: true,
        data: {
          metrics: filtered,
          count: filtered.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to collect metrics',
      });
    }
  });

  /**
   * GET /api/v1/metrics/summary
   * Returns a human-readable summary of key governance metrics
   */
  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          intents: {
            submitted: await intentsSubmitted.get().then(m => m.values.reduce((a, v) => a + v.value, 0)),
            approved: await intentsApproved.get().then(m => m.values.reduce((a, v) => a + v.value, 0)),
            denied: await intentsDenied.get().then(m => m.values.reduce((a, v) => a + v.value, 0)),
          },
          approvals: {
            pending: (await approvalsPending.get()).values[0]?.value || 0,
          },
          agents: {
            active: (await agentsActive.get()).values[0]?.value || 0,
          },
          policies: {
            evaluations: await policyEvaluationsTotal.get().then(m => m.values.reduce((a, v) => a + v.value, 0)),
          },
          warrants: {
            issued: await warrantsIssued.get().then(m => m.values.reduce((a, v) => a + v.value, 0)),
            revoked: (await warrantsRevoked.get()).values[0]?.value || 0,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to collect metrics',
      });
    }
  });

  return router;
}
