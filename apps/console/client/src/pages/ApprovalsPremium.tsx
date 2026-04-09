import React from 'react';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function ApprovalsPremium() {
  const approvals = [
    {
      id: 'WAR-2401',
      agent: 'agent-001',
      action: 'Write sensitive customer data to external API',
      tier: 0,
      risk: 'Critical',
      submittedAt: '2m 14s ago',
      timeout: '2m 46s',
      details: 'Customer PII export to third-party analytics platform',
    },
    {
      id: 'WAR-2402',
      agent: 'agent-004',
      action: 'Delete records from production database',
      tier: 1,
      risk: 'High',
      submittedAt: '5m 32s ago',
      timeout: '9m 28s',
      details: 'Automated cleanup of expired session data',
    },
    {
      id: 'WAR-2403',
      agent: 'agent-002',
      action: 'Execute shell command with elevated privileges',
      tier: 1,
      risk: 'High',
      submittedAt: '8m 41s ago',
      timeout: '6m 19s',
      details: 'System maintenance script deployment',
    },
  ];

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 0:
        return {
          border: 'border-red-500/40',
          glow: 'shadow-[0_0_30px_rgba(239,68,68,0.25)]',
          badge: 'bg-red-500/20 text-red-400 border-red-500/40',
          text: 'text-red-400',
        };
      case 1:
        return {
          border: 'border-amber-500/30',
          glow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          text: 'text-amber-400',
        };
      default:
        return {
          border: 'border-white/8',
          glow: '',
          badge: 'bg-white/10 text-white/70 border-white/20',
          text: 'text-white/70',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans flex">
      {/* Compact Sidebar */}
      <aside className="w-64 border-r border-white/8 bg-[#12131a] flex flex-col hidden lg:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-[#d4a853] flex items-center justify-center shadow-[0_0_15px_rgba(212,168,83,0.4)]">
              <ShieldCheck className="text-black" size={20} />
            </div>
            <span className="font-bold tracking-tight text-xl">Vienna OS</span>
          </div>

          <nav className="space-y-1">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              Agents
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-[13px] bg-[#d4a853]/10 text-[#d4a853] font-medium rounded-lg"
            >
              Approvals
              <span className="ml-auto bg-[#d4a853] text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {approvals.length}
              </span>
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              Execution Logs
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-white/55 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors"
            >
              Governance
            </a>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
              <span className="text-[11px] font-bold">OP</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">vienna.operator</div>
              <div className="text-[11px] text-white/35 truncate uppercase tracking-widest">
                Level 2 Clearance
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-white/8 bg-[#12131a] px-8 py-6 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Approvals</h1>
              <p className="text-[15px] text-white/70 mt-1">
                High-urgency queue for critical agent authorizations
              </p>
            </div>
            <div className="flex items-center gap-4 bg-[#1a1b26] border border-white/10 px-4 py-2 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">
                  Response Target
                </span>
                <span className="text-[15px] font-mono text-emerald-500 font-bold">00:04:12</span>
              </div>
              <Clock className="text-emerald-500" size={20} />
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Priority Notice */}
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg py-3 px-4 flex items-center gap-3 mb-6">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <div className="flex-1">
              <span className="text-[13px] text-red-100 font-semibold">
                {approvals.filter((a) => a.tier === 0).length} critical tier-0 warrant
                {approvals.filter((a) => a.tier === 0).length !== 1 ? 's' : ''} pending approval
              </span>
            </div>
          </div>

          {/* Approval Cards */}
          <div className="space-y-4">
            {approvals.map((approval) => {
              const tierStyle = getTierColor(approval.tier);
              return (
                <div
                  key={approval.id}
                  className={`bg-[#12131a] border ${tierStyle.border} ${tierStyle.glow} rounded-lg p-5 transition-all hover:bg-[#1a1b26]`}
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${tierStyle.badge}`}
                      >
                        Tier {approval.tier}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm text-[#d4a853] font-semibold">
                          {approval.id}
                        </span>
                        <span className="font-mono text-[11px] text-white/55">
                          Agent: {approval.agent}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/45 uppercase tracking-wider">
                          Timeout
                        </span>
                        <span className={`font-mono text-sm font-bold ${tierStyle.text}`}>
                          {approval.timeout}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Description */}
                  <div className="mb-4">
                    <div className="text-[11px] text-white/45 uppercase tracking-wider mb-1.5 font-semibold">
                      Requested Action
                    </div>
                    <div className="text-[15px] text-white font-medium mb-2">
                      {approval.action}
                    </div>
                    <div className="text-[13px] text-white/70">{approval.details}</div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/6">
                    <div className="flex items-center gap-6 text-[12px] font-mono">
                      <div>
                        <span className="text-white/45">Risk: </span>
                        <span className={tierStyle.text}>{approval.risk}</span>
                      </div>
                      <div>
                        <span className="text-white/45">Submitted: </span>
                        <span className="text-white/70">{approval.submittedAt}</span>
                      </div>
                    </div>
                    <button className="text-[11px] text-[#d4a853] hover:text-[#e0b866] font-medium">
                      View Full Context →
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-bold text-[13px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold text-[13px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                      <XCircle size={16} />
                      Deny
                    </button>
                    <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg font-medium text-[13px] transition-colors">
                      Escalate
                    </button>
                  </div>

                  {/* Keyboard Shortcuts Hint */}
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-white/35 font-mono">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20">
                        A
                      </kbd>{' '}
                      Approve
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20">
                        D
                      </kbd>{' '}
                      Deny
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/20">
                        E
                      </kbd>{' '}
                      Escalate
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State (when queue is clear) */}
          {approvals.length === 0 && (
            <div className="bg-[#12131a] border border-white/8 rounded-lg p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">All Clear</h2>
              <p className="text-white/55 text-sm">No pending approvals in the queue.</p>
            </div>
          )}

          {/* Stats Footer */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-[#12131a] border border-white/8 rounded-lg p-4">
              <div className="text-[10px] text-white/45 uppercase tracking-wider mb-1">
                Pending Today
              </div>
              <div className="font-mono text-2xl font-bold text-[#d4a853]">
                {approvals.length}
              </div>
            </div>
            <div className="bg-[#12131a] border border-white/8 rounded-lg p-4">
              <div className="text-[10px] text-white/45 uppercase tracking-wider mb-1">
                Approved Today
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-500">142</div>
            </div>
            <div className="bg-[#12131a] border border-white/8 rounded-lg p-4">
              <div className="text-[10px] text-white/45 uppercase tracking-wider mb-1">
                Denied Today
              </div>
              <div className="font-mono text-2xl font-bold text-red-500">8</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
