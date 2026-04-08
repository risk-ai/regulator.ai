/**
 * Premium Dashboard for Vienna OS Presentation
 * Showcases system capabilities with polished UI
 */

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

function MetricCard({ label, value, trend, trendValue, icon, status = 'healthy' }: MetricCardProps) {
  const statusColors = {
    healthy: { bg: 'rgba(74, 222, 128, 0.1)', border: 'rgba(74, 222, 128, 0.3)', text: '#10b981' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#f59e0b' },
    critical: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', text: '#ef4444' },
  };
  
  const colors = statusColors[status];
  
  return (
    <div className="metric-card fade-in" style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className="metric-label">{label}</div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      
      <div className="metric-value" style={{ color: colors.text }}>
        {value}
      </div>
      
      {trend && trendValue && (
        <div className={`metric-trend ${trend}`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}

interface TimelineItemProps {
  time: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

function TimelineItem({ time, title, description, status }: TimelineItemProps) {
  const statusColors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#60a5fa',
  };
  
  return (
    <div className="timeline-item">
      <div 
        className="timeline-content"
        style={{
          borderLeftColor: statusColors[status],
          borderLeftWidth: '3px',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="font-semibold text-white">{title}</div>
          <div className="text-xs text-gray-400">{time}</div>
        </div>
        <div className="text-sm text-gray-300">{description}</div>
      </div>
    </div>
  );
}

export function PremiumDashboard() {
  return (
    <div className="space-y-8 pb-12" style={{ paddingTop: '100px' }}>
      {/* Hero Section */}
      <div className="gradient-border fade-in">
        <div className="gradient-border-content">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-3" style={{
                fontFamily: 'var(--font-display)',
              }}>
                Governed AI Operating System
              </h1>
              <p className="text-lg text-gray-300">
                Complete execution traceability with architectural enforcement
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="status-badge healthy text-base">
                <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                All Systems Operational
              </div>
              <div className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid-4">
        <MetricCard
          label="Active Objectives"
          value="3"
          trend="up"
          trendValue="+1 today"
          icon="🎯"
          status="healthy"
        />
        <MetricCard
          label="Executions (24h)"
          value="127"
          trend="stable"
          trendValue="avg 130/day"
          icon="⚡"
          status="healthy"
        />
        <MetricCard
          label="Success Rate"
          value="98.4%"
          trend="up"
          trendValue="+2.1%"
          icon="✓"
          status="healthy"
        />
        <MetricCard
          label="Avg Response Time"
          value="1.2s"
          trend="down"
          trendValue="-0.3s"
          icon="⏱"
          status="healthy"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid-2">
        {/* System Health */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-xl font-bold text-white mb-6">System Health</h2>
          
          <div className="space-y-3">
            <HealthBar label="Vienna Core" value={100} status="healthy" />
            <HealthBar label="State Graph" value={100} status="healthy" />
            <HealthBar label="Execution Pipeline" value={98} status="healthy" />
            <HealthBar label="Provider Health" value={95} status="healthy" />
            <HealthBar label="Audit Trail" value={100} status="healthy" />
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          
          <div className="timeline">
            <TimelineItem
              time="2m ago"
              title="Objective Evaluated"
              description="Gateway health check completed successfully"
              status="success"
            />
            <TimelineItem
              time="8m ago"
              title="Plan Executed"
              description="Service restart workflow completed"
              status="success"
            />
            <TimelineItem
              time="15m ago"
              title="Policy Evaluated"
              description="Rate limit check passed"
              status="info"
            />
            <TimelineItem
              time="23m ago"
              title="Verification Complete"
              description="Post-execution health verified"
              status="success"
            />
          </div>
        </div>
      </div>

      {/* Architecture Pipeline Visualization */}
      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold gradient-text mb-8">Governance Pipeline</h2>
        
        <div className="flex items-center justify-between">
          <PipelineStage label="Intent" icon="💭" active />
          <PipelineArrow />
          <PipelineStage label="Plan" icon="📋" active />
          <PipelineArrow />
          <PipelineStage label="Policy" icon="⚖️" active />
          <PipelineArrow />
          <PipelineStage label="Warrant" icon="🔑" active />
          <PipelineArrow />
          <PipelineStage label="Execute" icon="⚡" active />
          <PipelineArrow />
          <PipelineStage label="Verify" icon="✓" active />
          <PipelineArrow />
          <PipelineStage label="Ledger" icon="📜" active />
        </div>
      </div>

      {/* Phase Progress */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-bold text-white mb-6">Development Progress</h2>
        
        <div className="space-y-4">
          <PhaseProgress phase="Phase 12: Operator Workspace" progress={100} status="complete" />
          <PhaseProgress phase="Phase 11: Intent Gateway" progress={100} status="complete" />
          <PhaseProgress phase="Phase 10: Control Plane" progress={100} status="complete" />
          <PhaseProgress phase="Phase 9: Objective Orchestration" progress={100} status="complete" />
          <PhaseProgress phase="Phase 8: Governance Spine" progress={100} status="complete" />
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, status }: { label: string; value: number; status: 'healthy' | 'warning' | 'critical' }) {
  const statusColors = {
    healthy: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
  };
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold" style={{ color: statusColors[status] }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${value}%`,
            background: `linear-gradient(90deg, ${statusColors[status]}, ${statusColors[status]}dd)`,
            boxShadow: `0 0 10px ${statusColors[status]}66`,
          }}
        />
      </div>
    </div>
  );
}

function PipelineStage({ label, icon, active }: { label: string; icon: string; active: boolean }) {
  return (
    <div className={`flex flex-col items-center ${active ? '' : 'opacity-50'}`}>
      <div 
        className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl mb-3 transition-all duration-300"
        style={{
          background: active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))' : 'rgba(255, 255, 255, 0.05)',
          border: active ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: active ? '0 0 20px rgba(99, 102, 241, 0.3)' : 'none',
        }}
      >
        {icon}
      </div>
      <div className="text-xs font-semibold text-gray-400">{label}</div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="h-0.5 flex-1 bg-gradient-to-r from-amber-500 to-amber-500 opacity-50"></div>
      <div className="text-amber-400 mx-2">→</div>
    </div>
  );
}

function PhaseProgress({ phase, progress, status }: { phase: string; progress: number; status: 'complete' | 'active' | 'planned' }) {
  const statusConfig = {
    complete: { color: '#10b981', label: 'Complete', icon: '✓' },
    active: { color: '#60a5fa', label: 'In Progress', icon: '⏳' },
    planned: { color: 'var(--text-secondary)', label: 'Planned', icon: '○' },
  };
  
  const config = statusConfig[status];
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-lg">{config.icon}</span>
          <span className="font-medium text-white">{phase}</span>
        </div>
        <span className="text-sm font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ 
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${config.color}, ${config.color}dd)`,
            boxShadow: `0 0 10px ${config.color}66`,
          }}
        />
      </div>
    </div>
  );
}
