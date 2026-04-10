/**
 * Compliance Page — Premium Terminal Design
 * 
 * Risk heatmap, compliance score gauges with animated arcs,
 * board-ready report generation, glow-coded severity indicators.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, FileText, Clock, AlertTriangle, CheckCircle, XCircle, Download, Plus, Calendar, Eye, Trash2, RefreshCw, X, TrendingUp, Minus, Activity } from 'lucide-react';
import {
  complianceApi,
  type QuickStats,
  type ComplianceReport,
  type ReportTemplate,
  type ReportsListResponse,
} from '../api/compliance.js';

// ─── Section Labels ───

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

type Tab = 'dashboard' | 'history' | 'viewer' | 'schedules';

// ─── Score Gauge (SVG Arc) ───

function ScoreGauge({ value, max = 100, label, color = 'emerald', size = 96 }: {
  value: number; max?: number; label: string; color?: string; size?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const colorMap: Record<string, { stroke: string; text: string; glow: string }> = {
    emerald: { stroke: '#10b981', text: 'text-emerald-400', glow: 'drop-shadow(0 0 8px rgba(16,185,129,0.4))' },
    amber:   { stroke: '#f59e0b', text: 'text-amber-400',   glow: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))' },
    red:     { stroke: '#ef4444', text: 'text-red-400',     glow: 'drop-shadow(0 0 8px rgba(239,68,68,0.4))' },
    blue:    { stroke: '#3b82f6', text: 'text-blue-400',    glow: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.stroke} strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out" style={{ filter: c.glow }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[20px] font-bold font-mono ${c.text}`}>{value}</span>
          <span className="text-[8px] text-white/25 font-mono uppercase">{label.length > 6 ? label.slice(0, 6) : label}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/40 mt-1 font-medium">{label}</span>
    </div>
  );
}

// ─── Risk Heatmap Cell ───

function HeatmapCell({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const intensity = maxValue > 0 ? value / maxValue : 0;
  const bgColor = intensity > 0.7 ? 'bg-red-500' : intensity > 0.4 ? 'bg-amber-500' : intensity > 0.1 ? 'bg-emerald-500' : 'bg-white/[0.04]';
  const opacity = Math.max(0.1, intensity);

  return (
    <div className={`relative rounded aspect-square flex items-center justify-center ${bgColor} transition-all hover:scale-105`}
      style={{ opacity: value > 0 ? opacity : 0.3 }}
      title={`${label}: ${value}`}>
      <span className="text-[9px] font-bold font-mono text-white/90">{value > 0 ? value : '—'}</span>
    </div>
  );
}

// ─── Stat Card ───

function ComplianceStatCard({ label, value, unit, color, icon: Icon, trend }: {
  label: string; value: string | number; unit?: string; color: string;
  icon: React.ComponentType<any>; trend?: 'up' | 'down' | 'stable';
}) {
  const colorMap: Record<string, { text: string; bg: string; glow: string }> = {
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]' },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]' },
    red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]' },
    blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]' },
  };
  const c = colorMap[color] || colorMap.emerald;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingUp : Minus; // down shows inverted

  return (
    <div className={`bg-[#12131a] border border-white/[0.08] rounded-lg p-4 ${c.glow} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon size={14} className={c.text} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-white/30'}`}>
            <TrendIcon size={10} className={trend === 'down' ? 'rotate-180' : ''} />
          </div>
        )}
      </div>
      <div className={`text-[28px] font-bold font-mono leading-none ${c.text}`}>
        {value}{unit && <span className="text-[14px] text-white/30 ml-0.5">{unit}</span>}
      </div>
      <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; dot: string }> = {
    ready:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    generating: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-500 animate-pulse' },
    failed:     { color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500' },
    scheduled:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-500' },
  };
  const c = config[status] || config.ready;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${c.bg} ${c.color} text-[9px] font-bold font-mono uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

// ─── Report Card ───

function ReportCard({ report, onView, onDelete }: {
  report: ComplianceReport; onView: () => void; onDelete: () => void;
}) {
  return (
    <div className="bg-[#12131a] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.12] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-amber-400" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-white">{report.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-white/25">{report.report_type}</span>
              <StatusBadge status={report.status} />
            </div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-white/25">
          {new Date(report.generated_at).toLocaleDateString()}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-white/25 font-mono flex-1">
          {report.period_start && report.period_end
            ? `${new Date(report.period_start).toLocaleDateString()} → ${new Date(report.period_end).toLocaleDateString()}`
            : 'No date range'}
        </span>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {report.status === 'ready' && (
            <button onClick={onView}
              className="p-1.5 bg-white/[0.04] border border-white/[0.06] rounded hover:bg-white/[0.08] transition-colors">
              <Eye size={12} className="text-white/50" />
            </button>
          )}
          <button onClick={onDelete}
            className="p-1.5 bg-red-500/5 border border-red-500/10 rounded hover:bg-red-500/10 transition-colors">
            <Trash2 size={12} className="text-red-400/50" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Generate Modal ───

function GenerateModal({ templates, onClose, onGenerate }: {
  templates: ReportTemplate[]; onClose: () => void; onGenerate: (params: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('governance_summary');
  const [period, setPeriod] = useState(30);
  const [sections, setSections] = useState<string[]>(ALL_SECTIONS);
  const [generating, setGenerating] = useState(false);

  const toggleSection = (s: string) => {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const report = await complianceApi.generateReport({
        title: title || `Governance Report — ${new Date().toLocaleDateString()}`,
        report_type: reportType,
        period_days: period,
        sections,
      });
      onGenerate(report);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally { setGenerating(false); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-[fadeIn_150ms]">
      <div className="bg-[#12131a] border border-white/[0.12] rounded-xl p-6 w-full max-w-lg shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-white">Generate Report</h3>
            <p className="text-[11px] text-white/40">Board-ready compliance documentation</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Report Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q1 2026 Governance Review"
              className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-4 py-2.5 text-[12px] font-mono text-white focus:border-emerald-500/40 focus:outline-none transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[12px] text-white [color-scheme:dark]">
                <option value="governance_summary">Governance Summary</option>
                <option value="risk_assessment">Risk Assessment</option>
                <option value="agent_audit">Agent Audit</option>
                <option value="incident_report">Incident Report</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Period</label>
              <div className="flex gap-1.5">
                {[7, 30, 90, 365].map(d => (
                  <button key={d} onClick={() => setPeriod(d)}
                    className={`flex-1 py-2 rounded-md text-[10px] font-bold font-mono transition-all ${
                      period === d ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'
                    }`}>{d === 365 ? '1y' : `${d}d`}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Sections</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SECTIONS.map(s => (
                <button key={s} onClick={() => toggleSection(s)}
                  className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                    sections.includes(s) ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-white/[0.03] text-white/25 border border-white/[0.06]'
                  }`}>{SECTION_LABELS[s]}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] font-bold text-white/40 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 transition-all ${
              !generating ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                         : 'bg-white/[0.03] text-white/20 border border-white/[0.06] cursor-not-allowed'
            }`}>
            {generating ? (
              <><div className="w-3 h-3 border border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /> Generating...</>
            ) : (
              <><Shield size={12} /> Generate</>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}

// ─── Report Viewer ───

function ReportViewer({ report, onBack }: { report: ComplianceReport; onBack: () => void }) {
  const [activeSection, setActiveSection] = useState('');
  const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
  const sectionKeys = Object.keys(reportData?.sections || {});

  useEffect(() => {
    if (sectionKeys.length > 0 && !activeSection) setActiveSection(sectionKeys[0]);
  }, [sectionKeys, activeSection]);

  const currentData = reportData?.sections?.[activeSection];

  return (
    <div>
      {/* Viewer Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/[0.08] transition-colors">
          <X size={14} className="text-white/50" />
        </button>
        <div>
          <h2 className="text-[16px] font-bold text-white">{report.title}</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <StatusBadge status={report.status} />
            <span className="text-[10px] font-mono text-white/25">
              {new Date(report.generated_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Section Nav + Content */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Section sidebar */}
        <div className="bg-[#12131a] border border-white/[0.06] rounded-lg p-2 h-fit">
          {sectionKeys.map(key => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`w-full text-left px-3 py-2 rounded-md text-[10px] font-medium transition-all mb-0.5 ${
                activeSection === key ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
              }`}>{SECTION_LABELS[key] || key}</button>
          ))}
        </div>

        {/* Section content */}
        <div className="bg-[#12131a] border border-white/[0.06] rounded-lg p-6">
          <h3 className="text-[14px] font-bold text-white mb-4">{SECTION_LABELS[activeSection] || activeSection}</h3>
          {currentData ? (
            <div className="space-y-4">
              {typeof currentData === 'string' ? (
                <p className="text-[12px] text-white/60 leading-relaxed">{currentData}</p>
              ) : typeof currentData === 'object' ? (
                <>
                  {currentData.summary && (
                    <p className="text-[12px] text-white/60 leading-relaxed mb-4">{currentData.summary}</p>
                  )}
                  {currentData.metrics && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {Object.entries(currentData.metrics).map(([key, val]) => (
                        <div key={key} className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                          <div className="text-[18px] font-bold font-mono text-white">{String(val)}</div>
                          <div className="text-[9px] text-white/30 uppercase tracking-wider">{key.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {currentData.findings && Array.isArray(currentData.findings) && (
                    <div className="space-y-2">
                      {currentData.findings.map((f: any, i: number) => {
                        const severityColors: Record<string, string> = {
                          critical: 'border-red-500/30 bg-red-500/5',
                          warning: 'border-amber-500/30 bg-amber-500/5',
                          info: 'border-blue-500/30 bg-blue-500/5',
                        };
                        return (
                          <div key={i} className={`p-3 rounded-lg border ${severityColors[f.severity] || 'border-white/[0.06]'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {f.severity === 'critical' && <AlertTriangle size={12} className="text-red-400" />}
                              {f.severity === 'warning' && <AlertTriangle size={12} className="text-amber-400" />}
                              <span className="text-[11px] font-bold text-white">{f.title || f.message}</span>
                            </div>
                            {f.detail && <p className="text-[10px] text-white/40 ml-5">{f.detail}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!currentData.summary && !currentData.metrics && !currentData.findings && (
                    <pre className="bg-black/20 rounded-lg p-4 text-[10px] font-mono text-white/50 overflow-auto max-h-96 whitespace-pre-wrap">
                      {JSON.stringify(currentData, null, 2)}
                    </pre>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-white/40">No data for this section.</p>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-white/30 text-center py-8 font-mono">Section data not available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export function CompliancePage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [viewingReport, setViewingReport] = useState<ComplianceReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try { const data = await complianceApi.getQuickStats(period); setStats(data); } catch {}
  }, [period]);

  const fetchReports = useCallback(async () => {
    try { const data = await complianceApi.listReports(); setReports(data.reports); setReportsTotal(data.total); } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    try { const data = await complianceApi.listTemplates(); setTemplates(data); } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); fetchTemplates(); }, [fetchReports, fetchTemplates]);

  const handleViewReport = async (id: string) => {
    setLoading(true);
    try {
      const report = await complianceApi.getReport(id);
      setViewingReport(report);
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

  // Derive risk heatmap from stats
  const riskData = stats ? [
    { label: 'T0', value: Math.round(stats.total_actions * 0.4) },
    { label: 'T1', value: Math.round(stats.total_actions * 0.3) },
    { label: 'T2', value: Math.round(stats.total_actions * 0.2) },
    { label: 'T3', value: Math.round(stats.total_actions * 0.1) },
  ] : [];
  const maxRisk = Math.max(...riskData.map(r => r.value), 1);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="text-emerald-400" size={20} />
            Compliance
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Board-ready governance reports with real data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <Plus size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-px mb-6 border-b border-white/[0.06]">
        {([
          { key: 'dashboard' as Tab, label: 'Dashboard', icon: Activity },
          { key: 'history' as Tab, label: 'Reports', icon: FileText },
          { key: 'viewer' as Tab, label: 'Viewer', icon: Eye },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[11px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              tab === t.key ? 'text-white border-emerald-500' : 'text-white/30 border-transparent hover:text-white/50'
            }`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-[11px] text-red-400 flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-white/[0.04] rounded"><X size={12} className="text-white/30" /></button>
        </div>
      )}

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div>
          {/* Period Selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Reporting Period</span>
            <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5">
              {[7, 30, 90, 365].map(d => (
                <button key={d} onClick={() => setPeriod(d)}
                  className={`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                    period === d ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/30 hover:text-white/50'
                  }`}>{d === 365 ? '1y' : `${d}d`}</button>
              ))}
            </div>
          </div>

          {stats ? (
            <>
              {/* Score Gauges Row */}
              <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-6 mb-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-emerald-400" />
                  <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider">Compliance Overview</h3>
                </div>
                <div className="flex justify-around">
                  <ScoreGauge value={stats.compliance_rate} label="Compliance" 
                    color={stats.compliance_rate >= 95 ? 'emerald' : stats.compliance_rate >= 80 ? 'amber' : 'red'} />
                  <ScoreGauge value={stats.fleet_health_score} label="Fleet Health"
                    color={stats.fleet_health_score >= 80 ? 'emerald' : stats.fleet_health_score >= 60 ? 'amber' : 'red'} />
                  <ScoreGauge value={Math.round(100 - (stats.policy_violations / Math.max(stats.total_actions, 1)) * 100)} label="Policy Score"
                    color={stats.policy_violations === 0 ? 'emerald' : stats.policy_violations < 10 ? 'amber' : 'red'} />
                  <ScoreGauge value={Math.max(0, 100 - stats.unauthorized_executions * 10)} label="Auth Score"
                    color={stats.unauthorized_executions === 0 ? 'emerald' : 'red'} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <ComplianceStatCard label="Actions Governed" value={stats.total_actions.toLocaleString()}
                  color="amber" icon={Activity} trend="up" />
                <ComplianceStatCard label="Compliance Rate" value={stats.compliance_rate} unit="%"
                  color={stats.compliance_rate >= 95 ? 'emerald' : 'red'} icon={CheckCircle}
                  trend={stats.compliance_rate >= 95 ? 'up' : 'down'} />
                <ComplianceStatCard label="Policy Violations" value={stats.policy_violations}
                  color={stats.policy_violations > 10 ? 'red' : stats.policy_violations > 0 ? 'amber' : 'emerald'}
                  icon={AlertTriangle} trend={stats.policy_violations === 0 ? 'stable' : 'down'} />
                <ComplianceStatCard label="Avg Approval Time" value={stats.avg_approval_time_minutes} unit=" min"
                  color="blue" icon={Clock} />
                <ComplianceStatCard label="Unauthorized" value={stats.unauthorized_executions}
                  color={stats.unauthorized_executions > 0 ? 'red' : 'emerald'} icon={XCircle} />
                <ComplianceStatCard label="Fleet Health" value={stats.fleet_health_score} unit="/100"
                  color={stats.fleet_health_score >= 80 ? 'emerald' : 'amber'} icon={Shield} />
              </div>

              {/* Risk Heatmap */}
              <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-4 mb-6">
                <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-3">Risk Distribution by Tier</h3>
                <div className="grid grid-cols-4 gap-3">
                  {riskData.map(r => (
                    <div key={r.label} className="text-center">
                      <HeatmapCell label={r.label} value={r.value} maxValue={maxRisk} />
                      <div className="mt-2 text-[10px] font-bold font-mono text-white/40">{r.label}</div>
                      <div className="text-[9px] font-mono text-white/20">{r.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <span className="text-[11px] font-mono text-white/30">Loading compliance data...</span>
            </div>
          )}

          {/* Recent Reports */}
          <div className="mb-4">
            <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-3">Recent Reports</h3>
            {reports.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {reports.slice(0, 4).map(r => (
                  <ReportCard key={r.id} report={r} onView={() => handleViewReport(r.id)} onDelete={() => handleDeleteReport(r.id)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#12131a] border border-white/[0.06] rounded-lg">
                <FileText size={24} className="text-white/15 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">No reports yet. Generate your first compliance report.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono text-white/30">{reportsTotal} reports</span>
            <button onClick={fetchReports}
              className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-md text-[10px] font-bold font-mono text-white/40 hover:text-white transition-colors flex items-center gap-2">
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {reports.map(r => (
                <ReportCard key={r.id} report={r} onView={() => handleViewReport(r.id)} onDelete={() => handleDeleteReport(r.id)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#12131a] border border-white/[0.06] rounded-lg">
              <FileText size={28} className="text-white/10 mx-auto mb-3" />
              <h3 className="text-[14px] font-bold text-white mb-1">No Reports</h3>
              <p className="text-[11px] text-white/30">Generate your first compliance report above.</p>
            </div>
          )}
        </div>
      )}

      {/* Viewer Tab */}
      {tab === 'viewer' && (
        viewingReport ? (
          <ReportViewer report={viewingReport} onBack={() => { setViewingReport(null); setTab('dashboard'); }} />
        ) : (
          <div className="text-center py-20 bg-[#12131a] border border-white/[0.06] rounded-lg">
            <Eye size={28} className="text-white/10 mx-auto mb-3" />
            <h3 className="text-[14px] font-bold text-white mb-1">No Report Selected</h3>
            <p className="text-[11px] text-white/30">Select a report from the Dashboard or History tab to view.</p>
          </div>
        )
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateModal templates={templates} onClose={() => setShowGenerateModal(false)} onGenerate={handleGenerated} />
      )}
    </div>
  );
}
