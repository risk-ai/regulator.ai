/**
 * Investigation API Routes
 * Phase 13a - Backend APIs
 */
import { Router } from 'express';
const router = Router();
// Auth middleware will be applied at app level via app.use()
// Individual routes use requireAuth parameter passed in
/**
 * List investigations
 * GET /api/v1/investigations
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const stateGraph = req.app.locals.stateGraph;
        if (!stateGraph) {
            return res.status(503).json({ error: 'State Graph not available' });
        }
        const filters = {
            status: status,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        };
        const investigations = stateGraph.listInvestigations(filters);
        // Enrich with related entity counts
        const enriched = investigations.map((inv) => {
            const objectives = stateGraph.getInvestigationObjectives?.(inv.investigation_id) || [];
            const intents = stateGraph.getInvestigationIntents?.(inv.investigation_id) || [];
            const artifacts = stateGraph.getInvestigationArtifacts?.(inv.investigation_id) || [];
            return {
                ...inv,
                objective_count: objectives.length,
                intent_count: intents.length,
                artifact_count: artifacts.length,
            };
        });
        res.json({
            success: true,
            data: {
                investigations: enriched,
                total: enriched.length,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error listing investigations:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'INVESTIGATION_LIST_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * Get investigation by ID
 * GET /api/v1/investigations/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stateGraph = req.app.locals.stateGraph;
        if (!stateGraph) {
            return res.status(503).json({ error: 'State Graph not available' });
        }
        const investigation = stateGraph.getInvestigation(id);
        if (!investigation) {
            return res.status(404).json({ error: 'Investigation not found' });
        }
        // Enrich with related entities
        const objectives = stateGraph.getInvestigationObjectives?.(id) || [];
        const intents = stateGraph.getInvestigationIntents?.(id) || [];
        const artifacts = stateGraph.getInvestigationArtifacts?.(id) || [];
        res.json({
            success: true,
            data: {
                ...investigation,
                objectives,
                intents,
                artifacts,
                objective_count: objectives.length,
                intent_count: intents.length,
                artifact_count: artifacts.length,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error getting investigation:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'INVESTIGATION_GET_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * Create investigation
 * POST /api/v1/investigations
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, objective_id, incident_id } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Investigation name required' });
        }
        const stateGraph = req.app.locals.stateGraph;
        const workspaceManager = req.app.locals.workspaceManager;
        if (!stateGraph || !workspaceManager) {
            return res.status(503).json({ error: 'Services not available' });
        }
        const investigation = workspaceManager.createInvestigation({
            name,
            description: description || '',
            objective_id,
            incident_id,
            created_by: req.user?.username || 'system',
        });
        res.status(201).json(investigation);
    }
    catch (error) {
        console.error('Error creating investigation:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Update investigation
 * PATCH /api/v1/investigations/:id
 */
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        const stateGraph = req.app.locals.stateGraph;
        const workspaceManager = req.app.locals.workspaceManager;
        if (!stateGraph || !workspaceManager) {
            return res.status(503).json({ error: 'Services not available' });
        }
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (description !== undefined)
            updates.description = description;
        if (status !== undefined) {
            workspaceManager.updateInvestigationStatus(id, status);
        }
        else if (Object.keys(updates).length > 0) {
            workspaceManager.updateInvestigation(id, updates);
        }
        const updated = stateGraph.getInvestigation(id);
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating investigation:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Delete investigation
 * DELETE /api/v1/investigations/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stateGraph = req.app.locals.stateGraph;
        if (!stateGraph) {
            return res.status(503).json({ error: 'State Graph not available' });
        }
        // Archive instead of delete
        const workspaceManager = req.app.locals.workspaceManager;
        if (workspaceManager) {
            workspaceManager.updateInvestigationStatus(id, 'archived');
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting investigation:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Get related entities for investigation
 * GET /api/v1/investigations/:id/related
 */
router.get('/:id/related', async (req, res) => {
    try {
        const { id } = req.params;
        const stateGraph = req.app.locals.stateGraph;
        if (!stateGraph) {
            return res.status(503).json({ error: 'State Graph not available' });
        }
        const investigation = stateGraph.getInvestigation(id);
        if (!investigation) {
            return res.status(404).json({ error: 'Investigation not found' });
        }
        const objectives = stateGraph.getInvestigationObjectives?.(id) || [];
        const intents = stateGraph.getInvestigationIntents?.(id) || [];
        const artifacts = stateGraph.getInvestigationArtifacts?.(id) || [];
        res.json({
            investigation_id: id,
            objectives,
            intents,
            artifacts,
            traces: [], // Populated from intents
        });
    }
    catch (error) {
        console.error('Error getting related entities:', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=investigations.js.map