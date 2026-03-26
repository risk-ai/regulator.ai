"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Shield, ArrowLeft, ArrowRight, Play, ChevronDown, Plus, Trash2 } from "lucide-react";

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
  pipeline: PipelineStep[];
  warrant: Warrant | null;
  audit_trail: AuditEntry[];
  policy_rules: PolicyRule[];
  total_duration_ms: number;
}

/* ─── Scenarios ─── */
const scenarios = [
  {
    id: "wire_transfer",
    icon: "💸",
    label: "Wire Transfer ($75K)",
    desc: "Financial agent requests $75,000 wire transfer. Multi-party T2 approval required.",
    tier: "T2",
    tierLabel: "Multi-Party",
    docs: "/docs/tiers#t2",
  },
  {
    id: "production_deploy",
    icon: "🚀",
    label: "Production Deploy",
    desc: "DevOps agent deploys to production. After-hours check + rollback constraint.",
    tier: "T1",
    tierLabel: "Approval",
    docs: "/docs/tiers#t1",
  },
  {
    id: "patient_record",
    icon: "🏥",
    label: "Patient Record Update",
    desc: "Healthcare agent updates PHI. HIPAA scoping with 60-second TTL warrant.",
    tier: "T1",
    tierLabel: "HIPAA",
    docs: "/docs/compliance#hipaa",
  },
  {
    id: "denied_scope_creep",
    icon: "🚫",
    label: "Denied — Scope Creep",
    desc: "Agent tries to access resources outside its scope. Policy engine blocks it.",
    tier: "DENY",
    tierLabel: "Blocked",
    docs: "/docs/security#scope",
  },
  {
    id: "auto_approved_read",
    icon: "⚡",
    label: "Auto-Approved Read",
    desc: "Read-only data query. Full pipeline in <50ms with T0 auto-approval.",
    tier: "T0",
    tierLabel: "Auto",
    docs: "/docs/tiers#t0",
  },
  {
    id: "custom",
    icon: "🔄",
    label: "Custom Action",
    desc: "Define your own action and see how the governance engine evaluates it.",
    tier: "?",
    tierLabel: "Dynamic",
    docs: "/docs/policies",
  },
];

