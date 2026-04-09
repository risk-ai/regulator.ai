import React from 'react';
import { Cpu, Settings, TrendingUp, Activity } from 'lucide-react';

export default function FleetPremium() {
  const agents = [
    {
      id: 'AGT-001',
      name: 'compliance-monitor',
      status: 'active',
      trust: 98.4,
      actions24h: 1842,
      lastAction: '2s ago',
      warrants: 124,
    },
    {
      id: 'AGT-002',
      name: 'risk-analyzer',
      status: 'active',
      trust: 96.7,
      actions24h: 2103,
      lastAction: '5s ago',
      warrants: 138,
    },
    {
      id: 'AGT-003',
      name: 'policy-enforcer',
      status: 'idle',
      trust: 94.2,
      actions24h: 842,
      lastAction: '2m ago',
      warrants: 98,
    },
    {
      id: 'AGT-004',
      name: 'audit-logger',
      status: 'active',
      trust: 99.1,
      actions24h: 3241,
      lastAction: '1s ago',
      warrants: 156,
    },
    {
      id: 'AGT-005',
      name: 'decision-reviewer',
      status: 'suspended',
      trust: 72.3,
      actions24h: 18,
      lastAction: '1h ago',
      warrants: 12,
    },
    {
      id: 'AGT-006',
      name: 'execution-monitor',
      status: 'active',
      trust: 95.8,
      actions24h: 1924,
      lastAction: '3s ago',
      warrants: 131,
    },
    {
      id: 'AGT-007',
      name: 'warrant-issuer',
      status: 'active',
      trust: 97.2,
      actions24h: 2184,
      lastAction: '4s ago',
      warrants: 142,
    },
    {
      id: 'AGT-008',
      name: 'compliance-checker',
      status: 'idle',
      trust: 93.6,
      actions24h: 724,
      lastAction: '5m ago',
      warrants: 89,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'idle':
        return 'bg-amber-500';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'ACT';
      case 'idle':
        return 'IDL';
      case 'suspended':
        return 'SUS';
      default:
        return 'UNK';
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/[0.03]';
      case 'idle':
        return 'bg-amber-500/[0.03]';
      case 'suspended':
        return 'bg-red-500/[0.03]';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Top Header */}
      <header className="border-b border-white/8 bg-[#12131a] sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#d4a853] rounded flex items-center justify-center">
              <Cpu className="text-black text-xl" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none tracking-tight">Fleet Console</h1>
              <p className="text-[11px] text-white/55 uppercase tracking-widest mt-1">
                Terminal View
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-[#1a1b26] border border-white/8 rounded flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs font-mono text-emerald-500 uppercase tracking-wider">
                System High-Res
              </span>
            </div>
            <button className="p-2 hover:bg-white/[0.03] rounded-lg transition-colors">
              <Settings className="text-white/55" size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 w-full">
        {/* Fleet Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-[10px] mb-8">
          <div className="bg-[#12131a] border border-white/6 rounded-md p-4 flex flex-col">
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.05em] mb-2">
              Total Agents
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold">{agents.length}</span>
              <span className="font-mono text-[11px] text-white/70 font-medium">SYS_ID</span>
            </div>
            <div className="mt-3">
              <div className="flex h-1 rounded-full overflow-hidden bg-white/8 mb-2">
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${
                      (agents.filter((a) => a.status === 'active').length / agents.length) * 100
                    }%`,
                  }}
                />
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${
                      (agents.filter((a) => a.status === 'idle').length / agents.length) * 100
                    }%`,
                  }}
                />
                <div
                  className="bg-red-500"
                  style={{
                    width: `${
                      (agents.filter((a) => a.status === 'suspended').length / agents.length) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="flex gap-4 text-[9px] font-mono opacity-70">
                <span className="text-emerald-500">
                  ● {agents.filter((a) => a.status === 'active').length} ACT
                </span>
                <span className="text-amber-500">
                  ● {agents.filter((a) => a.status === 'idle').length} IDL
                </span>
                <span className="text-red-500">
                  ● {agents.filter((a) => a.status === 'suspended').length} SUS
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#12131a] border border-white/6 rounded-md p-4 flex flex-col">
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.05em] mb-2">
              Avg Trust
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-emerald-500">
                {(agents.reduce((sum, a) => sum + a.trust, 0) / agents.length).toFixed(1)}
              </span>
              <span className="font-mono text-[11px] text-white/70 font-medium">%</span>
            </div>
            <div className="text-[10px] text-white/55 mt-auto font-mono">SIGMA_H: 0.94</div>
          </div>

          <div className="bg-[#12131a] border border-white/6 rounded-md p-4 flex flex-col">
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.05em] mb-2">
              Actions (24h)
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-blue-500">
                {agents.reduce((sum, a) => sum + a.actions24h, 0).toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-white/55 mt-auto font-mono">Δ +1,244 VPS</div>
          </div>

          <div className="bg-[#12131a] border border-white/6 rounded-md p-4 flex flex-col">
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.05em] mb-2">
              Fleet Latency
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-white">2.4</span>
              <span className="font-mono text-[11px] text-white/70 font-medium">ms</span>
            </div>
            <div className="text-[10px] text-white/55 mt-auto font-mono">p95: 4.1ms</div>
          </div>

          <div className="bg-[#12131a] border border-white/6 rounded-md p-4 flex flex-col">
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.05em] mb-2">
              Total Warrants
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-2xl font-bold text-[#d4a853]">
                {agents.reduce((sum, a) => sum + a.warrants, 0).toLocaleString()}
              </span>
            </div>
            <div className="text-[10px] text-white/55 mt-auto font-mono flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-500" />
              <span className="text-emerald-500">+8.2%</span>
            </div>
          </div>
        </div>

        {/* Terminal Table */}
        <div className="bg-[#12131a] border border-white/8 rounded-lg overflow-hidden shadow-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Agent ID
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Name
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Trust
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Actions (24h)
                </th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Last Action
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Warrants
                </th>
                <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  className={`border-b border-white/6 hover:bg-[#1a1b26] transition-colors ${getRowClass(
                    agent.status
                  )}`}
                >
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                      <span className="text-[10px] font-mono font-semibold uppercase text-white/70">
                        {getStatusLabel(agent.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs text-[#d4a853]">{agent.id}</span>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs text-white/90">{agent.name}</span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span
                      className={`font-mono text-xs font-medium ${
                        agent.trust >= 95
                          ? 'text-emerald-500'
                          : agent.trust >= 85
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {agent.trust.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="font-mono text-xs text-white/70">
                      {agent.actions24h.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-mono text-xs text-white/55">{agent.lastAction}</span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="font-mono text-xs text-white/70">{agent.warrants}</span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button className="text-xs text-[#d4a853] hover:text-[#e0b866] font-medium">
                      Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Performance Monitor */}
        <div className="mt-8 bg-[#12131a] border border-white/8 rounded-lg p-6 shadow-lg">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-4">
            Performance Monitor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">
                CPU Usage
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-blue-500">24</span>
                <span className="font-mono text-sm text-white/70">%</span>
              </div>
              <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[24%]" />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">
                Memory Usage
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-emerald-500">3.2</span>
                <span className="font-mono text-sm text-white/70">GB</span>
              </div>
              <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[40%]" />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-2">
                Network I/O
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold text-amber-500">142</span>
                <span className="font-mono text-sm text-white/70">MB/s</span>
              </div>
              <div className="mt-2 h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[56%]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
