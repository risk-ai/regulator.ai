/**
 * Usage Dashboard — Vienna OS
 * 
 * Real-time usage metrics: proposals/day, warrants issued, API calls, agent utilization.
 * Feeds upgrade funnel by showing usage against plan limits.
 * 
 * Features:
 * - Proposals per day chart
 * - Warrants issued (total + by tier)
 * - API call volume
 * - Agent utilization percentage
 * - Plan usage vs limits
 * - Upgrade CTA when approaching limits
 */

import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { TrendingUp, Activity, Shield, Zap, Users, ArrowUp } from 'lucide-react';

interface UsageMetrics {
  proposals_today: number;
  proposals_this_month: number;
  warrants_issued_today: number;
  warrants_issued_this_month: number;
  api_calls_today: number;
  api_calls_this_month: number;
  agents_active: number;
  agents_total: number;
  plan_limits: {
    proposals_per_month: number;
    agents_max: number;
    api_calls_per_month: number;
  };
  trend_data: {
    date: string;
    proposals: number;
    warrants: number;
    api_calls: number;
  }[];
}

export function UsageDashboardPage() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/usage/metrics?range=${timeRange}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to load usage metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Usage Dashboard" description="Loading metrics...">
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
          Loading usage data...
        </div>
      </PageLayout>
    );
  }

  if (!metrics) {
    return (
      <PageLayout title="Usage Dashboard" description="Error loading metrics">
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)' }}>
          Failed to load usage data. Please try again.
        </div>
      </PageLayout>
    );
  }

  const proposalsUsage = (metrics.proposals_this_month / metrics.plan_limits.proposals_per_month) * 100;
  const agentsUsage = (metrics.agents_active / metrics.plan_limits.agents_max) * 100;
  const apiCallsUsage = (metrics.api_calls_this_month / metrics.plan_limits.api_calls_per_month) * 100;

  const shouldShowUpgrade = proposalsUsage > 80 || agentsUsage > 80 || apiCallsUsage > 80;

  return (
    <PageLayout title="Usage Dashboard" description="Real-time metrics and plan usage">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Time Range Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '8px 16px',
                  background: timeRange === range ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-app)',
                  border: timeRange === range ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: timeRange === range ? '#f59e0b' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: timeRange === range ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Upgrade Banner */}
        {shouldShowUpgrade && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>
                Approaching Plan Limits
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                You're using {Math.max(proposalsUsage, agentsUsage, apiCallsUsage).toFixed(0)}% of your plan capacity. Upgrade to continue scaling.
              </p>
            </div>
            <a
              href="/settings?tab=billing"
              style={{
                padding: '12px 24px',
                background: '#f59e0b',
                color: '#000',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ArrowUp size={16} />
              Upgrade Plan
            </a>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <KPICard
            icon={<Activity size={20} />}
            label="Proposals Today"
            value={metrics.proposals_today}
            total={metrics.proposals_this_month}
            subtitle={`${metrics.proposals_this_month} this month`}
            color="#f59e0b"
            usage={proposalsUsage}
            limit={metrics.plan_limits.proposals_per_month}
          />
          <KPICard
            icon={<Shield size={20} />}
            label="Warrants Issued"
            value={metrics.warrants_issued_today}
            total={metrics.warrants_issued_this_month}
            subtitle={`${metrics.warrants_issued_this_month} this month`}
            color="#10b981"
          />
          <KPICard
            icon={<Zap size={20} />}
            label="API Calls Today"
            value={metrics.api_calls_today}
            total={metrics.api_calls_this_month}
            subtitle={`${metrics.api_calls_this_month} this month`}
            color="#3b82f6"
            usage={apiCallsUsage}
            limit={metrics.plan_limits.api_calls_per_month}
          />
          <KPICard
            icon={<Users size={20} />}
            label="Active Agents"
            value={metrics.agents_active}
            total={metrics.agents_total}
            subtitle={`${metrics.agents_total} total registered`}
            color="#8b5cf6"
            usage={agentsUsage}
            limit={metrics.plan_limits.agents_max}
          />
        </div>

        {/* Trend Chart */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} className="text-amber-500" />
            Usage Trends
          </h2>

          <div style={{ height: '300px', position: 'relative' }}>
            <SimpleTrendChart data={metrics.trend_data} />
          </div>
        </div>

        {/* Plan Details */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Plan Limits
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <LimitCard
              label="Proposals"
              used={metrics.proposals_this_month}
              limit={metrics.plan_limits.proposals_per_month}
              percentage={proposalsUsage}
            />
            <LimitCard
              label="API Calls"
              used={metrics.api_calls_this_month}
              limit={metrics.plan_limits.api_calls_per_month}
              percentage={apiCallsUsage}
            />
            <LimitCard
              label="Agents"
              used={metrics.agents_active}
              limit={metrics.plan_limits.agents_max}
              percentage={agentsUsage}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function KPICard({ icon, label, value, total, subtitle, color, usage, limit }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  subtitle: string;
  color: string;
  usage?: number;
  limit?: number;
}) {
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>
          {label}
        </span>
      </div>

      <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {value.toLocaleString()}
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        {subtitle}
      </div>

      {usage !== undefined && limit !== undefined && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
            <span>{usage.toFixed(0)}% of limit</span>
            <span>{limit.toLocaleString()}</span>
          </div>
          <div style={{
            height: '4px',
            background: 'var(--bg-app)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(usage, 100)}%`,
              background: usage > 80 ? '#ef4444' : usage > 60 ? '#f59e0b' : '#10b981',
              transition: 'width 300ms',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LimitCard({ label, used, limit, percentage }: {
  label: string;
  used: number;
  limit: number;
  percentage: number;
}) {
  return (
    <div style={{
      background: 'var(--bg-app)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {used.toLocaleString()} / {limit.toLocaleString()}
      </div>
      <div style={{
        height: '6px',
        background: 'var(--bg-primary)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginTop: '8px',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(percentage, 100)}%`,
          background: percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#10b981',
        }} />
      </div>
    </div>
  );
}

function SimpleTrendChart({ data }: { data: UsageMetrics['trend_data'] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
        No trend data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.proposals, d.warrants, d.api_calls)));

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%' }}>
      {data.map((point, idx) => (
        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', gap: '2px' }}>
            <div
              title={`Proposals: ${point.proposals}`}
              style={{
                height: `${(point.proposals / maxValue) * 100}%`,
                background: '#f59e0b',
                borderRadius: '2px 2px 0 0',
              }}
            />
            <div
              title={`Warrants: ${point.warrants}`}
              style={{
                height: `${(point.warrants / maxValue) * 100}%`,
                background: '#10b981',
                borderRadius: '2px 2px 0 0',
              }}
            />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default UsageDashboardPage;