const tierColors: Record<string, { text: string; bg: string; border: string }> = {
  T0: { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  T1: { text: "text-gold-400", bg: "bg-gold-400/10", border: "border-gold-400/20" },
  "T1+": { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  T2: { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  DENY: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  DENIED: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  "?": { text: "text-warm-400", bg: "bg-warm-400/10", border: "border-warm-400/20" },
};

const stepIcons: Record<string, string> = {
  intent_received: "📨",
  policy_engine: "📋",
  risk_assessment: "⚖️",
  approval_gate: "🔐",
  warrant_issued: "📜",
  execution: "⚡",
  verification: "✅",
  audit_logged: "📒",
};

/* ─── Component ─── */
export default function TryPage() {
  const [selected, setSelected] = useState("wire_transfer");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [animatingStep, setAnimatingStep] = useState(-1);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [showWarrant, setShowWarrant] = useState(false);
  const [warrantVerified, setWarrantVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "warrant" | "audit" | "policies">("pipeline");
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

  const pipelineRef = useRef<HTMLDivElement>(null);

  const selectedScenario = scenarios.find((s) => s.id === selected)!;

  /* ─── Animate pipeline steps ─── */
  const animatePipeline = useCallback((data: PipelineResult) => {
    setVisibleSteps([]);
    setShowWarrant(false);
    setWarrantVerified(false);
    setActiveTab("pipeline");

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
      } else if (e.key === "Enter" && !loading) {
        e.preventDefault();
        execute();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loading]);

  const tc = (tier: string) => tierColors[tier] || tierColors["?"];

  return (
    <div className="min-h-screen bg-navy-950">
      {/* ─── Nav ─── */}
      <nav className="border-b border-navy-700/50 backdrop-blur-sm bg-navy-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-warm-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-5 h-5 text-gold-400" />
            <span className="font-bold text-white">
              Vienna<span className="text-gold-400">OS</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-warm-500 font-mono">Interactive Playground</span>
            <a
              href="/signup"
              className="text-sm bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 border border-gold-400/20 px-4 py-1.5 rounded-lg transition font-medium"
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
            <div className="h-4 w-px bg-navy-700"></div>
            <span className="text-xs text-warm-600 font-mono">
              {visibleSteps.length > 0 ? `${visibleSteps.length}/8 steps completed` : "Ready to simulate"}
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Interactive Governance Pipeline
          </h1>
          <p className="text-warm-400 text-sm sm:text-base max-w-2xl mb-4">
            Submit any AI agent intent and watch it flow through Vienna OS — policy evaluation, 
            risk tiering, approval workflows, warrant issuance, and immutable audit logging.
          </p>
          
          <div className="flex items-center gap-6 text-xs text-warm-600">
            <div className="flex items-center gap-2">
              <span className="font-mono">⚡</span>
              <span>Real-time simulation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">🔒</span>
              <span>Production-grade logic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">📋</span>
              <span>Full audit trail</span>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="font-mono">⏱️</span>
                <span>{result.total_duration_ms}ms total</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ─── Left: Scenario Selector ─── */}
          <div className="space-y-3">
            {/* Mobile dropdown */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="w-full flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span>{selectedScenario.icon}</span>
                  <span className="text-white font-medium text-sm">{selectedScenario.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-warm-400 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileOpen && (
                <div className="mt-2 space-y-1.5">
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

            {/* Desktop list */}
            <div className="hidden lg:block space-y-1.5">
              <h3 className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider mb-2">
                Scenarios <span className="text-warm-600">↑↓ to navigate</span>
              </h3>
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

            {/* Custom action fields */}
            {selected === "custom" && (
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-warm-400 uppercase tracking-wider">Define Your Action</h4>
                <Field label="Action Name" value={customAction} onChange={setCustomAction} placeholder="e.g. delete_records" />
                <Field label="Agent ID" value={customAgent} onChange={setCustomAgent} placeholder="e.g. untrusted-agent" />
                <Field label="Amount ($)" value={customAmount} onChange={setCustomAmount} placeholder="0" type="number" />
                <div>
                  <label className="text-[11px] text-warm-500 block mb-1">Parameters</label>
                  {customParams.map((p, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <input
                        className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-warm-600 focus:border-gold-400/40 focus:outline-none transition"
                        placeholder="key"
                        value={p.key}
                        onChange={(e) => {
                          const next = [...customParams];
                          next[i] = { ...next[i], key: e.target.value };
                          setCustomParams(next);
                        }}
                      />
                      <input
                        className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-warm-600 focus:border-gold-400/40 focus:outline-none transition"
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
                        className="text-warm-600 hover:text-red-400 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setCustomParams([...customParams, { key: "", value: "" }])}
                    className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 transition mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add parameter
                  </button>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-warm-600 leading-relaxed">
                    Try: &quot;untrusted-agent&quot; → denied · amount &gt;$10K → T2 · &quot;delete&quot; in action → T2 · &quot;deploy&quot; after 6PM → T1+
                  </p>
                </div>
              </div>
            )}

            {/* Execute button */}
            <button
              onClick={execute}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-300 disabled:bg-gold-400/50 text-navy-950 font-semibold px-6 py-3 rounded-xl transition text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                  Running Pipeline…
                </span>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Execute Pipeline
                </>
              )}
            </button>
            <p className="text-[10px] text-warm-600 text-center">
              Press Enter to execute · Simulated locally
            </p>
          </div>

          {/* ─── Right: Results ─── */}
          <div className="min-w-0" ref={pipelineRef}>
            {/* Tabs */}
            {result && (
              <div className="flex gap-1 mb-4 bg-navy-800/50 rounded-xl p-1 overflow-x-auto">
                {(["pipeline", "warrant", "audit", "policies"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                      activeTab === tab
                        ? "bg-navy-700 text-white"
                        : "text-warm-500 hover:text-warm-300"
                    } ${tab === "warrant" && !result.warrant ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={tab === "warrant" && !result.warrant}
                  >
                    {tab === "pipeline" && "🔗 "}
                    {tab === "warrant" && "📜 "}
                    {tab === "audit" && "📒 "}
                    {tab === "policies" && "📋 "}
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                <p className="text-red-400 font-medium mb-1">Pipeline Error</p>
                <p className="text-sm text-warm-500">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
              <div className="bg-navy-800/50 border border-navy-700/50 rounded-2xl overflow-hidden min-h-[400px]">
                {/* Interactive demo header */}
                <div className="bg-navy-800 border-b border-navy-700/50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gold-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Interactive Governance Simulator</h3>
                        <p className="text-xs text-warm-500">Submit a mock intent and watch it flow through the pipeline</p>
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
                  <div className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {["Intent Gateway", "Policy Engine", "Risk Assessment", "Approval Gate", "Warrant Issuer", "Execution Router", "Verification Engine", "Audit Logger"].map((step, i) => (
                        <div key={step} className="bg-navy-900/50 border border-navy-700/50 rounded-lg p-3 text-center group hover:border-gold-400/30 hover:bg-gold-400/5 transition-all duration-300">
                          <div className="text-lg mb-1">
                            {["📨", "📋", "⚖️", "🔐", "📜", "⚡", "✅", "📒"][i]}
                          </div>
                          <div className="text-xs text-warm-400 font-medium">{step}</div>
                          <div className="text-[10px] text-warm-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Step {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-navy-900/30 border border-navy-700/30 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-gold-400 font-medium">💡 Try these scenarios:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          "🚀 Production deployment (T1 approval needed)",
                          "💸 Large wire transfer (T2 multi-party approval)",
                          "🏥 Patient record update (HIPAA compliant)", 
                          "⚡ Read-only query (T0 auto-approved)"
                        ].map((suggestion) => (
                          <div key={suggestion} className="text-xs text-warm-500 bg-navy-800/50 rounded px-3 py-2 border border-navy-700/30">
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-warm-400 text-sm mb-4 max-w-md mx-auto">
                      Select a scenario above and click "Execute Pipeline" to see Vienna OS governance in action.
                      Every step is simulated with realistic timing and outcomes.
                    </p>
                    
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-warm-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span>Real-time simulation</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-warm-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-400"></div>
                        <span>Interactive controls</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-warm-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                        <span>Full audit trail</span>
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
                  <div key={i} className="bg-navy-800/50 border border-navy-700/30 rounded-xl p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-navy-700/50" />
                      <div className="flex-1">
                        <div className="h-3 bg-navy-700/50 rounded w-32 mb-2" />
                        <div className="h-2 bg-navy-700/30 rounded w-64" />
                      </div>
                      <div className="h-3 bg-navy-700/30 rounded w-12" />
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
                    : "bg-gold-400/5 border-gold-400/20"
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {result.outcome === "denied" ? "🛑" : result.outcome === "auto-approved" ? "⚡" : "✅"}
                      </span>
                      <div>
                        <p className={`font-semibold text-sm ${
                          result.outcome === "denied" ? "text-red-400" : result.outcome === "auto-approved" ? "text-emerald-400" : "text-gold-400"
                        }`}>
                          {result.outcome === "denied" ? "Action Denied" : result.outcome === "auto-approved" ? "Auto-Approved" : "Approved"}
                          {" — "}
                          <span className="font-mono">{result.tier}</span>
                        </p>
                        <p className="text-xs text-warm-500">
                          Execution {result.execution_id.slice(0, 8)}… · {result.total_duration_ms}ms total
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedScenario.docs}
                      className="text-xs text-gold-400 hover:text-gold-300 transition flex items-center gap-1"
                    >
                      Learn more <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Steps */}
                {result.pipeline.map((step, i) => {
                  const visible = visibleSteps.includes(i);
                  const active = animatingStep === i;
                  const isDenied = step.status === "denied";
                  const isSkipped = step.status === "skipped";

                  return (
                    <div
                      key={step.step}
                      className={`
                        rounded-xl border p-3.5 transition-all duration-500
                        ${!visible ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
                        ${active ? "border-gold-400/40 bg-gold-400/5 shadow-[0_0_20px_rgba(212,165,32,0.08)]" : ""}
                        ${isDenied && visible && !active ? "border-red-500/30 bg-red-500/5" : ""}
                        ${isSkipped && visible && !active ? "border-navy-700/30 bg-navy-800/30 opacity-50" : ""}
                        ${!isDenied && !isSkipped && visible && !active ? "border-navy-700/50 bg-navy-800/50" : ""}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm transition-all duration-500
                          ${active ? "bg-gold-400/20 scale-110" : ""}
                          ${isDenied && !active ? "bg-red-500/10" : ""}
                          ${isSkipped && !active ? "bg-navy-700/30" : ""}
                          ${!isDenied && !isSkipped && !active ? "bg-navy-700/50" : ""}
                        `}>
                          {isSkipped ? "—" : stepIcons[step.step] || "•"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-medium text-sm ${isSkipped ? "text-warm-600" : isDenied ? "text-red-400" : "text-white"}`}>
                              {step.label}
                            </span>
                            {visible && !isSkipped && (
                              <span className={`
                                inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded
                                ${isDenied ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}
                              `}>
                                {isDenied ? "✗ denied" : "✓ ok"}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs leading-relaxed ${isSkipped ? "text-warm-700" : "text-warm-500"}`}>
                            {step.detail}
                          </p>
                        </div>
                        {visible && step.duration_ms > 0 && (
                          <span className="text-[10px] font-mono text-warm-600 flex-shrink-0 mt-0.5">
                            {step.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Warrant Inspector ─── */}
            {result && activeTab === "warrant" && result.warrant && (
              <div className="bg-navy-800/50 border border-navy-700/50 rounded-2xl overflow-hidden">
                {/* Warrant header */}
                <div className="bg-gold-400/5 border-b border-gold-400/10 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📜</span>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Cryptographic Warrant</h3>
                      <p className="text-[11px] font-mono text-warm-500">{result.warrant.warrant_id}</p>
                    </div>
                  </div>
                  {/* Verified stamp */}
                  <div className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-700
                    ${warrantVerified
                      ? "bg-emerald-400/10 border-emerald-400/30 scale-100 opacity-100"
                      : showWarrant
                      ? "bg-warm-700/10 border-warm-600/20 scale-95 opacity-60"
                      : "opacity-0 scale-90"
                    }
                  `}>
                    <span className={`text-sm transition-all duration-500 ${warrantVerified ? "text-emerald-400" : "text-warm-600"}`}>
                      {warrantVerified ? "✓" : "…"}
                    </span>
                    <span className={`text-xs font-semibold ${warrantVerified ? "text-emerald-400" : "text-warm-500"}`}>
                      {warrantVerified ? "Verified" : "Verifying"}
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
                    <h4 className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Scope</h4>
                    <div className="bg-navy-900/50 rounded-xl border border-navy-700/50 p-3">
                      <pre className="text-xs font-mono text-gold-400 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.warrant.scope, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Constraints</h4>
                    <div className="bg-navy-900/50 rounded-xl border border-navy-700/50 p-3">
                      <pre className="text-xs font-mono text-warm-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.warrant.constraints, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Signature */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider mb-2">Signature Hash</h4>
                    <div className="bg-navy-900/50 rounded-xl border border-navy-700/50 p-3">
                      <p className="text-[11px] font-mono text-warm-600 break-all">{result.warrant.signature_hash}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Audit Trail ─── */}
            {result && activeTab === "audit" && (
              <div className="bg-navy-800/50 border border-navy-700/50 rounded-2xl overflow-hidden">
                <div className="bg-navy-800 border-b border-navy-700/50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📒</span>
                    <h3 className="text-white font-semibold text-sm">Immutable Audit Trail</h3>
                  </div>
                  <span className="text-[10px] font-mono text-warm-600 bg-navy-900 px-2 py-1 rounded">
                    {result.audit_trail.length} entries · tamper-evident
                  </span>
                </div>
                <div className="divide-y divide-navy-700/30">
                  {result.audit_trail.map((entry, i) => (
                    <div key={i} className="px-5 py-3 flex gap-4 hover:bg-navy-700/10 transition">
                      <div className="flex-shrink-0 w-[72px]">
                        <span className="text-[10px] font-mono text-warm-600">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex-shrink-0 w-[120px]">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          entry.event.includes("denied") || entry.event.includes("ALERT")
                            ? "text-red-400 bg-red-400/10"
                            : "text-gold-400 bg-gold-400/10"
                        }`}>
                          {entry.event}
                        </span>
                      </div>
                      <p className="text-xs text-warm-400 flex-1">{entry.detail}</p>
                      <span className="text-[9px] text-warm-700 flex-shrink-0" title="Immutable entry">🔒</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Policy Rules ─── */}
            {result && activeTab === "policies" && (
              <div className="space-y-3">
                <div className="bg-navy-800/50 border border-navy-700/50 rounded-2xl overflow-hidden">
                  <div className="bg-navy-800 border-b border-navy-700/50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <h3 className="text-white font-semibold text-sm">Policy Rules Evaluated</h3>
                    </div>
                    <span className="text-[10px] font-mono text-warm-600">
                      {result.policy_rules.filter((r) => r.matched).length}/{result.policy_rules.length} matched
                    </span>
                  </div>
                  <div className="divide-y divide-navy-700/30">
                    {result.policy_rules.map((rule) => (
                      <div key={rule.rule_id} className={`px-5 py-3 flex items-start gap-3 ${rule.matched ? "" : "opacity-50"}`}>
                        <span className="mt-0.5 text-sm flex-shrink-0">
                          {rule.matched ? (rule.result?.startsWith("DENIED") || rule.result?.startsWith("VIOLATION") ? "🔴" : "🟢") : "⚪"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-warm-500">{rule.rule_id}</span>
                            <span className="text-sm text-white font-medium">{rule.name}</span>
                          </div>
                          <p className="text-[11px] text-warm-500 font-mono">{rule.conditions}</p>
                          {rule.result && (
                            <p className={`text-xs mt-1 ${
                              rule.result.startsWith("DENIED") || rule.result.startsWith("VIOLATION")
                                ? "text-red-400"
                                : "text-gold-400"
                            }`}>
                              → {rule.result}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono flex-shrink-0 ${rule.matched ? "text-gold-400" : "text-warm-700"}`}>
                          {rule.matched ? "matched" : "skipped"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="/docs/policies"
                  className="flex items-center justify-center gap-2 bg-gold-400/10 border border-gold-400/20 text-gold-400 hover:bg-gold-400/15 rounded-xl px-4 py-3 transition text-sm font-medium"
                >
                  Build your own policies <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* ─── CTA after result ─── */}
            {result && activeTab === "pipeline" && animatingStep === -1 && (
              <div className={`mt-4 rounded-xl p-4 border transition-all duration-500 ${
                result.outcome === "denied"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-gold-400/5 border-gold-400/20"
              }`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${result.outcome === "denied" ? "text-red-400" : "text-gold-400"}`}>
                      {result.outcome === "denied"
                        ? "🛑 That action was blocked by the governance pipeline"
                        : result.outcome === "auto-approved"
                        ? "⚡ Full pipeline in " + result.total_duration_ms + "ms — zero human latency"
                        : "✅ Full governance pipeline completed in " + result.total_duration_ms + "ms"
                      }
                    </p>
                    <p className="text-xs text-warm-500">
                      {result.outcome === "denied"
                        ? "Every denial is logged, the agent is flagged, and security is notified. This is governance working."
                        : `Intent → Policy → Risk (${result.tier}) → ${result.outcome === "auto-approved" ? "Auto-Approve" : "Approval"} → Warrant → Execute → Verify → Audit`
                      }
                    </p>
                  </div>
                  <a
                    href="/signup"
                    className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-gold-400 hover:text-gold-300 transition"
                  >
                    Get your own console <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── API Integration & Next Steps ─── */}
        <div className="mt-12 sm:mt-16 space-y-8">
          {/* API Snippet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider">
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
                className="text-xs text-gold-400 hover:text-gold-300 transition px-2 py-1 border border-gold-400/20 rounded"
              >
                Copy cURL
              </button>
            </div>
            <div className="bg-navy-800 border border-navy-700/50 rounded-xl p-4 sm:p-5">
              <pre className="font-mono text-xs sm:text-sm text-warm-300 overflow-x-auto">
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
          <div className="bg-gradient-to-r from-purple-900/20 to-navy-800/50 border border-purple-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Ready to govern your AI agents?</h3>
            <p className="text-warm-400 text-sm mb-4 max-w-2xl">
              This playground shows Vienna OS capabilities. Get started with your own governance infrastructure in minutes.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <a 
                href="/signup" 
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Start Free Trial →
              </a>
              <a 
                href="/docs" 
                className="bg-navy-700 hover:bg-navy-600 border border-navy-600 text-white text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Read Documentation
              </a>
              <a 
                href="/contact" 
                className="text-gold-400 hover:text-gold-300 border border-gold-400/30 hover:bg-gold-400/5 text-sm font-medium px-4 py-3 rounded-xl transition text-center"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-navy-700/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs text-warm-600">
          <span>Vienna OS — Governance infrastructure for autonomous agents</span>
          <a href="/docs" className="text-gold-400 hover:text-gold-300 transition">Documentation →</a>
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
        w-full text-left rounded-xl p-3 transition-all duration-200 border
        ${active
          ? "border-gold-400/30 bg-gold-400/5 shadow-[0_0_15px_rgba(212,165,32,0.04)]"
          : "border-navy-700/50 bg-navy-800/50 hover:border-navy-600 hover:bg-navy-800"
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{scenario.icon}</span>
          <span className={`font-medium text-sm ${active ? "text-white" : "text-warm-200"}`}>{scenario.label}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors.text} ${colors.bg} ${colors.border}`}>
          {scenario.tier}
        </span>
      </div>
      <p className="text-[11px] text-warm-500 leading-relaxed pl-7">{scenario.desc}</p>
    </button>
  );
}

function WarrantField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-900/50 rounded-lg border border-navy-700/30 px-3 py-2">
      <p className="text-[10px] text-warm-600 uppercase tracking-wider mb-0.5">{label}</p>
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
      <label className="text-[11px] text-warm-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-warm-600 focus:border-gold-400/40 focus:outline-none transition"
      />
    </div>
  );
}
