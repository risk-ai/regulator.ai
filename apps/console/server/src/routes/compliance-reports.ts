/**
 * Compliance Report API Routes — Vienna OS
 * 
 * Generate audit-ready compliance reports.
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/postgres.js';

export function createComplianceReportRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/reports/generate
   * Generate a compliance report.
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const {
        type = 'governance_summary',
        period_start,
        period_end,
        format = 'json',
        include_chain_verification = false,
        agent_ids,
        risk_tiers,
      } = req.body;

      if (!period_start || !period_end) {
        return res.status(400).json({
          success: false,
          error: 'period_start and period_end are required (ISO 8601)',
        });
      }

      // Create data source that queries our DB
      const dataSource = {
        async queryAuditLog(tid: string, filters: any) {
          let sql = `SELECT event, actor, details, risk_tier, created_at
                     FROM audit_log WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`;
          const params: any[] = [tid, filters.start, filters.end];

          if (filters.events && filters.events.length > 0) {
            const placeholders = filters.events.map((_: any, i: number) => `$${params.length + i + 1}`);
            sql += ` AND event = ANY(ARRAY[${placeholders.join(',')}])`;
            params.push(...filters.events);
          }

          sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
          params.push(filters.limit || 10000);

          return query(sql, params);
        },

        async queryWarrantChain(tid: string) {
          const chain = req.app.locals.warrantChain;
          if (!chain) return { length: 0, valid: false };
          try {
            const result = await chain.verifyChain(tid);
            return {
              length: result.warrants_verified,
              valid: result.valid,
              root: result.chain_root,
            };
          } catch {
            return { length: 0, valid: false };
          }
        },

        async queryPolicies(tid: string) {
          return query(
            `SELECT id as policy_id, name, enabled, priority FROM policies WHERE tenant_id = $1`,
            [tid]
          );
        },

        async queryAgents(tid: string) {
          return query(
            `SELECT id, name, status, created_at FROM agents WHERE tenant_id = $1`,
            [tid]
          );
        },
      };

      const { ComplianceReportGenerator } = await import(
        '../../../../../services/vienna-lib/compliance/report-generator.js'
      );

      const generator = new ComplianceReportGenerator(dataSource);
      const report = await generator.generate({
        type,
        tenant_id: tenantId,
        period_start,
        period_end,
        format,
        include_chain_verification,
        agent_ids,
        risk_tiers,
      });

      // Set content type based on format
      if (format === 'csv') {
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename="vienna-${type}-${Date.now()}.csv"`);
        return res.send(report.data);
      }

      if (format === 'markdown') {
        res.set('Content-Type', 'text/markdown');
        return res.send(report.data);
      }

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[ComplianceReports] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/reports/types
   * List available report types.
   */
  router.get('/types', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: [
        { type: 'governance_summary', description: 'Period overview with key metrics and SOC 2 control mapping' },
        { type: 'warrant_audit', description: 'All warrants issued with chain integrity verification' },
        { type: 'approval_audit', description: 'All approval decisions with reviewer details' },
        { type: 'policy_evaluation', description: 'All policy evaluations with reasoning' },
        { type: 'anomaly_report', description: 'All anomalies detected with severity' },
        { type: 'agent_activity', description: 'Per-agent action history with trust scores' },
        { type: 'full_compliance', description: 'Complete compliance package (all reports)' },
      ],
      formats: ['json', 'csv', 'markdown'],
    });
  });

  return router;
}
