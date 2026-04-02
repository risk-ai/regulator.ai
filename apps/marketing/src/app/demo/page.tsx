"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Lock,
  Terminal,
  Eye,
  Clock,
  Zap,
  Code,
  Star,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { analytics } from "@/lib/analytics";

// Scene definitions
const SCENES = [
  {
    id: 'introduction',
    title: 'Introduction',
    duration: 10000,
  },
  {
    id: 'live-demo',
    title: 'Live Demo',
    duration: 20000, // Extended for real execution
  },
  {
    id: 'denial-demo',
    title: 'Denial Demo',
    duration: 15000,
  },
  {
    id: 'integration',
    title: 'Integration',
    duration: 12000,
  },
  {
    id: 'try-your-own',
    title: 'Try Your Own',
    duration: 0, // Interactive, no auto-advance
  },
  {
    id: 'cta',
    title: 'Get Started',
    duration: 8000,
  },
] as const;

type SceneId = typeof SCENES[number]['id'];

const SCENARIO_OPTIONS = [
  { id: 'wire_transfer', label: 'Wire Transfer $75K', description: 'High-value financial transaction', tier: 'T2', color: 'amber' },
  { id: 'production_deploy', label: 'Production Deploy', description: 'Deploy to production environment', tier: 'T1/T1+', color: 'blue' },
  { id: 'patient_record', label: 'Patient Record Update', description: 'HIPAA-regulated data access', tier: 'T1', color: 'green' },
  { id: 'denied_scope_creep', label: 'Unauthorized Access', description: 'Agent scope violation', tier: 'DENIED', color: 'red' },
  { id: 'auto_approved_read', label: 'Read-Only Query', description: 'Low-risk data access', tier: 'T0', color: 'slate' },
] as const;

const INTEGRATION_CODE = `from vienna_sdk import ViennaClient

client = ViennaClient(api_key="vos_your_key")

result = client.submit_intent(
  action="deploy", 
  params={"service": "api"}
)

if result.approved:
    deploy(result.warrant_id)
else:
    log_denial(result.reason)`;

interface PipelineStep {
  step: string;
  label: string;
  status: "success" | "denied" | "skipped";
  duration_ms: number;
  detail: string;
  timestamp: string;
}

interface Warrant {
  warrant_id: string;
  issued_at: string;
  expires_at: string;
  ttl_seconds: number;
  scope: Record<string, any>;
  constraints: Record<string, any>;
  signature_hash: string;
  issuer: string;
  verified: boolean;
}

interface PipelineResult {
  execution_id: string;
  scenario: string;
  outcome: "approved" | "denied" | "auto-approved";
  tier: string;
  pipeline: PipelineStep[];
  warrant: Warrant | null;
  audit_trail: any[];
  policy_rules: any[];
  total_duration_ms: number;
}

