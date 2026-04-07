"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Shield, ArrowLeft, ArrowRight, Play, ChevronDown, Plus, Trash2 } from "lucide-react";
import { analytics } from "@/lib/analytics";
import NewsletterSignup from "../../components/NewsletterSignup";

/* ─── Types ─── */
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
  scope: Record<string, unknown>;
  constraints: Record<string, unknown>;
  signature_hash: string;
  issuer: string;
  verified: boolean;
}

interface AuditEntry {
  timestamp: string;
  event: string;
  detail: string;
  immutable: true;
}

interface PolicyRule {
  rule_id: string;
  name: string;
  conditions: string;
  matched: boolean;
  result?: string;
}

interface PipelineResult {
  execution_id: string;
  scenario: string;
  outcome: "approved" | "denied" | "auto-approved";
  tier: string;
  execution_mode: "vienna_direct" | "agent_passback";
  pipeline: PipelineStep[];
  warrant: Warrant | null;
  audit_trail: AuditEntry[];
  policy_rules: PolicyRule[];
  total_duration_ms: number;
  merkle_chain?: {
    chain_index: number;
    chain_hash: string;
    prev_hash: string | null;
    merkle_root: string;
    chain_verified: boolean;
  };
  ows_token?: string;
  trust_score?: {
    agent_id: string;
    score: number;
    level: string;
    components: Record<string, { score: number; max: number }>;
    recommendation: string;
  };
  delegation?: {
    parent_warrant_id: string;
    delegated_to: string;
    scope_reduction: string[];
    depth: number;
  } | null;
}

/* ─── Scenarios ─── */
const scenarios = [
  {
    id: "wire_transfer",
    icon: "",
    label: "Wire Transfer ($75K)",
    desc: "Financial agent requests $75,000 wire transfer. Multi-party T2 approval required.",
    tier: "T2",
    tierLabel: "Multi-Party",
    docs: "/docs/tiers#t2",
    category: "finance",
    riskFactors: ["high_value", "external_transfer", "irreversible"],
  },
  {
    id: "production_deploy",
    icon: "",
    label: "Production Deploy",
    desc: "DevOps agent deploys to production. After-hours check + rollback constraint.",
    tier: "T1",
    tierLabel: "Approval",
    docs: "/docs/tiers#t1",
    category: "devops",
    riskFactors: ["production_env", "after_hours"],
  },
  {
    id: "patient_record",
    icon: "",
    label: "Patient Record Update",
    desc: "Healthcare agent updates PHI. HIPAA scoping with 60-second TTL warrant.",
    tier: "T1",
    tierLabel: "HIPAA",
    docs: "/docs/compliance#hipaa",
    category: "healthcare",
    riskFactors: ["phi_data", "compliance_required"],
  },
  {
    id: "denied_scope_creep",
    icon: "",
    label: "Denied — Scope Creep",
    desc: "Agent tries to access resources outside its scope. Policy engine blocks it.",
    tier: "DENY",
    tierLabel: "Blocked",
    docs: "/docs/security#scope",
    category: "security",
    riskFactors: ["scope_violation", "unauthorized_access"],
  },
  {
    id: "auto_approved_read",
    icon: "",
    label: "Auto-Approved Read",
    desc: "Read-only data query. Full pipeline in <50ms with T0 auto-approval.",
    tier: "T0",
    tierLabel: "Auto",
    docs: "/docs/tiers#t0",
    category: "analytics",
    riskFactors: [],
  },
  {
    id: "ai_model_training",
    icon: "",
    label: "AI Model Training",
    desc: "ML agent trains new model on customer data. Privacy constraints + resource limits.",
    tier: "T2",
    tierLabel: "Privacy",
    docs: "/docs/ai-governance",
    category: "ai",
    riskFactors: ["customer_data", "resource_intensive", "model_risk"],
  },
  {
    id: "social_media_post",
    icon: "",
    label: "Social Media Post",
    desc: "Marketing agent posts to company social accounts. Brand safety + approval workflow.",
    tier: "T1",
    tierLabel: "Brand Safety",
    docs: "/docs/brand-safety",
    category: "marketing",
    riskFactors: ["public_visibility", "brand_reputation"],
  },
  {
    id: "contract_signing",
    icon: "",
    label: "Contract E-Signature",
    desc: "Legal agent signs $500K vendor contract. Multi-party approval + legal review.",
    tier: "T3",
    tierLabel: "Legal Review",
    docs: "/docs/legal-governance",
    category: "legal",
    riskFactors: ["high_value", "legal_commitment", "multi_party_required"],
  },
  {
    id: "custom",
    icon: "",
    label: "Custom Action",
    desc: "Define your own action and see how the governance engine evaluates it.",
    tier: "?",
    tierLabel: "Dynamic",
    docs: "/docs/policies",
    category: "custom",
    riskFactors: [],
  },
];

