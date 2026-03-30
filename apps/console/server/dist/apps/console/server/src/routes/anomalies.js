/**
 * Anomalies API Routes — Vienna OS Agent Behavior Anomaly Detection
 */
import { Router } from 'express';
import { getStateGraph } from '@vienna/lib';
const router = Router();
const stateGraph = getStateGraph();
// Initialize anomaly detector
let anomalyDetector = null;
async function getAnomalyDetector() {
    if (!anomalyDetector) {
        const { AgentAnomalyDetector } = require('@vienna/lib/detection/anomaly-detector');
        anomalyDetector = new AgentAnomalyDetector(await getStateGraph());
    }
    return anomalyDetector;
}
/**
 * GET /api/v1/anomalies
 *
 * List detected anomalies with optional filters
 */
router.get('/', async (req, res) => {
    try {
        await stateGraph.initialize();
        const detector = await getAnomalyDetector();
        const filters = {
            anomaly_type: req.query.anomaly_type,
            severity: req.query.severity,
            status: req.query.status,
            entity_type: req.query.entity_type,
            entity_id: req.query.entity_id,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        // Run detection if requested
        if (req.query.run_detection === 'true') {
            console.log('[Anomalies API] Running real-time anomaly detection...');
            await detector.detect();
        }
        // Get anomalies from state graph (this would need to be implemented)
        const anomalies = stateGraph.listAnomalies ? stateGraph.listAnomalies(filters) : [];
        res.json({
            success: true,
            anomalies,
            count: anomalies.length,
            filters,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
        await stateGraph.initialize();
        const detector = await getAnomalyDetector();
        const agentId = req.params.agentId;
        // Get agent baseline for debugging
        const baseline = detector.getAgentBaseline(agentId);
        // Filter anomalies for this agent
        const filters = {
            entity_type: 'agent',
            entity_id: agentId,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
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
    }
    catch (error) {
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
        await stateGraph.initialize();
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
    }
    catch (error) {
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
        await stateGraph.initialize();
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
    }
    catch (error) {
        console.error('[Anomalies API] Acknowledge failed:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * POST /api/v1/anomalies/detect
 *
 * Trigger immediate anomaly detection run
 */
router.post('/detect', async (req, res) => {
    try {
        const detector = await getAnomalyDetector();
        console.log('[Anomalies API] Running on-demand anomaly detection...');
        const anomalies = await detector.detect();
        const stats = detector.getStats();
        res.json({
            success: true,
            message: 'Anomaly detection completed',
            anomalies_found: anomalies.length,
            anomalies,
            detection_stats: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Anomalies API] Detection run failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
//# sourceMappingURL=anomalies.js.map