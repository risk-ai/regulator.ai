/**
 * Natural Language Policy Builder API — Vienna OS
 */

import { Router, Request, Response } from 'express';

export function createNLPolicyRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/nl-policy/parse
   * Parse natural language into a structured policy.
   */
  router.post('/parse', async (req: Request, res: Response) => {
    try {
      const { description } = req.body;

      if (!description || typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'description (string) is required',
        });
      }

      const { NaturalLanguagePolicyBuilder } = await import(
        '../../../../../services/vienna-lib/governance/natural-language-policy-builder.js'
      );

      const builder = new NaturalLanguagePolicyBuilder();
      const result = builder.parse(description);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/nl-policy/create
   * Parse natural language and create the policy (if confidence > threshold).
   */
  router.post('/create', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const userId = (req as any).user?.userId;
      const { description, min_confidence = 60 } = req.body;

      if (!description) {
        return res.status(400).json({ success: false, error: 'description is required' });
      }

      const { NaturalLanguagePolicyBuilder } = await import(
        '../../../../../services/vienna-lib/governance/natural-language-policy-builder.js'
      );

      const builder = new NaturalLanguagePolicyBuilder();
      const parsed = builder.parse(description);

      if (parsed.confidence < min_confidence) {
        return res.status(422).json({
          success: false,
          error: `Confidence too low (${parsed.confidence}%). Minimum: ${min_confidence}%. Review the parsed policy and create manually.`,
          data: parsed,
        });
      }

      // Insert into policies table
      const { query } = await import('../db/postgres.js');
      const { v4: uuidv4 } = await import('uuid');

      const policyId = uuidv4();
      await query(
        `INSERT INTO policies (id, tenant_id, name, description, enabled, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          policyId,
          tenantId,
          parsed.policy.name,
          `[NL] ${description}`,
          parsed.policy.enabled,
          parsed.policy.priority,
          userId,
        ]
      );

      res.json({
        success: true,
        data: {
          policy_id: policyId,
          parsed: parsed,
          created: true,
          message: `Policy "${parsed.policy.name}" created with ${parsed.confidence}% confidence`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