const tierColors: Record<string, { text: string; bg: string; border: string }> = {
  T0: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  T1: { text: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
  "T1+": { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  T2: { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  DENY: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  DENIED: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  "?": { text: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
};

const stepIcons: Record<string, string> = {
  intent_received: "→",
  policy_engine: "P",
  risk_assessment: "R",
  approval_gate: "A",
  warrant_issued: "W",
  execution: "E",
  verification: "V",
  audit_logged: "L",
};

/* ─── Component ─── */
function sha256Short(): string {
  const chars = "abcdef0123456789";
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("") + "...";
}

export default function TryPage() {
  // Track demo page view
  useEffect(() => {
    analytics.tryDemoStart();
  }, []);
  const [selected, setSelected] = useState("wire_transfer");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [animatingStep, setAnimatingStep] = useState(-1);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [showWarrant, setShowWarrant] = useState(false);
  const [warrantVerified, setWarrantVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "warrant" | "audit" | "policies" | "chain" | "trust" | "ows">("pipeline");
  const [error, setError] = useState<string | null>(null);

  // Custom action fields
  const [customAction, setCustomAction] = useState("transfer_funds");
  const [customAgent, setCustomAgent] = useState("finance-agent-1");
  const [customAmount, setCustomAmount] = useState("5000");
  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([
    { key: "destination", value: "account-7821" },
  ]);

  // Mobile scenario dropdown
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showRiskFactors, setShowRiskFactors] = useState(false);
  const [showWarrantBuilder, setShowWarrantBuilder] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState<'scenarios' | 'tier_picker' | 'warrant_builder'>('scenarios');
  const [runningAllScenarios, setRunningAllScenarios] = useState(false);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);

  const pipelineRef = useRef<HTMLDivElement>(null);

  const selectedScenario = scenarios.find((s) => s.id === selected)!;

  /* ─── Animate pipeline steps ─── */
  const animatePipeline = useCallback((data: PipelineResult) => {
    setVisibleSteps([]);
    setShowWarrant(false);
    setWarrantVerified(false);
    setActiveTab("pipeline");

    // Auto-scroll to pipeline view on execution
    setTimeout(() => {
      if (pipelineRef.current) {
        pipelineRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);

    const steps = data.pipeline;
    let i = 0;

    const runStep = () => {
      if (i >= steps.length) {
        setAnimatingStep(-1);
        // After pipeline done, show warrant verification
        if (data.warrant) {
          setTimeout(() => {
            setShowWarrant(true);
            setTimeout(() => setWarrantVerified(true), 600);
          }, 300);
        }
        return;
      }
      setAnimatingStep(i);
      setVisibleSteps((prev) => [...prev, i]);

      const step = steps[i];
      // Timing: skipped steps are instant, others scale with duration
      const delay = step.status === "skipped" ? 100 : Math.min(Math.max(step.duration_ms * 0.8, 150), 600);
      i++;
      setTimeout(runStep, delay);
    };

    // Start after a brief pause
    setTimeout(runStep, 200);
  }, []);

  /* ─── Run All Scenarios ─── */
  const runAllScenarios = async () => {
    setRunningAllScenarios(true);
    const executableScenarios = scenarios.filter(s => s.id !== 'custom').slice(0, 6); // First 6 scenarios
    
    for (let i = 0; i < executableScenarios.length; i++) {
      setCurrentScenarioIndex(i);
      setSelected(executableScenarios[i].id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between scenarios
      await execute();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Let user see results
    }
    
    setRunningAllScenarios(false);
    setCurrentScenarioIndex(0);
  };

  /* ─── Execute scenario ─── */
  const execute = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setAnimatingStep(-1);
    setVisibleSteps([]);
    setShowWarrant(false);
    setWarrantVerified(false);

    try {
      const body: Record<string, unknown> = { scenario: selected };
      if (selected === "custom") {
        body.action_name = customAction;
        body.agent_id = customAgent;
        body.amount = parseFloat(customAmount) || 0;
        const params: Record<string, string> = {};
        customParams.forEach((p) => {
          if (p.key.trim()) params[p.key.trim()] = p.value;
        });
        body.parameters = params;
      }

      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PipelineResult = await res.json();
      setResult(data);
      animatePipeline(data);
      
      // Track demo completion
      analytics.tryDemoComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline simulation failed");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Keyboard nav ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = scenarios.findIndex((s) => s.id === selected);
      
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelected(scenarios[Math.min(idx + 1, scenarios.length - 1)].id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelected(scenarios[Math.max(idx - 1, 0)].id);
      } else if (e.key === "Enter" && !loading && !runningAllScenarios) {
        e.preventDefault();
        execute();
      } else if (e.key === "r" && (e.metaKey || e.ctrlKey) && !loading) {
        e.preventDefault();
        runAllScenarios();
      } else if (e.key === "Escape" && loading) {
        e.preventDefault();
        setLoading(false);
        setAnimatingStep(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loading, runningAllScenarios]);

  const tc = (tier: string) => tierColors[tier] || tierColors["?"];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ─── Nav ─── */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="font-bold text-white">
              Vienna<span className="text-violet-400">OS</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500 font-mono">Interactive Playground</span>
            <a
              href="/signup"
              className="text-sm bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 border border-violet-400/20 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ─── Header ─── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Live Playground</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <span className="text-xs text-slate-500 font-mono">
              {visibleSteps.length > 0 ? `${visibleSteps.length}/8 steps completed` : "Ready to simulate"}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Interactive Governance Pipeline
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mb-4">
            Submit any AI agent intent and watch it flow through Vienna OS — policy evaluation, 
            risk tiering, approval workflows, warrant issuance, and immutable audit logging.
          </p>
          
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="v-status-dot v-status-warning"></span>
              <span>Real-time simulation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="v-status-dot v-status-success"></span>
              <span>Production-grade logic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="v-status-dot v-status-info"></span>
              <span>Full audit trail</span>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="v-status-dot v-status-warning"></span>
                <span>{result.total_duration_ms}ms total</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ─── Left: Interactive Controls ─── */}
          <div className="space-y-3">
            {/* Mode Selector */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Demo Mode</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'scenarios', label: 'Scenarios', desc: 'Pre-built examples' },
                  { id: 'tier_picker', label: 'Risk Tiers', desc: 'Pick T0/T1/T2/T3' },
                  { id: 'warrant_builder', label: 'Warrant Flow', desc: 'Interactive creation' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setInteractiveMode(mode.id as any)}
                    className={`
                      text-left px-3 py-2 rounded-lg border transition-all text-sm
                      ${interactiveMode === mode.id
                        ? 'border-violet-400/30 bg-violet-400/5 text-white'
                        : 'border-slate-700/30 bg-slate-800/30 text-slate-300 hover:border-navy-600 hover:bg-slate-700/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm">{mode.label}</span>
                    </div>
                    <div className="text-xs text-slate-500">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Mode */}
            {interactiveMode === 'scenarios' && (
              <>
                {/* Mobile dropdown */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span>{selectedScenario.icon}</span>
                      <span className="text-white font-medium text-sm">{selectedScenario.label}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileOpen && (
                    <div className="mt-2 max-h-[400px] overflow-y-auto space-y-1.5">
                      {scenarios.map((s) => (
                        <ScenarioButton
                          key={s.id}
                          scenario={s}
                          active={selected === s.id}
                          onClick={() => {
                            setSelected(s.id);
                            setMobileOpen(false);
                          }}
                          tc={tc}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tier Picker Mode */}
            {interactiveMode === 'tier_picker' && (
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Tier Explorer</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { tier: 'T0', label: 'Auto-Approved', desc: 'Read-only, no risk', color: 'emerald', example: 'Web search' },
                    { tier: 'T1', label: 'Policy Approved', desc: 'Low risk, automated', color: 'gold', example: 'Send notification' },
                    { tier: 'T2', label: 'Human Approval', desc: 'Medium risk, oversight', color: 'orange', example: 'Wire transfer' },
                    { tier: 'T3', label: 'Multi-Party', desc: 'High risk, committee', color: 'red', example: 'Contract signing' },
                  ].map((t) => (
                    <button
                      key={t.tier}
                      onClick={() => {
                        setSelectedTier(t.tier);
                        // Auto-select a scenario for this tier
                        const tierScenario = scenarios.find(s => s.tier === t.tier) || scenarios.find(s => s.tier === 'T1');
                        if (tierScenario) setSelected(tierScenario.id);
                      }}
                      className={`
                        text-left p-3 rounded-lg border transition-all
                        ${selectedTier === t.tier
                          ? `border-${t.color}-400/30 bg-${t.color}-400/5`
                          : 'border-slate-700/30 bg-slate-800/30 hover:border-navy-600'
                        }
                      `}
                    >
                      <div className={`text-sm font-bold mb-1 ${selectedTier === t.tier ? `text-${t.color}-400` : 'text-white'}`}>
                        {t.tier}
                      </div>
                      <div className="text-xs text-slate-400 mb-1">{t.label}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{t.desc}</div>
                      <div className="text-xs text-slate-600 mt-1 italic">{t.example}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warrant Builder Mode */}
            {interactiveMode === 'warrant_builder' && (
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interactive Warrant Creator</h4>
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 mb-2">Follow the warrant creation process step by step:</div>
                  
                  <div className="space-y-2">
                    {[
                      { step: '1', label: 'Submit Intent', status: 'completed', desc: 'Agent submits action request' },
                      { step: '2', label: 'Policy Check', status: showWarrantBuilder ? 'completed' : 'pending', desc: 'Evaluate against rules' },
                      { step: '3', label: 'Risk Assessment', status: showWarrantBuilder ? 'active' : 'pending', desc: 'Calculate risk tier' },
                      { step: '4', label: 'Generate Warrant', status: 'pending', desc: 'Create authorization proof' },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`
                          flex items-center gap-3 p-2 rounded-lg border transition-all
                          ${s.status === 'completed' ? 'border-emerald-400/30 bg-emerald-400/5' : ''}
                          ${s.status === 'active' ? 'border-violet-400/30 bg-violet-400/5' : ''}
                          ${s.status === 'pending' ? 'border-slate-700/30 bg-slate-800/30' : ''}
                        `}
                      >
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${s.status === 'completed' ? 'bg-emerald-400 text-slate-950' : ''}
                          ${s.status === 'active' ? 'bg-violet-400 text-slate-950' : ''}
                          ${s.status === 'pending' ? 'bg-slate-700 text-slate-500' : ''}
                        `}>
                          {s.status === 'completed' ? '✓' : s.step}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{s.label}</div>
                          <div className="text-xs text-slate-500">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowWarrantBuilder(!showWarrantBuilder);
                      if (!showWarrantBuilder) {
                        setSelected('wire_transfer'); // Auto-select a good example
                      }
                    }}
                    className="w-full mt-3 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    {showWarrantBuilder ? 'Reset Flow' : 'Start Warrant Flow'}
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Scenario List */}
            {interactiveMode === 'scenarios' && (
              <div className="hidden lg:block space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Scenarios <span className="text-slate-500">↑↓ to navigate</span>
                </h3>
                <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-2">
                  {scenarios.map((s) => (
                    <ScenarioButton
                      key={s.id}
                      scenario={s}
                      active={selected === s.id}
                      onClick={() => setSelected(s.id)}
                      tc={tc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Desktop Tier List */}
            {interactiveMode === 'tier_picker' && (
              <div className="hidden lg:block space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Risk Tiers <span className="text-slate-500">explore approval flows</span>
                </h3>
                <div className="space-y-2">
                  {scenarios.filter(s => s.id !== 'custom').map((s) => (
                    <ScenarioButton
                      key={s.id}
                      scenario={s}
                      active={selected === s.id}
                      onClick={() => setSelected(s.id)}
                      tc={tc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Warrant Builder List */}
            {interactiveMode === 'warrant_builder' && (
              <div className="hidden lg:block space-y-1.5">
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Warrant Examples <span className="text-slate-500">step-by-step creation</span>
                </h3>
                <div className="space-y-2">
                  {scenarios.filter(s => s.tier !== 'DENY' && s.id !== 'custom').slice(0, 4).map((s) => (
                    <ScenarioButton
                      key={s.id}
                      scenario={s}
                      active={selected === s.id}
                      onClick={() => setSelected(s.id)}
                      tc={tc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom action fields */}
            {selected === "custom" && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Define Your Action</h4>
                <Field label="Action Name" value={customAction} onChange={setCustomAction} placeholder="e.g. delete_records" />
                <Field label="Agent ID" value={customAgent} onChange={setCustomAgent} placeholder="e.g. untrusted-agent" />
                <Field label="Amount ($)" value={customAmount} onChange={setCustomAmount} placeholder="0" type="number" />
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Parameters</label>
                  {customParams.map((p, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <input
                        className="flex-1 bg-slate-900 border border-navy-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none transition"
                        placeholder="key"
                        value={p.key}
                        onChange={(e) => {
                          const next = [...customParams];
                          next[i] = { ...next[i], key: e.target.value };
                          setCustomParams(next);
                        }}
                      />
                      <input
                        className="flex-1 bg-slate-900 border border-navy-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none transition"
                        placeholder="value"
                        value={p.value}
                        onChange={(e) => {
                          const next = [...customParams];
                          next[i] = { ...next[i], value: e.target.value };
                          setCustomParams(next);
                        }}
                      />
                      <button
                        onClick={() => setCustomParams(customParams.filter((_, j) => j !== i))}
                        className="text-slate-500 hover:text-red-400 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setCustomParams([...customParams, { key: "", value: "" }])}
                    className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add parameter
                  </button>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Try: &quot;untrusted-agent&quot; → denied · amount &gt;$10K → T2 · &quot;delete&quot; in action → T2 · &quot;deploy&quot; after 6PM → T1+
                  </p>
                </div>
              </div>
            )}

            {/* Risk Tier Legend */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Risk Tier Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-4 rounded bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-mono text-[10px] font-bold">T0</span>
                  <span className="text-slate-300">Auto-approved (low risk)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-4 rounded bg-violet-400/10 border border-violet-400/30 flex items-center justify-center text-violet-400 font-mono text-[10px] font-bold">T1</span>
                  <span className="text-slate-300">Single approval required</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-4 rounded bg-orange-400/10 border border-orange-400/30 flex items-center justify-center text-orange-400 font-mono text-[10px] font-bold">T2</span>
                  <span className="text-slate-300">Multi-party approval</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-4 rounded bg-red-400/10 border border-red-400/30 flex items-center justify-center text-red-400 font-mono text-[10px] font-bold">T3</span>
                  <span className="text-slate-300">Legal/executive review</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-4 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 font-mono text-[9px] font-bold">⚠</span>
                  <span className="text-slate-300">Policy violation (deny)</span>
                </div>
              </div>
            </div>

            {/* Execute buttons - made more prominent */}
            <div className="sticky top-4 z-10 space-y-2">
              <button
                onClick={execute}
                disabled={loading || runningAllScenarios}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-violet-400 hover:from-violet-400 hover:to-violet-300 disabled:from-violet-400/50 disabled:to-violet-400/50 text-slate-950 font-bold px-6 py-4 rounded-xl transition text-sm shadow-lg shadow-violet-400/20"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Running Pipeline…
                    <button
                      onClick={() => {
                        setLoading(false);
                        setAnimatingStep(-1);
                      }}
                      className="ml-2 text-slate-700 hover:text-navy-600 text-xs"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> Execute Pipeline
                  </>
                )}
              </button>
              
              {/* Run All Scenarios button */}
              <button
                onClick={runAllScenarios}
                disabled={loading || runningAllScenarios}
                className="w-full flex items-center justify-center gap-2 bg-purple-600/90 hover:bg-purple-500 disabled:bg-purple-600/30 text-white font-medium px-4 py-3 rounded-lg transition text-sm"
              >
                {runningAllScenarios ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running All ({currentScenarioIndex + 1}/6)
                  </>
                ) : (
                  <>
                    Run All Scenarios
                  </>
                )}
              </button>
              
              <div className="text-[10px] text-slate-500 text-center space-y-1">
                <p>Enter: Execute • ↑↓: Navigate • Esc: Cancel • ⌘R: Run All</p>
                <p>Simulated locally • Click steps for details</p>
              </div>
            </div>
          </div>

          {/* ─── Right: Results ─── */}
          <div className="min-w-0" ref={pipelineRef}>
            {/* Tabs */}
            {result && (
              <div className="flex gap-1 mb-4 bg-slate-800/50 rounded-xl p-1 overflow-x-auto">
                {(["pipeline", "warrant", "chain", "trust", "ows", "audit", "policies"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                      activeTab === tab
                        ? "bg-slate-700 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    } ${tab === "warrant" && !result.warrant ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={tab === "warrant" && !result.warrant}
                  >
                    {tab === "pipeline" && "Pipeline "}
                    {tab === "warrant" && "Warrant "}
                    {tab === "chain" && "Chain "}
                    {tab === "trust" && "Trust "}
                    {tab === "ows" && "OWS "}
                    {tab === "audit" && "Audit "}
                    {tab === "policies" && "Policies "}
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                <p className="text-red-400 font-medium mb-1">Pipeline Error</p>
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden min-h-[400px]">
                {/* Interactive demo header */}
                <div className="bg-slate-800 border-b border-slate-700/50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Interactive Governance Simulator</h3>
                        <p className="text-xs text-slate-500">Submit a mock intent and watch it flow through the pipeline</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs text-emerald-400 font-medium">Live Simulation</span>
                    </div>
                  </div>
                </div>

                {/* Interactive flow preview */}
                <div className="p-6">
                  {interactiveMode === 'scenarios' && (
                    <div className="mb-6">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-400 mb-3">Governance Pipeline Flow</h4>
                        <div className="flex flex-wrap items-center gap-2 justify-center">
                          {["Intent Gateway", "Policy Engine", "Risk Assessment", "Approval Gate", "Warrant Issuer", "Execution Router", "Verification Engine", "Audit Logger"].map((step, i) => (
                            <div key={step} className="flex items-center">
                              <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-center group hover:border-violet-400/30 hover:bg-violet-400/5 transition-all duration-300 min-w-[100px]">
                                <div className="text-xl mb-1">
                                  {['I','P','R','A','W','E','V','L'][i]}
                                </div>
                                <div className="text-xs text-slate-400 font-medium leading-tight">{step}</div>
                                <div className="text-[10px] text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Step {i + 1}
                                </div>
                              </div>
                              {i < 7 && (
                                <ArrowRight className="w-4 h-4 text-slate-500 mx-1 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/30 border border-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm text-violet-400 font-medium">Try these scenarios:</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            "Production deployment (T1 approval needed)",
                            "Large wire transfer (T2 multi-party approval)",
                            "Patient record update (HIPAA compliant)", 
                            "Read-only query (T0 auto-approved)"
                          ].map((suggestion) => (
                            <div key={suggestion} className="text-xs text-slate-500 bg-slate-800/50 rounded px-3 py-2 border border-slate-700/30">
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {interactiveMode === 'tier_picker' && (
                    <div className="mb-6 space-y-4">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">Risk Tier Explorer</h3>
                        <p className="text-slate-400 text-sm">Understand how Vienna OS classifies and handles different risk levels</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            tier: 'T0',
                            label: 'Auto-Approved',
                            color: 'emerald',
                            icon: '',
                            description: 'Read-only operations with no external impact',
                            examples: ['Database queries', 'Log analysis', 'Web search'],
                            timing: '< 50ms',
                            approval: 'Automatic'
                          },
                          {
                            tier: 'T1', 
                            label: 'Policy Approved',
                            color: 'blue',
                            icon: '',
                            description: 'Low-risk operations governed by policies',
                            examples: ['Internal notifications', 'Report generation', 'Config updates'],
                            timing: '100-500ms',
                            approval: 'Policy Engine'
                          },
                          {
                            tier: 'T2',
                            label: 'Human Approval',
                            color: 'orange', 
                            icon: '',
                            description: 'Medium-risk operations requiring oversight',
                            examples: ['Financial transactions', 'External communications', 'Data exports'],
                            timing: '1-60 minutes',
                            approval: 'Single Human'
                          },
                          {
                            tier: 'T3',
                            label: 'Multi-Party Approval',
                            color: 'red',
                            icon: '', 
                            description: 'High-risk operations with significant impact',
                            examples: ['Contract signing', 'System administration', 'Legal actions'],
                            timing: 'Hours to days',
                            approval: 'Multiple Humans'
                          }
                        ].map((t) => (
                          <div
                            key={t.tier}
                            className={`
                              bg-slate-900/30 border rounded-xl p-4 transition-all hover:border-${t.color}-400/30 hover:bg-${t.color}-400/5
                              ${selectedTier === t.tier ? `border-${t.color}-400/30 bg-${t.color}-400/5` : 'border-slate-700/30'}
                            `}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-2xl">{t.icon}</span>
                              <div>
                                <h4 className="text-white font-semibold">{t.tier} - {t.label}</h4>
                                <p className="text-xs text-slate-500">{t.approval} • {t.timing}</p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-3 leading-relaxed">{t.description}</p>
                            <div className="space-y-1">
                              {t.examples.map((example) => (
                                <div key={example} className="text-xs text-slate-500 bg-slate-800/50 rounded px-2 py-1">
                                  {example}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {interactiveMode === 'warrant_builder' && (
                    <div className="mb-6 space-y-4">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">Interactive Warrant Creation</h3>
                        <p className="text-slate-400 text-sm">See how Vienna OS creates cryptographic authorization proofs</p>
                      </div>

                      <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-6">
                        <div className="space-y-4">
                          {/* Warrant Properties Preview */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-400">Warrant Properties</h4>
                              <div className="space-y-2">
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500 mb-1">Scope</div>
                                  <div className="font-mono text-xs text-violet-400">action: {selected}</div>
                                  <div className="font-mono text-xs text-violet-400">resource: production.api</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500 mb-1">TTL</div>
                                  <div className="font-mono text-xs text-emerald-400">60 seconds</div>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-400">Security Features</h4>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                  <span>✓</span> HMAC-SHA256 signature
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                  <span>✓</span> Time-bounded execution
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                  <span>✓</span> Scope-limited permissions
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                  <span>✓</span> Non-transferable
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-700/30 pt-4">
                            <div className="text-xs text-slate-500 space-y-1">
                              <div>Warrant ID: warrant_2024{Date.now().toString().slice(-6)}</div>
                              <div>Risk Tier: {selectedScenario.tier}</div>
                              <div>Approver: {selectedScenario.tier === 'T0' ? 'Auto-system' : selectedScenario.tier === 'T1' ? 'Policy Engine' : 'Human Required'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
                      {interactiveMode === 'scenarios' && "Select a scenario and click \"Execute Pipeline\" to see the governance pipeline in action."}
                      {interactiveMode === 'tier_picker' && "Pick a risk tier above to explore different approval workflows and timing."}
                      {interactiveMode === 'warrant_builder' && "Choose an action above to see how warrants are created with cryptographic proofs."}
                      {!result && " Every step is simulated with realistic timing and outcomes."}
                    </p>
                    
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span>Real-time simulation</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                        <span>Interactive controls</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                        <span>Full audit trail</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        <span>Cryptographic warrants</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && !result && (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-700/50" />
                      <div className="flex-1">
                        <div className="h-3 bg-slate-700/50 rounded w-32 mb-2" />
                        <div className="h-2 bg-slate-700/30 rounded w-64" />
                      </div>
                      <div className="h-3 bg-slate-700/30 rounded w-12" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Pipeline View ─── */}
            {result && activeTab === "pipeline" && (
              <div className="space-y-2">
                {/* Outcome banner */}
                <div className={`rounded-xl p-4 mb-4 border ${
                  result.outcome === "denied"
                    ? "bg-red-500/5 border-red-500/20"
                    : result.outcome === "auto-approved"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-violet-400/5 border-violet-400/20"
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.outcome === "denied" ? "✗" : result.outcome === "auto-approved" ? "→" : "✓"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-semibold text-sm ${
                            result.outcome === "denied" ? "text-red-400" : result.outcome === "auto-approved" ? "text-emerald-400" : "text-violet-400"
                          }`}>
                            {result.outcome === "denied" ? "Action Denied" : result.outcome === "auto-approved" ? "Auto-Approved" : "Approved"}
                            {" — "}
                            <span className="font-mono">{result.tier}</span>
                          </p>
                          {/* Execution Mode Badge */}
                          {result.execution_mode && result.outcome !== "denied" && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                              result.execution_mode === "vienna_direct" 
                                ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                                : "bg-purple-400/10 text-purple-400 border border-purple-400/20"
                            }`}>
                              {result.execution_mode === "vienna_direct" ? "Vienna Direct" : "Agent Passback"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Execution {result.execution_id.slice(0, 8)}… · {result.total_duration_ms}ms total</span>
                          {/* Execution Mode Explanation */}
                          {result.execution_mode === "vienna_direct" && result.outcome !== "denied" && (
                            <span className="text-[10px] text-emerald-400">• Zero human latency</span>
                          )}
                          {result.execution_mode === "agent_passback" && (
                            <span className="text-[10px] text-purple-400">• Human oversight required</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={selectedScenario.docs}
                      className="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
                    >
                      Learn more <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Pipeline Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Pipeline Progress</span>
                    <span>{visibleSteps.length}/{result.pipeline.length} steps completed</span>
                  </div>
                  <div className="w-full bg-slate-800/50 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-violet-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(visibleSteps.length / result.pipeline.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Steps */}
                {result.pipeline.map((step, i) => {
                  const visible = visibleSteps.includes(i);
                  const active = animatingStep === i;
                  const isDenied = step.status === "denied";
                  const isSkipped = step.status === "skipped";
                  const isComplete = visible && !active;

                  return (
                    <div
                      key={step.step}
                      onClick={() => {
                        // Make steps clickable for details
                        if (visible) {
                          setActiveTab("audit");
                        }
                      }}
                      className={`
                        rounded-xl border p-3.5 transition-all duration-500 cursor-pointer group relative
                        ${!visible ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
                        ${active ? "border-violet-400/40 bg-violet-400/5 shadow-[0_0_20px_rgba(212,165,32,0.08)] animate-pulse" : ""}
                        ${isDenied && visible && !active ? "border-red-500/30 bg-red-500/5" : ""}
                        ${isSkipped && visible && !active ? "border-slate-700/30 bg-slate-800/30 opacity-50" : ""}
                        ${isComplete && !isDenied && !isSkipped ? "border-emerald-400/20 bg-emerald-400/5 hover:border-emerald-400/40" : ""}
                        ${visible && !active ? "hover:bg-slate-700/30" : ""}
                      `}
                    >
                      {/* Connecting line between steps */}
                      {i > 0 && visible && (
                        <div className="absolute -top-3 left-7 w-0.5 h-6 bg-violet-400/30" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm transition-all duration-500 relative
                          ${active ? "bg-violet-400/20 scale-110" : ""}
                          ${isDenied && !active ? "bg-red-500/10 border-2 border-red-500/30" : ""}
                          ${isSkipped && !active ? "bg-slate-700/30" : ""}
                          ${isComplete && !isDenied && !isSkipped ? "bg-emerald-400/10 border-2 border-emerald-400/30" : ""}
                          ${!visible ? "bg-slate-700/30" : ""}
                        `}>
                          {/* Pulse effect for active step */}
                          {active && (
                            <div className="absolute inset-0 rounded-lg bg-violet-400/20 animate-ping" />
                          )}
                          
                          {/* Status-based icon */}
                          {isSkipped ? (
                            <span className="text-slate-500">—</span>
                          ) : isDenied ? (
                            <span className="text-red-400 font-bold">✗</span>
                          ) : isComplete ? (
                            <span className="text-emerald-400 font-bold">✓</span>
                          ) : (
                            stepIcons[step.step] || "•"
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-medium text-sm transition-colors ${
                              isSkipped ? "text-slate-500" : 
                              isDenied ? "text-red-400" : 
                              active ? "text-violet-400" :
                              isComplete ? "text-emerald-400" : "text-white"
                            }`}>
                              {step.label}
                            </span>
                            
                            {/* Status badge with animation */}
                            {visible && !isSkipped && (
                              <span className={`
                                inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded transition-all
                                ${isDenied ? "text-red-400 bg-red-400/10 border border-red-400/20" : 
                                  active ? "text-violet-400 bg-violet-400/10 border border-violet-400/20 animate-pulse" :
                                  "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"}
                              `}>
                                {isDenied ? "✗ denied" : active ? "⏳ running" : "✓ complete"}
                              </span>
                            )}
                            
                            {/* Click hint */}
                            {visible && (
                              <span className="text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Click for audit
                              </span>
                            )}
                          </div>
                          
                          <p className={`text-xs leading-relaxed transition-colors ${
                            isSkipped ? "text-slate-600" : 
                            active ? "text-slate-300" : 
                            "text-slate-500"
                          }`}>
                            {step.detail}
                          </p>
                        </div>
                        
                        {/* Duration and step number */}
                        <div className="flex flex-col items-end gap-1">
                          {visible && step.duration_ms > 0 && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {step.duration_ms}ms
                            </span>
                          )}
                          <span className="text-[9px] text-slate-600 font-mono">
                            #{i + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Warrant Inspector ─── */}
            {result && activeTab === "warrant" && result.warrant && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Warrant header */}
                <div className="bg-violet-400/5 border-b border-violet-400/10 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-mono text-violet-400">W</span>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Cryptographic Warrant</h3>
                      <p className="text-[11px] font-mono text-slate-500">{result.warrant.warrant_id}</p>
                    </div>
                  </div>
                  {/* Verified stamp with enhanced animation */}
                  <div className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-700 relative
                    ${warrantVerified
                      ? "bg-emerald-400/10 border-emerald-400/30 scale-100 opacity-100"
                      : showWarrant
                      ? "bg-slate-600/10 border-slate-500/20 scale-95 opacity-60"
                      : "opacity-0 scale-90"
                    }
                  `}>
                    {/* Stamp effect ring */}
                    {warrantVerified && (
                      <div className="absolute inset-0 rounded-lg border-2 border-emerald-400/50 animate-ping" />
                    )}
                    
                    <span className={`text-sm transition-all duration-500 ${warrantVerified ? "text-emerald-400" : "text-slate-500"}`}>
                      {warrantVerified ? "✓" : "…"}
                    </span>
                    <span className={`text-xs font-semibold transition-all duration-300 ${warrantVerified ? "text-emerald-400" : "text-slate-500"}`}>
                      {warrantVerified ? "VERIFIED" : "Verifying"}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <WarrantField label="Issued" value={new Date(result.warrant.issued_at).toLocaleTimeString()} />
                    <WarrantField label="Expires" value={new Date(result.warrant.expires_at).toLocaleTimeString()} />
                    <WarrantField label="TTL" value={`${result.warrant.ttl_seconds}s`} />
                    <WarrantField label="Issuer" value="policy-engine/v1" />
                  </div>

                  {/* Scope */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Scope</h4>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-3">
                      <pre className="text-xs font-mono text-violet-400 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.warrant.scope, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Constraints</h4>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-3">
                      <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.warrant.constraints, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Signature */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Signature Hash</h4>
                    <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-3">
                      <p className="text-[11px] font-mono text-slate-500 break-all">{result.warrant.signature_hash}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Audit Trail ─── */}
            {result && activeTab === "audit" && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="v-status-dot v-status-success" />
                    <h3 className="text-white font-semibold text-sm">Immutable Audit Trail</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    {result.audit_trail.length} entries · tamper-evident
                  </span>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {result.audit_trail.map((entry, i) => (
                    <div key={i} className="px-5 py-3 flex gap-4 hover:bg-slate-700/10 transition">
                      <div className="flex-shrink-0 w-[72px]">
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex-shrink-0 w-[120px]">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          entry.event.includes("denied") || entry.event.includes("ALERT")
                            ? "text-red-400 bg-red-400/10"
                            : "text-violet-400 bg-violet-400/10"
                        }`}>
                          {entry.event}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex-1">{entry.detail}</p>
                      <span className="text-[9px] text-slate-600 flex-shrink-0" title="Immutable entry">●</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Policy Rules ─── */}
            {result && activeTab === "policies" && (
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="v-status-dot v-status-info" />
                      <h3 className="text-white font-semibold text-sm">Policy Rules Evaluated</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {result.policy_rules.filter((r) => r.matched).length}/{result.policy_rules.length} matched
                    </span>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {result.policy_rules.map((rule) => (
                      <div key={rule.rule_id} className={`px-5 py-3 flex items-start gap-3 ${rule.matched ? "" : "opacity-50"}`}>
                        <span className="mt-0.5 text-sm flex-shrink-0">
                          {rule.matched ? (rule.result?.startsWith('DENIED') || rule.result?.startsWith('VIOLATION') ? '✗' : '✓') : '—'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-slate-500">{rule.rule_id}</span>
                            <span className="text-sm text-white font-medium">{rule.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">{rule.conditions}</p>
                          {rule.result && (
                            <p className={`text-xs mt-1 ${
                              rule.result.startsWith("DENIED") || rule.result.startsWith("VIOLATION")
                                ? "text-red-400"
                                : "text-violet-400"
                            }`}>
                              → {rule.result}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono flex-shrink-0 ${rule.matched ? "text-violet-400" : "text-slate-600"}`}>
                          {rule.matched ? "matched" : "skipped"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="/docs/policies"
                  className="flex items-center justify-center gap-2 bg-violet-400/10 border border-violet-400/20 text-violet-400 hover:bg-violet-400/15 rounded-xl px-4 py-3 transition text-sm font-medium"
                >
                  Build your own policies <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* ─── Merkle Warrant Chain Tab ─── */}
            {result && activeTab === "chain" && result.merkle_chain && (
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="v-status-dot v-status-success" />
                      <h3 className="text-white font-semibold text-sm">Merkle Warrant Chain</h3>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${result.merkle_chain!.chain_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {result.merkle_chain!.chain_verified ? '✓ Chain Verified' : '✗ Chain Broken'}
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This warrant has been appended to an immutable, hash-linked chain. 
                      Each warrant&apos;s hash includes the previous warrant&apos;s hash — any tampering is instantly detectable.
                      Third-party auditors can verify the chain without trusting Vienna OS.
                    </p>
                    
                    {/* Chain visualization */}
                    <div className="flex items-center gap-2 overflow-x-auto py-3">
                      {[
                        { idx: result.merkle_chain!.chain_index - 2, current: false },
                        { idx: result.merkle_chain!.chain_index - 1, current: false },
                        { idx: result.merkle_chain!.chain_index, current: true },
                      ].filter(b => b.idx >= 0).map((block, i) => (
                        <div key={i} className="flex items-center gap-2 flex-shrink-0">
                          {i > 0 && <div className="text-slate-500">→</div>}
                          <div className={`border rounded-lg p-3 min-w-[140px] ${block.current ? 'border-violet-400/50 bg-violet-400/5' : 'border-navy-600 bg-slate-800/50'}`}>
                            <div className="text-[10px] text-slate-500 mb-1">Block #{block.idx}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                              {block.current ? result.merkle_chain!.chain_hash.slice(7, 23) + '...' : sha256Short()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Chain Index</div>
                        <div className="text-sm font-mono text-violet-400">{result.merkle_chain!.chain_index.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Merkle Root</div>
                        <div className="text-sm font-mono text-white truncate">{result.merkle_chain!.merkle_root.slice(7, 23)}...</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3 col-span-2">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Chain Hash</div>
                        <div className="text-xs font-mono text-slate-300 break-all">{result.merkle_chain.chain_hash}</div>
                      </div>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3">
                      <div className="text-xs text-purple-300 font-medium mb-1">Why this matters</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        A SOC 2 auditor can verify this entire governance chain without accessing your Vienna OS instance. 
                        They only need the Merkle proof — the math proves integrity. No trust required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Agent Trust Score Tab ─── */}
            {result && activeTab === "trust" && result.trust_score && (
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="v-status-dot v-status-info" />
                      <h3 className="text-white font-semibold text-sm">Agent Trust Score</h3>
                    </div>
                    <span className="text-sm font-mono text-slate-400">{result.trust_score.agent_id}</span>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Score dial */}
                    <div className="text-center py-4">
                      <div className="text-6xl font-bold text-white mb-1">{result.trust_score.score}</div>
                      <div className="text-sm text-slate-400">out of 100</div>
                      <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                        result.trust_score.level === 'exemplary' ? 'bg-emerald-500/20 text-emerald-400' :
                        result.trust_score.level === 'good' ? 'bg-blue-500/20 text-blue-400' :
                        result.trust_score.level === 'watch' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {result.trust_score.level.toUpperCase()}
                      </div>
                    </div>

                    {/* Component bars */}
                    <div className="space-y-2">
                      {Object.entries(result.trust_score.components).map(([name, comp]) => (
                        <div key={name} className="flex items-center gap-3">
                          <div className="w-24 text-[11px] text-slate-400 capitalize">{name.replace(/_/g, ' ')}</div>
                          <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-500 transition-all duration-1000"
                              style={{ width: `${(comp.score / comp.max) * 100}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 w-10 text-right">{comp.score}/{comp.max}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recommendation */}
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <div className="text-xs text-blue-300 font-medium mb-1">Governance Recommendation</div>
                      <p className="text-xs text-slate-400">{result.trust_score.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── OWS Token Tab ─── */}
            {result && activeTab === "ows" && result.ows_token && (
              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="v-status-dot v-status-warning" />
                      <h3 className="text-white font-semibold text-sm">Open Warrant Standard Token</h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">OWS v1.0</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This is a portable execution authorization token — like JWT for authentication, 
                      OWS is for AI agent authorization. Any system can verify this token independently.
                    </p>

                    {/* Token display */}
                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                      <div className="text-[11px] font-mono leading-relaxed">
                        <span className="text-red-400">{result.ows_token.split('.')[0]}</span>
                        <span className="text-slate-500">.</span>
                        <span className="text-purple-400">{result.ows_token.split('.')[1]}</span>
                        <span className="text-slate-500">.</span>
                        <span className="text-cyan-400">{result.ows_token.split('.')[2]}</span>
                      </div>
                    </div>

                    {/* Token parts */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <span className="text-xs text-slate-400">Header — algorithm, type, version</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span className="text-xs text-slate-400">Payload — warrant ID, tier, scope, expiration, agent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                        <span className="text-xs text-slate-400">Signature — HMAC-SHA256 (tamper-proof)</span>
                      </div>
                    </div>

                    {/* Decoded payload */}
                    {(() => {
                      try {
                        const payload = JSON.parse(atob(result.ows_token.split('.')[1]));
                        return (
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Decoded Payload</div>
                            <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
                          </div>
                        );
                      } catch { return null; }
                    })()}

                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                      <div className="text-xs text-violet-300 font-medium mb-1">Interoperable</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Share this token with any system that implements the Open Warrant Standard. 
                        They can verify the agent&apos;s authorization without calling Vienna OS.
                        <a href="/docs/ows" className="text-violet-400 hover:underline ml-1">Read the spec →</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Delegation info (shown on warrant tab for T2+) ─── */}
            {result && activeTab === "warrant" && result.delegation && (
              <div className="mt-3 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="v-status-dot v-status-info" />
                  <h4 className="text-sm font-semibold text-purple-300">Warrant Delegation</h4>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  This warrant can be delegated to sub-agents with reduced scope.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-slate-500">Delegated to</div>
                    <div className="font-mono text-white">{result.delegation.delegated_to}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="text-slate-500">Delegation depth</div>
                    <div className="font-mono text-white">{result.delegation.depth} / 5 max</div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2 col-span-2">
                    <div className="text-slate-500">Scope reduction</div>
                    <div className="font-mono text-purple-300">{result.delegation.scope_reduction.join(', ') || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── CTA after result ─── */}
            {result && activeTab === "pipeline" && animatingStep === -1 && (
              <div className={`mt-4 rounded-xl p-4 border transition-all duration-500 ${
                result.outcome === "denied"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-violet-400/5 border-violet-400/20"
              }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${result.outcome === "denied" ? "text-red-400" : "text-violet-400"}`}>
                      {result.outcome === "denied"
                        ? "That action was blocked by the governance pipeline"
                        : result.outcome === "auto-approved"
                        ? "Full pipeline in " + result.total_duration_ms + "ms — zero human latency"
                        : "Full governance pipeline completed in " + result.total_duration_ms + "ms"
                      }
                    </p>
                    <p className="text-xs text-slate-500">
                      {result.outcome === "denied"
                        ? "Every denial is logged, the agent is flagged, and security is notified. This is governance working."
                        : `Intent → Policy → Risk (${result.tier}) → ${result.outcome === "auto-approved" ? "Auto-Approve" : "Approval"} → Warrant → Execute → Verify → Audit`
                      }
                    </p>
                  </div>
                  <a
                    href="/signup"
                    className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition"
                  >
                    Get your own console <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Newsletter Signup ─── */}
        <div className="mt-12 max-w-2xl mx-auto">
          <NewsletterSignup />
        </div>

        {/* ─── API Integration & Next Steps ─── */}
        <div className="mt-12 sm:mt-16 space-y-8">
          {/* API Snippet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Integrate via API
              </h3>
              <button 
                onClick={() => navigator.clipboard?.writeText(`curl -X POST https://api.vienna-os.dev/v1/agent/intent \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "${selected === "custom" ? customAction : selected}",
    "source": "your-agent-id", 
    "tenant_id": "your-org",
    "context": { "environment": "production" }
  }'`)}
                className="text-xs text-violet-400 hover:text-violet-300 transition px-2 py-1 border border-violet-400/20 rounded"
              >
                Copy cURL
              </button>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 sm:p-5">
              <pre className="font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto">
{`curl -X POST https://api.vienna-os.dev/v1/agent/intent \\
  -H "Authorization: Bearer \$VIENNA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "${selected === "custom" ? customAction : selected}",
    "source": "your-agent-id",
    "tenant_id": "your-org",
    "context": { "environment": "production" }
  }'`}
              </pre>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-purple-900/20 to-slate-800/50 border border-purple-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Ready to govern your AI agents?</h3>
            <p className="text-slate-400 text-sm mb-4 max-w-2xl">
              This playground shows Vienna OS capabilities. Get started with your own governance infrastructure in minutes.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <a 
                href="/signup" 
                onClick={() => analytics.ctaClick('try_demo', 'start_free_trial')}
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Start Free Trial →
              </a>
              <a 
                href="/docs" 
                onClick={() => analytics.ctaClick('try_demo', 'read_documentation')}
                className="bg-slate-700 hover:bg-navy-600 border border-navy-600 text-white text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Read Documentation
              </a>
              <a 
                href="/contact" 
                onClick={() => analytics.ctaClick('try_demo', 'schedule_demo')}
                className="text-violet-400 hover:text-violet-300 border border-violet-400/30 hover:bg-violet-400/5 text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-700/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-slate-500">
          <span>Vienna OS — The governance and authorization layer for AI systems</span>
          <a href="/docs" className="text-violet-400 hover:text-violet-300 transition">Documentation →</a>
        </div>
      </footer>
    </div>
  );
}

/* ─── Subcomponents ─── */

function ScenarioButton({
  scenario,
  active,
  onClick,
  tc,
}: {
  scenario: (typeof scenarios)[0];
  active: boolean;
  onClick: () => void;
  tc: (tier: string) => { text: string; bg: string; border: string };
}) {
  const colors = tc(scenario.tier);
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl p-3 transition-all duration-200 border group relative
        ${active
          ? "border-violet-400/40 bg-violet-400/8 shadow-[0_0_20px_rgba(212,165,32,0.1)] ring-1 ring-violet-400/20"
          : "border-slate-700/50 bg-slate-800/50 hover:border-navy-600 hover:bg-slate-800"
        }
      `}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-gold-600 rounded-l-xl"></div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{scenario.icon}</span>
          <span className={`font-medium text-sm ${active ? "text-white" : "text-warm-200"}`}>{scenario.label}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
          {scenario.tier}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed pl-7 mb-1">{scenario.desc}</p>
      
      {/* Risk Factors */}
      {(scenario as any).riskFactors && (scenario as any).riskFactors.length > 0 && (
        <div className="pl-7 mt-2">
          <div className="flex flex-wrap gap-1">
            {(scenario as any).riskFactors.slice(0, 3).map((factor: string) => (
              <span
                key={factor}
                className="text-[10px] px-2 py-1 rounded border border-slate-500/40 bg-warm-800/30 text-slate-300 font-mono"
              >
                {factor.replace(/_/g, ' ')}
              </span>
            ))}
            {(scenario as any).riskFactors.length > 3 && (
              <span className="text-[10px] text-slate-500 font-medium">+{(scenario as any).riskFactors.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Category Badge */}
      {(scenario as any).category && (
        <div className="pl-7 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] text-slate-600 capitalize">
            {(scenario as any).category} • {scenario.tierLabel}
          </span>
        </div>
      )}
    </button>
  );
}

function WarrantField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700/30 px-3 py-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-white font-mono truncate">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none transition"
      />
    </div>
  );
}
