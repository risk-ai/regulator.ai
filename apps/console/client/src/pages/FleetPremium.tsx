import { List, Search, TrendingUp, Eye, Shield, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface FleetStats {
  total: number;
  active: number;
  idle: number;
  suspended: number;
  avgTrust: number;
  actions24h: number;
  latency: number;
  criticalAlerts: number;
}

interface Agent {
  id: string;
  name: string;
  uuid: string;
  status: 'active' | 'idle' | 'suspended';
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  execCount: number;
  successRate: number;
  uptime: number;
  trustScore: number;
}

const FleetStatCard = ({ label, value, subValue, color = 'white' }: { label: string; value: string | number; subValue?: string; color?: string }) => {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    green: 'text-emerald-500',
    blue: 'text-blue-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  };

  return (
    <div className="bg-[#12131a] border border-white/[0.06] rounded-md p-4 flex flex-col">
      <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-[24px] font-bold ${colorClasses[color]}`}>{value}</span>
      </div>
      {subValue && (
        <div className="text-[10px] text-white/55 mt-auto font-mono">{subValue}</div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: Agent['status'] }) => {
  const config = {
    active: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500', label: 'ACTIVE' },
    idle: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', label: 'IDLE' },
    suspended: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', label: 'SUSPENDED' },
  };

  return (
    <div className={`flex items-center gap-2 ${config[status].color}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${config[status].dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      <span className="font-mono text-[12px]">{config[status].label}</span>
    </div>
  );
};

const TierBadge = ({ tier }: { tier: Agent['tier'] }) => {
  const config = {
    T0: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    T1: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    T2: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    T3: { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  };

  return (
    <span className={`px-1.5 py-0.5 ${config[tier].bg} border ${config[tier].border} rounded text-[9px] font-bold ${config[tier].color} font-mono`}>
      {tier}
    </span>
  );
};

export default function FleetPremium() {
  const navigate = useNavigate();
  const [searchFilter, setSearchFilter] = useState('');
  
  const [fleetStats] = useState<FleetStats>({
    total: 124,
    active: 84,
    idle: 24,
    suspended: 16,
    avgTrust: 92.4,
    actions24h: 18402,
    latency: 42,
    criticalAlerts: 3,
  });

  const [agents, setAgents] = useState<Agent[]>([
    { id: 'ares-9-delta', name: 'ARES-9-DELTA', uuid: 'a8f-2219-c901', status: 'active', tier: 'T0', execCount: 14288, successRate: 99.82, uptime: 100.0, trustScore: 98 },
    { id: 'hermes-4', name: 'HERMES-4', uuid: '3bf-8811-d205', status: 'active', tier: 'T1', execCount: 8421, successRate: 98.45, uptime: 99.9, trustScore: 94 },
    { id: 'apollo-12', name: 'APOLLO-12', uuid: 'c7e-9912-a408', status: 'idle', tier: 'T1', execCount: 5209, successRate: 97.21, uptime: 98.4, trustScore: 91 },
    { id: 'zeus-prime', name: 'ZEUS-PRIME', uuid: '1da-4523-b702', status: 'active', tier: 'T0', execCount: 21450, successRate: 99.91, uptime: 100.0, trustScore: 99 },
    { id: 'athena-7', name: 'ATHENA-7', uuid: '9fc-1128-e604', status: 'active', tier: 'T2', execCount: 3180, successRate: 96.18, uptime: 97.2, trustScore: 88 },
    { id: 'hades-3', name: 'HADES-3', uuid: 'f21-7734-c309', status: 'suspended', tier: 'T3', execCount: 842, successRate: 89.42, uptime: 92.1, trustScore: 72 },
  ]);

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    agent.uuid.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Fleet Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-[#12131a] border border-white/[0.06] rounded-md p-4 flex flex-col">
          <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">Total Agents</div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[24px] font-bold">{fleetStats.total}</span>
            <span className="font-mono text-[11px] text-white/70 font-medium">SYS_ID</span>
          </div>
          <div className="mt-3">
            <div className="flex h-1 rounded-full overflow-hidden bg-white/[0.08] mb-2">
              <div className="bg-emerald-500" style={{ width: `${(fleetStats.active / fleetStats.total) * 100}%` }} />
              <div className="bg-amber-500" style={{ width: `${(fleetStats.idle / fleetStats.total) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(fleetStats.suspended / fleetStats.total) * 100}%` }} />
            </div>
            <div className="flex gap-4 text-[9px] font-mono opacity-70">
              <span className="text-emerald-500">● {fleetStats.active} ACT</span>
              <span className="text-amber-500">● {fleetStats.idle} IDL</span>
              <span className="text-red-500">● {fleetStats.suspended} SUS</span>
            </div>
          </div>
        </div>

        <FleetStatCard label="Avg Trust" value={fleetStats.avgTrust} subValue="SIGMA_H: 0.94" color="green" />
        <FleetStatCard label="Actions (24h)" value={fleetStats.actions24h.toLocaleString()} subValue="Δ +1,244 VPS" color="blue" />
        <FleetStatCard label="Fleet Latency" value={`${fleetStats.latency}ms`} subValue="JITTER: 2.1ms" color="green" />
        
        <div className="bg-gradient-to-br from-[#12131a] to-[#201010] border border-white/[0.06] rounded-md p-4 flex flex-col">
          <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">Critical Alerts</div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[24px] font-bold text-red-500">{String(fleetStats.criticalAlerts).padStart(2, '0')}</span>
          </div>
          <div className="text-[10px] text-red-500 mt-auto font-semibold font-mono animate-pulse">INTERVENTION_REQ</div>
        </div>
      </div>

      {/* Fleet Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <List className="text-violet-500" size={16} />
            <span className="font-mono">AGENT_MANIFEST_LIVE</span>
          </h2>
          <div className="flex gap-1">
            <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.08] rounded text-[10px] font-mono text-white/50">RAW_FEED</span>
            <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/30 rounded text-[10px] font-mono text-violet-400">FILTER: ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={12} />
            <input 
              type="text" 
              placeholder="FILTER_ID..." 
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-[#12131a] border border-white/[0.08] rounded-sm pl-8 pr-3 py-1 text-[11px] font-mono w-48 focus:outline-none focus:border-violet-500 transition-colors text-white"
            />
          </div>
          <button className="px-3 py-1 bg-[#12131a] border border-white/[0.08] rounded-sm text-[11px] font-mono hover:bg-white/[0.03] transition-colors text-white">
            EXPORT.CSV
          </button>
        </div>
      </div>

      {/* Terminal Table */}
      <div className="bg-[#12131a] border border-white/[0.08] rounded overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1a1b26] text-[11px] font-mono text-white/55 uppercase tracking-wider">
              <th className="text-left px-4 py-3 border-b border-white/[0.08]">Agent Identifier</th>
              <th className="text-left px-4 py-3 border-b border-white/[0.08]">Status</th>
              <th className="text-left px-4 py-3 border-b border-white/[0.08]">Tier</th>
              <th className="text-right px-4 py-3 border-b border-white/[0.08]">Exec Count</th>
              <th className="text-right px-4 py-3 border-b border-white/[0.08]">Success %</th>
              <th className="text-right px-4 py-3 border-b border-white/[0.08]">Uptime</th>
              <th className="text-right px-4 py-3 border-b border-white/[0.08]">Trust Sig</th>
              <th className="text-right px-4 py-3 border-b border-white/[0.08]">Actions</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[12px]">
            {filteredAgents.map((agent) => (
              <tr 
                key={agent.id} 
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => navigate(`/fleet/${agent.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{agent.name}</span>
                    <span className="text-[9px] text-white/35">UUID: {agent.uuid}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={agent.status} />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={agent.tier} />
                </td>
                <td className="px-4 py-3 text-right text-white">{agent.execCount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <span className={agent.successRate >= 98 ? 'text-emerald-500' : agent.successRate >= 95 ? 'text-amber-500' : 'text-red-500'}>
                    {agent.successRate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-white">{agent.uptime}%</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1 bg-white/[0.08] rounded-full">
                      <div 
                        className={`h-full rounded-full ${agent.trustScore >= 95 ? 'bg-emerald-500' : agent.trustScore >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${agent.trustScore}%` }}
                      />
                    </div>
                    <span className={agent.trustScore >= 95 ? 'text-emerald-500' : agent.trustScore >= 85 ? 'text-amber-500' : 'text-red-500'}>
                      {agent.trustScore}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/fleet/${agent.id}`); }}
                      className="p-1 hover:bg-white/[0.05] rounded transition-colors"
                      title="View Details"
                    >
                      <Eye size={14} className="text-white/55 hover:text-white" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1 hover:bg-white/[0.05] rounded transition-colors"
                      title="Shield Agent"
                    >
                      <Shield size={14} className="text-white/55 hover:text-violet-400" />
                    </button>
                    {agent.status === 'suspended' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-1 hover:bg-white/[0.05] rounded transition-colors"
                        title="Alert"
                      >
                        <AlertTriangle size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-white/45 font-mono text-[12px]">
          NO AGENTS MATCH FILTER_CRITERIA
        </div>
      )}
    </div>
  );
}
