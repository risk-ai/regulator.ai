import React from 'react';
import { Activity, TrendingUp, AlertCircle, Cpu } from 'lucide-react';

export default function DashboardPremium() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#12131a] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#d4a853] rounded flex items-center justify-center">
              <Cpu className="text-black text-lg" size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Vienna OS{' '}
              <span className="text-[11px] font-mono font-medium text-[#d4a853] bg-[#d4a853]/10 px-1.5 py-0.5 rounded ml-2 uppercase">
                Operator Dashboard
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-white/8 rounded-lg p-0.5 bg-[#0a0a0f]">
              <button className="px-3 py-1 text-[11px] font-bold bg-[#d4a853] text-black rounded-md">
                LIVE
              </button>
              <button className="px-3 py-1 text-[11px] font-bold text-white/55 hover:text-white">
                HISTORICAL
              </button>
            </div>
            <button className="px-3 py-1.5 bg-[#d4a853] text-black text-xs font-semibold rounded-md hover:bg-[#e0b866] transition-colors shadow-lg">
              Force Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 w-full space-y-4">
        {/* Observation Banner */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg py-2.5 px-4 flex items-center gap-3">
          <Activity className="text-blue-400" size={18} />
          <div className="flex-1 flex items-center gap-4">
            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap">
              System Monitoring Active
            </span>
            <div className="h-4 w-px bg-blue-700/50" />
            <span className="text-xs text-blue-300/80 font-mono">
              Real-time governance in effect. All agent actions monitored.
            </span>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI: Active Agents */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-3.5 flex flex-col shadow-lg">
            <div className="flex justify-between items-start">
              <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
                Active Agents
              </div>
              <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                +12.4% <TrendingUp size={12} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white font-mono mt-1 leading-none">
              142
            </div>
            <div className="mt-4 flex gap-[1.5px] items-end h-7">
              {[40, 50, 45, 60, 75, 90, 70, 55, 95, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500"
                  style={{ height: `${h}%`, opacity: 0.2 + (h / 100) * 0.8 }}
                />
              ))}
            </div>
          </div>

          {/* KPI: Warrants Issued */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-3.5 flex flex-col shadow-lg">
            <div className="flex justify-between items-start">
              <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
                Warrants Today
              </div>
              <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                +4.1% <TrendingUp size={12} />
              </div>
            </div>
            <div className="text-[28px] font-bold text-white font-mono mt-1 leading-none">
              8,241
            </div>
            <div className="mt-4 flex gap-[1.5px] items-end h-7">
              {[60, 65, 80, 70, 85, 75, 90, 95, 88, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-emerald-500"
                  style={{ height: `${h}%`, opacity: 0.2 + (h / 100) * 0.8 }}
                />
              ))}
            </div>
          </div>

          {/* KPI: Policy Violations */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-3.5 flex flex-col shadow-lg">
            <div className="flex justify-between items-start">
              <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
                Policy Violations
              </div>
              <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1 font-mono">
                +0.8%
              </div>
            </div>
            <div className="text-[28px] font-bold text-white font-mono mt-1 leading-none">
              14
            </div>
            <div className="mt-4 flex gap-[1.5px] items-end h-7">
              {[30, 35, 28, 40, 25, 32, 38, 30, 35, 42].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-amber-500"
                  style={{ height: `${h}%`, opacity: 0.3 + (h / 100) * 0.7 }}
                />
              ))}
            </div>
          </div>

          {/* KPI: Avg Trust Score */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-3.5 flex flex-col shadow-lg">
            <div className="flex justify-between items-start">
              <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">
                Avg Trust Score
              </div>
              <div className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 font-mono">
                +2.1%
              </div>
            </div>
            <div className="text-[28px] font-bold text-emerald-500 font-mono mt-1 leading-none">
              94.2%
            </div>
            <div className="text-[10px] text-white/55 mt-auto font-mono">
              SIGMA: 0.96
            </div>
          </div>
        </div>

        {/* Fleet Status + Live Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Fleet Status Grid */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">
                Fleet Status
              </h2>
              <button className="text-xs text-[#d4a853] hover:text-[#e0b866] font-mono">
                VIEW ALL →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'agent-001', status: 'active', trust: 98, warrants: 142 },
                { name: 'agent-002', status: 'active', trust: 96, warrants: 138 },
                { name: 'agent-003', status: 'idle', trust: 94, warrants: 124 },
                { name: 'agent-004', status: 'active', trust: 99, warrants: 156 },
                { name: 'agent-005', status: 'suspended', trust: 72, warrants: 18 },
                { name: 'agent-006', status: 'active', trust: 95, warrants: 131 },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className="bg-[#1a1b26] border border-white/6 rounded p-2.5 hover:bg-[#22242e] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-white/90">{agent.name}</span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        agent.status === 'active'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : agent.status === 'idle'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/55 font-mono">Trust: {agent.trust}%</span>
                    <span className="text-white/55 font-mono">{agent.warrants}w</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-[#12131a] border border-white/8 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">
                Live Activity
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider">
                  STREAMING
                </span>
              </div>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {[
                {
                  time: '14:32:08',
                  agent: 'agent-001',
                  action: 'Warrant issued',
                  type: 'success',
                },
                {
                  time: '14:31:52',
                  agent: 'agent-003',
                  action: 'Policy check passed',
                  type: 'info',
                },
                {
                  time: '14:31:41',
                  agent: 'agent-002',
                  action: 'Intent submitted',
                  type: 'info',
                },
                {
                  time: '14:31:28',
                  agent: 'agent-005',
                  action: 'Policy violation detected',
                  type: 'warning',
                },
                {
                  time: '14:31:15',
                  agent: 'agent-004',
                  action: 'Execution completed',
                  type: 'success',
                },
                {
                  time: '14:30:58',
                  agent: 'agent-001',
                  action: 'Approval pending',
                  type: 'info',
                },
              ].map((event, i) => (
                <div
                  key={i}
                  className="bg-[#1a1b26] border border-white/6 rounded p-2 flex items-start gap-2 text-[11px]"
                >
                  <span className="font-mono text-white/45 shrink-0">{event.time}</span>
                  <span className="font-mono text-[#d4a853] shrink-0">{event.agent}</span>
                  <span className="text-white/70 flex-1">{event.action}</span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                      event.type === 'success'
                        ? 'bg-emerald-500'
                        : event.type === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#12131a] border border-emerald-500/20 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
                Runtime Status
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="text-2xl font-bold text-emerald-500 font-mono">OPERATIONAL</div>
            <div className="text-[10px] text-white/55 mt-1 font-mono">
              Uptime: 47d 14h 22m
            </div>
          </div>

          <div className="bg-[#12131a] border border-blue-500/20 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
                DB Connection
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="text-2xl font-bold text-emerald-500 font-mono">HEALTHY</div>
            <div className="text-[10px] text-white/55 mt-1 font-mono">
              Pool: 12/50 connections
            </div>
          </div>

          <div className="bg-[#12131a] border border-amber-500/20 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
                Pending Approvals
              </h3>
              <AlertCircle className="text-amber-500" size={14} />
            </div>
            <div className="text-2xl font-bold text-amber-500 font-mono">3</div>
            <div className="text-[10px] text-white/55 mt-1 font-mono">
              Oldest: 4m 12s ago
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
