/**
 * System Diagnostics Routes
 *
 * Deep runtime state inspection for operator troubleshooting.
 */
import { Router } from 'express';
export function createDiagnosticsRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/system/diagnostics
     * Get comprehensive system diagnostics
     */
    router.get('/', async (req, res) => {
        try {
            const diagnostics = await vienna.getDiagnostics();
            res.json({
                success: true,
                data: diagnostics,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[DiagnosticsRoute] Error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'DIAGNOSTICS_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/system/diagnostics/snapshot
     * Get unified system truth snapshot (Phase 7.3)
     *
     * Returns authoritative state from State Graph:
     * - Services (status, health, dependencies)
     * - Providers (health, credentials, rate limits)
     * - Runtime mode (current mode, transition history)
     * - Endpoints (registered endpoints, instruction history)
     * - Incidents (open incidents)
     * - Objectives (active objectives)
     */
    router.get('/snapshot', async (req, res) => {
        try {
            const snapshot = await vienna.getSystemSnapshot();
            res.json({
                success: true,
                data: snapshot,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[DiagnosticsRoute] Snapshot error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'SNAPSHOT_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=diagnostics.js.map