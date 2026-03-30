/**
 * Executions Routes
 *
 * Phase 10: Operator visibility into execution ledger
 * Read-only endpoints backed by State Graph execution_ledger_summary
 */
import { Router } from 'express';
export function createExecutionsRouter(vienna) {
    const router = Router();
    /**
     * GET /api/v1/executions
     * List recent executions (ledger summary)
     */
    router.get('/', async (req, res) => {
        try {
            const { objective, risk_tier, status, target_type, target_id, since, limit = '50', } = req.query;
            const limitNum = Math.min(parseInt(limit, 10), 200); // Max 200
            // Get State Graph
            const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
            const stateGraph = getStateGraph();
            // Build query
            let query = 'SELECT * FROM execution_ledger_summary WHERE 1=1';
            const params = [];
            if (objective) {
                query += ' AND objective LIKE ?';
                params.push(`%${objective}%`);
            }
            if (risk_tier) {
                query += ' AND risk_tier = ?';
                params.push(risk_tier);
            }
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            if (target_type) {
                query += ' AND target_type = ?';
                params.push(target_type);
            }
            if (target_id) {
                query += ' AND target_id = ?';
                params.push(target_id);
            }
            if (since) {
                query += ' AND started_at > ?';
                params.push(since);
            }
            // Order by most recent first
            query += ' ORDER BY started_at DESC LIMIT ?';
            params.push(limitNum);
            const executions = await stateGraph.query(query, params);
            // Get total count (for pagination)
            let countQuery = 'SELECT COUNT(*) as total FROM execution_ledger_summary WHERE 1=1';
            const countParams = [];
            if (objective) {
                countQuery += ' AND objective LIKE ?';
                countParams.push(`%${objective}%`);
            }
            if (risk_tier) {
                countQuery += ' AND risk_tier = ?';
                countParams.push(risk_tier);
            }
            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }
            if (target_type) {
                countQuery += ' AND target_type = ?';
                countParams.push(target_type);
            }
            if (target_id) {
                countQuery += ' AND target_id = ?';
                countParams.push(target_id);
            }
            if (since) {
                countQuery += ' AND started_at > ?';
                countParams.push(since);
            }
            const countResult = await stateGraph.query(countQuery, countParams);
            const total = countResult[0]?.total || 0;
            res.json({
                success: true,
                data: {
                    executions: executions.map((exec) => ({
                        ...exec,
                        objective_achieved: Boolean(exec.objective_achieved),
                    })),
                    total,
                    hasMore: executions.length < total,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ExecutionsRoute] Error fetching executions:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'EXECUTIONS_QUERY_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/executions/:id
     * Get full execution detail (plan, verification, outcome, timeline)
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Get State Graph
            const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
            const stateGraph = getStateGraph();
            // Get execution summary
            const summaries = await stateGraph.query('SELECT * FROM execution_ledger_summary WHERE execution_id = ?', [id]);
            if (summaries.length === 0) {
                res.status(404).json({
                    success: false,
                    error: `Execution not found: ${id}`,
                    code: 'EXECUTION_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                });
                return;
            }
            const summary = summaries[0];
            // Get plan details
            let plan = null;
            if (summary.plan_id) {
                const plans = await stateGraph.query('SELECT * FROM plans WHERE plan_id = ?', [summary.plan_id]);
                if (plans.length > 0) {
                    plan = {
                        ...plans[0],
                        steps: plans[0].steps ? JSON.parse(plans[0].steps) : [],
                        preconditions: plans[0].preconditions ? JSON.parse(plans[0].preconditions) : [],
                        postconditions: plans[0].postconditions ? JSON.parse(plans[0].postconditions) : [],
                        verification_spec: plans[0].verification_spec ? JSON.parse(plans[0].verification_spec) : null,
                    };
                }
            }
            // Get verification details
            let verification = null;
            if (summary.verification_id) {
                const verifications = await stateGraph.query('SELECT * FROM verifications WHERE verification_id = ?', [summary.verification_id]);
                if (verifications.length > 0) {
                    verification = {
                        ...verifications[0],
                        objective_achieved: Boolean(verifications[0].objective_achieved),
                        evidence_json: verifications[0].evidence_json ? JSON.parse(verifications[0].evidence_json) : null,
                    };
                }
            }
            // Get outcome details
            let outcome = null;
            if (summary.outcome_id) {
                const outcomes = await stateGraph.query('SELECT * FROM workflow_outcomes WHERE outcome_id = ?', [summary.outcome_id]);
                if (outcomes.length > 0) {
                    outcome = {
                        ...outcomes[0],
                        objective_achieved: Boolean(outcomes[0].objective_achieved),
                        next_actions: outcomes[0].next_actions ? JSON.parse(outcomes[0].next_actions) : [],
                    };
                }
            }
            // Get timeline (ledger events)
            const timeline = await stateGraph.query('SELECT event_type, stage, event_timestamp, summary, status FROM execution_ledger_events WHERE execution_id = ? ORDER BY sequence_num ASC', [id]);
            res.json({
                success: true,
                data: {
                    execution_id: id,
                    summary: {
                        ...summary,
                        objective_achieved: Boolean(summary.objective_achieved),
                    },
                    plan,
                    verification,
                    outcome,
                    timeline: timeline.map((event) => ({
                        event_type: event.event_type,
                        stage: event.stage,
                        event_timestamp: event.event_timestamp,
                        summary: event.summary,
                        status: event.status,
                    })),
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ExecutionsRoute] Error fetching execution detail:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'EXECUTION_DETAIL_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    /**
     * GET /api/v1/executions/:id/events
     * Get raw ledger events for execution
     */
    router.get('/:id/events', async (req, res) => {
        try {
            const { id } = req.params;
            const { stage } = req.query;
            // Get State Graph
            const { getStateGraph } = await import('../../../../../services/vienna-lib/state/state-graph.js');
            const stateGraph = getStateGraph();
            // Build query
            let query = 'SELECT * FROM execution_ledger_events WHERE execution_id = ?';
            const params = [id];
            if (stage) {
                query += ' AND stage = ?';
                params.push(stage);
            }
            query += ' ORDER BY sequence_num ASC';
            const events = await stateGraph.query(query, params);
            res.json({
                success: true,
                data: {
                    execution_id: id,
                    events: events.map((event) => ({
                        ...event,
                        payload_json: event.payload_json ? JSON.parse(event.payload_json) : null,
                        evidence_json: event.evidence_json ? JSON.parse(event.evidence_json) : null,
                    })),
                    total: events.length,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[ExecutionsRoute] Error fetching ledger events:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'LEDGER_QUERY_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    return router;
}
//# sourceMappingURL=executions.js.map