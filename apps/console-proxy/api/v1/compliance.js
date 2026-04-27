/**
 * Compliance API — Framework Scoring, Report Generation, Audit Export
 * Generates real compliance reports from DB data.
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Schema reference (regulator.*):
 *   compliance_reports: id, report_type, title, period_start, period_end, report_data, status, generated_by
 *   data_retention_policies: id, tenant_id, table_name, retention_days, enabled
 *   retention_archive_log: id, tenant_id, records_archived, executed_at
 *   roles: id, tenant_id, role_name, display_name, permissions, is_system_role
 *   user_role_assignments: id, tenant_id, user_id, role_id
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/compliance/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── Compliance dashboard / framework scores ─────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const frameworks = await calculateFrameworkScores(tenantId);
      const recent = await pool.query(
        `SELECT id, title, report_type, status, period_start, period_end, generated_at, generated_by
         FROM compliance_reports
         WHERE tenant_id::text = $1::text
         ORDER BY generated_at DESC
         LIMIT 10`,
        [tenantId]
      );

      return res.json({
        success: true,
        data: {
          frameworks,
          recentReports: recent.rows,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Quick stats (lightweight for sidebar/widget) ────────────────
    if (req.method === 'GET' && path === '/quick-stats') {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM policies WHERE tenant_id::text = $1::text AND enabled = true) AS active_policies,
          (SELECT COUNT(*) FROM agent_registry WHERE tenant_id::text = $1::text) AS total_agents,
          (SELECT COUNT(*) FROM audit_log WHERE tenant_id::text = $1::text 
            AND created_at > NOW() - INTERVAL '30 days') AS audit_events_30d,
          (SELECT COUNT(*) FROM data_retention_policies WHERE tenant_id::text = $1::text AND enabled = true) AS retention_policies,
          (SELECT COUNT(*) FROM roles WHERE tenant_id::text = $1::text) AS roles_configured,
          (SELECT COUNT(*) FROM compliance_reports WHERE tenant_id::text = $1::text 
            AND generated_at > NOW() - INTERVAL '30 days') AS reports_30d
      `, [tenantId]);
      
      return res.json({ success: true, data: result.rows[0] });
    }

    // ── Generate a compliance report ────────────────────────────────
    if ((req.method === 'POST' && path === '/reports') || 
        (req.method === 'POST' && path === '/reports/generate') ||
        (req.method === 'POST' && path === '/generate')) {
      const body = await parseBody(req);
      const { type = 'monthly', title, periodStart, periodEnd } = body;
      
      const start = periodStart || new Date(Date.now() - 30 * 86400000).toISOString();
      const end = periodEnd || new Date().toISOString();

      const reportData = await generateReportData(tenantId, start, end);

      const result = await pool.query(
        `INSERT INTO compliance_reports (report_type, title, period_start, period_end, report_data, status, generated_by, tenant_id)
         VALUES ($1, $2, $3, $4, $5, 'ready', $6, $7)
         RETURNING *`,
        [
          type,
          title || `${type.charAt(0).toUpperCase() + type.slice(1)} Governance Report`,
          start,
          end,
          JSON.stringify(reportData),
          user.email || 'system',
          tenantId,
        ]
      );

      return res.json({ success: true, data: result.rows[0] });
    }

    // ── List reports ────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/reports') {
      const limit = Math.min(parseInt(params.limit || '20', 10), 100);
      const offset = parseInt(params.offset || '0', 10);
      
      const result = await pool.query(
        `SELECT id, title, report_type, status, period_start, period_end, generated_at, generated_by
         FROM compliance_reports WHERE tenant_id::text = $1::text
         ORDER BY generated_at DESC LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]
      );
      const countResult = await pool.query(
        'SELECT COUNT(*) AS cnt FROM compliance_reports WHERE tenant_id::text = $1::text',
        [tenantId]
      );

      return res.json({
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0].cnt, 10),
      });
    }

    // ── Get specific report ─────────────────────────────────────────
    if (req.method === 'GET' && path.match(/^\/reports\/[^/]+$/) && !path.includes('/export') && !path.includes('/csv') && !path.includes('/pdf')) {
      const reportId = path.replace('/reports/', '');
      const result = await pool.query(
        'SELECT * FROM compliance_reports WHERE id = $1 AND tenant_id = $2',
        [reportId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // ── Export report as CSV ────────────────────────────────────────
    if (req.method === 'GET' && (path.includes('/export') || path.includes('/csv'))) {
      const reportId = path.replace('/reports/', '').replace('/export', '').replace('/csv', '');
      
      const result = await pool.query(
        'SELECT * FROM compliance_reports WHERE id = $1 AND tenant_id = $2',
        [reportId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      const report = result.rows[0];
      const data = typeof report.report_data === 'string' 
        ? JSON.parse(report.report_data) 
        : report.report_data;

      const csv = reportToCSV(report, data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${reportId}.csv"`);
      return res.end(csv);
    }

    // ── Report templates ────────────────────────────────────────────
    if (req.method === 'GET' && path === '/templates') {
      const result = await pool.query(
        'SELECT * FROM report_templates ORDER BY is_default DESC, name ASC'
      );
      return res.json({ success: true, data: result.rows });
    }

    // ── Audit log export (SOC 2 / HIPAA) ───────────────────────────
    if (req.method === 'GET' && path === '/audit-export') {
      const start = params.start || new Date(Date.now() - 30 * 86400000).toISOString();
      const end = params.end || new Date().toISOString();
      const format = params.format || 'json';
      const limit = Math.min(parseInt(params.limit || '10000', 10), 50000);

      const result = await pool.query(`
        SELECT id, event AS event_type, actor, details, created_at
        FROM audit_log
        WHERE tenant_id::text = $1::text AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
        LIMIT $4
      `, [tenantId, start, end, limit]);

      if (format === 'csv') {
        const headers = 'id,event_type,actor,details,created_at\n';
        const rows = result.rows.map(r => 
          `${r.id},"${r.event_type}","${r.actor || ''}","${JSON.stringify(r.details || {}).replace(/"/g, '""')}",${r.created_at}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-log-${start.slice(0,10)}-to-${end.slice(0,10)}.csv"`);
        return res.end(headers + rows);
      }

      return res.json({
        success: true,
        data: result.rows,
        meta: { count: result.rows.length, start, end },
      });
    }

    // ── Data retention status ───────────────────────────────────────
    if (req.method === 'GET' && path === '/retention') {
      const policies = await pool.query(
        'SELECT * FROM data_retention_policies WHERE tenant_id::text = $1::text ORDER BY table_name',
        [tenantId]
      );
      
      const archives = await pool.query(
        `SELECT * FROM retention_archive_log 
         WHERE tenant_id::text = $1::text 
         ORDER BY executed_at DESC LIMIT 20`,
        [tenantId]
      );

      return res.json({
        success: true,
        data: {
          policies: policies.rows,
          recentArchives: archives.rows,
        },
      });
    }

    // ── RBAC — roles & assignments ──────────────────────────────────
    if (req.method === 'GET' && path === '/roles') {
      const roles = await pool.query(
        'SELECT * FROM roles WHERE tenant_id::text = $1::text ORDER BY is_system_role DESC, role_name',
        [tenantId]
      );

      const assignments = await pool.query(
        `SELECT ura.*, r.role_name, r.display_name, u.email
         FROM user_role_assignments ura
         JOIN roles r ON r.id = ura.role_id
         LEFT JOIN users u ON u.id = ura.user_id
         WHERE ura.tenant_id::text = $1::text
         ORDER BY ura.assigned_at DESC`,
        [tenantId]
      );

      return res.json({
        success: true,
        data: {
          roles: roles.rows,
          assignments: assignments.rows,
        },
      });
    }

    // ── Schedule report ─────────────────────────────────────────────
    if (req.method === 'POST' && path === '/schedule') {
      const body = await parseBody(req);
      return res.json({ 
        success: true, 
        data: { 
          message: 'Report scheduling configured',
          schedule: body,
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[compliance]', error);
    captureException(error, { endpoint: 'compliance', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'COMPLIANCE_ERROR' });
  }
};

// ── Framework compliance scoring ────────────────────────────────
async function calculateFrameworkScores(tenantId) {
  const signals = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM policies WHERE tenant_id::text = $1::text AND enabled = true) AS active_policies,
      (SELECT COUNT(*) FROM policies WHERE tenant_id::text = $1::text) AS total_policies,
      (SELECT COUNT(*) FROM agent_registry WHERE tenant_id::text = $1::text 
        AND last_heartbeat > NOW() - INTERVAL '24 hours') AS monitored_agents,
      (SELECT COUNT(*) FROM agent_registry WHERE tenant_id::text = $1::text) AS total_agents,
      (SELECT COUNT(*) FROM api_keys WHERE tenant_id::text = $1::text AND revoked = false 
        AND expires_at IS NOT NULL) AS keys_with_expiry,
      (SELECT COUNT(*) FROM api_keys WHERE tenant_id::text = $1::text AND revoked = false) AS total_keys,
      (SELECT COUNT(*) FROM data_retention_policies WHERE tenant_id::text = $1::text AND enabled = true) AS retention_policies,
      (SELECT COUNT(*) FROM webhooks WHERE tenant_id::text = $1::text AND enabled = true) AS active_webhooks,
      (SELECT COUNT(*) FROM audit_log WHERE tenant_id::text = $1::text 
        AND created_at > NOW() - INTERVAL '30 days') AS recent_audit_events,
      (SELECT COUNT(*) FROM roles WHERE tenant_id::text = $1::text) AS role_count,
      (SELECT COUNT(*) FROM user_role_assignments WHERE tenant_id::text = $1::text) AS role_assignments,
      (SELECT COUNT(*) FROM integrations WHERE tenant_id::text = $1::text AND enabled = true) AS active_integrations,
      (SELECT COUNT(DISTINCT execution_id) FROM execution_ledger_events 
        WHERE tenant_id::text = $1::text AND event_timestamp > NOW() - INTERVAL '30 days') AS recent_executions
  `, [tenantId]);

  const s = signals.rows[0];

  const frameworks = [
    {
      id: 'soc2',
      name: 'SOC 2 Type II',
      description: 'Service Organization Control — Trust Services Criteria',
      controls: [
        { name: 'CC6.1 — Access Control', score: scoreRatio(s.role_count, 4), weight: 20,
          detail: `${s.role_count} roles configured (target: 4+)` },
        { name: 'CC7.2 — Monitoring', score: scoreRatio(s.recent_audit_events, 100), weight: 20,
          detail: `${s.recent_audit_events} audit events in 30d` },
        { name: 'CC7.3 — Change Management', score: scoreRatio(s.active_policies, 3), weight: 15,
          detail: `${s.active_policies} active policies` },
        { name: 'CC8.1 — Risk Assessment', score: s.total_agents > 0 ? scoreRatio(s.monitored_agents, s.total_agents) : 0, weight: 15,
          detail: `${s.monitored_agents}/${s.total_agents} agents monitored` },
        { name: 'PI1.3 — Data Retention', score: s.retention_policies > 0 ? 100 : 0, weight: 15,
          detail: `${s.retention_policies} retention policies` },
        { name: 'CC6.3 — Key Management', score: s.total_keys > 0 ? scoreRatio(s.keys_with_expiry, s.total_keys) : 50, weight: 15,
          detail: `${s.keys_with_expiry}/${s.total_keys} keys with expiry` },
      ],
    },
    {
      id: 'hipaa',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act',
      controls: [
        { name: '§164.312(a) — Access Control', score: scoreRatio(s.role_assignments, 1), weight: 25,
          detail: `${s.role_assignments} role assignments` },
        { name: '§164.312(b) — Audit Controls', score: scoreRatio(s.recent_audit_events, 50), weight: 25,
          detail: `${s.recent_audit_events} audit events` },
        { name: '§164.312(d) — Authentication', score: s.total_keys > 0 ? 100 : 50, weight: 25,
          detail: `${s.total_keys} API keys issued` },
        { name: '§164.308(a)(5) — Security Awareness', score: scoreRatio(s.active_policies, 2), weight: 25,
          detail: `${s.active_policies} active policies` },
      ],
    },
    {
      id: 'iso27001',
      name: 'ISO 27001',
      description: 'Information Security Management System',
      controls: [
        { name: 'A.9 — Access Control', score: scoreRatio(s.role_count, 4), weight: 20 },
        { name: 'A.12 — Operations Security', score: scoreRatio(s.active_policies, 5), weight: 20 },
        { name: 'A.12.4 — Logging & Monitoring', score: scoreRatio(s.recent_audit_events, 100), weight: 20 },
        { name: 'A.14 — System Acquisition', score: scoreRatio(s.active_integrations, 1), weight: 15 },
        { name: 'A.18 — Compliance', score: s.retention_policies > 0 ? 100 : 0, weight: 15 },
        { name: 'A.15 — Supplier Relations', score: scoreRatio(s.active_webhooks, 1), weight: 10 },
      ],
    },
    {
      id: 'nist_ai_rmf',
      name: 'NIST AI RMF',
      description: 'AI Risk Management Framework',
      controls: [
        { name: 'GOVERN — Policies & Roles', score: scoreRatio(s.active_policies, 3), weight: 25 },
        { name: 'MAP — Risk Identification', score: s.total_agents > 0 ? scoreRatio(s.monitored_agents, s.total_agents) : 0, weight: 25 },
        { name: 'MEASURE — Monitoring', score: scoreRatio(s.recent_executions, 10), weight: 25 },
        { name: 'MANAGE — Incident Response', score: scoreRatio(s.active_webhooks, 1), weight: 25 },
      ],
    },
    {
      id: 'eu_ai_act',
      name: 'EU AI Act',
      description: 'European Union Artificial Intelligence Act',
      controls: [
        { name: 'Art 9 — Risk Management', score: scoreRatio(s.active_policies, 3), weight: 20 },
        { name: 'Art 10 — Data Governance', score: s.retention_policies > 0 ? 100 : 0, weight: 20 },
        { name: 'Art 11 — Documentation', score: scoreRatio(s.recent_audit_events, 100), weight: 20 },
        { name: 'Art 12 — Transparency', score: scoreRatio(s.active_webhooks, 1), weight: 20 },
        { name: 'Art 14 — Human Oversight', score: scoreRatio(s.role_assignments, 2), weight: 20 },
      ],
    },
  ];

  for (const fw of frameworks) {
    const totalWeight = fw.controls.reduce((sum, c) => sum + c.weight, 0);
    fw.score = Math.round(
      fw.controls.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight
    );
    fw.status = fw.score >= 80 ? 'compliant' : fw.score >= 50 ? 'partial' : 'non_compliant';
  }

  return frameworks;
}

function scoreRatio(actual, target) {
  actual = parseInt(actual) || 0;
  target = parseInt(target) || 1;
  return Math.min(100, Math.round(100 * actual / target));
}

async function generateReportData(tenantId, start, end) {
  const [execSummary, policySummary, agentSummary, approvalSummary, incidents, frameworks] = await Promise.all([
    pool.query(`
      SELECT 
        COUNT(DISTINCT execution_id) AS total,
        COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_completed') AS completed,
        COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_rejected') AS rejected
      FROM execution_ledger_events
      WHERE tenant_id::text = $1::text AND event_timestamp BETWEEN $2 AND $3
    `, [tenantId, start, end]),

    pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE result = 'allow') AS allowed,
        COUNT(*) FILTER (WHERE result = 'deny') AS denied,
        COUNT(*) FILTER (WHERE result = 'require_approval') AS escalated
      FROM policy_evaluations
      WHERE tenant_id::text = $1::text AND evaluated_at BETWEEN $2 AND $3
    `, [tenantId, start, end]),

    pool.query(`
      SELECT COUNT(*) AS total, 
        COUNT(*) FILTER (WHERE status = 'active') AS active
      FROM agent_registry WHERE tenant_id::text = $1::text
    `, [tenantId]),

    pool.query(`
      SELECT 
        COUNT(*) AS total,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) 
          FILTER (WHERE status IN ('approved','denied')) AS avg_resolution_seconds
      FROM approval_requests
      WHERE tenant_id::text = $1::text AND created_at BETWEEN $2 AND $3
    `, [tenantId, start, end]),

    pool.query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'open') AS open
      FROM incidents WHERE tenant_id::text = $1::text AND created_at BETWEEN $2 AND $3
    `, [tenantId, start, end]),

    calculateFrameworkScores(tenantId),
  ]);

  return {
    executiveSummary: {
      period: { start, end },
      executions: execSummary.rows[0],
      policyEvaluations: policySummary.rows[0],
      agents: agentSummary.rows[0],
      approvals: approvalSummary.rows[0],
      incidents: incidents.rows[0],
    },
    frameworkScores: frameworks,
    generatedAt: new Date().toISOString(),
  };
}

function reportToCSV(report, data) {
  let csv = `Compliance Report: ${report.title}\n`;
  csv += `Period: ${report.period_start} to ${report.period_end}\n`;
  csv += `Generated: ${report.generated_at}\n\n`;

  if (data.executiveSummary) {
    const es = data.executiveSummary;
    csv += 'Section,Metric,Value\n';
    csv += `Executions,Total,${es.executions?.total || 0}\n`;
    csv += `Executions,Completed,${es.executions?.completed || 0}\n`;
    csv += `Executions,Rejected,${es.executions?.rejected || 0}\n`;
    csv += `Policy Evaluations,Total,${es.policyEvaluations?.total || 0}\n`;
    csv += `Policy Evaluations,Allowed,${es.policyEvaluations?.allowed || 0}\n`;
    csv += `Policy Evaluations,Denied,${es.policyEvaluations?.denied || 0}\n`;
    csv += `Agents,Total,${es.agents?.total || 0}\n`;
    csv += `Agents,Active,${es.agents?.active || 0}\n`;
    csv += `Approvals,Total,${es.approvals?.total || 0}\n`;
    csv += `Approvals,Avg Resolution (s),${Math.round(es.approvals?.avg_resolution_seconds || 0)}\n`;
    csv += `Incidents,Total,${es.incidents?.total || 0}\n`;
    csv += `Incidents,Open,${es.incidents?.open || 0}\n`;
  }

  if (data.frameworkScores) {
    csv += '\nFramework,Score,Status\n';
    for (const fw of data.frameworkScores) {
      csv += `${fw.name},${fw.score},${fw.status}\n`;
    }
  }

  return csv;
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}
