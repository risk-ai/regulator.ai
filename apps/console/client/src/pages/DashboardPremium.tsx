import { Activity, TrendingUp, Minus, Bell, Cpu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  sparklineData: number[];
  color?: 'green' | 'amber' | 'blue';
}

const MetricCard = ({ label, value, trend, trendDirection, sparklineData, color = 'green' }: MetricCardProps) => {
  const colorClasses = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  };

  const trendColor = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    stable: 'text-gray-400',
  };

  return (
    <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-3.5 flex flex-col shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4),0_2px_4px_-1px_rgba(0,0,0,0.3)]">
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">{label}</div>
        {trend && (
          <div className={`text-[11px] font-bold ${trendColor[trendDirection || 'stable']} flex items-center gap-1 font-mono`}>
            {trend} {trendDirection === 'up' && <TrendingUp size={11} />}
            {trendDirection === 'stable' && <Minus size={11} />}
          </div>
        )}
      </div>
      <div className={`text-[28px] font-bold ${color === 'amber' ? 'text-amber-500' : 'text-white'} font-mono mt-1 leading-none`}>
        {value}
      </div>
      <div className="mt-4 flex gap-[1.5px] items-end h-7">
        {sparklineData.map((height, i) => (
          <div
            key={i}
            className={`flex-1 ${colorClasses[color]}`}
            style={{ 
              height: `${height}%`,
              opacity: i === sparklineData.length - 1 ? 1 : 0.2 + (height / 100) * 0.8
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface SystemStatusProps {
  label: string;
  status: 'operational' | 'degraded' | 'warning';
  detail: string;
  uptime?: string;
}

const SystemStatusCard = ({ label, status, detail, uptime }: SystemStatusProps) => {
  const statusConfig = {
    operational: { dot: 'bg-emerald-500', text: 'text-emerald-500', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' },
    degraded: { dot: 'bg-amber-500', text: 'text-amber-500', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
    warning: { dot: 'bg-red-500', text: 'text-red-500', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' },
  };

  return (
    <div className={`bg-[#1a1b26] border border-white/[0.08] rounded-lg p-3 ${statusConfig[status].glow}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-[13px] font-semibold text-white">{label}</div>
        <div className={`w-2 h-2 rounded-full ${statusConfig[status].dot} animate-pulse`} />
      </div>
      <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${statusConfig[status].text}`}>
        {status.toUpperCase()}
      </div>
      <div className="text-[11px] text-white/55 font-mono">{detail}</div>
      {uptime && (
        <div className="text-[10px] text-white/35 font-mono mt-2 pt-2 border-t border-white/[0.06]">
          Uptime: {uptime}
        </div>
      )}
    </div>
  );
};

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'proposal' | 'warrant' | 'policy' | 'agent';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

const ActivityTimeline = ({ events }: { events: ActivityEvent[] }) => {
  const severityColor = {
    info: 'border-blue-500/30',
    warning: 'border-amber-500/30',
    error: 'border-red-500/30',
  };

  return (
    <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Live Activity</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono text-white/55">STREAMING</span>
        </div>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`flex gap-3 p-2 rounded border-l-2 ${severityColor[event.severity]} bg-white/[0.02] hover:bg-white/[0.04] transition-colors`}
          >
            <div className="text-[10px] font-mono text-white/35 whitespace-nowrap pt-0.5">
              {event.timestamp}
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-white/80 font-mono">{event.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPremium() {
  const [showBanner, setShowBanner] = useState(true);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    { id: '1', timestamp: '14:32:15', type: 'warrant', message: 'Warrant #W-8241 issued → agent-142 [tier-1]', severity: 'info' },
    { id: '2', timestamp: '14:31:58', type: 'proposal', message: 'Proposal #P-1847 approved → executing...', severity: 'info' },
    { id: '3', timestamp: '14:31:42', type: 'policy', message: 'Policy evaluation: data-access → ALLOW', severity: 'info' },
    { id: '4', timestamp: '14:31:20', type: 'agent', message: 'Agent agent-089 registered → active', severity: 'info' },
    { id: '5', timestamp: '14:30:55', type: 'warrant', message: 'Warrant #W-8240 executed successfully', severity: 'info' },
  ]);

  // Simulate real-time activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent: ActivityEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: ['proposal', 'warrant', 'policy', 'agent'][Math.floor(Math.random() * 4)] as any,
        message: [
          'Policy evaluation completed',
          'New warrant issued',
          'Agent registered',
          'Proposal pending approval',
        ][Math.floor(Math.random() * 4)],
        severity: ['info', 'info', 'info', 'warning'][Math.floor(Math.random() * 4)] as any,
      };
      setActivityEvents(prev => [newEvent, ...prev].slice(0, 20));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Observation Banner */}
      {showBanner && (
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg py-2.5 px-4 flex items-center gap-3 mb-4">
          <Activity className="text-blue-400" size={18} />
          <div className="flex-1 flex items-center gap-4">
            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-widest whitespace-nowrap">
              System Monitoring Active
            </span>
            <div className="h-4 w-px bg-blue-700/50" />
            <span className="text-[12px] text-blue-300/80 font-mono">
              Real-time governance enforcement — All systems operational
            </span>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-blue-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Active Agents"
          value="142"
          trend="+12.4%"
          trendDirection="up"
          sparklineData={[40, 50, 45, 60, 75, 90, 70, 55, 95, 100]}
          color="green"
        />
        <MetricCard
          label="Warrants Issued Today"
          value="8,241"
          trend="+4.1%"
          trendDirection="up"
          sparklineData={[60, 65, 80, 75, 100, 85, 80, 70, 65, 60]}
          color="green"
        />
        <MetricCard
          label="Policy Evals"
          value="1.24M"
          trend="STABLE"
          trendDirection="stable"
          sparklineData={[70, 72, 69, 75, 71, 73, 70, 72, 71, 69]}
          color="blue"
        />
        <MetricCard
          label="Queue Depth"
          value="42"
          trend="+18%"
          trendDirection="up"
          sparklineData={[20, 25, 35, 45, 50, 65, 75, 85, 95, 100]}
          color="amber"
        />
      </div>

      {/* Main Grid: System Status + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* System Health */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-[11px] font-bold text-white/45 uppercase tracking-wider mb-3">System Health</h3>
          <SystemStatusCard
            label="Governance Engine"
            status="operational"
            detail="Processing 1.2k proposals/min"
            uptime="99.98%"
          />
          <SystemStatusCard
            label="Policy Evaluator"
            status="operational"
            detail="Avg latency: 12ms"
            uptime="99.99%"
          />
          <SystemStatusCard
            label="Warrant Registry"
            status="operational"
            detail="8.2k warrants issued today"
            uptime="100%"
          />
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline events={activityEvents} />
        </div>
      </div>

      {/* Runtime Control Panel */}
      <div className="bg-[#12131a] border border-white/[0.08] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Runtime Control</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded text-[11px] font-semibold text-white transition-colors">
              Pause All
            </button>
            <button className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded text-[11px] font-semibold text-white transition-colors shadow-lg">
              Force Sync
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">CPU</div>
            <div className="text-[20px] font-bold text-white font-mono">38%</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Memory</div>
            <div className="text-[20px] font-bold text-white font-mono">2.4GB</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Threads</div>
            <div className="text-[20px] font-bold text-white font-mono">142</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
            <div className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1">Uptime</div>
            <div className="text-[20px] font-bold text-white font-mono">14d</div>
          </div>
        </div>
      </div>
    </div>
  );
}
