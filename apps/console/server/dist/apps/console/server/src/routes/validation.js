/**
 * Validation Routes
 *
 * Browser validation logging endpoints for manual testing.
 */
import { Router } from 'express';
import { getStateGraph } from '@vienna/lib';
export function createValidationRouter() {
    const router = Router();
    /**
     * POST /api/v1/validation/log
     * Log browser validation results
     */
    router.post('/log', async (req, res) => {
        try {
            const { case: testCase, result, details, ui_observation } = req.body;
            if (!testCase || !result) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: case, result',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const stateGraph = getStateGraph();
            await stateGraph.initialize();
            // Store validation result
            const validationId = `val_${Date.now()}_${testCase}`;
            const timestamp = new Date().toISOString();
            // Log to state graph (using runtime_context for now)
            const db = stateGraph.db;
            const stmt = db.prepare(`
        INSERT INTO runtime_context (key, value, metadata, created_at)
        VALUES (?, ?, ?, ?)
      `);
            stmt.run(`validation_${validationId}`, JSON.stringify({
                case: testCase,
                result,
                details,
                ui_observation,
                timestamp,
            }), JSON.stringify({ type: 'browser_validation' }), timestamp);
            res.json({
                success: true,
                validation_id: validationId,
                timestamp,
            });
        }
        catch (error) {
            console.error('Validation log error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to log validation',
                details: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/validation/results
     * Retrieve all validation results
     */
    router.get('/results', async (req, res) => {
        try {
            const stateGraph = getStateGraph();
            await stateGraph.initialize();
            const db = stateGraph.db;
            const stmt = db.prepare(`
        SELECT key, value, metadata, created_at
        FROM runtime_context
        WHERE key LIKE 'validation_%'
        ORDER BY created_at DESC
      `);
            const rows = stmt.all();
            const results = rows.map((row) => ({
                validation_id: row.key.replace('validation_', ''),
                ...JSON.parse(row.value),
                created_at: row.created_at,
            }));
            res.json({
                success: true,
                results,
                count: results.length,
            });
        }
        catch (error) {
            console.error('Validation results error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve validation results',
                details: error.message,
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=validation.js.map