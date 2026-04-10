/**
 * History Page — Premium Terminal Design
 * 
 * Execution ledger & audit trail with timeline visualization,
 * type-coded glow indicators, filter controls, CSV/PDF export.
 */

import React, { useState, useEffect } from 'react';
import { Clock, Download, FileText, Filter, RefreshCw, Search } from 'lucide-react';
import { exportCSV, exportPrintReport } from '../utils/exportReport.js';
import { addToast } from '../store/toastStore.js';

// ─── Types ───

interface AuditEntry {
  id: string;
  type: 'intent' | 'warrant' | 'execution' | 'verification' | 'policy' | 'anomaly';
  action: string;
  status: 'success' | 'failed' | 'pending' | 'rejected';
  timestamp: string;
  tenant_id?: string;
  execution_id?: string;
  details?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; label: string }> = {
  intent:       { icon: '🎯', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20', label: 'Intent' },
  warrant:      { icon: '🔐', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20', label: 'Warrant' },
  execution:    { icon: '⚡', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Execution' },
  verification: { icon: '🔍', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20', label: 'Verification' },
  policy:       { icon: '📋', color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20', label: 'Policy' },
  anomaly:      { icon: '⚠️', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20', label: 'Anomaly' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  success:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  failed:   { color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500' },
  pending:  { color: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-500 animate-pulse' },
  rejected: { color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500' },
};

// ─── Audit Entry Card ───

function AuditCard({ entry }: { entry: AuditEntry }) {
  const type = TYPE_CONFIG[entry.type] || TYPE_CONFIG.intent;
  const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.success;
  const isAnomaly = entry.type === 'anomaly';

  return (
    <div className={`bg-[#12131a] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.12] transition-all group ${
      isAnomaly ? 'shadow-[0_0_12px_rgba(239,68,68,0.15)]' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-1">
          <div className={`w-8 h-8 rounded-lg ${type.bg} border ${type.border} flex items-center justify-center text-sm`}>
            {type.icon}
          </div>
          <div className="w-[2px] flex-1 bg-white/[0.06] mt-2 min-h-[12px]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`px-2 py-0.5 rounded ${type.bg} ${type.color} text-[9px] font-bold font-mono uppercase border ${type.border}`}>
              {type.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${status.bg} ${status.color} text-[9px] font-bold font-mono uppercase`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {entry.status}
            </span>
            {entry.execution_id && (
              <span className="px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.06] rounded text-[8px] font-mono text-white/25">
                {entry.execution_id.slice(0, 12)}
              </span>
            )}
          </div>
          <div className="text-[12px] font-medium text-white font-mono">{entry.action}</div>
          {entry.details && (
            <div className="text-[10px] text-white/35 mt-1 font-mono">{entry.details}</div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-right flex-shrink-0">
          <div className="text-[11px] font-bold font-mono text-white/50">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
          <div className="text-[9px] font-mono text-white/20">
            {new Date(entry.timestamp).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export function HistoryPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [filterType, setFilterType] = useState('all');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadHistory(); }, [timeRange, filterType]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/audit/recent?limit=50', { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setEntries(data.data?.entries || []); }
    } catch {} finally { setLoading(false); }
  };

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.type === filterType);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
            <Clock className="text-amber-400" size={20} />
            History
          </h1>
          <p className="text-[12px] text-white/40 mt-1 font-mono">Execution ledger — every action, warrant, and verification</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            if (!entries.length) { addToast('No entries', 'warning'); return; }
            exportCSV(`vienna-audit-${new Date().toISOString().slice(0, 10)}.csv`, [{
              title: 'Audit Trail', headers: ['ID', 'Type', 'Action', 'Status', 'Details', 'Timestamp'],
              rows: entries.map(e => [e.id, e.type, e.action, e.status, e.details || '', e.timestamp]),
            }]);
            addToast(`Exported ${entries.length} entries`, 'success');
          }}
            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-bold font-mono text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
            <Download size={10} /> CSV
          </button>
          <button onClick={() => {
            if (!entries.length) { addToast('No entries', 'warning'); return; }
            exportPrintReport('Vienna OS Governance Audit Report', [{
              title: `Audit Trail — ${timeRange}`, headers: ['ID', 'Type', 'Action', 'Status', 'Details', 'Timestamp'],
              rows: entries.map(e => [e.id.slice(0, 12), e.type, e.action, e.status, e.details || '', new Date(e.timestamp).toLocaleString()]),
            }]);
          }}
            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] font-bold font-mono text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
            <FileText size={10} /> PDF
          </button>
          <button onClick={loadHistory}
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[10px] font-bold font-mono text-white/50 hover:text-white transition-all flex items-center gap-1.5">
            <RefreshCw size={10} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5">
          {[{ v: '1h', l: '1h' }, { v: '6h', l: '6h' }, { v: '24h', l: '24h' }, { v: '7d', l: '7d' }].map(r => (
            <button key={r.v} onClick={() => setTimeRange(r.v)}
              className={`px-3 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                timeRange === r.v ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/50'
              }`}>{r.l}</button>
          ))}
        </div>
        <div className="flex bg-[#12131a] border border-white/[0.08] rounded-lg p-1 gap-0.5">
          {[{ v: 'all', l: 'All' }, { v: 'intent', l: 'Intents' }, { v: 'execution', l: 'Execs' }, { v: 'warrant', l: 'Warrants' }, { v: 'verification', l: 'Verify' }, { v: 'policy', l: 'Policy' }].map(f => (
            <button key={f.v} onClick={() => setFilterType(f.v)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                filterType === f.v ? 'bg-amber-500/15 text-amber-400' : 'text-white/30 hover:text-white/50'
              }`}>{f.l}</button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-white/20 ml-auto">{filtered.length} entries</span>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/10 border-t-amber-500 rounded-full animate-spin mb-4" />
          <span className="text-[11px] font-mono text-white/30">Loading audit trail...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#12131a] border border-white/[0.06] rounded-lg">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="text-[14px] font-bold text-white mb-1">{entries.length === 0 ? 'Audit trail is empty' : 'No matching entries'}</h3>
          <p className="text-[11px] text-white/30">Every governance action will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => <AuditCard key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}
