/**
 * Demo Data Routes
 * Opt-in demo data seeding for onboarding/testing.
 * 
 * Users start with a clean workspace. Demo data is only created
 * when explicitly requested via the onboarding wizard or this endpoint.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/postgres.js';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

export function createDemoRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * POST /api/v1/demo/seed
   * Seed demo data for onboarding — opt-in only.
   * Creates: starter policy, sample agents, sample objectives.
   * All demo data is clearly labeled with [Demo] prefix.
   */
  router.post('/seed', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId;
      const userId = authReq.user?.userId;

      if (!tenantId || !userId) {
        const err: ErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        };
        return res.status(401).json(err);
      }

      const seeded: string[] = [];

      // 1. Seed a starter governance policy
      try {
        await query(
          `INSERT INTO policies (id, tenant_id, name, description, enabled, priority, created_by)
           VALUES ($1, $2, $3, $4, true, 1, $5)
           ON CONFLICT DO NOTHING`,
          [
            uuidv4(),
            tenantId,
            '[Demo] Default Governance Policy',
            'Sample starter policy. Low-risk actions (T0) auto-approve. Higher tiers require human review. Delete or modify this policy to customize your governance.',
            userId,
          ]
        );
        seeded.push('policy');
      } catch (e) {
        console.error('[Demo] Failed to seed policy:', e);
      }

      // 2. Seed sample agents
      const sampleAgents = [
        {
          name: '[Demo] Billing Optimizer',
          description: 'Sample agent that optimizes cloud billing. Demonstrates T1 governance for cost-related actions.',
          status: 'active',
        },
        {
          name: '[Demo] Data Pipeline Agent',
          description: 'Sample agent that manages ETL workflows. Demonstrates T0 auto-approval for read-only operations.',
          status: 'active',
        },
      ];

      for (const agent of sampleAgents) {
        try {
          await query(
            `INSERT INTO agents (id, tenant_id, name, description, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [uuidv4(), tenantId, agent.name, agent.description, agent.status, userId]
          );
          seeded.push(`agent:${agent.name}`);
        } catch (e) {
          console.error(`[Demo] Failed to seed agent ${agent.name}:`, e);
        }
      }

      // 3. Seed sample objectives via the state graph (if available)
      try {
        const stateGraph = vienna['viennaCore']?.stateGraph;
        if (stateGraph) {
          const demoObjectives = [
            {
              objective_id: `demo_obj_${Date.now()}_1`,
              target_id: '[Demo] api-gateway',
              target_type: 'service',
              status: 'active',
              desired_state: JSON.stringify({ status: 'running', replicas: 3 }),
              priority: 100,
              evaluation_interval_seconds: 60,
              verification_strength: 'medium',
              is_enabled: true
            },
            {
              objective_id: `demo_obj_${Date.now()}_2`,
              target_id: '[Demo] database-backup',
              target_type: 'task',
              status: 'pending',
              desired_state: JSON.stringify({ schedule: 'daily', retention: 30 }),
              priority: 200,
              evaluation_interval_seconds: 3600,
              verification_strength: 'high',
              is_enabled: true
            }
          ];

          for (const obj of demoObjectives) {
            stateGraph.createObjective(obj);
          }
          seeded.push('objectives');
        }
      } catch (e) {
        console.error('[Demo] Failed to seed objectives:', e);
      }

      const response: SuccessResponse<{ seeded: string[]; count: number }> = {
        success: true,
        data: {
          seeded,
          count: seeded.length,
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DEMO_SEED_ERROR',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(err);
    }
  });

  /**
   * DELETE /api/v1/demo/clear
   * Remove all demo data (items prefixed with [Demo])
   */
  router.delete('/clear', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId;

      if (!tenantId) {
        const err: ErrorResponse = {
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          timestamp: new Date().toISOString()
        };
        return res.status(401).json(err);
      }

      const cleared: string[] = [];

      // Clear demo policies
      const policyResult = await query(
        `DELETE FROM policies WHERE tenant_id = $1 AND name LIKE '[Demo]%'`,
        [tenantId]
      );
      if (policyResult.rowCount && policyResult.rowCount > 0) {
        cleared.push(`${policyResult.rowCount} policies`);
      }

      // Clear demo agents
      const agentResult = await query(
        `DELETE FROM agents WHERE tenant_id = $1 AND name LIKE '[Demo]%'`,
        [tenantId]
      );
      if (agentResult.rowCount && agentResult.rowCount > 0) {
        cleared.push(`${agentResult.rowCount} agents`);
      }

      const response: SuccessResponse<{ cleared: string[] }> = {
        success: true,
        data: { cleared },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DEMO_CLEAR_ERROR',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(err);
    }
  });

  return router;
}
