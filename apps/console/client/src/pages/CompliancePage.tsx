/**
 * Compliance Page — Vienna OS
 * 
 * One-click governance reports for board presentation.
 * Quick stats dashboard, report generator, viewer, history, and scheduling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  complianceApi,
  type QuickStats,
  type ComplianceReport,
  type ReportTemplate,
  type ReportsListResponse,
} from '../api/compliance.js';

// ─── Section Labels ─────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  governance_overview: 'Governance Overview',
  action_volume: 'Action Volume',
  policy_compliance: 'Policy Compliance',
  agent_performance: 'Agent Performance',
  risk_analysis: 'Risk Analysis',
  approval_metrics: 'Approval Metrics',
  violations_incidents: 'Violations & Incidents',
  integration_health: 'Integration Health',
  recommendations: 'Recommendations',
};

const ALL_SECTIONS = Object.keys(SECTION_LABELS);

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '0' } as React.CSSProperties,
  
  // Quick Stats
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px', marginBottom: '28px',
  } as React.CSSProperties,
  statCard: (color: string) => ({
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', padding: '20px', textAlign: 'center' as const,
    borderTop: `3px solid ${color}`,
  }),
  statValue: (color: string) => ({
    fontSize: '32px', fontWeight: 700, color, lineHeight: 1.1,
  }),
  statLabel: {
    fontSize: '11px', color: '#94a3b8', marginTop: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  } as React.CSSProperties,
  statUnit: { fontSize: '14px', fontWeight: 400, color: '#64748b' } as React.CSSProperties,

  // Period Selector
  periodBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  periodBtn: (active: boolean) => ({
    padding: '6px 14px', fontSize: '12px', fontWeight: active ? 600 : 400,
    color: active ? '#a78bfa' : '#94a3b8',
    background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'),
    borderRadius: '6px', cursor: 'pointer', marginLeft: '6px',
  }),

  // Tabs
  tabBar: {
    display: 'flex', gap: '2px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '10px 18px', fontSize: '13px', fontWeight: active ? 600 : 400,
    color: active ? '#a78bfa' : '#94a3b8',
    background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
    border: 'none', borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    borderRadius: '6px 6px 0 0', cursor: 'pointer',
  }),

  // Buttons
  primaryBtn: {
    padding: '10px 20px', fontSize: '13px', fontWeight: 600, color: '#fff',
    background: '#7c3aed', border: 'none', borderRadius: '8px', cursor: 'pointer',
  } as React.CSSProperties,
  secondaryBtn: {
    padding: '8px 16px', fontSize: '12px', fontWeight: 500, color: '#a78bfa',
    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: '6px', cursor: 'pointer',
  } as React.CSSProperties,
  dangerBtn: {
    padding: '6px 12px', fontSize: '11px', fontWeight: 500, color: '#f87171',
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '4px', cursor: 'pointer',
  } as React.CSSProperties,
  ghostBtn: {
    padding: '6px 12px', fontSize: '11px', fontWeight: 500, color: '#94a3b8',
    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '4px', cursor: 'pointer',
  } as React.CSSProperties,

  // Modal
  overlay: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px', padding: '28px', width: '520px', maxHeight: '80vh', overflow: 'auto',
  } as React.CSSProperties,
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '20px' } as React.CSSProperties,

  // Form
  formGroup: { marginBottom: '16px' } as React.CSSProperties,
  label: { display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,
  select: {
    width: '100%', padding: '10px 12px', fontSize: '13px', color: '#e2e8f0',
    background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', outline: 'none',
  } as React.CSSProperties,
  input: {
    width: '100%', padding: '10px 12px', fontSize: '13px', color: '#e2e8f0',
    background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', outline: 'none',
  } as React.CSSProperties,
  checkbox: { marginRight: '8px' } as React.CSSProperties,
  checkboxLabel: { fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' } as React.CSSProperties,

  // Table
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' } as React.CSSProperties,
  th: {
    padding: '10px 12px', textAlign: 'left' as const, fontWeight: 600, color: '#94a3b8',
    borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '11px',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  } as React.CSSProperties,
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' } as React.CSSProperties,

  // Report Viewer
  viewerWrapper: {
    background: '#ffffff', borderRadius: '12px', padding: '0', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  } as React.CSSProperties,
  viewerToolbar: {
    display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  } as React.CSSProperties,
  viewerContent: { padding: '32px 40px' } as React.CSSProperties,
  viewerNav: {
    position: 'sticky' as const, top: 0, display: 'flex', flexDirection: 'column' as const,
    gap: '2px', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRight: '1px solid #e2e8f0',
    minWidth: '200px',
  } as React.CSSProperties,
  viewerNavItem: (active: boolean) => ({
    padding: '8px 12px', fontSize: '12px', fontWeight: active ? 600 : 400,
    color: active ? '#7c3aed' : '#64748b', background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
    border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left' as const,
  }),

  // Badges
  badge: (color: string, bg: string) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: 600, color, background: bg,
  }),
  statusBadge: (status: string) => {
    const map: Record<string, [string, string]> = {
      ready: ['#166534', '#dcfce7'], generating: ['#854d0e', '#fef9c3'],
      failed: ['#991b1b', '#fee2e2'], scheduled: ['#1e40af', '#dbeafe'],
    };
    const [c, b] = map[status] || ['#64748b', '#f1f5f9'];
    return { display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: c, background: b };
  },

  // Section in viewer
  sectionBlock: { marginBottom: '32px', color: '#1a1a2e' } as React.CSSProperties,
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' } as React.CSSProperties,
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' } as React.CSSProperties,
  kpiCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', textAlign: 'center' as const } as React.CSSProperties,
  kpiValue: (color = '#1a1a2e') => ({ fontSize: '24px', fontWeight: 700, color }),
  kpiLabel: { fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,

  barRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } as React.CSSProperties,
  barLabel: { width: '120px', fontSize: '12px', fontWeight: 500, color: '#334155', textAlign: 'right' as const } as React.CSSProperties,
  barTrack: { flex: 1, height: '16px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' } as React.CSSProperties,
  barFill: (pct: number, color: string) => ({ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }),
  barValue: { width: '36px', fontSize: '12px', fontWeight: 600, color: '#334155' } as React.CSSProperties,

  dataTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px', marginBottom: '12px' } as React.CSSProperties,
  dtTh: { padding: '8px 10px', textAlign: 'left' as const, fontWeight: 600, color: '#334155', borderBottom: '2px solid #e2e8f0', background: '#f1f5f9', fontSize: '10px', textTransform: 'uppercase' as const } as React.CSSProperties,
  dtTd: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', color: '#1a1a2e' } as React.CSSProperties,

  trustBar: (score: number) => {
    const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
    return { display: 'inline-flex', alignItems: 'center', gap: '4px', color };
  },

  highlight: { background: '#f8fafc', borderRadius: '8px', padding: '14px 18px', marginTop: '12px' } as React.CSSProperties,
  highlightItem: { fontSize: '13px', color: '#334155', marginBottom: '4px', lineHeight: 1.5 } as React.CSSProperties,

  rec: (severity: string) => {
    const map: Record<string, [string, string]> = { critical: ['#fef2f2', '#ef4444'], warning: ['#fffbeb', '#f59e0b'], info: ['#eff6ff', '#3b82f6'] };
    const [bg, border] = map[severity] || ['#f8fafc', '#94a3b8'];
    return { padding: '12px 14px', borderRadius: '8px', marginBottom: '8px', borderLeft: `4px solid ${border}`, background: bg };
  },
  recCategory: { fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginLeft: '8px' } as React.CSSProperties,
  recMessage: { fontSize: '13px', color: '#1a1a2e', margin: '4px 0' } as React.CSSProperties,
  recAction: { fontSize: '12px', color: '#64748b', fontStyle: 'italic' } as React.CSSProperties,

  callout: (type: 'green' | 'yellow') => ({
    padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', fontSize: '13px',
    background: type === 'green' ? '#f0fdf4' : '#fffbeb',
    borderLeft: `4px solid ${type === 'green' ? '#22c55e' : '#f59e0b'}`,
    color: '#1a1a2e',
  }),

  empty: { textAlign: 'center' as const, padding: '60px 20px', color: '#64748b' } as React.CSSProperties,
  spinner: { display: 'inline-block', width: '16px', height: '16px', border: '2px solid #7c3aed', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' } as React.CSSProperties,
};

// ─── Main Component ─────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'history' | 'viewer' | 'schedules';

export function CompliancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [viewingReport, setViewingReport] = useState<ComplianceReport | null>(null);
  const [activeViewerSection, setActiveViewerSection] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch data
  const fetchStats = useCallback(async () => {
    try { const data = await complianceApi.getQuickStats(period); setStats(data); } catch (e) { console.error('Stats error:', e); }
  }, [period]);

  const fetchReports = useCallback(async () => {
    try {
      const data = await complianceApi.listReports();
      setReports(data.reports); setReportsTotal(data.total);
    } catch (e) { console.error('Reports error:', e); }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try { const data = await complianceApi.listTemplates(); setTemplates(data); } catch (e) { console.error('Templates error:', e); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); fetchTemplates(); }, [fetchReports, fetchTemplates]);

  // Actions
  const handleViewReport = async (id: string) => {
    setLoading(true);
    try {
      const report = await complianceApi.getReport(id);
      setViewingReport(report);
      const rd = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
      const firstSection = Object.keys(rd.sections || {})[0] || '';
      setActiveViewerSection(firstSection);
      setTab('viewer');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try { await complianceApi.deleteReport(id); fetchReports(); } catch (e: any) { setError(e.message); }
  };

  const handleGenerated = (report: ComplianceReport) => {
    setShowGenerateModal(false);
    fetchReports();
    // Poll until ready
    const poll = setInterval(async () => {
      try {
        const r = await complianceApi.getReport(report.id);
        if (r.status === 'ready' || r.status === 'failed') {
          clearInterval(poll);
          fetchReports();
          if (r.status === 'ready') handleViewReport(r.id);
        }
      } catch { clearInterval(poll); }
    }, 2000);
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Compliance Reports</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Board-ready governance reports with real data</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.secondaryBtn} onClick={() => setShowScheduleModal(true)}>Schedule Report</button>
          <button style={s.primaryBtn} onClick={() => setShowGenerateModal(true)}>Generate Report</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {(['dashboard', 'history', 'viewer', 'schedules'] as Tab[]).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 Dashboard' : t === 'history' ? '📋 Reports' : t === 'viewer' ? '📄 Viewer' : '⏰ Schedules'}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button></div>}

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div>
          <div style={s.periodBar}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Reporting period</span>
            <div>
              {[7, 30, 90, 365].map(d => (
                <button key={d} style={s.periodBtn(period === d)} onClick={() => setPeriod(d)}>
                  {d === 365 ? '1y' : `${d}d`}
                </button>
              ))}
            </div>
          </div>
          {stats ? (
            <div style={s.statsGrid}>
              <div style={s.statCard('#7c3aed')}>
                <div style={s.statValue('#a78bfa')}>{stats.total_actions.toLocaleString()}</div>
                <div style={s.statLabel}>Actions Governed</div>
              </div>
              <div style={s.statCard(stats.compliance_rate >= 95 ? '#22c55e' : '#ef4444')}>
                <div style={s.statValue(stats.compliance_rate >= 95 ? '#4ade80' : '#f87171')}>{stats.compliance_rate}%</div>
                <div style={s.statLabel}>Compliance Rate</div>
              </div>
              <div style={s.statCard(stats.policy_violations > 10 ? '#ef4444' : stats.policy_violations > 0 ? '#f59e0b' : '#22c55e')}>
                <div style={s.statValue(stats.policy_violations > 10 ? '#f87171' : stats.policy_violations > 0 ? '#fbbf24' : '#4ade80')}>{stats.policy_violations}</div>
                <div style={s.statLabel}>Policy Violations</div>
              </div>
              <div style={s.statCard('#3b82f6')}>
                <div style={s.statValue('#60a5fa')}>{stats.avg_approval_time_minutes}<span style={s.statUnit}> min</span></div>
                <div style={s.statLabel}>Avg Approval Time</div>
              </div>
              <div style={s.statCard(stats.unauthorized_executions > 0 ? '#ef4444' : '#22c55e')}>
                <div style={s.statValue(stats.unauthorized_executions > 0 ? '#f87171' : '#4ade80')}>{stats.unauthorized_executions}</div>
                <div style={s.statLabel}>Unauthorized Executions</div>
              </div>
              <div style={s.statCard(stats.fleet_health_score >= 80 ? '#22c55e' : stats.fleet_health_score >= 60 ? '#f59e0b' : '#ef4444')}>
                <div style={s.statValue(stats.fleet_health_score >= 80 ? '#4ade80' : stats.fleet_health_score >= 60 ? '#fbbf24' : '#f87171')}>
                  {stats.fleet_health_score}<span style={s.statUnit}>/100</span>
                </div>
                <div style={s.statLabel}>Fleet Health Score</div>
              </div>
            </div>
          ) : (
            <div style={s.empty}><div style={s.spinner} /> Loading stats...</div>
          )}

          {/* Recent Reports */}
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Recent Reports</h3>
          {reports.length > 0 ? (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Title</th><th style={s.th}>Type</th><th style={s.th}>Status</th>
                  <th style={s.th}>Generated</th><th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.title}</td>
                    <td style={s.td}><span style={s.badge('#a78bfa', 'rgba(124,58,237,0.15)')}>{r.report_type}</span></td>
                    <td style={s.td}><span style={s.statusBadge(r.status)}>{r.status}</span></td>
                    <td style={s.td}>{new Date(r.generated_at).toLocaleDateString()}</td>
                    <td style={s.td}>
                      {r.status === 'ready' && <button style={s.ghostBtn} onClick={() => handleViewReport(r.id)}>View</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={s.empty}>No reports yet. Generate your first compliance report above.</div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th><th style={s.th}>Type</th><th style={s.th}>Period</th>
                <th style={s.th}>Generated By</th><th style={s.th}>Date</th><th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td style={s.td}>{r.title}</td>
                  <td style={s.td}><span style={s.badge('#a78bfa', 'rgba(124,58,237,0.15)')}>{r.report_type}</span></td>
                  <td style={{ ...s.td, fontSize: '11px' }}>
                    {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                  </td>
                  <td style={s.td}>{r.generated_by}</td>
                  <td style={s.td}>{new Date(r.generated_at).toLocaleString()}</td>
                  <td style={s.td}><span style={s.statusBadge(r.status)}>{r.status}</span></td>
                  <td style={{ ...s.td, display: 'flex', gap: '4px' }}>
                    {r.status === 'ready' && (
                      <>
                        <button style={s.ghostBtn} onClick={() => handleViewReport(r.id)}>View</button>
                        <a href={complianceApi.getPdfUrl(r.id)} target="_blank" rel="noreferrer" style={{ ...s.ghostBtn, textDecoration: 'none' }}>PDF</a>
                        <a href={complianceApi.getCsvUrl(r.id)} style={{ ...s.ghostBtn, textDecoration: 'none' }}>CSV</a>
                      </>
                    )}
                    <button style={s.dangerBtn} onClick={() => handleDeleteReport(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <div style={s.empty}>No reports generated yet.</div>}
        </div>
      )}

      {/* Viewer Tab */}
      {tab === 'viewer' && (
        viewingReport ? <ReportViewer report={viewingReport} activeSection={activeViewerSection} onSectionChange={setActiveViewerSection} onBack={() => { setViewingReport(null); setTab('history'); }} /> :
        <div style={s.empty}>Select a report from the History tab to view it.</div>
      )}

      {/* Schedules Tab */}
      {tab === 'schedules' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <button style={s.primaryBtn} onClick={() => setShowScheduleModal(true)}>+ Add Schedule</button>
          </div>
          {reports.filter(r => r.schedule_cron).length > 0 ? (
            <table style={s.table}>
              <thead><tr><th style={s.th}>Report Type</th><th style={s.th}>Schedule</th><th style={s.th}>Recipients</th></tr></thead>
              <tbody>
                {reports.filter(r => r.schedule_cron).map(r => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.report_type}</td>
                    <td style={s.td}><code style={{ fontSize: '12px', color: '#a78bfa' }}>{r.schedule_cron}</code></td>
                    <td style={s.td}>{(r.recipients || []).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={s.empty}>No scheduled reports. Set up recurring report generation.</div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && <GenerateModal templates={templates} onClose={() => setShowGenerateModal(false)} onGenerated={handleGenerated} />}

      {/* Schedule Modal */}
      {showScheduleModal && <ScheduleModal onClose={() => setShowScheduleModal(false)} onCreated={() => { setShowScheduleModal(false); fetchReports(); }} />}
    </div>
  );
}

// ─── Generate Report Modal ──────────────────────────────────────────────────

function GenerateModal({ templates, onClose, onGenerated }: { templates: ReportTemplate[]; onClose: () => void; onGenerated: (r: ComplianceReport) => void }) {
  const [reportType, setReportType] = useState('quarterly');
  const [templateId, setTemplateId] = useState('');
  const [sections, setSections] = useState<string[]>([...ALL_SECTIONS]);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleSection = (s: string) => {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const params: any = { report_type: reportType, sections };
      if (templateId) params.template_id = templateId;
      if (reportType === 'custom' && customStart) params.period_start = customStart;
      if (reportType === 'custom' && customEnd) params.period_end = customEnd;
      const report = await complianceApi.generateReport(params);
      onGenerated(report);
    } catch (e: any) {
      alert('Generation failed: ' + e.message);
    } finally { setGenerating(false); }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <h2 style={s.modalTitle}>Generate Compliance Report</h2>

        <div style={s.formGroup}>
          <label style={s.label}>Report Type</label>
          <select style={s.select} value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {reportType === 'custom' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ ...s.formGroup, flex: 1 }}>
              <label style={s.label}>Start Date</label>
              <input type="date" style={s.input} value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div style={{ ...s.formGroup, flex: 1 }}>
              <label style={s.label}>End Date</label>
              <input type="date" style={s.input} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {templates.length > 0 && (
          <div style={s.formGroup}>
            <label style={s.label}>Template</label>
            <select style={s.select} value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">All Sections (Default)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div style={s.formGroup}>
          <label style={s.label}>Sections</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {ALL_SECTIONS.map(sec => (
              <label key={sec} style={{ ...s.checkboxLabel, display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" style={s.checkbox} checked={sections.includes(sec)} onChange={() => toggleSection(sec)} />
                {SECTION_LABELS[sec]}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...s.primaryBtn, opacity: generating ? 0.6 : 1 }} disabled={generating} onClick={handleGenerate}>
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Modal ─────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [reportType, setReportType] = useState('weekly');
  const [frequency, setFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState('');
  const [creating, setCreating] = useState(false);

  const cronMap: Record<string, string> = {
    daily: '0 8 * * *',
    weekly: '0 8 * * 1',
    monthly: '0 8 1 * *',
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await complianceApi.createSchedule({
        report_type: reportType,
        schedule_cron: cronMap[frequency] || '0 8 * * 1',
        recipients: recipients.split(',').map(r => r.trim()).filter(Boolean),
      });
      onCreated();
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setCreating(false); }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <h2 style={s.modalTitle}>Schedule Recurring Report</h2>
        <div style={s.formGroup}>
          <label style={s.label}>Report Type</label>
          <select style={s.select} value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Frequency</label>
          <select style={s.select} value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="daily">Daily (8:00 AM)</option><option value="weekly">Weekly (Monday 8:00 AM)</option><option value="monthly">Monthly (1st, 8:00 AM)</option>
          </select>
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Recipients (comma-separated emails)</label>
          <input style={s.input} placeholder="ciso@company.com, cto@company.com" value={recipients} onChange={e => setRecipients(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button style={s.secondaryBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...s.primaryBtn, opacity: creating ? 0.6 : 1 }} disabled={creating} onClick={handleCreate}>
            {creating ? 'Creating...' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Viewer ──────────────────────────────────────────────────────────

function ReportViewer({ report, activeSection, onSectionChange, onBack }: {
  report: ComplianceReport; activeSection: string; onSectionChange: (s: string) => void; onBack: () => void;
}) {
  const data = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
  const sections = data.sections || {};
  const sectionKeys = Object.keys(sections);

  return (
    <div style={s.viewerWrapper}>
      {/* Toolbar */}
      <div style={s.viewerToolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ ...s.ghostBtn, color: '#64748b' }}>← Back</button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e' }}>{report.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href={complianceApi.getPdfUrl(report.id)} target="_blank" rel="noreferrer"
            style={{ ...s.primaryBtn, textDecoration: 'none', fontSize: '12px', padding: '8px 14px', background: '#1a1a2e' }}>
            Download PDF
          </a>
          <a href={complianceApi.getCsvUrl(report.id)}
            style={{ ...s.secondaryBtn, textDecoration: 'none', color: '#1a1a2e', borderColor: '#e2e8f0' }}>
            Export CSV
          </a>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Navigation sidebar */}
        <div style={s.viewerNav}>
          {sectionKeys.map((key, i) => (
            <button key={key} style={s.viewerNavItem(activeSection === key)} onClick={() => onSectionChange(key)}>
              {i + 1}. {SECTION_LABELS[key] || key}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={s.viewerContent}>
          {/* Report Header */}
          <div style={{ marginBottom: '32px', borderBottom: '3px solid #7c3aed', paddingBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '2px', marginBottom: '8px' }}>VIENNA OS</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>{report.title}</h1>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Period: <strong>{new Date(report.period_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong> — <strong>{new Date(report.period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              {' · '}Generated: {new Date(report.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Render all sections */}
          {sectionKeys.map((key, idx) => (
            <div key={key} id={`section-${key}`} style={s.sectionBlock}>
              <RenderSection sectionKey={key} data={sections[key]} index={idx + 1} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section Renderer ───────────────────────────────────────────────────────

function RenderSection({ sectionKey, data, index }: { sectionKey: string; data: any; index: number }) {
  if (!data || data.error) {
    return (
      <div>
        <h2 style={s.sectionTitle}>{index}. {SECTION_LABELS[sectionKey] || sectionKey}</h2>
        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>{data?.error || 'No data available'}</p>
      </div>
    );
  }

  switch (sectionKey) {
    case 'executive_summary': return <ExecutiveSummarySection data={data} index={index} />;
    case 'governance_overview': return <GovernanceOverviewSection data={data} index={index} />;
    case 'action_volume': return <ActionVolumeSection data={data} index={index} />;
    case 'policy_compliance': return <PolicyComplianceSection data={data} index={index} />;
    case 'agent_performance': return <AgentPerformanceSection data={data} index={index} />;
    case 'risk_analysis': return <RiskAnalysisSection data={data} index={index} />;
    case 'approval_metrics': return <ApprovalMetricsSection data={data} index={index} />;
    case 'violations_incidents': return <ViolationsSection data={data} index={index} />;
    case 'integration_health': return <IntegrationHealthSection data={data} index={index} />;
    case 'recommendations': return <RecommendationsSection data={data} index={index} />;
    default: return <div><h2 style={s.sectionTitle}>{index}. {sectionKey}</h2><pre style={{ fontSize: '11px', color: '#64748b' }}>{JSON.stringify(data, null, 2)}</pre></div>;
  }
}

function ExecutiveSummarySection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Executive Summary</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={data.total_actions_governed?.toLocaleString() || '0'} label="Actions Governed" />
        <KpiCard value={`${data.policy_compliance_rate || 0}%`} label="Compliance Rate" color={(data.policy_compliance_rate || 0) >= 95 ? '#16a34a' : '#dc2626'} />
        <KpiCard value={String(data.unauthorized_executions || 0)} label="Unauthorized Executions" color={data.unauthorized_executions === 0 ? '#16a34a' : '#dc2626'} />
        <KpiCard value={`${data.fleet_health_score || 0}/100`} label="Fleet Health" color={(data.fleet_health_score || 0) >= 80 ? '#16a34a' : '#f59e0b'} />
        <KpiCard value={String(data.active_agents || 0)} label="Active Agents" />
        <KpiCard value={`${data.avg_approval_time_minutes || 0} min`} label="Avg Approval Time" />
      </div>
      {data.highlights?.length > 0 && (
        <div style={s.highlight}>
          {data.highlights.map((h: string, i: number) => <p key={i} style={s.highlightItem}>• {h}</p>)}
        </div>
      )}
    </div>
  );
}

function GovernanceOverviewSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Governance Overview</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={String(data.active_rules_count || 0)} label="Active Rules" />
        <KpiCard value={String(data.rules_added_in_period || 0)} label="Rules Added" />
      </div>
      {data.action_distribution?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>Default Action Distribution</h3>
          <BarChart items={data.action_distribution.map((d: any) => ({
            label: d.action, value: d.count,
            color: d.action === 'deny' ? '#ef4444' : d.action === 'require_approval' ? '#f59e0b' : '#22c55e',
          }))} />
        </>
      )}
    </div>
  );
}

function ActionVolumeSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Action Volume</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={(data.total_intents || 0).toLocaleString()} label="Total Intents" />
      </div>
      {data.by_risk_tier?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>By Risk Tier</h3>
          <BarChart items={data.by_risk_tier.map((t: any) => ({
            label: t.tier, value: t.count,
            color: t.tier === 'T2' ? '#ef4444' : t.tier === 'T1' ? '#f59e0b' : '#22c55e',
          }))} />
        </>
      )}
      {data.by_action_type?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>By Action Type</h3>
          <table style={s.dataTable}>
            <thead><tr><th style={s.dtTh}>Type</th><th style={s.dtTh}>Count</th><th style={s.dtTh}>%</th></tr></thead>
            <tbody>{data.by_action_type.map((a: any) => {
              const pct = data.total_intents > 0 ? Math.round((a.count / data.total_intents) * 100) : 0;
              return <tr key={a.type}><td style={s.dtTd}>{a.type}</td><td style={s.dtTd}>{a.count}</td><td style={s.dtTd}><InlineBar pct={pct} /> {pct}%</td></tr>;
            })}</tbody>
          </table>
        </>
      )}
      {data.daily_trend?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>Daily Trend</h3>
          <MiniChart data={data.daily_trend} />
        </>
      )}
    </div>
  );
}

function PolicyComplianceSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Policy Compliance</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={(data.total_evaluations || 0).toLocaleString()} label="Rules Evaluated" />
        <KpiCard value={`${data.match_rate || 0}%`} label="Match Rate" />
      </div>
      {data.top_triggered_rules?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>Top Triggered Rules</h3>
          <table style={s.dataTable}>
            <thead><tr><th style={s.dtTh}>Rule</th><th style={s.dtTh}>Triggered</th><th style={s.dtTh}>Block Rate</th></tr></thead>
            <tbody>{data.top_triggered_rules.map((r: any) => (
              <tr key={r.rule_id}><td style={s.dtTd}>{r.name}</td><td style={s.dtTd}>{r.times_triggered}</td>
                <td style={s.dtTd}><span style={s.badge(r.block_rate > 50 ? '#991b1b' : '#854d0e', r.block_rate > 50 ? '#fee2e2' : '#fef9c3')}>{r.block_rate}%</span></td>
              </tr>
            ))}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

function AgentPerformanceSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Agent Performance</h2>
      {data.best_performer && <div style={s.callout('green')}>🏆 Best Performer: <strong>{data.best_performer.name}</strong> (Trust: {data.best_performer.trust_score}/100)</div>}
      {data.worst_performer && <div style={s.callout('yellow')}>⚠️ Needs Attention: <strong>{data.worst_performer.name}</strong> (Trust: {data.worst_performer.trust_score}/100)</div>}
      {data.scorecards?.length > 0 && (
        <table style={s.dataTable}>
          <thead><tr><th style={s.dtTh}>Agent</th><th style={s.dtTh}>Status</th><th style={s.dtTh}>Actions</th><th style={s.dtTh}>Approval</th><th style={s.dtTh}>Error</th><th style={s.dtTh}>Latency</th><th style={s.dtTh}>Trust</th></tr></thead>
          <tbody>{data.scorecards.map((a: any) => (
            <tr key={a.agent_id}>
              <td style={{ ...s.dtTd, fontWeight: 600 }}>{a.display_name}</td>
              <td style={s.dtTd}><span style={s.badge(
                a.status === 'active' ? '#166534' : a.status === 'suspended' ? '#991b1b' : '#64748b',
                a.status === 'active' ? '#dcfce7' : a.status === 'suspended' ? '#fee2e2' : '#f1f5f9'
              )}>{a.status}</span></td>
              <td style={s.dtTd}>{a.total_actions}</td>
              <td style={s.dtTd}>{a.approval_rate}%</td>
              <td style={{ ...s.dtTd, color: a.error_rate > 10 ? '#ef4444' : a.error_rate > 5 ? '#f59e0b' : '#22c55e' }}>{a.error_rate}%</td>
              <td style={s.dtTd}>{a.avg_latency_ms}ms</td>
              <td style={s.dtTd}><TrustBar score={a.trust_score} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function RiskAnalysisSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Risk Analysis</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={String(data.high_risk_actions?.total || 0)} label="High-Risk (T2) Actions" color="#ef4444" />
        <KpiCard value={String(data.scope_creep_attempts || 0)} label="Scope Creep Attempts" />
        <KpiCard value={String(data.anomalies_detected || 0)} label="Anomalies Detected" />
      </div>
      {data.top_denials?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>Top Denial Reasons</h3>
          <table style={s.dataTable}>
            <thead><tr><th style={s.dtTh}>Agent</th><th style={s.dtTh}>Action</th><th style={s.dtTh}>Denials</th></tr></thead>
            <tbody>{data.top_denials.map((d: any, i: number) => <tr key={i}><td style={s.dtTd}>{d.agent_id}</td><td style={s.dtTd}>{d.action_type}</td><td style={s.dtTd}>{d.count}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}

function ApprovalMetricsSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Approval Metrics</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={String(data.total_approvals_requested || 0)} label="Approvals Requested" />
        <KpiCard value={`${data.avg_time_to_approval_minutes || 0} min`} label="Avg Time to Approval" />
        <KpiCard value={`${data.approval_rate || 0}%`} label="Approval Rate" color="#16a34a" />
      </div>
      {data.by_tier?.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '16px 0 8px' }}>By Tier</h3>
          <BarChart items={data.by_tier.map((t: any) => ({ label: t.tier, value: t.count, color: '#7c3aed' }))} />
        </>
      )}
    </div>
  );
}

function ViolationsSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Violations & Incidents</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={String(data.total_violations || 0)} label="Total Violations" color={data.total_violations > 0 ? '#ef4444' : '#16a34a'} />
        <KpiCard value={String(data.unresolved_count || 0)} label="Unresolved" color={data.unresolved_count > 0 ? '#f59e0b' : '#16a34a'} />
      </div>
      {data.by_severity?.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {data.by_severity.map((sv: any) => (
            <span key={sv.severity} style={s.badge(
              sv.severity === 'critical' ? '#991b1b' : sv.severity === 'warning' ? '#854d0e' : '#1e40af',
              sv.severity === 'critical' ? '#fee2e2' : sv.severity === 'warning' ? '#fef9c3' : '#dbeafe',
            )}>{sv.severity}: {sv.count}</span>
          ))}
        </div>
      )}
      {data.incident_timeline?.length > 0 && (
        <table style={s.dataTable}>
          <thead><tr><th style={s.dtTh}>Time</th><th style={s.dtTh}>Agent</th><th style={s.dtTh}>Type</th><th style={s.dtTh}>Severity</th><th style={s.dtTh}>Message</th><th style={s.dtTh}>Resolved</th></tr></thead>
          <tbody>{data.incident_timeline.slice(0, 15).map((i: any) => (
            <tr key={i.id}>
              <td style={{ ...s.dtTd, fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(i.created_at).toLocaleString()}</td>
              <td style={s.dtTd}>{i.agent_id}</td><td style={s.dtTd}>{i.alert_type}</td>
              <td style={s.dtTd}><span style={s.badge(
                i.severity === 'critical' ? '#991b1b' : i.severity === 'warning' ? '#854d0e' : '#1e40af',
                i.severity === 'critical' ? '#fee2e2' : i.severity === 'warning' ? '#fef9c3' : '#dbeafe',
              )}>{i.severity}</span></td>
              <td style={{ ...s.dtTd, fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.message}</td>
              <td style={s.dtTd}>{i.resolved ? '✅' : '❌'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function IntegrationHealthSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Integration Health</h2>
      <div style={s.kpiGrid}>
        <KpiCard value={String(data.total_active || 0)} label="Active Integrations" />
        <KpiCard value={`${data.overall_delivery_rate || 100}%`} label="Delivery Rate" color="#16a34a" />
      </div>
      {data.integrations?.length > 0 && (
        <table style={s.dataTable}>
          <thead><tr><th style={s.dtTh}>Name</th><th style={s.dtTh}>Type</th><th style={s.dtTh}>Status</th><th style={s.dtTh}>Success Rate</th><th style={s.dtTh}>Events</th></tr></thead>
          <tbody>{data.integrations.map((i: any) => (
            <tr key={i.name}>
              <td style={s.dtTd}>{i.name}</td><td style={s.dtTd}>{i.type}</td>
              <td style={s.dtTd}><span style={s.badge(i.enabled ? '#166534' : '#64748b', i.enabled ? '#dcfce7' : '#f1f5f9')}>{i.enabled ? 'Active' : 'Disabled'}</span></td>
              <td style={s.dtTd}>{i.delivery_success_rate}%</td><td style={s.dtTd}>{i.events_in_period}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function RecommendationsSection({ data, index }: { data: any; index: number }) {
  return (
    <div>
      <h2 style={s.sectionTitle}>{index}. Recommendations</h2>
      {data.items?.length > 0 ? data.items.map((r: any, i: number) => (
        <div key={i} style={s.rec(r.severity)}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={s.badge(
              r.severity === 'critical' ? '#991b1b' : r.severity === 'warning' ? '#854d0e' : '#1e40af',
              r.severity === 'critical' ? '#fee2e2' : r.severity === 'warning' ? '#fef9c3' : '#dbeafe',
            )}>{r.severity.toUpperCase()}</span>
            <span style={s.recCategory}>{r.category}</span>
          </div>
          <p style={s.recMessage}>{r.message}</p>
          <p style={s.recAction}>→ {r.action}</p>
        </div>
      )) : (
        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No recommendations at this time. Governance posture is strong. ✅</p>
      )}
    </div>
  );
}

// ─── Shared Chart Components ────────────────────────────────────────────────

function KpiCard({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={s.kpiCard}>
      <div style={s.kpiValue(color || '#1a1a2e')}>{value}</div>
      <div style={s.kpiLabel}>{label}</div>
    </div>
  );
}

function BarChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={s.barRow}>
          <span style={s.barLabel}>{item.label}</span>
          <div style={s.barTrack}><div style={s.barFill((item.value / max) * 100, item.color)} /></div>
          <span style={s.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function InlineBar({ pct }: { pct: number }) {
  return (
    <span style={{ display: 'inline-block', width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', verticalAlign: 'middle', marginRight: '4px' }}>
      <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: '#7c3aed', borderRadius: '3px' }} />
    </span>
  );
}

function MiniChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '60px', borderBottom: '1px solid #e2e8f0' }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.date}: ${d.count}`}
          style={{ flex: 1, minWidth: '3px', background: '#7c3aed', borderRadius: '2px 2px 0 0', opacity: 0.8,
            height: `${Math.max(4, (d.count / max) * 56)}px` }} />
      ))}
    </div>
  );
}

function TrustBar({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <span style={s.trustBar(score)}>
      <span style={{ width: '40px', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', width: `${score}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </span>
      <span style={{ fontSize: '11px', fontWeight: 600 }}>{score}</span>
    </span>
  );
}
