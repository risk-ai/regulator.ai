import { CheckCircle, XCircle, Bot, Timer, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface Approval {
  id: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  action: string;
  title: string;
  description: string;
  expiresIn: string;
  targetResource?: string;
  requestingAgent: string;
  timeAgo: string;
  urgency: 'critical' | 'high' | 'standard';
}

const TierGlow = {
  T0: 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
  T1: 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  T2: 'border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  T3: 'border-gray-500/40 shadow-[0_0_20px_rgba(107,114,128,0.1)]',
};

const TierBadge = {
  T0: { bg: 'bg-red-900/40', text: 'text-red-400', border: 'border-red-500/40' },
  T1: { bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-500/40' },
  T2: { bg: 'bg-blue-900/40', text: 'text-blue-400', border: 'border-blue-500/40' },
  T3: { bg: 'bg-gray-900/40', text: 'text-gray-400', border: 'border-gray-500/40' },
};

const TierDot = {
  T0: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
  T1: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
  T2: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  T3: 'bg-gray-500',
};

const ApprovalCard = ({ approval, onApprove, onDeny }: { approval: Approval; onApprove: () => void; onDeny: () => void }) => {
  const [selected, setSelected] = useState(false);
  
  const tierConfig = TierBadge[approval.tier];
  const glowClass = TierGlow[approval.tier];
  const dotClass = TierDot[approval.tier];

  return (
    <div className="flex gap-4">
      <div className="pt-6">
        <input 
          type="checkbox" 
          checked={selected}
          onChange={(e) => setSelected(e.target.checked)}
          className="w-5 h-5 rounded accent-violet-500 cursor-pointer"
        />
      </div>
      <div className={`flex-1 bg-[#12131a] border-2 ${glowClass} rounded-xl p-7 transition-all hover:border-opacity-60`}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 ${tierConfig.bg} ${tierConfig.text} border ${tierConfig.border} rounded text-[11px] font-bold tracking-widest uppercase`}>
                Tier {approval.tier.slice(1)}
              </span>
              <span className="text-white/35 text-xs font-mono uppercase">Action: {approval.action}</span>
            </div>
            <h4 className="text-xl font-bold text-white tracking-tight">{approval.title}</h4>
            <p className="mt-2 text-[14px] text-white/55 leading-relaxed">{approval.description}</p>
          </div>
          <div className="text-right ml-6">
            <div className="text-[10px] text-white/35 font-bold uppercase mb-1">Expires In</div>
            <div className={`text-3xl font-mono font-bold ${approval.urgency === 'critical' ? 'text-red-500' : approval.urgency === 'high' ? 'text-amber-500' : 'text-blue-500'}`}>
              {approval.expiresIn}
            </div>
          </div>
        </div>
        
        <div className={`flex flex-wrap gap-x-8 gap-y-3 mb-6 p-4 ${tierConfig.bg} rounded-lg border ${tierConfig.border} text-xs`}>
          {approval.targetResource && (
            <div>
              <span className="text-white/35 uppercase block mb-1 font-semibold tracking-tighter">Target Resource</span>
              <span className="text-white font-mono">{approval.targetResource}</span>
            </div>
          )}
          <div>
            <span className="text-white/35 uppercase block mb-1 font-semibold tracking-tighter">Requesting Agent</span>
            <span className="text-white font-mono flex items-center gap-1.5">
              <Bot size={12} className={tierConfig.text} />
              {approval.requestingAgent}
            </span>
          </div>
          <div>
            <span className="text-white/35 uppercase block mb-1 font-semibold tracking-tighter">Time Since Request</span>
            <span className="text-white">{approval.timeAgo}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onApprove}
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[15px] font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
          >
            <CheckCircle size={18} />
            Authorize Execution
            <span className="ml-auto text-[11px] opacity-60 font-normal">⌘A</span>
          </button>
          <button 
            onClick={onDeny}
            className="flex-1 h-12 bg-transparent hover:bg-red-500/10 text-red-400 rounded-lg text-[15px] font-bold transition-all border-2 border-red-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <XCircle size={18} />
            Deny Access
            <span className="ml-auto text-[11px] opacity-60 font-normal">⌘D</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ApprovalsPremium() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [tierFilter, setTierFilter] = useState<'all' | 'T1' | 'T2'>('all');
  
  const [approvals, setApprovals] = useState<Approval[]>([
    {
      id: 'appr-001',
      tier: 'T0',
      action: 'PROD_REDEPLOY',
      title: 'Deploy system upgrade to node-group vienna-prd-alpha',
      description: 'Full service replacement in production cluster. This will trigger a rolling restart of all workers in the primary ingestion pool.',
      expiresIn: '02:47',
      targetResource: 'vienna-prd-alpha.internal.local',
      requestingAgent: 'Gov-Sentinel-04',
      timeAgo: '4m 12s ago',
      urgency: 'critical',
    },
    {
      id: 'appr-002',
      tier: 'T1',
      action: 'DB_MIGRATION',
      title: 'Execute database schema migration on production',
      description: 'Apply schema changes to policy_rules table. Includes adding new columns for policy versioning and rollback capabilities.',
      expiresIn: '14:22',
      targetResource: 'postgres-prod-01.regulator.ai',
      requestingAgent: 'Schema-Manager-02',
      timeAgo: '8m 40s ago',
      urgency: 'high',
    },
    {
      id: 'appr-003',
      tier: 'T2',
      action: 'API_KEY_GENERATION',
      title: 'Generate new API key for external integration',
      description: 'Third-party service integration requires new API credentials with read-only access to agent metrics.',
      expiresIn: '45:10',
      targetResource: 'api-gateway.regulator.ai',
      requestingAgent: 'Integration-Bot-09',
      timeAgo: '12m 05s ago',
      urgency: 'standard',
    },
  ]);

  const handleApprove = (id: string) => {
    // TODO: Wire to API - POST /api/v1/approvals/:id/approve
    setApprovals(prev => prev.filter(a => a.id !== id));
  };

  const handleDeny = (id: string) => {
    // TODO: Wire to API - POST /api/v1/approvals/:id/deny
    setApprovals(prev => prev.filter(a => a.id !== id));
  };

  const filteredApprovals = tierFilter === 'all' 
    ? approvals 
    : approvals.filter(a => a.tier === tierFilter);

  const criticalApprovals = filteredApprovals.filter(a => a.urgency === 'critical');
  const highApprovals = filteredApprovals.filter(a => a.urgency === 'high');
  const standardApprovals = filteredApprovals.filter(a => a.urgency === 'standard');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-[#12131a] px-8 py-6 mb-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-white">Approvals</h1>
            <p className="text-[15px] text-white/70 mt-1">High-urgency queue for critical agent authorizations</p>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1b26] border border-white/10 px-4 py-2 rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Response Target</span>
              <span className="text-[15px] font-mono text-emerald-500 font-bold">00:04:12</span>
            </div>
            <Timer className="text-emerald-500" size={20} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8">
        {/* Tabs */}
        <div className="flex gap-[2px] mb-8 border-b border-white/[0.06]">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 text-[14px] font-semibold transition-all border-b-2 ${
              activeTab === 'pending' 
                ? 'text-white border-violet-500' 
                : 'text-white/55 border-transparent hover:text-white'
            }`}
          >
            ⏳ Pending Approvals
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-[14px] font-semibold transition-all border-b-2 ${
              activeTab === 'history' 
                ? 'text-white border-violet-500' 
                : 'text-white/55 border-transparent hover:text-white'
            }`}
          >
            📜 View History
          </button>
        </div>

        {activeTab === 'pending' && (
          <>
            {/* Queue Actions */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-1 bg-[#12131a] p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setTierFilter('all')}
                  className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                    tierFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  All ({approvals.length})
                </button>
                <button 
                  onClick={() => setTierFilter('T1')}
                  className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                    tierFilter === 'T1' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  T1 Only
                </button>
                <button 
                  onClick={() => setTierFilter('T2')}
                  className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                    tierFilter === 'T2' ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white'
                  }`}
                >
                  T2 Only
                </button>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-white/70">
                <span className="bg-white/5 border border-white/10 rounded px-2 py-1 font-mono text-[11px]">Shift + A: Bulk Approve</span>
                <div className="h-4 w-[1px] bg-white/10" />
                <input type="checkbox" id="select-all" className="w-4 h-4 rounded accent-violet-500 cursor-pointer" />
                <label htmlFor="select-all" className="cursor-pointer font-medium">Select All</label>
              </div>
            </div>

            {/* Approval Lists */}
            <div className="space-y-10 pb-32">
              {/* Critical Priority */}
              {criticalApprovals.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                      <h3 className="text-base font-bold text-red-400 uppercase tracking-widest">Critical Priority (T0)</h3>
                    </div>
                    <span className="text-[11px] font-mono text-white/35">NEEDS IMMEDIATE AUTHORIZATION</span>
                  </div>
                  <div className="space-y-6">
                    {criticalApprovals.map(approval => (
                      <ApprovalCard 
                        key={approval.id} 
                        approval={approval} 
                        onApprove={() => handleApprove(approval.id)}
                        onDeny={() => handleDeny(approval.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority */}
              {highApprovals.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" />
                    <h3 className="text-base font-bold text-amber-400 uppercase tracking-widest">High Priority (T1)</h3>
                  </div>
                  <div className="space-y-6">
                    {highApprovals.map(approval => (
                      <ApprovalCard 
                        key={approval.id} 
                        approval={approval} 
                        onApprove={() => handleApprove(approval.id)}
                        onDeny={() => handleDeny(approval.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Standard Priority */}
              {standardApprovals.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <h3 className="text-base font-bold text-blue-400 uppercase tracking-widest">Standard Queue (T2+)</h3>
                  </div>
                  <div className="space-y-6">
                    {standardApprovals.map(approval => (
                      <ApprovalCard 
                        key={approval.id} 
                        approval={approval} 
                        onApprove={() => handleApprove(approval.id)}
                        onDeny={() => handleDeny(approval.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredApprovals.length === 0 && (
                <div className="text-center py-16">
                  <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Queue Clear</h3>
                  <p className="text-white/55">No pending approvals at this time.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-16 text-white/45">
            <p className="font-mono text-[12px]">APPROVAL_HISTORY_VIEW</p>
            <p className="text-[14px] mt-2">Historical approval records will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
