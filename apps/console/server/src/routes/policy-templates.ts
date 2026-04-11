/**
 * Policy Templates API
 * 
 * Pre-built policy templates for common governance scenarios
 * Phase 31, Feature 1
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres.js';
import { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { getTenantId } from '../middleware/tenantContext.js';

export function createPolicyTemplatesRouter(): Router {
  const router = Router();

  /**
   * List all policy templates
   * GET /api/v1/policy-templates
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { category, tags, limit = 50, offset = 0 } = req.query;

      let sql = 'SELECT * FROM policy_templates WHERE enabled = true';
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by category
      if (category) {
        sql += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      // Filter by tags (contains any of the provided tags)
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        sql += ` AND tags && $${paramIndex}::text[]`;
        params.push(tagArray);
        paramIndex++;
      }

      // Order by popularity and name
      sql += ` ORDER BY use_count DESC, name ASC`;

      // Pagination
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const templates = await query<any>(sql, params);

      // Get total count
      let countSql = 'SELECT COUNT(*) as total FROM policy_templates WHERE enabled = true';
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (category) {
        countSql += ` AND category = $${countParamIndex}`;
        countParams.push(category);
        countParamIndex++;
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        countSql += ` AND tags && $${countParamIndex}::text[]`;
        countParams.push(tagArray);
      }

      const countResult = await queryOne<{ total: string }>(countSql, countParams);
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
      console.error('[PolicyTemplates] List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list policy templates',
        code: 'TEMPLATES_LIST_ERROR',
      });
    }
  });

  /**
   * Get template by ID
   * GET /api/v1/policy-templates/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const template = await queryOne<any>(
        'SELECT * FROM policy_templates WHERE id = $1 AND enabled = true',
        [id]
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Policy template not found',
          code: 'TEMPLATE_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error('[PolicyTemplates] Get error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get policy template',
        code: 'TEMPLATE_GET_ERROR',
      });
    }
  });

  /**
   * Create policy from template
   * POST /api/v1/policy-templates/:id/instantiate
   */
  router.post('/:id/instantiate', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      const { id } = req.params;
      const { name, customizations = {} } = req.body;

      // Get template
      const template = await queryOne<any>(
        'SELECT * FROM policy_templates WHERE id = $1 AND enabled = true',
        [id]
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Policy template not found',
          code: 'TEMPLATE_NOT_FOUND',
        });
      }

      // Apply customizations to rules
      let rules = template.rules;
      if (customizations.rules) {
        rules = customizations.rules;
      }

      // Create policy from template
      const policy = await queryOne<any>(
        `INSERT INTO policies (
          tenant_id,
          name,
          description,
          enabled,
          priority,
          rules,
          created_from_template
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          name || template.name,
          customizations.description || template.description,
          customizations.enabled !== undefined ? customizations.enabled : true,
          customizations.priority || template.priority,
          JSON.stringify(rules),
          id,
        ]
      );

      // Increment template use count
      await query(
        'SELECT increment_template_use_count($1)',
        [id]
      );

      res.json({
        success: true,
        data: policy,
        message: 'Policy created from template successfully',
      });
    } catch (error) {
      console.error('[PolicyTemplates] Instantiate error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create policy from template',
        code: 'TEMPLATE_INSTANTIATE_ERROR',
      });
    }
  });

  /**
   * Get popular templates
   * GET /api/v1/policy-templates/popular
   */
  router.get('/stats/popular', async (req: Request, res: Response) => {
    try {
      const { limit = 5 } = req.query;

      const templates = await query<any>(
        `SELECT id, name, description, category, icon, use_count
         FROM policy_templates
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
      console.error('[PolicyTemplates] Popular error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular templates',
        code: 'TEMPLATES_POPULAR_ERROR',
      });
    }
  });

  /**
   * Get templates by category
   * GET /api/v1/policy-templates/categories/:category
   */
  router.get('/categories/:category', async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const templates = await query<any>(
        `SELECT * FROM policy_templates
         WHERE category = $1 AND enabled = true
         ORDER BY use_count DESC, name ASC`,
        [category]
      );

      res.json({
        success: true,
        data: templates,
        category,
      });
    } catch (error) {
      console.error('[PolicyTemplates] Category error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates by category',
        code: 'TEMPLATES_CATEGORY_ERROR',
      });
    }
  });

  return router;
}
