/**
 * Compliance Routes — Vienna OS
 * 
 * Governance compliance reporting, PDF/CSV export, templates, and scheduling.
 */

import { Router, Request, Response } from 'express';
import { ComplianceReportService } from '../services/complianceReportService.js';

const service = new ComplianceReportService();

export function createComplianceRouter(): Router {
  const router = Router();

  // ─── Quick Stats ─────────────────────────────────────────────────────────

  router.get('/quick-stats', async (req: Request, res: Response) => {
    try {
      const period = parseInt(req.query.period as string) || 30;
      const stats = await service.getQuickStats(period);
      res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quick stats',
        code: 'COMPLIANCE_STATS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── Reports ─────────────────────────────────────────────────────────────

  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const { reports, total } = await service.listReports(limit, offset);
      res.json({ success: true, data: { reports, total, limit, offset }, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({
        success: false, error: (error as Error).message, code: 'LIST_REPORTS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/reports/:id', async (req: Request, res: Response) => {
    try {
      const report = await service.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
      }
      res.json({ success: true, data: report, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'GET_REPORT_ERROR', timestamp: new Date().toISOString() });
    }
  });

  router.post('/reports/generate', async (req: Request, res: Response) => {
    try {
      const { report_type, period_start, period_end, template_id, sections, generated_by } = req.body;
      if (!report_type) {
        return res.status(400).json({ success: false, error: 'report_type is required', code: 'VALIDATION_ERROR', timestamp: new Date().toISOString() });
      }
      const report = await service.generateReport({ report_type, period_start, period_end, template_id, sections, generated_by });
      res.status(202).json({ success: true, data: report, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'GENERATE_ERROR', timestamp: new Date().toISOString() });
    }
  });

  router.delete('/reports/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.deleteReport(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Report not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
      }
      res.json({ success: true, data: { deleted: true }, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'DELETE_ERROR', timestamp: new Date().toISOString() });
    }
  });

  // ─── PDF Export (print-ready HTML) ──────────────────────────────────────

  router.get('/reports/:id/pdf', async (req: Request, res: Response) => {
    try {
      const report = await service.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
      }
      if (report.status !== 'ready') {
        return res.status(400).json({ success: false, error: 'Report is not ready', code: 'NOT_READY', timestamp: new Date().toISOString() });
      }

      const html = generatePdfHtml(report);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${slugify(report.title)}.html"`);
      res.send(html);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'PDF_ERROR', timestamp: new Date().toISOString() });
    }
  });

  // ─── CSV Export ─────────────────────────────────────────────────────────

  router.get('/reports/:id/csv', async (req: Request, res: Response) => {
    try {
      const report = await service.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
      }

      const csv = generateCsv(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${slugify(report.title)}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'CSV_ERROR', timestamp: new Date().toISOString() });
    }
  });

  // ─── Templates ──────────────────────────────────────────────────────────

  router.get('/templates', async (_req: Request, res: Response) => {
    try {
      const templates = await service.listTemplates();
      res.json({ success: true, data: templates, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'TEMPLATES_ERROR', timestamp: new Date().toISOString() });
    }
  });

  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const template = await service.createTemplate(req.body);
      res.status(201).json({ success: true, data: template, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'CREATE_TEMPLATE_ERROR', timestamp: new Date().toISOString() });
    }
  });

  router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
      const template = await service.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
      }
      res.json({ success: true, data: template, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'UPDATE_TEMPLATE_ERROR', timestamp: new Date().toISOString() });
    }
  });

  // ─── Scheduling ─────────────────────────────────────────────────────────

  router.post('/schedule', async (req: Request, res: Response) => {
    try {
      const { report_type, schedule_cron, template_id, recipients } = req.body;
      if (!report_type || !schedule_cron) {
        return res.status(400).json({ success: false, error: 'report_type and schedule_cron required', code: 'VALIDATION_ERROR', timestamp: new Date().toISOString() });
      }
      const schedule = await service.createSchedule({ report_type, schedule_cron, template_id, recipients });
      res.status(201).json({ success: true, data: schedule, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message, code: 'SCHEDULE_ERROR', timestamp: new Date().toISOString() });
    }
  });

  return router;
}

