"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const investigations_1 = require("../adapters/db/repositories/investigations");
const artifacts_1 = require("../adapters/db/repositories/artifacts");
const router = (0, express_1.Router)();
// Transform DB investigation to API investigation
function toApiInvestigation(dbInv) {
    if (!dbInv)
        return null;
    return {
        id: dbInv.id,
        name: dbInv.name,
        description: dbInv.description || undefined,
        status: dbInv.status,
        objective_id: undefined, // TODO: Add objective_id to investigations table
        created_by: dbInv.created_by,
        created_at: dbInv.created_at,
        resolved_at: dbInv.resolved_at || undefined,
        workspace_path: `/workspace/investigations/${dbInv.id}`, // Derived field
        artifact_count: 0, // TODO: Add aggregation
        trace_count: 0 // TODO: Add aggregation
    };
}
// GET /api/investigations - List investigations
router.get('/', (req, res) => {
    const repo = new investigations_1.InvestigationRepository();
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 50;
    const dbInvestigations = repo.list({ status, limit });
    const investigations = dbInvestigations.map(toApiInvestigation).filter((i) => i !== null);
    const response = {
        investigations,
        total: investigations.length,
        limit,
        offset: 0
    };
    res.json(response);
});
// GET /api/investigations/:id - Get investigation details
router.get('/:id', (req, res) => {
    const repo = new investigations_1.InvestigationRepository();
    const artifactRepo = new artifacts_1.ArtifactRepository();
    const dbInvestigation = repo.findById(req.params.id);
    if (!dbInvestigation) {
        return res.status(404).json({
            error: 'investigation_not_found',
            message: `Investigation ${req.params.id} not found`
        });
    }
    const investigation = toApiInvestigation(dbInvestigation);
    if (!investigation) {
        return res.status(500).json({
            error: 'internal_error',
            message: 'Failed to transform investigation'
        });
    }
    // Expand with artifacts
    const artifacts = artifactRepo.listByInvestigation(investigation.id);
    const incidents = repo.getLinkedIncidents(investigation.id);
    res.json({
        ...investigation,
        artifact_count: artifacts.length,
        trace_count: 0, // TODO
        artifacts,
        incidents
    });
});
exports.default = router;
//# sourceMappingURL=investigations.js.map