// Animation components for pipeline execution
function LivePipelineAnimation({ 
  isActive, 
  pipeline, 
  currentStep 
}: { 
  isActive: boolean; 
  pipeline: PipelineStep[];
  currentStep: number;
}) {
  if (!isActive || !pipeline.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {pipeline.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFailed = step.status === 'denied' && (isCompleted || isCurrent);
          const isSkipped = step.status === 'skipped';
          
          return (
            <div key={step.step} className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-500 min-w-24 text-center ${
                isFailed 
                  ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                  : isSkipped
                  ? 'bg-slate-800 border-slate-700 text-slate-600'
                  : isCurrent
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 animate-pulse'
                  : isCompleted 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-navy-800 border-navy-700 text-slate-500'
              }`}>
                {step.label}
                {isFailed && <XCircle className="w-3 h-3 ml-1 inline" />}
                {isCompleted && !isFailed && !isSkipped && <CheckCircle className="w-3 h-3 ml-1 inline" />}
                {isCurrent && !isFailed && <RefreshCw className="w-3 h-3 ml-1 inline animate-spin" />}
              </div>
              {index < pipeline.length - 1 && (
                <ChevronRight className={`w-4 h-4 transition-colors duration-500 ${
                  isCompleted ? 'text-slate-400' : 'text-slate-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step details */}
      {currentStep < pipeline.length && pipeline[currentStep] && (
        <div className="bg-navy-900/80 border border-purple-500/30 rounded-lg p-4 animate-fade-in text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-purple-400 font-semibold text-sm">
              Executing: {pipeline[currentStep].label}
            </span>
          </div>
          <p className="text-slate-300 text-sm">
            {pipeline[currentStep].detail}
          </p>
        </div>
      )}
    </div>
  );
}

function WarrantDisplay({ warrant, isActive }: { warrant: Warrant | null; isActive: boolean }) {
  const [showWarrant, setShowWarrant] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isActive && warrant) {
      const timer = setTimeout(() => setShowWarrant(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowWarrant(false);
    }
  }, [isActive, warrant]);

  const copyWarrant = () => {
    if (warrant) {
      navigator.clipboard.writeText(JSON.stringify(warrant, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inspectWarrant = () => {
    analytics.ctaClick('demo-warrant', 'inspect_warrant');
    window.open('/demo/warrant', '_blank');
  };

  if (!showWarrant || !warrant) return null;

  return (
    <div className="bg-navy-900/80 border border-amber-500/30 rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 font-semibold text-sm">Warrant Issued</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyWarrant}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 hover:bg-amber-500/20 transition text-xs"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={inspectWarrant}
            className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 hover:bg-purple-500/20 transition text-xs"
          >
            <Eye className="w-3 h-3" />
            Inspect
          </button>
        </div>
      </div>
      <div className="font-mono text-xs space-y-1 text-slate-300 max-h-32 overflow-y-auto">
        <div><span className="text-slate-500">ID:</span> {warrant.warrant_id.slice(0, 20)}...</div>
        <div><span className="text-slate-500">TTL:</span> {warrant.ttl_seconds}s</div>
        <div><span className="text-slate-500">Scope:</span> {JSON.stringify(warrant.scope)}</div>
        <div><span className="text-slate-500">Signature:</span> {warrant.signature_hash.slice(0, 16)}...</div>
      </div>
      <button
        onClick={inspectWarrant}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 py-2 rounded hover:bg-purple-600/30 transition text-sm"
      >
        <ExternalLink className="w-3 h-3" />
        Deep-dive warrant inspector
      </button>
    </div>
  );
}

function TypewriterCode({ isActive }: { isActive: boolean }) {
  const [displayedCode, setDisplayedCode] = useState('');
  
  useEffect(() => {
    if (!isActive) {
      setDisplayedCode('');
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      if (i < INTEGRATION_CODE.length) {
        setDisplayedCode(INTEGRATION_CODE.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="bg-black/90 rounded-lg border border-purple-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-purple-400" />
        <span className="text-purple-400 font-semibold text-sm">Python Integration</span>
      </div>
      <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
        {displayedCode}
        <span className="animate-pulse">|</span>
      </pre>
    </div>
  );
}

// Scene components
function Scene1Introduction({ isActive }: { isActive: boolean }) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-amber-400">Vienna OS</span>
          </h1>
          <p className="text-2xl md:text-3xl text-slate-400 mb-8">
            Real-time governance between AI intent and execution
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <Shield className="w-6 h-6 text-amber-400 mb-2" />
              <div className="text-lg font-semibold mb-1">Policy Engine</div>
              <div className="text-sm text-slate-400">4-tier risk assessment</div>
            </div>
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <Lock className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-lg font-semibold mb-1">Cryptographic Warrants</div>
              <div className="text-sm text-slate-400">HMAC-signed execution tokens</div>
            </div>
            <div className="bg-navy-800/50 border border-navy-700 rounded-lg p-4">
              <Eye className="w-6 h-6 text-purple-400 mb-2" />
              <div className="text-lg font-semibold mb-1">Audit Trail</div>
              <div className="text-sm text-slate-400">Immutable execution log</div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            This is a <span className="text-emerald-400 font-semibold">live demo</span> — 
            real API calls, real pipeline execution, real warrants.
          </p>
        </div>
      </div>
    </div>
  );
}

function Scene2LiveDemo({ 
  isActive, 
  selectedScenario, 
  setSelectedScenario,
  executeScenario,
  isExecuting,
  executionResult,
  currentStep
}: { 
  isActive: boolean;
  selectedScenario: string;
  setSelectedScenario: (scenario: string) => void;
  executeScenario: (scenario: string) => void;
  isExecuting: boolean;
  executionResult: PipelineResult | null;
  currentStep: number;
}) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Live Demo — Real Pipeline Execution
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Pick a scenario and watch Vienna OS govern execution in real-time
        </p>
      </div>

      {/* Scenario Selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {SCENARIO_OPTIONS.slice(0, 4).map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario.id)}
            disabled={isExecuting}
            className={`p-3 rounded-lg border transition-all text-sm ${
              selectedScenario === scenario.id
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                : 'border-navy-700 bg-navy-800/50 text-slate-300 hover:border-slate-600'
            } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="font-medium mb-1">{scenario.label}</div>
            <div className="text-xs text-slate-500 mb-2">{scenario.description}</div>
            <div className={`text-xs px-2 py-1 rounded ${
              scenario.tier === 'DENIED' ? 'bg-red-500/20 text-red-400' :
              scenario.tier === 'T2' ? 'bg-amber-500/20 text-amber-400' :
              scenario.tier === 'T1/T1+' ? 'bg-blue-500/20 text-blue-400' :
              scenario.tier === 'T1' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {scenario.tier}
            </div>
          </button>
        ))}
      </div>

      {/* Execute Button */}
      <div className="text-center mb-8">
        <button
          onClick={() => executeScenario(selectedScenario)}
          disabled={isExecuting}
          className="flex items-center gap-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-8 py-4 rounded-xl transition font-semibold text-lg group mx-auto"
        >
          {isExecuting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
          {isExecuting ? 'Executing...' : 'Run Live Demo'}
        </button>
      </div>

      {/* Pipeline Animation */}
      {(isExecuting || executionResult) && (
        <div className="space-y-8">
          <LivePipelineAnimation 
            isActive={isExecuting || !!executionResult} 
            pipeline={executionResult?.pipeline || []} 
            currentStep={currentStep}
          />

          {/* Results */}
          {executionResult && !isExecuting && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Outcome */}
              <div className={`border rounded-lg p-4 ${
                executionResult.outcome === 'denied' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {executionResult.outcome === 'denied' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className={`font-bold text-lg ${
                    executionResult.outcome === 'denied' ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {executionResult.outcome.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="text-slate-400">Tier:</span> {executionResult.tier}</div>
                  <div><span className="text-slate-400">Total time:</span> {executionResult.total_duration_ms}ms</div>
                  <div><span className="text-slate-400">Execution ID:</span> {executionResult.execution_id.slice(0, 8)}...</div>
                </div>
              </div>

              {/* Warrant Display */}
              <WarrantDisplay 
                warrant={executionResult.warrant} 
                isActive={!!executionResult.warrant}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Scene3DenialDemo({ 
  isActive,
  executeScenario,
  isExecuting,
  executionResult,
  currentStep
}: { 
  isActive: boolean;
  executeScenario: (scenario: string) => void;
  isExecuting: boolean;
  executionResult: PipelineResult | null;
  currentStep: number;
}) {
  useEffect(() => {
    if (isActive && !executionResult) {
      // Auto-run denial demo when scene becomes active
      setTimeout(() => executeScenario('denied_scope_creep'), 1000);
    }
  }, [isActive, executionResult, executeScenario]);

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Scope Creep Prevention
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Analytics bot tries to access admin data — denied in 18ms
        </p>
      </div>

      <div className="space-y-8">
        <LivePipelineAnimation 
          isActive={isExecuting || !!executionResult} 
          pipeline={executionResult?.pipeline || []} 
          currentStep={currentStep}
        />
        
        {executionResult && !isExecuting && executionResult.outcome === 'denied' && (
          <div className="animate-fade-in">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-red-400 font-bold text-lg">DENIED</span>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300">Scope violation detected</p>
                <p className="text-slate-300">Security alert: FIRED</p>
                <p className="text-lg font-bold text-red-400">
                  {executionResult.total_duration_ms}ms. Denied. Logged. Alert sent.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Scene4Integration({ isActive }: { isActive: boolean }) {
  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          <span className="text-purple-400">5 Lines of Code</span>
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Drop Vienna OS into any agent framework
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <TypewriterCode isActive={isActive} />
      </div>

      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2">
            <span className="text-2xl">🦜</span>
            <span className="text-slate-300 font-medium">LangChain</span>
          </div>
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2">
            <span className="text-2xl">👥</span>
            <span className="text-slate-300 font-medium">CrewAI</span>
          </div>
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2">
            <span className="text-2xl">🔄</span>
            <span className="text-slate-300 font-medium">AutoGen</span>
          </div>
          <div className="flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-4 py-2">
            <span className="text-2xl">🪝</span>
            <span className="text-slate-300 font-medium">OpenClaw</span>
          </div>
        </div>
        <p className="text-lg text-slate-400">
          Or <code className="bg-navy-800 px-2 py-1 rounded text-emerald-400">npm install @vienna-os/sdk</code>
        </p>
      </div>
    </div>
  );
}

function Scene5TryYourOwn({ 
  isActive,
  executeScenario,
  isExecuting,
  executionResult,
  currentStep
}: { 
  isActive: boolean;
  executeScenario: (scenario: string, customData?: any) => void;
  isExecuting: boolean;
  executionResult: PipelineResult | null;
  currentStep: number;
}) {
  const [actionName, setActionName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [amount, setAmount] = useState('');

  const handleCustomSubmit = () => {
    const customData = {
      action_name: actionName || 'custom_action',
      agent_id: agentId || 'demo-agent',
      amount: amount ? parseInt(amount) : 0,
    };
    executeScenario('custom', customData);
  };

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Try Your Own Action
        </h1>
        <p className="text-xl text-slate-400 mb-8">
          Submit a custom action and see how Vienna OS evaluates it
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Input Form */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Action Name
            </label>
            <input
              type="text"
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder="e.g., delete_database"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              disabled={isExecuting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="e.g., analytics-bot"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              disabled={isExecuting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount (optional)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 15000"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              disabled={isExecuting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={handleCustomSubmit}
            disabled={isExecuting}
            className="flex items-center gap-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-8 py-4 rounded-xl transition font-semibold text-lg group mx-auto"
          >
            {isExecuting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
            {isExecuting ? 'Evaluating...' : 'Submit to Vienna OS'}
          </button>
        </div>

        {/* Suggestions */}
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400 mb-2">Try these for different tiers:</div>
            <div className="space-y-1">
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                <span className="text-emerald-400">read_analytics</span> → T0 (auto-approved)
              </div>
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                <span className="text-amber-400">deploy_staging</span> → T1 (approval needed)
              </div>
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                <span className="text-red-400">delete_all_users</span> → T2 (multi-party)
              </div>
            </div>
          </div>
          <div>
            <div className="text-slate-400 mb-2">Special test cases:</div>
            <div className="space-y-1">
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                <span className="text-red-400">untrusted-agent</span> → DENIED
              </div>
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                Amount &gt; $10,000 → T2 escalation
              </div>
              <div className="bg-slate-700/50 px-3 py-2 rounded">
                After hours deploy → T1+ escalation
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {(isExecuting || executionResult) && (
          <div className="space-y-6">
            <LivePipelineAnimation 
              isActive={isExecuting || !!executionResult} 
              pipeline={executionResult?.pipeline || []} 
              currentStep={currentStep}
            />

            {executionResult && !isExecuting && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`border rounded-lg p-4 ${
                  executionResult.outcome === 'denied' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {executionResult.outcome === 'denied' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    )}
                    <span className={`font-bold text-lg ${
                      executionResult.outcome === 'denied' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {executionResult.outcome.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-400">Tier:</span> {executionResult.tier}</div>
                    <div><span className="text-slate-400">Total time:</span> {executionResult.total_duration_ms}ms</div>
                    <div><span className="text-slate-400">Policy rules triggered:</span> {executionResult.policy_rules.filter(r => r.matched).length}</div>
                  </div>
                </div>

                <WarrantDisplay 
                  warrant={executionResult.warrant} 
                  isActive={!!executionResult.warrant}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Scene6CTA({ isActive }: { isActive: boolean }) {
  const handleGetStarted = () => {
    analytics.ctaClick('demo-functional', 'get_started');
  };

  const handleGitHubStar = () => {
    analytics.ctaClick('demo-functional', 'github_star');
    window.open('https://github.com/vienna-os/vienna-os', '_blank');
  };

  const handleTryPlayground = () => {
    analytics.ctaClick('demo-functional', 'try_playground');
    window.open('/try', '_blank');
  };

  return (
    <div className={`transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Ready to govern your agents?
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Start free. 5 agents. No credit card.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl transition font-semibold text-lg group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={handleTryPlayground}
              className="inline-flex items-center gap-3 bg-navy-700 hover:bg-navy-600 text-white px-8 py-4 rounded-xl transition font-semibold text-lg"
            >
              <Terminal className="w-5 h-5" />
              API Playground
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-slate-400">
            <code className="bg-navy-800 px-3 py-2 rounded">
              npm install @vienna-os/sdk
            </code>
            <button
              onClick={handleGitHubStar}
              className="flex items-center gap-2 hover:text-white transition"
            >
              <Star className="w-4 h-4" />
              Star on GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function FunctionalDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState<SceneId>('introduction');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneTimeout, setSceneTimeout] = useState<NodeJS.Timeout | null>(null);

  // Demo execution state
  const [selectedScenario, setSelectedScenario] = useState('wire_transfer');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<PipelineResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const executeScenario = async (scenario: string, customData?: any) => {
    setIsExecuting(true);
    setExecutionResult(null);
    setCurrentStep(0);

    try {
      const response = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, ...customData }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const result: PipelineResult = await response.json();
      
      // Animate through pipeline steps
      for (let i = 0; i < result.pipeline.length; i++) {
        setCurrentStep(i);
        const step = result.pipeline[i];
        // Wait for step duration, minimum 200ms for visibility
        await new Promise(resolve => setTimeout(resolve, Math.max(step.duration_ms, 200)));
      }

      setExecutionResult(result);
      setCurrentStep(result.pipeline.length);

      // Analytics
      analytics.tryDemoComplete();
      if (result.outcome === 'approved') {
        analytics.ctaClick('demo-functional', 'scenario_approved');
      } else {
        analytics.ctaClick('demo-functional', 'scenario_denied');
      }

    } catch (error) {
      console.error('Demo execution failed:', error);
      // Show error state
      setExecutionResult({
        execution_id: 'error',
        scenario: scenario,
        outcome: 'denied',
        tier: 'ERROR',
        pipeline: [{
          step: 'error',
          label: 'Error',
          status: 'denied',
          duration_ms: 0,
          detail: 'Demo execution failed - please try again',
          timestamp: new Date().toISOString(),
        }],
        warrant: null,
        audit_trail: [],
        policy_rules: [],
        total_duration_ms: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const advanceToNextScene = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    
    if (sceneIndex < SCENES.length - 1) {
      const nextIndex = sceneIndex + 1;
      setSceneIndex(nextIndex);
      setCurrentScene(SCENES[nextIndex].id);
      
      if (isPlaying && SCENES[nextIndex].duration > 0) {
        const timeout = setTimeout(advanceToNextScene, SCENES[nextIndex].duration);
        setSceneTimeout(timeout);
      }
    } else {
      setIsPlaying(false);
    }
  }, [sceneIndex, isPlaying, sceneTimeout]);

  const goToPreviousScene = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    
    if (sceneIndex > 0) {
      const prevIndex = sceneIndex - 1;
      setSceneIndex(prevIndex);
      setCurrentScene(SCENES[prevIndex].id);
    }
  }, [sceneIndex, sceneTimeout]);

  const playDemo = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    setIsPlaying(true);
    
    // If already at the end, restart from beginning
    if (sceneIndex >= SCENES.length - 1) {
      setCurrentScene('introduction');
      setSceneIndex(0);
    }

    analytics.tryDemoStart();
    if (SCENES[sceneIndex].duration > 0) {
      const timeout = setTimeout(advanceToNextScene, SCENES[sceneIndex].duration);
      setSceneTimeout(timeout);
    }
  }, [sceneIndex, advanceToNextScene, sceneTimeout]);

  const pauseDemo = useCallback(() => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    setIsPlaying(false);
  }, [sceneTimeout]);

  const goToScene = useCallback((sceneId: SceneId) => {
    if (sceneTimeout) clearTimeout(sceneTimeout);
    const index = SCENES.findIndex(s => s.id === sceneId);
    setCurrentScene(sceneId);
    setSceneIndex(index);
    setIsPlaying(false);
    // Reset execution state when changing scenes
    setExecutionResult(null);
    setIsExecuting(false);
    setCurrentStep(0);
  }, [sceneTimeout]);

  const skipToDemo = useCallback(() => {
    goToScene('live-demo');
  }, [goToScene]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) {
            pauseDemo();
          } else {
            playDemo();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          advanceToNextScene();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPreviousScene();
          break;
        case 'Escape':
          e.preventDefault();
          pauseDemo();
          break;
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            goToScene('introduction');
          }
          break;
        case 'KeyD':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            skipToDemo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sceneTimeout) clearTimeout(sceneTimeout);
    };
  }, [isPlaying, playDemo, pauseDemo, advanceToNextScene, goToPreviousScene, goToScene, skipToDemo, sceneTimeout]);

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50 bg-navy-900/80 backdrop-blur sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm">Vienna OS</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/try" className="text-xs text-slate-400 hover:text-white transition">API Playground</a>
          <a href="/demo/warrant" className="text-xs text-slate-400 hover:text-white transition">Warrant Inspector</a>
          <a href="/signup" className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      {/* Controls */}
      <div className="border-b border-navy-700/50 bg-navy-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={isPlaying ? pauseDemo : playDemo}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play Demo'}
              </button>
              
              <button
                onClick={skipToDemo}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg transition font-medium text-xs"
              >
                <Zap className="w-3 h-3" />
                Skip to Live Demo
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={goToPreviousScene}
                  className="p-1 hover:text-white transition"
                  disabled={sceneIndex === 0}
                  title="Previous scene (←)"
                >
                  ←
                </button>
                <button
                  onClick={advanceToNextScene}
                  className="p-1 hover:text-white transition"
                  disabled={sceneIndex >= SCENES.length - 1}
                  title="Next scene (→)"
                >
                  →
                </button>
                
                <div className="flex items-center gap-1 ml-2">
                  <Clock className="w-3 h-3" />
                  Interactive Demo
                </div>
              </div>
            </div>

            {/* Scene dots */}
            <div className="flex items-center gap-2">
              {SCENES.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => goToScene(scene.id)}
                  className={`group relative w-3 h-3 rounded-full transition-all duration-300 hover:scale-125 ${
                    index === sceneIndex
                      ? 'bg-purple-400'
                      : index < sceneIndex
                      ? 'bg-navy-600'
                      : 'bg-navy-800 hover:bg-navy-700'
                  }`}
                  title={scene.title}
                >
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {scene.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-slate-500 text-center">
            <span className="font-mono">Space</span> = play/pause • <span className="font-mono">←→</span> = navigate • <span className="font-mono">Esc</span> = pause • <span className="font-mono">Ctrl+D</span> = skip to demo
          </div>
        </div>
      </div>

      {/* Main presentation area */}
      <div className="relative overflow-hidden">
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="relative">
              {/* Scene 1: Introduction */}
              <div className={`${currentScene === 'introduction' ? 'block' : 'hidden'}`}>
                <Scene1Introduction isActive={currentScene === 'introduction'} />
              </div>

              {/* Scene 2: Live Demo */}
              <div className={`${currentScene === 'live-demo' ? 'block' : 'hidden'}`}>
                <Scene2LiveDemo 
                  isActive={currentScene === 'live-demo'}
                  selectedScenario={selectedScenario}
                  setSelectedScenario={setSelectedScenario}
                  executeScenario={executeScenario}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                  currentStep={currentStep}
                />
              </div>

              {/* Scene 3: Denial Demo */}
              <div className={`${currentScene === 'denial-demo' ? 'block' : 'hidden'}`}>
                <Scene3DenialDemo 
                  isActive={currentScene === 'denial-demo'}
                  executeScenario={executeScenario}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                  currentStep={currentStep}
                />
              </div>

              {/* Scene 4: Integration */}
              <div className={`${currentScene === 'integration' ? 'block' : 'hidden'}`}>
                <Scene4Integration isActive={currentScene === 'integration'} />
              </div>

              {/* Scene 5: Try Your Own */}
              <div className={`${currentScene === 'try-your-own' ? 'block' : 'hidden'}`}>
                <Scene5TryYourOwn 
                  isActive={currentScene === 'try-your-own'}
                  executeScenario={executeScenario}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                  currentStep={currentStep}
                />
              </div>

              {/* Scene 6: CTA */}
              <div className={`${currentScene === 'cta' ? 'block' : 'hidden'}`}>
                <Scene6CTA isActive={currentScene === 'cta'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="border-t border-navy-700/50 bg-navy-900/60">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-slate-500">
            Live interactive demo showcasing real Vienna OS governance pipeline execution
          </p>
        </div>
      </div>
    </div>
  );
}