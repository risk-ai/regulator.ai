/**
 * Agent Templates API
 * Phase 31, Feature 5
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres.js';

export function createAgentTemplatesRouter(): Router {
  const router = Router();

  /**
   * List all agent templates
   * GET /api/v1/agent-templates
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { framework, tags, limit = 50, offset = 0 } = req.query;

      let sql = 'SELECT * FROM agent_templates WHERE enabled = true';
      const params: any[] = [];
      let paramIndex = 1;

      if (framework) {
        sql += ` AND framework = $${paramIndex}`;
        params.push(framework);
        paramIndex++;
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        sql += ` AND tags && $${paramIndex}::text[]`;
        params.push(tagArray);
        paramIndex++;
      }

      sql += ` ORDER BY use_count DESC, name ASC`;
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const templates = await query<any>(sql, params);

      const countSql = 'SELECT COUNT(*) as total FROM agent_templates WHERE enabled = true';
      const countResult = await queryOne<{ total: string }>(countSql);
      const total = parseInt(countResult.total, 10);

      res.json({
        success: true,
        data: templates,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      console.error('[AgentTemplates] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list agent templates',
        code: 'AGENT_TEMPLATES_LIST_ERROR',
      });
    }
  });

  /**
   * Get template by ID
   * GET /api/v1/agent-templates/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await queryOne<any>(
        'SELECT * FROM agent_templates WHERE id = $1 AND enabled = true',
        [id]
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Agent template not found',
          code: 'TEMPLATE_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('[AgentTemplates] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent template',
        code: 'TEMPLATE_GET_ERROR',
      });
    }
  });

  /**
   * Get templates by framework
   * GET /api/v1/agent-templates/framework/:framework
   */
  router.get('/framework/:framework', async (req: Request, res: Response) => {
    try {
      const { framework } = req.params;

      const templates = await query<any>(
        `SELECT * FROM agent_templates
         WHERE framework = $1 AND enabled = true
         ORDER BY use_count DESC, name ASC`,
        [framework]
      );

      res.json({
        success: true,
        data: templates,
        framework,
      });
    } catch (error) {
      console.error('[AgentTemplates] Framework error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates by framework',
        code: 'TEMPLATES_FRAMEWORK_ERROR',
      });
    }
  });

  /**
   * Get popular templates
   * GET /api/v1/agent-templates/stats/popular
   */
  router.get('/stats/popular', async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;

      const templates = await query<any>(
        `SELECT id, name, description, framework, icon, use_count, tags
         FROM agent_templates
         WHERE enabled = true
         ORDER BY use_count DESC
         LIMIT $1`,
        [limit]
      );

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('[AgentTemplates] Popular error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular templates',
        code: 'TEMPLATES_POPULAR_ERROR',
      });
    }
  });

  /**
   * Record template usage
   * POST /api/v1/agent-templates/:id/use
   */
  router.post('/:id/use', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await query('SELECT increment_agent_template_use_count($1)', [id]);

      res.json({
        success: true,
        message: 'Template usage recorded',
      });
    } catch (error) {
      console.error('[AgentTemplates] Use error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record template usage',
        code: 'TEMPLATE_USE_ERROR',
      });
    }
  });

  return router;
}
