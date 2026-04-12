import { useState } from 'react';
import { 
  ShieldAlert, Activity, PowerOff, Undo2, Lock, RotateCw, 
  AlertOctagon, TrendingUp, AlertTriangle, Shield, Zap, Download
} from 'lucide-react';

interface ThreatItem {
  id: string;
  severity: 'critical' | 'high' | 'warning';
  agent: string;
  message: string;
  timestamp: string;
}

interface PredictiveAlert {
  id: string;
  type: 'failure' | 'coverage' | 'threshold';
  message: string;
  confidence: number;
  timestamp: string;
}

interface GovernanceHealth {
  overall: number;
  policyCoverage: number;
  warrantCompliance: number;
  agentTrustAvg: number;
  auditCompleteness: number;
}

export default function DashboardSOC() {
  const [threats, setThreats] = useState<ThreatItem[]>([
    {
      id: 'T-842',
      severity: 'critical',
      agent: 'node-842',
      message: 'Behavioral divergence detected. Execution latency jumped from 12ms to 142ms. Unrequested recursive call to identity-v3 detected.',
      timestamp: '14:52:01',
    },
    {
      id: 'T-291',
      severity: 'high',
      agent: 'agent-291',
      message: 'Trust score dropped 12% in 30min. Multiple policy violations (data-access-tier-2). Consecutive execution failures: 4/5.',
      timestamp: '14:48:14',
    },
    {
      id: 'T-667',
      severity: 'warning',
      agent: 'ares-7-charlie',
      message: 'Policy violation detected: attempted write to restricted namespace /internal/secrets without warrant.',
      timestamp: '14:41:08',
    },
  ]);

  const [predictions] = useState<PredictiveAlert[]>([
    {
      id: 'P-1',
      type: 'failure',
      message: 'Agent hermes-4 78% likely to fail next action',
      confidence: 78,
      timestamp: '14:55:00',
    },
    {
      id: 'P-2',
      type: 'coverage',
      message: 'Policy data-encryption has 45% coverage gap',
      confidence: 91,
      timestamp: '14:52:00',
    },
    {
      id: 'P-3',
      type: 'threshold',
      message: 'Trust threshold breach in 6h (agent apollo-12)',
      confidence: 82,
      timestamp: '14:49:00',
    },
  ]);

  const [health] = useState<GovernanceHealth>({
    overall: 88,
    policyCoverage: 94,
    warrantCompliance: 100,
    agentTrustAvg: 82,
    auditCompleteness: 92,
  });

  const handleEmergencyAction = (action: string) => {
    if (!confirm(`⚠️ CRITICAL: Execute ${action}?\n\nThis action cannot be undone.`)) return;
    console.log(`Emergency action: ${action}`);
    // TODO: Wire to backend POST /api/v1/system/${action}
  };

  const handleRemediation = (threatId: string, action: string) => {
    console.log(`Remediation: ${action} for threat ${threatId}`);
    // TODO: Wire to backend POST /api/v1/threats/${threatId}/remediate
    setThreats(prev => prev.filter(t => t.id !== threatId));
  };

  const severityConfig = {
    critical: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      badge: 'bg-red-500',
      text: 'text-red-500',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    },
    high: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500',
      text: 'text-amber-500',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    },
    warning: {
      bg: 'bg-white/[0.02]',
      border: 'border-white/[0.08]',
      badge: 'bg-white/20',
      text: 'text-white/70',
      glow: '',
    },
  };

  return (
    <div className="min-h-screen bg-[#12131a] p-4 lg:p-6 max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-amber-500 w-8 h-8 animate-pulse" />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tighter">
              Vienna SOC <span className="text-white/30 font-normal">/ Command_Center_v4.0</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest">DEFCON LEVEL: 3</span>
              <span className="text-[9px] text-white/30">//</span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase">System Status: HEAVILY_MONITORED</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/[0.08] rounded">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">UPLINK: ACTIVE</span>
          </div>
          <div className="text-[10px] font-mono text-white/30 tracking-widest px-3 py-1 border border-white/[0.04] rounded">
            SID: 884-29-XRA
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Governance Health & Emergency (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Governance Health Gauge */}
          <div className="bg-[#1a1b26] border border-white/[0.08] rounded p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Governance_Health</h3>
              <Activity className="text-amber-500/40 w-4 h-4" />
            </div>

            <div className="flex flex-col items-center py-4">
              <div className="relative flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/[0.04]" />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="364.4"
                    strokeDashoffset={364.4 - (364.4 * health.overall) / 100}
                    className="text-amber-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold font-mono">{health.overall}</span>
                  <span className="text-[10px] text-white/40 uppercase">Rating</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4 border-t border-white/[0.05] pt-4">
              <div>
                <div className="flex justify-between text-[9px] mb-1 uppercase tracking-wider">
                  <span className="text-white/40">Policy Coverage</span>
                  <span className="text-white">{health.policyCoverage}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${health.policyCoverage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1 uppercase tracking-wider">
                  <span className="text-white/40">Warrant Compliance</span>
                  <span className="text-white">{health.warrantCompliance}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${health.warrantCompliance}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1 uppercase tracking-wider">
                  <span className="text-white/40">Agent Trust Avg</span>
                  <span className="text-white">{health.agentTrustAvg}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${health.agentTrustAvg}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1 uppercase tracking-wider">
                  <span className="text-white/40">Audit Completeness</span>
                  <span className="text-white">{health.auditCompleteness}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${health.auditCompleteness}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="bg-red-950/20 border border-red-500/30 rounded p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="text-red-500 w-5 h-5" />
              <h3 className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Emergency_Override</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleEmergencyAction('stop-all')}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-[10px] font-bold uppercase rounded text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg"
              >
                <PowerOff className="w-3 h-3" /> STOP ALL AGENTS
              </button>
              <button
                onClick={() => handleEmergencyAction('bulk-revoke')}
                className="w-full py-2 bg-white/[0.04] border border-red-500/40 hover:bg-red-500/10 text-[10px] font-bold uppercase rounded text-red-400 flex items-center justify-center gap-2 transition-all"
              >
                <Undo2 className="w-3 h-3" /> BULK REVOKE WARRANTS
              </button>
              <button
                onClick={() => handleEmergencyAction('strict-mode')}
                className="w-full py-2 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.1] text-[10px] font-bold uppercase rounded text-white/70 flex items-center justify-center gap-2 transition-all"
              >
                <Lock className="w-3 h-3" /> ENABLE STRICT MODE
              </button>
            </div>
            <div className="mt-4 p-2 bg-black/40 border border-red-500/20 rounded">
              <p className="text-[8px] text-red-400 font-mono leading-tight">
                CRITICAL: Execution will terminate all active governance streams immediately.
              </p>
            </div>
          </div>
        </div>

        {/* CENTER: Threat Detection (6/12) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#1a1b26] border border-white/[0.08] rounded h-full flex flex-col">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Anomaly_Detection_Feed</h3>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-mono text-red-500 uppercase">Live_Threat_Vectoring</span>
                </div>
              </div>
              <button className="p-1.5 bg-white/[0.02] border border-white/[0.1] rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {threats.map((threat) => {
                const config = severityConfig[threat.severity];
                return (
                  <div key={threat.id} className={`${config.bg} border ${config.border} rounded p-4 ${config.glow}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 ${config.badge} text-white text-[9px] font-bold rounded uppercase`}>
                          {threat.severity}
                        </span>
                        <span className="text-[11px] font-bold font-mono">AGENT_OUTLIER: {threat.agent}</span>
                      </div>
                      <span className="text-[10px] text-white/30 font-mono">{threat.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-white/70 font-mono mb-4">{threat.message}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => handleRemediation(threat.id, 'pause')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-[9px] font-bold uppercase transition-all"
                      >
                        Pause Agent
                      </button>
                      <button
                        onClick={() => handleRemediation(threat.id, 'audit')}
                        className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[9px] font-bold uppercase transition-all"
                      >
                        Force Audit
                      </button>
                      <button
                        onClick={() => handleRemediation(threat.id, 'isolate')}
                        className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] rounded text-[9px] font-bold uppercase transition-all"
                      >
                        Isolate
                      </button>
                      <button
                        onClick={() => handleRemediation(threat.id, 'dismiss')}
                        className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] rounded text-[9px] font-bold uppercase text-white/40 transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Predictive Alerts (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#1a1b26] border border-white/[0.08] rounded p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="text-amber-500 w-4 h-4" />
              <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Predictive_Alerts</h3>
            </div>
            <div className="space-y-3">
              {predictions.map((pred) => (
                <div key={pred.id} className="bg-white/[0.02] border border-white/[0.08] rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <AlertTriangle className="text-amber-500 w-4 h-4" />
                    <span className="text-[9px] font-mono text-white/30">{pred.confidence}% conf</span>
                  </div>
                  <p className="text-[10px] text-white/70 font-mono leading-tight">{pred.message}</p>
                  <div className="mt-2 text-[8px] text-white/40 font-mono">{pred.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#1a1b26] border border-white/[0.08] rounded p-4">
            <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Quick_Actions</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2">
                <Download className="w-3 h-3" /> Export Full Audit
              </button>
              <button className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2">
                <Shield className="w-3 h-3" /> Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
