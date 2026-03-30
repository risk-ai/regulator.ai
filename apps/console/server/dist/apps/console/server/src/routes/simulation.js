/**
 * Simulation Routes — Vienna OS Chaos/Red Team Simulation
 *
 * Controls chaos engineering and red team simulation scenarios
 * to test governance policy effectiveness.
 */
import { Router } from 'express';
import { getStateGraph } from '@vienna/lib';
const router = Router();
// Initialize chaos engine
let chaosEngine = null;
async function getChaosEngine() {
    if (!chaosEngine) {
        // Import via @vienna/lib package (proper module resolution)
        const { ChaosEngine } = require('@vienna/lib/simulation/chaos-engine');
        const stateGraph = await getStateGraph();
        chaosEngine = new ChaosEngine(stateGraph, {
            dry_run: process.env.CHAOS_DRY_RUN === 'true' // Enable dry run for safety
        });
    }
    return chaosEngine;
}
/**
 * POST /api/v1/simulations/run — Run a chaos scenario
 */
router.post('/run', async (req, res) => {
    try {
        const { scenario, config = {} } = req.body;
        if (!scenario) {
            return res.status(400).json({
                success: false,
                error: 'scenario is required',
                available_scenarios: [
                    'flood_intents',
                    'scope_creep',
                    'budget_exhaust',
                    'concurrent_approvals',
                    'expired_warrant_exploit',
                    'parameter_tampering',
                    'comprehensive_test'
                ],
                timestamp: new Date().toISOString()
            });
        }
        const engine = await getChaosEngine();
        let result = null;
        console.log(`[Simulation API] Running ${scenario} scenario...`);
        switch (scenario) {
            case 'flood_intents':
                result = await engine.floodIntents(config.agent_id || `chaos_agent_${Date.now()}`, config.count || 20, config.interval || 100);
                break;
            case 'scope_creep':
                result = await engine.scopeCreep(config.agent_id || `chaos_agent_${Date.now()}`, config.escalating_actions);
                break;
            case 'budget_exhaust':
                result = await engine.budgetExhaust(config.agent_id || `chaos_agent_${Date.now()}`, config.amount || 1000);
                break;
            case 'concurrent_approvals':
                result = await engine.concurrentApprovals(config.count || 10);
                break;
            case 'expired_warrant_exploit':
                result = await engine.expiredWarrantExploit(config.warrant_id);
                break;
            case 'parameter_tampering':
                result = await engine.parameterTampering(config.intent_id, config.modified_params);
                break;
            case 'comprehensive_test':
                result = await engine.runComprehensiveTest(config);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: `Unknown scenario: ${scenario}`,
                    timestamp: new Date().toISOString()
                });
        }
        res.json({
            success: true,
            simulation: result,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Simulation API] Run failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/v1/simulations — List simulation results
 */
router.get('/', async (req, res) => {
    try {
        const engine = await getChaosEngine();
        const filters = {
            status: req.query.status,
            scenario: req.query.scenario,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };
        const simulations = engine.listSimulations(filters);
        const stats = engine.getStats();
        res.json({
            success: true,
            simulations: simulations.map((s) => s.toJSON()),
            count: simulations.length,
            stats,
            filters,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Simulation API] List failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/v1/simulations/:id — Get specific simulation result
 */
router.get('/:id', async (req, res) => {
    try {
        const engine = await getChaosEngine();
        const simulationId = req.params.id;
        const simulation = engine.getSimulation(simulationId);
        if (!simulation) {
            return res.status(404).json({
                success: false,
                error: 'Simulation not found',
                timestamp: new Date().toISOString()
            });
        }
        res.json({
            success: true,
            simulation: simulation.toJSON(),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Simulation API] Get failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * DELETE /api/v1/simulations/:id — Cancel running simulation
 */
router.delete('/:id', async (req, res) => {
    try {
        const engine = await getChaosEngine();
        const simulationId = req.params.id;
        const cancelled = engine.cancelSimulation(simulationId);
        if (!cancelled) {
            return res.status(404).json({
                success: false,
                error: 'Simulation not found or not running',
                timestamp: new Date().toISOString()
            });
        }
        res.json({
            success: true,
            message: 'Simulation cancelled',
            simulation_id: simulationId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Simulation API] Cancel failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * GET /api/v1/simulations/scenarios/list — List available scenarios
 */
router.get('/scenarios/list', async (req, res) => {
    try {
        const scenarios = [
            {
                name: 'flood_intents',
                description: 'Submit many intents rapidly to test rate limiting',
                parameters: {
                    agent_id: 'string (optional)',
                    count: 'number (default: 20)',
                    interval: 'number (milliseconds, default: 100)'
                }
            },
            {
                name: 'scope_creep',
                description: 'Gradually escalate action scope to test authorization',
                parameters: {
                    agent_id: 'string (optional)',
                    escalating_actions: 'array (optional, uses defaults)'
                }
            },
            {
                name: 'budget_exhaust',
                description: 'Try to exceed budget limits',
                parameters: {
                    agent_id: 'string (optional)',
                    amount: 'number (default: 1000)'
                }
            },
            {
                name: 'concurrent_approvals',
                description: 'Submit many T1/T2 requests simultaneously',
                parameters: {
                    count: 'number (default: 10)'
                }
            },
            {
                name: 'expired_warrant_exploit',
                description: 'Try to use expired/invalidated warrant',
                parameters: {
                    warrant_id: 'string (optional, generates expired warrant)'
                }
            },
            {
                name: 'parameter_tampering',
                description: 'Modify parameters post-approval',
                parameters: {
                    intent_id: 'string (optional)',
                    modified_params: 'object (optional)'
                }
            },
            {
                name: 'comprehensive_test',
                description: 'Run all scenarios in sequence',
                parameters: {
                    include_flood: 'boolean (default: true)',
                    include_scope_creep: 'boolean (default: true)',
                    include_budget_exhaust: 'boolean (default: true)',
                    include_concurrent_approvals: 'boolean (default: true)',
                    include_expired_warrant: 'boolean (default: true)',
                    include_parameter_tampering: 'boolean (default: true)'
                }
            }
        ];
        res.json({
            success: true,
            scenarios,
            count: scenarios.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Simulation API] Scenarios list failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
// Factory function for compatibility with app.ts
export function createSimulationRouter() {
    return router;
}
//# sourceMappingURL=simulation.js.map