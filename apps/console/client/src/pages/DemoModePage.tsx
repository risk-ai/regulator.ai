import { useState } from 'react';
import { Terminal, PlayCircle, RotateCcw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: string;
  events: number;
}

interface DemoEvent {
  id: string;
  type: 'intent' | 'proposal' | 'warrant' | 'execution' | 'audit';
  timestamp: string;
  agent: string;
  action: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  status: 'approved' | 'denied' | 'pending' | 'complete' | 'failed';
}

export default function DemoModePage() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<DemoEvent[]>([]);

  const scenarios: DemoScenario[] = [
    {
      id: 'quick-tour',
      name: 'Quick Tour (2 min)',
      description: 'Basic governance flow: 3 agents, 5 intents, 1 denial',
      duration: '2 minutes',
      events: 12,
    },
    {
      id: 'compliance-demo',
      name: 'Compliance Audit (5 min)',
      description: 'SOC 2 scenario: 5 agents, 15 intents, policy violations, audit trail',
      duration: '5 minutes',
      events: 35,
    },
    {
      id: 'risk-escalation',
      name: 'Risk Escalation (3 min)',
      description: 'T2/T3 actions, human approval flow, execution monitoring',
      duration: '3 minutes',
      events: 18,
    },
    {
      id: 'multi-agent',
      name: 'Multi-Agent Fleet (10 min)',
      description: '20 agents, parallel workflows, fleet coordination',
      duration: '10 minutes',
      events: 80,
    },
  ];

  const handlePlayScenario = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setIsPlaying(true);
    setProgress(0);
    setEvents([]);

    // TODO: Call backend /api/v1/demo/seed endpoint
    // For now, simulate with mock data
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    // Simulate progress
    const duration = parseInt(scenario.duration) * 60 * 1000; // Convert to ms
    const interval = duration / 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, interval);

    // Generate mock events
    const mockEvents: DemoEvent[] = [];
    const agents = ['agent-alpha', 'agent-beta', 'agent-gamma', 'agent-delta', 'agent-epsilon'];
    const actions = [
      'deploy_infrastructure',
      'query_database',
      'send_email',
      'update_config',
      'delete_resource',
      'create_user',
      'modify_permissions',
    ];
    const tiers: Array<'T0' | 'T1' | 'T2' | 'T3'> = ['T0', 'T1', 'T2', 'T3'];
    const statuses: Array<'approved' | 'denied' | 'pending' | 'complete' | 'failed'> = [
      'approved',
      'approved',
      'approved',
      'denied',
      'complete',
    ];

    // Deterministic pseudo-random selection (seeded by index)
    const deterministicSelect = <T,>(arr: T[], seed: number): T => {
      return arr[seed % arr.length];
    };

    for (let i = 0; i < scenario.events; i++) {
      const event: DemoEvent = {
        id: `demo-event-${i}`,
        type: deterministicSelect(['intent', 'proposal', 'warrant', 'execution', 'audit'] as DemoEvent['type'][], i * 7),
        timestamp: new Date(Date.now() + i * 5000).toISOString(),
        agent: deterministicSelect(agents, i * 13),
        action: deterministicSelect(actions, i * 17),
        tier: deterministicSelect(tiers, i * 23),
        status: deterministicSelect(statuses, i * 29),
      };
      mockEvents.push(event);
    }

    // Stream events gradually
    for (let i = 0; i < mockEvents.length; i++) {
      setTimeout(() => {
        setEvents((prev) => [...prev, mockEvents[i]]);
      }, (i / mockEvents.length) * duration);
    }
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setIsPlaying(false);
    setProgress(0);
    setEvents([]);
  };

  const getStatusIcon = (status: DemoEvent['status']) => {
    switch (status) {
      case 'approved':
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'denied':
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-400" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'T0':
        return 'text-green-400';
      case 'T1':
        return 'text-amber-400';
      case 'T2':
        return 'text-red-400';
      case 'T3':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#e4e4e4] overflow-hidden">


      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Terminal className="w-8 h-8 text-[#d4af37]" />
          <div>
            <h1 className="text-3xl font-bold text-[#d4af37] font-mono">Demo Mode</h1>
            <p className="text-sm text-gray-400 mt-1">One-click governance scenarios for sales and demos</p>
          </div>
        </div>

        {/* Scenarios Grid */}
        {!selectedScenario && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handlePlayScenario(scenario.id)}
                className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6 text-left hover:border-[#d4af37]/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-[#d4af37] font-mono group-hover:text-[#d4af37]/90">
                    {scenario.name}
                  </h3>
                  <PlayCircle className="w-6 h-6 text-[#d4af37]/60 group-hover:text-[#d4af37]" />
                </div>
                <p className="text-sm text-gray-400 mb-4">{scenario.description}</p>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-gray-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {scenario.duration}
                  </span>
                  <span className="text-gray-500">{scenario.events} events</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Active Demo */}
        {selectedScenario && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#d4af37] font-mono">
                    {scenarios.find((s) => s.id === selectedScenario)?.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {scenarios.find((s) => s.id === selectedScenario)?.description}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded border border-red-500/40 hover:bg-red-500/30 transition-colors flex items-center gap-2 font-mono text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <div className="relative w-full h-3 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#d4af37] to-amber-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs font-mono text-gray-500">
                <span>{progress}%</span>
                <span>{isPlaying ? 'Running...' : progress === 100 ? 'Complete' : 'Ready'}</span>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-6">
              <h4 className="text-sm font-bold text-[#d4af37] font-mono mb-4 uppercase tracking-wider">
                Governance Timeline
              </h4>
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                {events.length === 0 && (
                  <div className="text-center py-12 text-gray-500 text-sm font-mono">
                    No events yet. Demo will start shortly...
                  </div>
                )}
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-[#0a0a0a]/60 rounded border border-gray-800 hover:border-[#d4af37]/40 transition-colors"
                  >
                    <div className="flex-shrink-0">{getStatusIcon(event.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-gray-400">{event.type.toUpperCase()}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{event.agent}</span>
                        <span className="text-gray-600">•</span>
                        <span className={getTierColor(event.tier)}>{event.tier}</span>
                      </div>
                      <div className="text-sm text-[#e4e4e4] mt-1 truncate">{event.action}</div>
                    </div>
                    <div className="flex-shrink-0 text-xs font-mono text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">Total Events</div>
                <div className="text-2xl font-bold text-[#d4af37] font-mono">{events.length}</div>
              </div>
              <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">Approved</div>
                <div className="text-2xl font-bold text-green-400 font-mono">
                  {events.filter((e) => e.status === 'approved' || e.status === 'complete').length}
                </div>
              </div>
              <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">Denied</div>
                <div className="text-2xl font-bold text-red-400 font-mono">
                  {events.filter((e) => e.status === 'denied' || e.status === 'failed').length}
                </div>
              </div>
              <div className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-[#d4af37]/20 rounded-lg p-4">
                <div className="text-xs font-mono text-gray-500 uppercase mb-1">High Risk</div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {events.filter((e) => e.tier === 'T2' || e.tier === 'T3').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
