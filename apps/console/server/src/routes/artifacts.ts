/**
 * Artifact API Routes
 * Phase 13a - Backend APIs
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Auth middleware applied at app level

/**
 * List artifacts
 * GET /api/v1/artifacts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      investigation_id,
      artifact_type,
      intent_id,
      execution_id,
      objective_id,
      limit = 50,
      offset = 0,
    } = req.query;

    const stateGraph = req.app.locals.stateGraph;
    if (!stateGraph) {
      return res.status(503).json({ error: 'State Graph not available' });
    }

    const filters = {
      investigation_id: investigation_id as string | undefined,
      artifact_type: artifact_type as string | undefined,
      intent_id: intent_id as string | undefined,
      execution_id: execution_id as string | undefined,
      objective_id: objective_id as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    const artifacts = stateGraph.listArtifacts(filters);

    res.json({
      success: true,
      data: {
        artifacts,
        total: artifacts.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error listing artifacts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ARTIFACT_LIST_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get artifact by ID
 * GET /api/v1/artifacts/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stateGraph = req.app.locals.stateGraph;
    if (!stateGraph) {
      return res.status(503).json({ error: 'State Graph not available' });
    }

    const artifact = stateGraph.getArtifact(id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    res.json({
      success: true,
      data: artifact,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error getting artifact:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ARTIFACT_GET_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get artifact content
 * GET /api/v1/artifacts/:id/content
 */
router.get('/:id/content', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workspaceManager = req.app.locals.workspaceManager;
    if (!workspaceManager) {
      return res.status(503).json({ error: 'Workspace Manager not available' });
    }

    const content = workspaceManager.getArtifactContent(id);
    const artifact = workspaceManager.stateGraph.getArtifact(id);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Set appropriate content type
    res.setHeader('Content-Type', artifact.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${artifact.name}"`);
    
    res.send(content);
  } catch (error: any) {
    console.error('Error getting artifact content:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create artifact
 * POST /api/v1/artifacts
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      artifact_type,
      name,
      content,
      investigation_id,
      intent_id,
      execution_id,
      objective_id,
      incident_id,
    } = req.body;

    if (!artifact_type || !content) {
      return res.status(400).json({ error: 'artifact_type and content required' });
    }

    const workspaceManager = req.app.locals.workspaceManager;
    if (!workspaceManager) {
      return res.status(503).json({ error: 'Workspace Manager not available' });
    }

    const artifact = workspaceManager.storeArtifact({
      artifact_type,
      name,
      content,
      investigation_id,
      intent_id,
      execution_id,
      objective_id,
      incident_id,
      created_by: (req as any).user?.username || 'system',
    });

    res.status(201).json(artifact);
  } catch (error: any) {
    console.error('Error creating artifact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
