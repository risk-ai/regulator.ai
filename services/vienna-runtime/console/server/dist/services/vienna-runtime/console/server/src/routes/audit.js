/**
 * Audit Routes
 *
 * GET /api/v1/audit
 * GET /api/v1/audit/:id
 */
import { Router } from 'express';
export function createAuditRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/audit
     * Query audit records with filters
     */
    router.get('/', async (req, res) => {
        try {
            const params = {
                objective_id: req.query.objective_id,
                envelope_id: req.query.envelope_id,
                thread_id: req.query.thread_id,
                action: req.query.action,
                operator: req.query.operator,
                result: req.query.result,
                start: req.query.start,
                end: req.query.end,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            };
            const result = await vienna.queryAudit(params);
            const responseData = {
                records: result.records,
                total: result.total,
                has_more: result.has_more,
            };
            const response = {
                success: true,
                data: responseData,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'AUDIT_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    /**
     * GET /api/v1/audit/:id
     * Get specific audit record by ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const record = await vienna.getAuditRecord(req.params.id);
            if (!record) {
                const err = {
                    success: false,
                    error: 'Audit record not found',
                    code: 'NOT_FOUND',
                    timestamp: new Date().toISOString(),
                };
                res.status(404).json(err);
                return;
            }
            const response = {
                success: true,
                data: record,
                timestamp: new Date().toISOString(),
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'AUDIT_RECORD_ERROR',
                timestamp: new Date().toISOString(),
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=audit.js.map