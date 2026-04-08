/**
 * Fleet Dashboard Page — Enhanced Fleet Overview
 * 
 * Implements Superdesign draft: ffee3d5e-01fc-47e5-93f2-94f342fb19be
 * "Vienna OS Enhanced Fleet Overview"
 * 
 * Features:
 * - 5 fleet stat cards with status breakdown
 * - Agent grid with profile cards
 * - Sparklines for execution trends
 * - Trust integrity scores with health bars
 * - Real-time status indicators
 * - Filter controls and search
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Settings, Search, Filter } from 'lucide-react';
import { FleetStatCard } from '../components/ui/FleetStatCard';
import { AgentCard, type Agent } from '../components/ui/AgentCard';

export function FleetDashboardNew() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'autonomous' | 'supervised'>('all');
  const [loading, setLoading] = useState(true);

  // Mock data (TODO: replace with real API)
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadFleetData();
  }, []);

  const loadFleetData = async () => {
    setLoading(true);
    
    // TODO: Replace with real API call
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock agent data
    const mockAgents: Agent[] = [
      {
        id: 'agent-1',
        name: 'ARES-9-DELTA',
        shortId: 'a8f-2219-c901',
        status: 'active',
        tier: 'T0',
        trustScore: 98,
        executions24h: 1248,
        heartbeatRelative: '4s ago',
        sparklineData: [15, 12, 14, 10, 11, 6, 8, 4, 5, 2, 3],
      },
      {
        id: 'agent-2',
        name: 'CYPHER-MOD-4',
        shortId: 'x09-8812-r721',
        status: 'idle',
        tier: 'T2',
        trustScore: 72,
        executions24h: 412,
        heartbeatRelative: '12m ago',
        sparklineData: [12, 13, 12, 13, 12, 13, 12, 12, 13, 12, 12],
      },
      {
        id: 'agent-3',
        name: 'PHANTOM-RECON',
        shortId: 'p22-4401-b889',
        status: 'suspended',
        tier: 'T3',
        trustScore: 34,
        executions24h: 0,
        heartbeatRelative: '2h ago',
        sparklineData: [8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0],
      },
      {
        id: 'agent-4',
        name: 'NEXUS-PRIME',
        shortId: 'n55-7788-x199',
        status: 'active',
        tier: 'T1',
        trustScore: 94,
        executions24h: 892,
        heartbeatRelative: '8s ago',
        sparklineData: [10, 12, 11, 13, 10, 15, 12, 14, 11, 16, 14],
      },
    ];
    
    setAgents(mockAgents);
    setLoading(false);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.shortId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // TODO: Add autonomous/supervised filtering when we have that data
    const matchesFilter = filterMode === 'all' || true;
    
    return matchesSearch && matchesFilter;
  });

  // Calculate fleet stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const idleAgents = agents.filter(a => a.status === 'idle').length;
  const suspendedAgents = agents.filter(a => a.status === 'suspended').length;
  const avgTrust = agents.length > 0 
    ? Math.round(agents.reduce((sum, a) => sum + a.trustScore, 0) / agents.length)
    : 0;
  const totalActions = agents.reduce((sum, a) => sum + a.executions24h, 0);
  const unresolvedAlerts = suspendedAgents + agents.filter(a => a.trustScore < 50).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#12131a] sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-amber-600 rounded flex items-center justify-center">
              <Cpu className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold leading-none tracking-tight">Fleet Dashboard</h1>
              <p className="text-[11px] text-[rgba(255,255,255,0.55)] uppercase tracking-widest mt-1">
                Bloomberg Terminal for AI Agents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-mono text-emerald-500 uppercase tracking-wider">
                System Online
              </span>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
            >
              <Settings className="text-[rgba(255,255,255,0.55)] w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 w-full flex-1">
        {/* Fleet Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-[10px] mb-8">
          <FleetStatCard
            label="Total Agents"
            value={totalAgents}
            unit="AGENTS"
            statusBar={{
              segments: [
                { value: (activeAgents / totalAgents) * 100, color: '[#10b981]', label: `${activeAgents} ACTIVE` },
                { value: (idleAgents / totalAgents) * 100, color: '[#f59e0b]', label: `${idleAgents} IDLE` },
                { value: (suspendedAgents / totalAgents) * 100, color: '[#ef4444]', label: `${suspendedAgents} SUSP` },
              ],
            }}
            loading={loading}
          />
          
          <FleetStatCard
            label="Avg Trust Score"
            value={avgTrust}
            unit="%"
            subtext="✓ FLEET HEALTH: EXCELLENT"
            variant="success"
            loading={loading}
          />
          
          <FleetStatCard
            label="Actions Today"
            value={totalActions.toLocaleString()}
            subtext="+12.4% VS YESTERDAY"
            loading={loading}
          />
          
          <FleetStatCard
            label="Avg Latency"
            value={42}
            unit="MS"
            subtext="STATUS: OPTIMAL"
            variant="success"
            loading={loading}
          />
          
          <FleetStatCard
            label="Unresolved Alerts"
            value={unresolvedAlerts}
            subtext="⚡ ACTION REQUIRED"
            variant={unresolvedAlerts > 0 ? 'critical' : 'default'}
            loading={loading}
          />
        </div>

        {/* Fleet Controls & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-[17px] font-semibold text-white">Live Fleet Inventory</h2>
            <div className="h-4 w-[1px] bg-[rgba(255,255,255,0.12)]" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  filterMode === 'all'
                    ? 'bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[#a855f7]'
                    : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('autonomous')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  filterMode === 'autonomous'
                    ? 'bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[#a855f7]'
                    : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)]'
                }`}
              >
                Autonomous
              </button>
              <button
                onClick={() => setFilterMode('supervised')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  filterMode === 'supervised'
                    ? 'bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.3)] text-[#a855f7]'
                    : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)]'
                }`}
              >
                Supervised
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.35)] w-4 h-4" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#12131a] border border-[rgba(255,255,255,0.08)] rounded-md pl-9 pr-4 py-1.5 text-[13px] w-64 focus:outline-none focus:border-[#7c3aed] transition-colors text-white placeholder-[rgba(255,255,255,0.35)]"
              />
            </div>
            <button className="p-1.5 bg-[#12131a] border border-[rgba(255,255,255,0.08)] rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors">
              <Filter className="text-white w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            // Loading skeletons
            [...Array(4)].map((_, i) => <AgentCard key={i} agent={{} as Agent} loading />)
          ) : filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSuspend={(id) => console.log('Suspend agent:', id)}
                onAdjust={(id) => navigate(`/fleet/${id}`)}
              />
            ))
          ) : (
            // Empty state
            <div className="col-span-full text-center py-16">
              <div className="text-[rgba(255,255,255,0.35)] text-sm">
                No agents found matching "{searchQuery}"
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
