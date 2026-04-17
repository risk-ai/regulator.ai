/**
 * Risk Heatmap — Vienna OS
 * 
 * Visual heatmap showing agent activity distribution across risk tiers.
 * Competitive differentiation: Obsidian-style risk visualization.
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { addToast } from '../store/toastStore.js';

// ─── Types ───

interface AgentRiskData {
  agent_id: string;
  agent_name: string;
  status: string;
  t0_count: number;
  t1_count: number;
  t2_count: number;
  t3_count: number;
  high_risk_count: number;
  total_actions: number;
}

interface RiskCell {
  agent_id: string;
  agent_name: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  count: number;
}

interface HeatmapData {
  cells: RiskCell[];
  totals: {
    T0: number;
    T1: number;
    T2: number;
    T3: number;
  };
  highest_risk_agent: string;
  risk_concentration: number; // % of actions in T2+
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

// ─── Component ───

export function RiskHeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [sortBy, setSortBy] = useState<'alpha' | 'active' | 'risk'>('risk');
  const [filterT2Plus, setFilterT2Plus] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchHeatmapData() {
      setLoading(true);
      try {
        const response = await apiClient.get<{ success: boolean; data: AgentRiskData[] }>(
          `/analytics/risk-heatmap?range=${timeRange}`
        );

        if (!mounted) return;

        if (response.success && response.data) {
          // Transform backend data to heatmap format
          const cells: RiskCell[] = [];
          const totals = { T0: 0, T1: 0, T2: 0, T3: 0 };

          response.data.forEach((agent) => {
            cells.push({ agent_id: agent.agent_id, agent_name: agent.agent_name, tier: 'T0', count: agent.t0_count });
            cells.push({ agent_id: agent.agent_id, agent_name: agent.agent_name, tier: 'T1', count: agent.t1_count });
            cells.push({ agent_id: agent.agent_id, agent_name: agent.agent_name, tier: 'T2', count: agent.t2_count });
            cells.push({ agent_id: agent.agent_id, agent_name: agent.agent_name, tier: 'T3', count: agent.t3_count });

            totals.T0 += agent.t0_count;
            totals.T1 += agent.t1_count;
            totals.T2 += agent.t2_count;
            totals.T3 += agent.t3_count;
          });

          const totalActions = totals.T0 + totals.T1 + totals.T2 + totals.T3;
          const highRiskActions = totals.T2 + totals.T3;
          const riskConcentration = totalActions > 0 ? Math.round((highRiskActions / totalActions) * 100) : 0;

          // Find highest risk agent
          const sortedByRisk = response.data.sort((a, b) => b.high_risk_count - a.high_risk_count);
          const highestRiskAgent = sortedByRisk[0]?.agent_name || 'N/A';

          setData({
            cells,
            totals,
            highest_risk_agent: highestRiskAgent,
            risk_concentration: riskConcentration,
          });
        } else {
          // No data - show empty state
          setData({
            cells: [],
            totals: { T0: 0, T1: 0, T2: 0, T3: 0 },
            highest_risk_agent: 'N/A',
            risk_concentration: 0,
          });
        }
      } catch (error: any) {
        if (!mounted) return;
        console.error('Failed to fetch risk heatmap:', error);
        addToast('Failed to load risk heatmap data', 'error');
        // Fallback to empty state
        setData({
          cells: [],
          totals: { T0: 0, T1: 0, T2: 0, T3: 0 },
          highest_risk_agent: 'N/A',
          risk_concentration: 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchHeatmapData();

    return () => {
      mounted = false;
    };
  }, [timeRange]);

  if (loading || !data) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <PageLayout title="Risk Distribution" description="Loading heatmap...">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(251, 191, 36, 0.2)',
                borderTop: '3px solid #fbbf24',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          </PageLayout>
        </div>
      </div>
    );
  }

  // Extract unique agents from cells
  const agents = Array.from(new Set(data.cells.map(c => c.agent_id)));
  const tiers: Array<'T0' | 'T1' | 'T2' | 'T3'> = ['T0', 'T1', 'T2', 'T3'];

  // Filter and sort agents
  let filteredAgents = agents;
  if (filterT2Plus) {
    filteredAgents = agents.filter(agent => {
      const t2 = data.cells.find(c => c.agent_id === agent && c.tier === 'T2')?.count || 0;
      const t3 = data.cells.find(c => c.agent_id === agent && c.tier === 'T3')?.count || 0;
      return t2 > 0 || t3 > 0;
    });
  }

  if (sortBy === 'alpha') {
    filteredAgents.sort();
  } else if (sortBy === 'active') {
    filteredAgents.sort((a, b) => {
      const aTotal = data.cells.filter(c => c.agent_id === a).reduce((sum, c) => sum + c.count, 0);
      const bTotal = data.cells.filter(c => c.agent_id === b).reduce((sum, c) => sum + c.count, 0);
      return bTotal - aTotal;
    });
  } else if (sortBy === 'risk') {
    filteredAgents.sort((a, b) => {
      const aRisk = (data.cells.find(c => c.agent_id === a && c.tier === 'T2')?.count || 0) +
                    (data.cells.find(c => c.agent_id === a && c.tier === 'T3')?.count || 0) * 2;
      const bRisk = (data.cells.find(c => c.agent_id === b && c.tier === 'T2')?.count || 0) +
                    (data.cells.find(c => c.agent_id === b && c.tier === 'T3')?.count || 0) * 2;
      return bRisk - aRisk;
    });
  }

  // Helper: Get cell count for agent × tier
  const getCellCount = (agent: string, tier: 'T0' | 'T1' | 'T2' | 'T3'): number => {
    return data.cells.find(c => c.agent_id === agent && c.tier === tier)?.count || 0;
  };

  // Helper: Get color intensity based on count
  const getCellColor = (count: number): string => {
    if (count === 0) return 'rgba(251, 191, 36, 0.05)';
    if (count <= 10) return 'rgba(251, 191, 36, 0.2)';
    if (count <= 50) return 'rgba(251, 191, 36, 0.4)';
    if (count <= 100) return 'rgba(251, 191, 36, 0.6)';
    return 'rgba(251, 191, 36, 0.8)';
  };

  // Helper: Tier color for headers
  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'T0': return '#10b981'; // green
      case 'T1': return '#fbbf24'; // amber
      case 'T2': return '#ef4444'; // red
      case 'T3': return '#991b1b'; // dark red
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PageLayout title="" description="">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
                  RISK DISTRIBUTION
                </h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                  Agent activity by risk tier - last {timeRange}
                </p>
              </div>

              {/* Time Range Selector */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['24h', '7d', '30d', '90d'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{
                      padding: '6px 12px',
                      background: timeRange === range ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)',
                      border: timeRange === range ? 'none' : '1px solid rgba(251, 191, 36, 0.3)',
                      color: timeRange === range ? '#0A0E14' : '#fbbf24',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard
              icon={<Shield size={16} />}
              label="Total Actions"
              value={(data.totals.T0 + data.totals.T1 + data.totals.T2 + data.totals.T3).toLocaleString()}
              color="#10b981"
            />
            <StatCard
              icon={<AlertTriangle size={16} />}
              label="High Risk (T2+)"
              value={`${data.risk_concentration}%`}
              sublabel={`${data.totals.T2 + data.totals.T3} actions`}
              color="#ef4444"
            />
            <StatCard
              icon={<TrendingUp size={16} />}
              label="Highest Risk Agent"
              value={data.highest_risk_agent}
              color="#fbbf24"
            />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>SORT:</span>
              {[
                { key: 'risk', label: 'Risk' },
                { key: 'active', label: 'Active' },
                { key: 'alpha', label: 'A-Z' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key as any)}
                  style={{
                    padding: '4px 10px',
                    background: sortBy === key ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    color: sortBy === key ? '#fbbf24' : '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterT2Plus}
                onChange={(e) => setFilterT2Plus(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Show only T2+ agents
            </label>
          </div>

          {/* Heatmap Grid */}
          <div style={{
            background: '#0A0E14',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            overflow: 'auto',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
            }}>
              <thead>
                <tr style={{ background: 'rgba(251, 191, 36, 0.05)' }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 700,
                    position: 'sticky',
                    left: 0,
                    background: '#0A0E14',
                    zIndex: 10,
                  }}>
                    AGENT
                  </th>
                  {tiers.map(tier => (
                    <th key={tier} style={{
                      padding: '12px',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      color: getTierColor(tier),
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      <div>{tier}</div>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {data.totals[tier].toLocaleString()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(agent => (
                  <tr key={agent} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '11px',
                      position: 'sticky',
                      left: 0,
                      background: '#0A0E14',
                      zIndex: 5,
                    }}>
                      {agent}
                    </td>
                    {tiers.map(tier => {
                      const count = getCellCount(agent, tier);
                      const color = getCellColor(count);
                      return (
                        <td
                          key={tier}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            background: color,
                            color: count > 50 ? '#0A0E14' : '#fff',
                            cursor: count > 0 ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            if (count > 0) {
                              e.currentTarget.style.boxShadow = `inset 0 0 0 2px ${getTierColor(tier)}`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          title={count > 0 ? `${agent}: ${count} ${tier} actions` : ''}
                        >
                          {count > 0 ? count.toLocaleString() : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(251, 191, 36, 0.05)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              COLOR SCALE
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[
                { label: '0', color: 'rgba(251, 191, 36, 0.05)' },
                { label: '1-10', color: 'rgba(251, 191, 36, 0.2)' },
                { label: '11-50', color: 'rgba(251, 191, 36, 0.4)' },
                { label: '51-100', color: 'rgba(251, 191, 36, 0.6)' },
                { label: '100+', color: 'rgba(251, 191, 36, 0.8)' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '24px',
                    height: '16px',
                    background: color,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }} />
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PageLayout>
      </div>
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'rgba(10, 14, 20, 0.6)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      padding: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ color }}>{icon}</div>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
          {label.toUpperCase()}
        </div>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
