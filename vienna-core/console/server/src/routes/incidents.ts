/**
 * Phase 14: Forensic Incidents API
 * 
 * Provides CRUD + linking for incident containers
 */

import { Router } from 'express';
import { getStateGraph } from '../../../../lib/state/state-graph.js';

const router = Router();

/**
 * GET /api/v1/incidents
 * List all incidents with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const sg = getStateGraph();
    await sg.initialize();

    const filters: any = {};
    
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severity) filters.severity = req.query.severity;
    if (req.query.created_by) filters.created_by = req.query.created_by;
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

    const incidents = sg.listForensicIncidents(filters);

    res.json({ incidents });
  } catch (error: any) {
    console.error('[API] List incidents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/incidents
 * Create new incident
 */
router.post('/', async (req, res) => {
  try {
    const { title, summary, severity, created_by } = req.body;

    if (!title || !severity) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, severity' 
      });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ 
        error: 'Invalid severity. Must be: low, medium, high, critical' 
      });
    }

    const sg = getStateGraph();
    await sg.initialize();

    const incident = sg.createForensicIncident({ 
      title, 
      summary, 
      severity, 
      created_by 
    });

    res.status(201).json({ incident });
  } catch (error: any) {
    console.error('[API] Create incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/incidents/:incident_id
 * Get incident by ID
 */
router.get('/:incident_id', async (req, res) => {
  try {
    const sg = getStateGraph();
    await sg.initialize();

    const incident = sg.getForensicIncident(req.params.incident_id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ incident });
  } catch (error: any) {
    console.error('[API] Get incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/v1/incidents/:incident_id
 * Update incident
 */
router.patch('/:incident_id', async (req, res) => {
  try {
    const sg = getStateGraph();
    await sg.initialize();

    const incident = sg.getForensicIncident(req.params.incident_id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const updates: any = {};
    const allowed = ['title', 'summary', 'severity', 'status', 'resolved_by'];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }

    sg.updateForensicIncident(req.params.incident_id, updates);

    const updated = sg.getForensicIncident(req.params.incident_id);
    res.json({ incident: updated });
  } catch (error: any) {
    console.error('[API] Update incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/incidents/:incident_id/link
 * Link entity to incident
 */
router.post('/:incident_id/link', async (req, res) => {
  try {
    const { entity_type, entity_id, linked_by } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: entity_type, entity_id' 
      });
    }

    const validTypes = ['investigation', 'intent', 'objective', 'artifact'];
    if (!validTypes.includes(entity_type)) {
      return res.status(400).json({ 
        error: `Invalid entity_type. Must be: ${validTypes.join(', ')}` 
      });
    }

    const sg = getStateGraph();
    await sg.initialize();

    const incident = sg.getForensicIncident(req.params.incident_id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Call appropriate link method
    switch (entity_type) {
      case 'investigation':
        sg.linkInvestigationToIncident(req.params.incident_id, entity_id, linked_by);
        break;
      case 'intent':
        sg.linkIntentToIncident(req.params.incident_id, entity_id, linked_by);
        break;
      case 'objective':
        sg.linkObjectiveToIncident(req.params.incident_id, entity_id, linked_by);
        break;
      case 'artifact':
        sg.linkArtifactToIncident(req.params.incident_id, entity_id, linked_by);
        break;
    }

    res.json({ 
      message: 'Entity linked successfully',
      incident_id: req.params.incident_id,
      entity_type,
      entity_id
    });
  } catch (error: any) {
    console.error('[API] Link entity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/incidents/:incident_id/unlink
 * Unlink entity from incident
 */
router.post('/:incident_id/unlink', async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: entity_type, entity_id' 
      });
    }

    const sg = getStateGraph();
    await sg.initialize();

    sg.unlinkFromIncident(req.params.incident_id, entity_type, entity_id);

    res.json({ 
      message: 'Entity unlinked successfully',
      incident_id: req.params.incident_id,
      entity_type,
      entity_id
    });
  } catch (error: any) {
    console.error('[API] Unlink entity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/incidents/:incident_id/graph
 * Get incident graph (all linked entities)
 */
router.get('/:incident_id/graph', async (req, res) => {
  try {
    const sg = getStateGraph();
    await sg.initialize();

    const graph = sg.getIncidentGraph(req.params.incident_id);

    if (!graph) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(graph);
  } catch (error: any) {
    console.error('[API] Get incident graph error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
