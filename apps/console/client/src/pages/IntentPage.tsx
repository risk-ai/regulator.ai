/**
 * Intent Submission Page — Premium Terminal Design
 * 
 * Governed execution interface with tier-coded action cards,
 * pipeline visualization, rich result display.
 */

import React, { useState, useEffect } from 'react';
import { Zap, Send, Play, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// ─── Types ───

interface IntentAction {
  id: string;
  label: string;
  desc: string;
  tier: string;
  tierColor: string;
  params?: { key: string; label: string; placeholder: string; required?: boolean }[];
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  T0: { color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  glow: '' },
  T1: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  glow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]' },
  T2: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.15)]' },
  T3: { color: 'text-red-500',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]' },
};

const INTENT_ACTIONS: IntentAction[] = [
  { id: 'check_health', label: 'Health Check', desc: 'Verify system health through governance pipeline', tier: 'T0', tierColor: '#94a3b8' },
  { id: 'list_objectives', label: 'List Objectives', desc: 'Query active governance objectives', tier: 'T0', tierColor: '#94a3b8' },
  { id: 'check_system_status', label: 'System Status', desc: 'Full system posture check', tier: 'T0', tierColor: '#94a3b8' },
  { id: 'list_recent_executions', label: 'Recent Executions', desc: 'View execution audit trail', tier: 'T0', tierColor: '#94a3b8',
    params: [{ key: 'limit', label: 'Limit', placeholder: '10' }] },
  { id: 'run_diagnostic', label: 'Run Diagnostic', desc: 'Execute system diagnostics', tier: 'T0', tierColor: '#94a3b8' },
  { id: 'check_execution_status', label: 'Check Execution', desc: 'Query execution by ID', tier: 'T0', tierColor: '#94a3b8',
    params: [{ key: 'execution_id', label: 'Execution ID', placeholder: 'exec-xxxxx', required: true }] },
  { id: 'query_state_graph', label: 'Query State Graph', desc: 'Query canonical state graph', tier: 'T0', tierColor: '#94a3b8',
    params: [{ key: 'entity_type', label: 'Entity Type', placeholder: 'execution | objective' }] },
  { id: 'restart_service', label: 'Restart Service', desc: 'Restart service — requires approval', tier: 'T1', tierColor: '#f59e0b',
    params: [{ key: 'service', label: 'Service Name', placeholder: 'api-gateway', required: true }] },
  { id: 'trigger_backup', label: 'Trigger Backup', desc: 'Initiate state graph backup', tier: 'T1', tierColor: '#f59e0b' },
  { id: 'update_configuration', label: 'Update Config', desc: 'Modify runtime configuration', tier: 'T1', tierColor: '#f59e0b',
    params: [{ key: 'key', label: 'Config Key', placeholder: 'rate_limit.max', required: true }, { key: 'value', label: 'New Value', placeholder: '100', required: true }] },
  { id: 'check_service_logs', label: 'Service Logs', desc: 'Retrieve recent service logs', tier: 'T1', tierColor: '#f59e0b',
    params: [{ key: 'service', label: 'Service Name', placeholder: 'intent-gateway', required: true }] },
];

// ─── Main Page ───

