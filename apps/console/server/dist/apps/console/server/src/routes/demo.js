/**
 * Demo Data Routes
 * Seed sample data for onboarding/testing
 */
import { Router } from 'express';
export function createDemoRouter(vienna) {
    const router = Router();
    /**
     * POST /api/v1/demo/seed
     * Seed demo data for onboarding
     */
    router.post('/seed', async (req, res) => {
        try {
            const stateGraph = vienna['viennaCore']?.stateGraph;
            if (!stateGraph) {
                throw new Error('State Graph not available');
            }
            // Create sample objectives
            const demoObjectives = [
                {
                    objective_id: `demo_obj_${Date.now()}_1`,
                    target_id: 'api-gateway',
                    target_type: 'service',
                    status: 'active',
                    desired_state: JSON.stringify({ status: 'running', replicas: 3 }),
                    priority: 100,
                    evaluation_interval_seconds: 60,
                    verification_strength: 'medium',
                    is_enabled: true
                },
                {
                    objective_id: `demo_obj_${Date.now()}_2`,
                    target_id: 'database-backup',
                    target_type: 'task',
                    status: 'pending',
                    desired_state: JSON.stringify({ schedule: 'daily', retention: 30 }),
                    priority: 200,
                    evaluation_interval_seconds: 3600,
                    verification_strength: 'high',
                    is_enabled: true
                }
            ];
            for (const obj of demoObjectives) {
                stateGraph.createObjective(obj);
            }
            const response = {
                success: true,
                data: {
                    seeded: demoObjectives.length
                },
                timestamp: new Date().toISOString()
            };
            res.json(response);
        }
        catch (error) {
            const err = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'DEMO_SEED_ERROR',
                timestamp: new Date().toISOString()
            };
            res.status(500).json(err);
        }
    });
    return router;
}
//# sourceMappingURL=demo.js.map