// ─── PDF HTML Generator ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generatePdfHtml(report: any): string {
  const data = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
  const sections = data.sections || {};
  const meta = data.metadata || {};

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fmtPct = (n: number) => `${n}%`;

  let sectionsHtml = '';

  // Executive Summary
  if (sections.executive_summary) {
    const es = sections.executive_summary;
    sectionsHtml += `
      <div class="section">
        <h2>1. Executive Summary</h2>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${(es.total_actions_governed || 0).toLocaleString()}</div>
            <div class="kpi-label">Actions Governed</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color: ${(es.policy_compliance_rate || 0) >= 95 ? '#16a34a' : '#dc2626'}">${fmtPct(es.policy_compliance_rate || 0)}</div>
            <div class="kpi-label">Compliance Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" style="color: ${es.unauthorized_executions === 0 ? '#16a34a' : '#dc2626'}">${es.unauthorized_executions || 0}</div>
            <div class="kpi-label">Unauthorized Executions</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${es.fleet_health_score || 0}<span class="kpi-unit">/100</span></div>
            <div class="kpi-label">Fleet Health Score</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${es.active_agents || 0}</div>
            <div class="kpi-label">Active Agents</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${es.avg_approval_time_minutes || 0}<span class="kpi-unit"> min</span></div>
            <div class="kpi-label">Avg Approval Time</div>
          </div>
        </div>
        ${es.highlights ? `<div class="highlights">${es.highlights.map((h: string) => `<p class="highlight-item">• ${h}</p>`).join('')}</div>` : ''}
      </div>`;
  }

  // Governance Overview
  if (sections.governance_overview) {
    const go = sections.governance_overview;
    sectionsHtml += `
      <div class="section">
        <h2>2. Governance Overview</h2>
        <div class="kpi-grid kpi-grid-3">
          <div class="kpi-card"><div class="kpi-value">${go.active_rules_count || 0}</div><div class="kpi-label">Active Policy Rules</div></div>
          <div class="kpi-card"><div class="kpi-value">${go.rules_added_in_period || 0}</div><div class="kpi-label">Rules Added in Period</div></div>
        </div>
        ${go.action_distribution?.length ? `
          <h3>Default Action Distribution</h3>
          <div class="bar-chart">
            ${go.action_distribution.map((d: any) => {
              const max = Math.max(...go.action_distribution.map((x: any) => x.count));
              const pct = max > 0 ? (d.count / max) * 100 : 0;
              const color = d.action === 'deny' ? '#ef4444' : d.action === 'require_approval' ? '#f59e0b' : '#22c55e';
              return `<div class="bar-row"><span class="bar-label">${d.action}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="bar-value">${d.count}</span></div>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }

  // Action Volume
  if (sections.action_volume) {
    const av = sections.action_volume;
    sectionsHtml += `
      <div class="section page-break">
        <h2>3. Action Volume Analysis</h2>
        <div class="kpi-grid kpi-grid-3">
          <div class="kpi-card"><div class="kpi-value">${(av.total_intents || 0).toLocaleString()}</div><div class="kpi-label">Total Intents Submitted</div></div>
        </div>
        ${av.by_risk_tier?.length ? `
          <h3>Actions by Risk Tier</h3>
          <div class="bar-chart">
            ${av.by_risk_tier.map((t: any) => {
              const max = Math.max(...av.by_risk_tier.map((x: any) => x.count));
              const pct = max > 0 ? (t.count / max) * 100 : 0;
              const color = t.tier === 'T2' ? '#ef4444' : t.tier === 'T1' ? '#f59e0b' : '#22c55e';
              return `<div class="bar-row"><span class="bar-label">${t.tier}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="bar-value">${t.count}</span></div>`;
            }).join('')}
          </div>` : ''}
        ${av.by_action_type?.length ? `
          <h3>Actions by Type</h3>
          <table class="data-table">
            <thead><tr><th>Action Type</th><th>Count</th><th>Distribution</th></tr></thead>
            <tbody>${av.by_action_type.map((a: any) => {
              const pct = av.total_intents > 0 ? Math.round((a.count / av.total_intents) * 100) : 0;
              return `<tr><td>${a.type}</td><td>${a.count}</td><td><div class="inline-bar"><div class="inline-bar-fill" style="width:${pct}%"></div></div> ${pct}%</td></tr>`;
            }).join('')}</tbody>
          </table>` : ''}
        ${av.daily_trend?.length ? `
          <h3>Daily Activity Trend</h3>
          <div class="mini-chart">
            ${av.daily_trend.map((d: any) => {
              const max = Math.max(...av.daily_trend.map((x: any) => x.count));
              const h = max > 0 ? Math.max(4, (d.count / max) * 80) : 4;
              return `<div class="mini-bar" style="height:${h}px" title="${d.date}: ${d.count}"></div>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }

  // Policy Compliance
  if (sections.policy_compliance) {
    const pc = sections.policy_compliance;
    sectionsHtml += `
      <div class="section">
        <h2>4. Policy Compliance</h2>
        <div class="kpi-grid kpi-grid-3">
          <div class="kpi-card"><div class="kpi-value">${(pc.total_evaluations || 0).toLocaleString()}</div><div class="kpi-label">Rules Evaluated</div></div>
          <div class="kpi-card"><div class="kpi-value">${fmtPct(pc.match_rate || 0)}</div><div class="kpi-label">Match Rate</div></div>
        </div>
        ${pc.top_triggered_rules?.length ? `
          <h3>Top Triggered Rules</h3>
          <table class="data-table">
            <thead><tr><th>Rule Name</th><th>Times Triggered</th><th>Block Rate</th></tr></thead>
            <tbody>${pc.top_triggered_rules.map((r: any) => `
              <tr><td>${r.name}</td><td>${r.times_triggered}</td><td><span class="badge ${r.block_rate > 50 ? 'badge-red' : 'badge-yellow'}">${r.block_rate}%</span></td></tr>
            `).join('')}</tbody>
          </table>` : ''}
      </div>`;
  }

  // Agent Performance
  if (sections.agent_performance) {
    const ap = sections.agent_performance;
    sectionsHtml += `
      <div class="section page-break">
        <h2>5. Agent Performance</h2>
        ${ap.best_performer ? `<p class="callout callout-green">🏆 Best Performer: <strong>${ap.best_performer.name}</strong> (Trust: ${ap.best_performer.trust_score}/100)</p>` : ''}
        ${ap.worst_performer ? `<p class="callout callout-yellow">⚠️ Needs Attention: <strong>${ap.worst_performer.name}</strong> (Trust: ${ap.worst_performer.trust_score}/100)</p>` : ''}
        ${ap.scorecards?.length ? `
          <table class="data-table">
            <thead><tr><th>Agent</th><th>Status</th><th>Actions</th><th>Approval Rate</th><th>Error Rate</th><th>Avg Latency</th><th>Trust Score</th></tr></thead>
            <tbody>${ap.scorecards.map((s: any) => `
              <tr>
                <td><strong>${s.display_name}</strong></td>
                <td><span class="badge ${s.status === 'active' ? 'badge-green' : s.status === 'suspended' ? 'badge-red' : 'badge-gray'}">${s.status}</span></td>
                <td>${s.total_actions}</td>
                <td>${s.approval_rate}%</td>
                <td><span style="color:${s.error_rate > 10 ? '#ef4444' : s.error_rate > 5 ? '#f59e0b' : '#22c55e'}">${s.error_rate}%</span></td>
                <td>${s.avg_latency_ms}ms</td>
                <td>${renderTrustBar(s.trust_score)}</td>
              </tr>
            `).join('')}</tbody>
          </table>` : ''}
      </div>`;
  }

  // Risk Analysis
  if (sections.risk_analysis) {
    const ra = sections.risk_analysis;
    sectionsHtml += `
      <div class="section">
        <h2>6. Risk Analysis</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value" style="color:#ef4444">${ra.high_risk_actions?.total || 0}</div><div class="kpi-label">High-Risk (T2) Actions</div></div>
          <div class="kpi-card"><div class="kpi-value">${ra.scope_creep_attempts || 0}</div><div class="kpi-label">Scope Creep Attempts</div></div>
          <div class="kpi-card"><div class="kpi-value">${ra.anomalies_detected || 0}</div><div class="kpi-label">Anomalies Detected</div></div>
        </div>
        ${ra.top_denials?.length ? `
          <h3>Top Denial Reasons</h3>
          <table class="data-table">
            <thead><tr><th>Agent</th><th>Action Type</th><th>Denials</th></tr></thead>
            <tbody>${ra.top_denials.map((d: any) => `<tr><td>${d.agent_id}</td><td>${d.action_type}</td><td>${d.count}</td></tr>`).join('')}</tbody>
          </table>` : ''}
      </div>`;
  }

  // Approval Metrics
  if (sections.approval_metrics) {
    const am = sections.approval_metrics;
    sectionsHtml += `
      <div class="section">
        <h2>7. Approval Metrics</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value">${am.total_approvals_requested || 0}</div><div class="kpi-label">Approvals Requested</div></div>
          <div class="kpi-card"><div class="kpi-value">${am.avg_time_to_approval_minutes || 0}<span class="kpi-unit"> min</span></div><div class="kpi-label">Avg Time to Approval</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:#22c55e">${fmtPct(am.approval_rate || 0)}</div><div class="kpi-label">Approval Rate</div></div>
        </div>
        ${am.by_tier?.length ? `
          <h3>Approvals by Tier</h3>
          <div class="bar-chart">
            ${am.by_tier.map((t: any) => {
              const max = Math.max(...am.by_tier.map((x: any) => x.count));
              const pct = max > 0 ? (t.count / max) * 100 : 0;
              return `<div class="bar-row"><span class="bar-label">${t.tier}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#7c3aed"></div></div><span class="bar-value">${t.count}</span></div>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }

  // Violations & Incidents
  if (sections.violations_incidents) {
    const vi = sections.violations_incidents;
    sectionsHtml += `
      <div class="section page-break">
        <h2>8. Violations & Incidents</h2>
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-value" style="color:${vi.total_violations > 0 ? '#ef4444' : '#22c55e'}">${vi.total_violations || 0}</div><div class="kpi-label">Total Violations</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:${vi.unresolved_count > 0 ? '#f59e0b' : '#22c55e'}">${vi.unresolved_count || 0}</div><div class="kpi-label">Unresolved</div></div>
        </div>
        ${vi.by_severity?.length ? `
          <h3>Violations by Severity</h3>
          <div class="severity-pills">
            ${vi.by_severity.map((s: any) => `<span class="badge ${s.severity === 'critical' ? 'badge-red' : s.severity === 'warning' ? 'badge-yellow' : 'badge-blue'}">${s.severity}: ${s.count}</span>`).join(' ')}
          </div>` : ''}
        ${vi.incident_timeline?.length ? `
          <h3>Recent Incident Timeline</h3>
          <table class="data-table">
            <thead><tr><th>Time</th><th>Agent</th><th>Type</th><th>Severity</th><th>Message</th><th>Resolved</th></tr></thead>
            <tbody>${vi.incident_timeline.slice(0, 20).map((i: any) => `
              <tr>
                <td class="text-sm">${new Date(i.created_at).toLocaleString()}</td>
                <td>${i.agent_id}</td>
                <td>${i.alert_type}</td>
                <td><span class="badge ${i.severity === 'critical' ? 'badge-red' : i.severity === 'warning' ? 'badge-yellow' : 'badge-blue'}">${i.severity}</span></td>
                <td class="text-sm">${i.message}</td>
                <td>${i.resolved ? '✅' : '❌'}</td>
              </tr>
            `).join('')}</tbody>
          </table>` : ''}
      </div>`;
  }

  // Integration Health
  if (sections.integration_health) {
    const ih = sections.integration_health;
    sectionsHtml += `
      <div class="section">
        <h2>9. Integration Health</h2>
        <div class="kpi-grid kpi-grid-3">
          <div class="kpi-card"><div class="kpi-value">${ih.total_active || 0}</div><div class="kpi-label">Active Integrations</div></div>
          <div class="kpi-card"><div class="kpi-value" style="color:#22c55e">${fmtPct(ih.overall_delivery_rate || 100)}</div><div class="kpi-label">Delivery Success Rate</div></div>
        </div>
        ${ih.integrations?.length ? `
          <table class="data-table">
            <thead><tr><th>Integration</th><th>Type</th><th>Status</th><th>Success Rate</th><th>Events</th></tr></thead>
            <tbody>${ih.integrations.map((i: any) => `
              <tr>
                <td>${i.name}</td>
                <td>${i.type}</td>
                <td><span class="badge ${i.enabled ? 'badge-green' : 'badge-gray'}">${i.enabled ? 'Active' : 'Disabled'}</span></td>
                <td>${fmtPct(i.delivery_success_rate)}</td>
                <td>${i.events_in_period}</td>
              </tr>
            `).join('')}</tbody>
          </table>` : ''}
      </div>`;
  }

  // Recommendations
  if (sections.recommendations) {
    const rec = sections.recommendations;
    sectionsHtml += `
      <div class="section">
        <h2>10. Recommendations</h2>
        ${rec.items?.length ? rec.items.map((r: any) => `
          <div class="recommendation ${r.severity}">
            <div class="rec-header">
              <span class="badge ${r.severity === 'critical' ? 'badge-red' : r.severity === 'warning' ? 'badge-yellow' : 'badge-blue'}">${r.severity.toUpperCase()}</span>
              <span class="rec-category">${r.category}</span>
            </div>
            <p class="rec-message">${r.message}</p>
            <p class="rec-action">→ ${r.action}</p>
          </div>
        `).join('') : '<p class="text-muted">No recommendations at this time. Governance posture is strong.</p>'}
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    @media print {
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; line-height: 1.6; font-size: 14px; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 32px; }
    
    /* Header */
    .report-header { border-bottom: 3px solid #7c3aed; padding-bottom: 24px; margin-bottom: 32px; }
    .report-header h1 { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; letter-spacing: -0.5px; }
    .report-header .subtitle { color: #64748b; font-size: 14px; }
    .report-header .meta { display: flex; gap: 24px; margin-top: 16px; color: #64748b; font-size: 13px; }
    .report-header .meta strong { color: #1a1a2e; }
    .logo-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .logo-text { font-size: 18px; font-weight: 700; color: #7c3aed; letter-spacing: 1px; }
    .confidential { font-size: 11px; color: #ef4444; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; }
    
    /* Sections */
    .section { margin-bottom: 36px; }
    .section h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .section h3 { font-size: 15px; font-weight: 600; color: #334155; margin: 16px 0 10px; }
    
    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .kpi-unit { font-size: 14px; font-weight: 400; color: #64748b; }
    .kpi-label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Data Tables */
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    .data-table thead { background: #f1f5f9; }
    .data-table th { padding: 10px 12px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .data-table tbody tr:hover { background: #fafbfc; }
    
    /* Bar Charts */
    .bar-chart { margin-bottom: 16px; }
    .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .bar-label { width: 140px; font-size: 13px; font-weight: 500; color: #334155; text-align: right; }
    .bar-track { flex: 1; height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .bar-value { width: 40px; font-size: 13px; font-weight: 600; color: #334155; }
    
    /* Mini Chart */
    .mini-chart { display: flex; align-items: flex-end; gap: 2px; height: 80px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; }
    .mini-bar { flex: 1; background: #7c3aed; border-radius: 2px 2px 0 0; min-width: 4px; opacity: 0.8; }
    
    /* Inline Bar */
    .inline-bar { display: inline-block; width: 80px; height: 8px; background: #f1f5f9; border-radius: 4px; vertical-align: middle; overflow: hidden; margin-right: 6px; }
    .inline-bar-fill { height: 100%; background: #7c3aed; border-radius: 4px; }
    
    /* Badges */
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-gray { background: #f1f5f9; color: #64748b; }
    
    /* Trust Bar */
    .trust-bar { display: inline-flex; align-items: center; gap: 6px; }
    .trust-track { width: 60px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .trust-fill { height: 100%; border-radius: 3px; }
    .trust-value { font-size: 12px; font-weight: 600; }
    
    /* Callouts */
    .callout { padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
    .callout-green { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .callout-yellow { background: #fffbeb; border-left: 4px solid #f59e0b; }
    
    /* Recommendations */
    .recommendation { padding: 14px 16px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid; }
    .recommendation.critical { background: #fef2f2; border-color: #ef4444; }
    .recommendation.warning { background: #fffbeb; border-color: #f59e0b; }
    .recommendation.info { background: #eff6ff; border-color: #3b82f6; }
    .rec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .rec-category { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .rec-message { font-size: 14px; color: #1a1a2e; margin-bottom: 4px; }
    .rec-action { font-size: 13px; color: #64748b; font-style: italic; }
    
    /* Highlights */
    .highlights { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-top: 16px; }
    .highlight-item { font-size: 14px; color: #334155; margin-bottom: 6px; line-height: 1.5; }
    
    /* Severity Pills */
    .severity-pills { display: flex; gap: 10px; margin-bottom: 16px; }
    
    .text-sm { font-size: 12px; }
    .text-muted { color: #94a3b8; font-style: italic; }
    
    /* Footer */
    .report-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <div class="logo-bar">
        <span class="logo-text">VIENNA OS</span>
        <span class="confidential">Confidential</span>
      </div>
      <h1>${report.title}</h1>
      <div class="subtitle">AI Governance & Compliance Report</div>
      <div class="meta">
        <span>Period: <strong>${fmtDate(report.period_start)} — ${fmtDate(report.period_end)}</strong></span>
        <span>Generated: <strong>${fmtDate(report.generated_at)}</strong></span>
        <span>By: <strong>${report.generated_by}</strong></span>
      </div>
    </div>
    
    ${sectionsHtml}
    
    <div class="report-footer">
      <p>Generated by Vienna OS Compliance Engine — ${fmtDate(report.generated_at)}</p>
      <p>This report is auto-generated from real-time governance data. For questions, contact your Vienna OS administrator.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderTrustBar(score: number): string {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return `<span class="trust-bar"><span class="trust-track"><span class="trust-fill" style="width:${score}%;background:${color}"></span></span><span class="trust-value" style="color:${color}">${score}</span></span>`;
}

// ─── CSV Generator ────────────────────────────────────────────────────────────

function generateCsv(report: any): string {
  const data = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
  const sections = data.sections || {};
  const rows: string[][] = [];

  rows.push(['Vienna OS Compliance Report']);
  rows.push(['Title', report.title]);
  rows.push(['Period', `${report.period_start} to ${report.period_end}`]);
  rows.push(['Generated', report.generated_at]);
  rows.push([]);

  // Executive Summary
  if (sections.executive_summary) {
    const es = sections.executive_summary;
    rows.push(['EXECUTIVE SUMMARY']);
    rows.push(['Metric', 'Value']);
    rows.push(['Total Actions Governed', String(es.total_actions_governed || 0)]);
    rows.push(['Compliance Rate', `${es.policy_compliance_rate || 0}%`]);
    rows.push(['Unauthorized Executions', String(es.unauthorized_executions || 0)]);
    rows.push(['Fleet Health Score', `${es.fleet_health_score || 0}/100`]);
    rows.push(['Active Agents', String(es.active_agents || 0)]);
    rows.push([]);
  }

  // Agent Performance
  if (sections.agent_performance?.scorecards) {
    rows.push(['AGENT PERFORMANCE']);
    rows.push(['Agent', 'Status', 'Actions', 'Approval Rate', 'Error Rate', 'Avg Latency (ms)', 'Trust Score']);
    for (const s of sections.agent_performance.scorecards) {
      rows.push([s.display_name, s.status, String(s.total_actions), `${s.approval_rate}%`, `${s.error_rate}%`, String(s.avg_latency_ms), String(s.trust_score)]);
    }
    rows.push([]);
  }

  // Policy Compliance
  if (sections.policy_compliance?.top_triggered_rules) {
    rows.push(['TOP TRIGGERED RULES']);
    rows.push(['Rule Name', 'Times Triggered', 'Block Rate']);
    for (const r of sections.policy_compliance.top_triggered_rules) {
      rows.push([r.name, String(r.times_triggered), `${r.block_rate}%`]);
    }
    rows.push([]);
  }

  // Violations
  if (sections.violations_incidents?.incident_timeline) {
    rows.push(['INCIDENTS']);
    rows.push(['Time', 'Agent', 'Type', 'Severity', 'Message', 'Resolved']);
    for (const i of sections.violations_incidents.incident_timeline) {
      rows.push([i.created_at, i.agent_id, i.alert_type, i.severity, `"${(i.message || '').replace(/"/g, '""')}"`, i.resolved ? 'Yes' : 'No']);
    }
    rows.push([]);
  }

  // Recommendations
  if (sections.recommendations?.items) {
    rows.push(['RECOMMENDATIONS']);
    rows.push(['Severity', 'Category', 'Message', 'Action']);
    for (const r of sections.recommendations.items) {
      rows.push([r.severity, r.category, `"${r.message.replace(/"/g, '""')}"`, `"${r.action.replace(/"/g, '""')}"`]);
    }
  }

  return rows.map(row => row.join(',')).join('\n');
}
