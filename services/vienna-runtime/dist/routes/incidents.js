"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incidents_1 = require("../adapters/db/repositories/incidents");
const router = (0, express_1.Router)();
// Transform DB incident to API incident
function toApiIncident(dbIncident) {
    if (!dbIncident)
        return null;
    return {
        id: dbIncident.id,
        title: dbIncident.title,
        severity: dbIncident.severity,
        status: dbIncident.status === 'closed' ? 'resolved' : dbIncident.status,
        service_id: 'unknown', // TODO: Add service_id to incidents table
        detected_by: 'system', // TODO: Add detected_by to incidents table
        detected_at: dbIncident.detected_at,
        resolved_at: dbIncident.resolved_at || undefined,
        resolution_summary: dbIncident.description || undefined
    };
}
// GET /api/incidents - List incidents
router.get('/', (req, res) => {
    const repo = new incidents_1.IncidentRepository();
    const dbIncidents = repo.list();
    const incidents = dbIncidents.map(toApiIncident).filter((i) => i !== null);
    const response = {
        incidents,
        total: incidents.length,
        limit: 50,
        offset: 0
    };
    res.json(response);
});
// GET /api/incidents/:id - Get incident details
router.get('/:id', (req, res) => {
    const repo = new incidents_1.IncidentRepository();
    const dbIncident = repo.findById(req.params.id);
    if (!dbIncident) {
        return res.status(404).json({
            error: 'incident_not_found',
            message: `Incident ${req.params.id} not found`
        });
    }
    const incident = toApiIncident(dbIncident);
    if (!incident) {
        return res.status(500).json({
            error: 'internal_error',
            message: 'Failed to transform incident'
        });
    }
    res.json(incident);
});
// POST /api/incidents - Create incident
router.post('/', (req, res) => {
    const repo = new incidents_1.IncidentRepository();
    const dbIncident = repo.create({
        id: `inc_${Date.now()}`,
        title: req.body.title,
        description: req.body.description,
        severity: req.body.severity || 'medium',
        status: req.body.status || 'open',
        detected_at: new Date().toISOString()
    });
    const incident = toApiIncident(dbIncident);
    if (!incident) {
        return res.status(500).json({
            error: 'internal_error',
            message: 'Failed to transform incident'
        });
    }
    res.status(201).json(incident);
});
exports.default = router;
//# sourceMappingURL=incidents.js.map