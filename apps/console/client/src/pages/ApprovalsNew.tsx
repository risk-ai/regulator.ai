/**
 * Approvals Page — High-Urgency Queue
 * 
 * Implements Superdesign draft: 312c49b2-3c53-4fd3-a7b4-c3f5be5fcd29
 * "Vienna OS - High-Urgency Approvals Console"
 */

import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { ApprovalCard, type ApprovalRequest } from '../components/ui/ApprovalCard';

export function ApprovalsNew() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'T1' | 'T2'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    
    // TODO: Replace with real API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockRequests: ApprovalRequest[] = [
      {
        id: 'req-1',
        tier: 'T2',
        action: 'PROD_REDEPLOY',
        title: 'Deploy system upgrade to node-group vienna-prd-alpha',
        description: 'Full service replacement in production cluster. This will trigger a rolling restart of all workers in the primary ingestion pool.',
        expiresInSeconds: 167,
        requestedAgo: '4m 12s ago',
        agent: 'Gov-Sentinel-04',
        target: 'vienna-prd-alpha.internal.local',
      },
      {
        id: 'req-2',
        tier: 'T1',
        action: 'CFG_UPDATE',
        title: 'Update API rate-limits for Partner-Pool-B',
        description: '',
        expiresInSeconds: 2472,
        requestedAgo: '14m ago',
        agent: 'Scale-Opt-3',
        target: 'edge-gw-01',
      },
    ];
    
    setRequests(mockRequests);
    setLoading(false);
  };

  const handleApprove = (id: string) => {
    console.log('Approve:', id);
    // TODO: API call
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleDeny = (id: string) => {
    console.log('Deny:', id);
    // TODO: API call
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const filtered = requests.filter(r => 
    filter === 'all' || r.tier === filter
  );

  const t2Requests = filtered.filter(r => r.tier === 'T2');
  const t1Requests = filtered.filter(r => r.tier === 'T1');

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#12131a] px-8 py-6 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-white">Approvals</h1>
            <p className="text-[15px] text-[rgba(255,255,255,0.7)] mt-1">
              High-urgency queue for critical agent authorizations
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1b26] border border-white/10 px-4 py-2 rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] text-[rgba(255,255,255,0.35)] uppercase tracking-wider font-semibold">
                Response Target
              </span>
              <span className="text-[15px] font-mono text-emerald-500 font-bold">00:04:12</span>
            </div>
            <Timer className="text-emerald-500 w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-1 bg-[#12131a] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                filter === 'all' ? 'bg-white/10 text-white' : 'text-[rgba(255,255,255,0.55)] hover:text-white'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('T1')}
              className={`px-4 py-1.5 text-[13px] font-normal transition-colors ${
                filter === 'T1' ? 'bg-white/10 text-white' : 'text-[rgba(255,255,255,0.55)] hover:text-white'
              }`}
            >
              T1 Only
            </button>
            <button
              onClick={() => setFilter('T2')}
              className={`px-4 py-1.5 text-[13px] font-normal transition-colors ${
                filter === 'T2' ? 'bg-white/10 text-white' : 'text-[rgba(255,255,255,0.55)] hover:text-white'
              }`}
            >
              T2 Only
            </button>
          </div>
        </div>

        {/* Approval Lists */}
        <div className="space-y-10">
          {/* T2 Critical */}
          {t2Requests.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                  <h3 className="text-base font-bold text-red-400 uppercase tracking-widest">
                    Critical Priority (T2)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[rgba(255,255,255,0.35)]">
                  NEEDS MULTI-PARTY AUTHORIZATION
                </span>
              </div>
              <div className="space-y-6">
                {t2Requests.map(req => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    selected={selected.has(req.id)}
                    onSelect={(id, checked) => {
                      const newSelected = new Set(selected);
                      if (checked) newSelected.add(id);
                      else newSelected.delete(id);
                      setSelected(newSelected);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* T1 Standard */}
          {t1Requests.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <h3 className="text-base font-bold text-amber-500 uppercase tracking-widest">
                  Standard Priority (T1)
                </h3>
              </div>
              <div className="space-y-6">
                {t1Requests.map(req => (
                  <ApprovalCard
                    key={req.id}
                    request={req}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    selected={selected.has(req.id)}
                    onSelect={(id, checked) => {
                      const newSelected = new Set(selected);
                      if (checked) newSelected.add(id);
                      else newSelected.delete(id);
                      setSelected(newSelected);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-[rgba(255,255,255,0.35)] text-sm">
                No pending approvals
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
