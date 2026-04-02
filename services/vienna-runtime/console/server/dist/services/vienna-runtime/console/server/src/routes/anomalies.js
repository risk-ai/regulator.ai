/**
 * Anomalies API Routes — Phase 15 Stage 7
 */
import { Router } from 'express';
import { getStateGraph } from '../../../../lib/state/state-graph.js';
const router = Router();
const stateGraph = getStateGraph();
/**
 * GET /api/v1/anomalies
 *
 * List anomalies with optional filters
 */
router.get('/', async (req, res) => {
    try {
        await stateGraph.initialize();
        const filters = {
            anomaly_type: req.query.anomaly_type,
            severity: req.query.severity,
            status: req.query.status,
            entity_type: req.query.entity_type,
            entity_id: req.query.entity_id,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        const anomalies = stateGraph.listAnomalies(filters);
        res.json({
            anomalies,
            count: anomalies.length,
            filters
        });
    }
    catch (error) {
        console.error('[Anomalies API] List failed:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/v1/anomalies/:anomaly_id
 *
 * Get anomaly by ID with history
 */
router.get('/:anomaly_id', async (req, res) => {
    try {
        await stateGraph.initialize();
        const anomaly = stateGraph.getAnomaly(req.params.anomaly_id);
        if (!anomaly) {
            return res.status(404).json({ error: 'Anomaly not found' });
        }
        const history = stateGraph.getAnomalyHistory(req.params.anomaly_id);
        res.json({
            anomaly,
            history
        });
    }
    catch (error) {
        console.error('[Anomalies API] Get failed:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * PATCH /api/v1/anomalies/:anomaly_id
 *
 * Update anomaly status (operator review)
 */
router.patch('/:anomaly_id', async (req, res) => {
    try {
        await stateGraph.initialize();
        const { status, reviewed_by, resolution } = req.body;
        if (!reviewed_by) {
            return res.status(400).json({ error: 'reviewed_by is required' });
        }
        const updated = stateGraph.updateAnomalyStatus(req.params.anomaly_id, {
            status,
            reviewed_by,
            reviewed_at: new Date().toISOString(),
            resolution
        });
        res.json({ anomaly: updated });
    }
    catch (error) {
        console.error('[Anomalies API] Update failed:', error);
        res.status(400).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=anomalies.js.map