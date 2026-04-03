/**
 * Anomalies API Routes — Vienna OS Agent Behavior Anomaly Detection
 */

import { Router } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import { anomalyDetectionService } from '../services/anomalyDetection.js';

export function createAnomaliesRouter(viennaRuntime: ViennaRuntimeService): Router {
  const router = Router();

/**
 * GET /api/v1/anomalies
 * 
 * List recent anomaly alerts
 */
router.get('/', async (req, res) => {
  try {
    const anomalies = await anomalyDetectionService.detectAnomalies();

    // Apply filters
    let filteredAnomalies = anomalies;
    
    if (req.query.type) {
      filteredAnomalies = filteredAnomalies.filter(a => a.type === req.query.type);
    }
    
    if (req.query.severity) {
      filteredAnomalies = filteredAnomalies.filter(a => a.severity === req.query.severity);
    }
    
    if (req.query.agent_id) {
      filteredAnomalies = filteredAnomalies.filter(a => a.agent_id === req.query.agent_id);
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const paginatedAnomalies = filteredAnomalies.slice(offset, offset + limit);

    res.json({
      success: true,
      anomalies: paginatedAnomalies,
      total: filteredAnomalies.length,
      limit,
      offset,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] List failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/anomalies/agents/:agentId
 * 
 * Get anomalies for specific agent
 */
router.get('/agents/:agentId', async (req, res) => {
  try {
    const stateGraph = viennaRuntime.getStateGraph();
    const detector = anomalyDetectionService;

    const agentId = req.params.agentId;

    // Get agent baseline for debugging (if available)
    const baseline = null; // TODO: Implement getAgentBaseline if needed
    
    // Filter anomalies for this agent
    const filters = {
      entity_type: 'agent',
      entity_id: agentId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };

    const anomalies = stateGraph.listAnomalies ? stateGraph.listAnomalies(filters) : [];

    res.json({
      success: true,
      agent_id: agentId,
      anomalies,
      count: anomalies.length,
      baseline: baseline ? {
        created_at: baseline.created_at,
        last_updated: baseline.last_updated,
        metrics: {
          velocity: {
            mean: baseline.metrics.velocity.mean,
            std_dev: baseline.metrics.velocity.std_dev,
            samples: baseline.metrics.velocity.values.length
          },
          error_rate: {
            mean: baseline.metrics.error_rate.mean,
            std_dev: baseline.metrics.error_rate.std_dev,
            samples: baseline.metrics.error_rate.values.length
          },
          action_diversity: {
            mean: baseline.metrics.action_diversity.mean,
            samples: baseline.metrics.action_diversity.values.length
          }
        },
        action_patterns: Object.fromEntries(baseline.action_patterns),
        typical_hours: Array.from(baseline.getTypicalHours())
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] Agent anomalies failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/anomalies/:anomaly_id
 * 
 * Get anomaly by ID with detailed information
 */
router.get('/:anomaly_id', async (req, res) => {
  try {
    const stateGraph = viennaRuntime.getStateGraph();

    const anomaly = stateGraph.getAnomaly ? stateGraph.getAnomaly(req.params.anomaly_id) : null;
    
    if (!anomaly) {
      return res.status(404).json({ 
        success: false,
        error: 'Anomaly not found',
        timestamp: new Date().toISOString()
      });
    }

    const history = stateGraph.getAnomalyHistory ? stateGraph.getAnomalyHistory(req.params.anomaly_id) : [];

    res.json({
      success: true,
      anomaly,
      history,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] Get failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/anomalies/acknowledge/:id
 * 
 * Acknowledge an anomaly (mark as reviewed)
 */
router.post('/acknowledge/:id', async (req, res) => {
  try {
    const stateGraph = viennaRuntime.getStateGraph();

    const anomalyId = req.params.id;
    const { reviewed_by, resolution, notes } = req.body;

    if (!reviewed_by) {
      return res.status(400).json({ 
        success: false,
        error: 'reviewed_by is required',
        timestamp: new Date().toISOString()
      });
    }

    // Update anomaly status (this would need to be implemented in state graph)
    const updates = {
      status: 'acknowledged',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      resolution,
      notes
    };

    const updated = stateGraph.updateAnomalyStatus ? 
      stateGraph.updateAnomalyStatus(anomalyId, updates) : 
      { anomaly_id: anomalyId, ...updates };

    res.json({
      success: true,
      anomaly: updated,
      message: 'Anomaly acknowledged',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] Acknowledge failed:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/anomalies/stats
 * 
 * Summary stats (alerts by type, severity)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await anomalyDetectionService.getStats();

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] Stats failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/anomalies/check
 * 
 * Trigger manual anomaly check
 */
router.post('/check', async (req, res) => {
  try {
    console.log('[Anomalies API] Running manual anomaly detection...');
    const anomalies = await anomalyDetectionService.detectAnomalies();
    const stats = await anomalyDetectionService.getStats();

    res.json({
      success: true,
      message: 'Anomaly detection completed',
      anomalies_found: anomalies.length,
      anomalies,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Anomalies API] Manual check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

  return router;
}