export function IntentPage() {
  const [selectedAction, setSelectedAction] = useState('check_health');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState<{ id: string; display_name: string; status: string }[]>([]);
  const [params, setParams] = useState<Record<string, string>>({});
  const [simulation, setSimulation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch('/api/v1/agents', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list = (data.data || data.agents || []).filter((a: any) => a.status === 'active');
        setAgents(list);
        if (list.length > 0 && !selectedAgent) setSelectedAgent(list[0].id);
      }).catch(() => {});
  }, []);

  const action = INTENT_ACTIONS.find(a => a.id === selectedAction)!;
  const tierCfg = TIER_CONFIG[action.tier] || TIER_CONFIG.T0;

  const handleSubmit = async () => {
    if (!selectedAgent) { setResult({ success: false, error: 'Select an agent' }); return; }
    setLoading(true); setResult(null);
    try {
      const body: Record<string, unknown> = { agent_id: selectedAgent, action: selectedAction, source: 'openclaw', tenant_id: 'system', simulation };
      if (action.params?.length) {
        const ctx: Record<string, string> = {};
        for (const p of action.params) { if (params[p.key]) { ctx[p.key] = params[p.key]; body[p.key] = params[p.key]; } }
        body.context = ctx;
      }
      const res = await fetch('/api/v1/agent/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      setResult(await res.json());
    } catch (e) { setResult({ success: false, error: e instanceof Error ? e.message : 'Failed' }); }
    setLoading(false);
  };

  const isSuccess = result && (result as any).success === true;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
          <Zap className="text-amber-400" size={20} />
          Intent Submission
        </h1>
        <p className="text-[12px] text-white/40 mt-1 font-mono">
          Submit intents through the governed pipeline: policy → risk tier → warrant → execute → verify
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Agent Selector */}
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Acting Agent</label>
            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-[#12131a] border border-white/[0.08] rounded-lg px-4 py-2.5 text-[12px] font-mono text-white focus:border-amber-500/40 focus:outline-none [color-scheme:dark]">
              {agents.length === 0 && <option value="">Loading agents...</option>}
              {agents.map(a => <option key={a.id} value={a.id}>{a.display_name} ({a.id.slice(0, 8)}…)</option>)}
            </select>
          </div>

          {/* Action Grid */}
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Select Action</label>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {INTENT_ACTIONS.map(a => {
                const tc = TIER_CONFIG[a.tier] || TIER_CONFIG.T0;
                const selected = selectedAction === a.id;
                return (
                  <button key={a.id} onClick={() => { setSelectedAction(a.id); setParams({}); setResult(null); }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                      selected
                        ? `bg-amber-500/[0.06] border-amber-500/30 ${tc.glow}`
                        : 'bg-[#12131a] border-white/[0.06] hover:border-white/[0.12]'
                    }`}>
                    <span className={`px-2 py-0.5 ${tc.bg} border ${tc.border} rounded text-[9px] font-bold ${tc.color} font-mono flex-shrink-0`}>
                      {a.tier}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] font-semibold ${selected ? 'text-amber-400' : 'text-white'}`}>{a.label}</div>
                      <div className="text-[10px] text-white/30 truncate">{a.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameters */}
          {action.params && action.params.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Parameters</label>
              {action.params.map(p => (
                <div key={p.key}>
                  <label className="text-[10px] text-white/30 mb-1 block">
                    {p.label} {p.required && <span className="text-amber-400">*</span>}
                  </label>
                  <input value={params[p.key] || ''} onChange={e => setParams({ ...params, [p.key]: e.target.value })}
                    placeholder={p.placeholder}
                    className="w-full bg-[#12131a] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] font-mono text-white focus:border-amber-500/40 focus:outline-none" />
                </div>
              ))}
            </div>
          )}

          {/* Simulation toggle */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sim" checked={simulation} onChange={e => setSimulation(e.target.checked)}
              className="accent-amber-500" />
            <label htmlFor="sim" className="text-[11px] text-white/40">Simulation mode (dry run)</label>
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            className={`w-full py-3 rounded-lg text-[12px] font-bold flex items-center justify-center gap-2 transition-all ${
              loading ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                     : `bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.15)]`
            }`}>
            {loading ? (
              <><div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> Executing...</>
            ) : (
              <><Send size={14} /> Submit {action.tier} Intent: {action.label}</>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div>
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Governance Response</label>
          <div className={`bg-[#12131a] border rounded-lg p-6 min-h-[500px] ${
            result ? (isSuccess ? 'border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]' : 'border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]')
                   : 'border-white/[0.08]'
          }`}>
            {result ? (
              <div>
                {/* Status */}
                <div className="flex items-center gap-2 mb-4">
                  {isSuccess ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold font-mono text-emerald-400">
                      <CheckCircle size={12} /> EXECUTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold font-mono text-red-400">
                      <XCircle size={12} /> FAILED
                    </span>
                  )}
                  {result.status && <span className="text-[10px] font-mono text-white/25">{String(result.status)}</span>}
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 mb-4">
                    <p className="text-[12px] text-white/60 leading-relaxed">{String(result.explanation)}</p>
                  </div>
                )}

                {/* JSON */}
                <pre className="bg-black/20 rounded-lg p-4 text-[10px] font-mono text-white/50 overflow-auto max-h-[360px] whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <Zap size={28} className="text-amber-400/40" />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2">Select an intent and execute</h3>
                <p className="text-[11px] text-white/30 max-w-xs leading-relaxed">
                  Every submission flows through the full governance pipeline: policy → risk tier → warrant → execution → verification.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
