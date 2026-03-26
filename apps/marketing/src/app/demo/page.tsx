"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ============================================================
   TYPES & DATA
   ============================================================ */

type Tier = "T0" | "T1" | "T2";
type Outcome = "approved" | "denied";

interface Agent {
  id: string;
  name: string;
  role: string;
  mode: string;
  trust: number;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

interface StepDetail {
  agent: string;
  action: string;
  tier: Tier;
  description: string;
  policyResult: string;
  warrantIssued: boolean;
  warrantDetail?: string;
  outcome: Outcome;
  trustDelta: number;
  timeLabel: string;
  pipelineStages: { label: string; status: "pass" | "fail" | "skip" }[];
  detail: string;
}

const AGENTS: Agent[] = [
  {
    id: "payments",
    name: "PaymentsBot",
    role: "Payment Processing",
    mode: "Autonomous",
    trust: 78,
    icon: "💳",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "deploy",
    name: "DeployBot",
    role: "CI/CD Pipeline",
    mode: "Semi-Autonomous",
    trust: 85,
    icon: "🚀",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "data",
    name: "DataExporter",
    role: "Data Operations",
    mode: "Supervised",
    trust: 45,
    icon: "📊",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
];

const STEPS: StepDetail[] = [
  {
    agent: "payments",
    action: "process_payment",
    tier: "T0",
    description: "Process payment — $500 invoice #4821",
    policyResult: "Auto-approved (T0, amount < $1,000)",
    warrantIssued: true,
    warrantDetail: "Scope: process_payment | TTL: 60s | Max: $1,000",
    outcome: "approved",
    trustDelta: 0,
    timeLabel: "09:14:22",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "pass" },
      { label: "Warrant", status: "pass" },
      { label: "Execute", status: "pass" },
      { label: "Verify", status: "pass" },
    ],
    detail:
      "PaymentsBot submitted a routine $500 payment. Policy engine classified as T0 (low-risk, amount under threshold). Auto-approved without operator intervention. Warrant issued with 60s TTL. Execution completed in 240ms. Verification Engine confirmed amount matches warrant scope.",
  },
  {
    agent: "deploy",
    action: "deploy_staging",
    tier: "T1",
    description: "Deploy to staging — build #1847",
    policyResult: "T1 — operator approval required",
    warrantIssued: true,
    warrantDetail: "Scope: deploy_staging | TTL: 120s | Target: staging-cluster",
    outcome: "approved",
    trustDelta: 0,
    timeLabel: "09:31:05",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "pass" },
      { label: "Approval", status: "pass" },
      { label: "Warrant", status: "pass" },
      { label: "Execute", status: "pass" },
    ],
    detail:
      "DeployBot submitted a staging deployment intent. Policy engine classified as T1 — requires single operator approval. Operator Jane approved within 12 seconds. Warrant issued scoped to staging-cluster with 120s TTL. Deployment completed successfully. Build hash verified against warrant.",
  },
  {
    agent: "data",
    action: "export_customer_pii",
    tier: "T2",
    description: "Export customer PII — 12,400 records",
    policyResult: "DENIED — PII export blocked (trust < 50)",
    warrantIssued: false,
    outcome: "denied",
    trustDelta: -5,
    timeLabel: "10:02:41",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "fail" },
      { label: "Approval", status: "skip" },
      { label: "Warrant", status: "skip" },
      { label: "Execute", status: "skip" },
    ],
    detail:
      "DataExporter attempted to export customer PII (12,400 records). Policy engine evaluated: agent trust score 45 is below minimum threshold (50) for PII operations. Request DENIED at policy stage. No warrant issued. Alert generated. Trust score decayed by 5 points to 40 due to policy violation.",
  },
  {
    agent: "payments",
    action: "wire_transfer",
    tier: "T2",
    description: "Wire transfer — $75,000 to vendor-456",
    policyResult: "T2 — multi-party approval required (2 operators)",
    warrantIssued: true,
    warrantDetail: "Scope: wire_transfer | TTL: 60s | Max: $75,000 | Recipient: vendor-456",
    outcome: "approved",
    trustDelta: 0,
    timeLabel: "11:45:18",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "pass" },
      { label: "Approval ×2", status: "pass" },
      { label: "Warrant", status: "pass" },
      { label: "Execute", status: "pass" },
    ],
    detail:
      'PaymentsBot submitted a $75,000 wire transfer. Policy engine classified as T2 — high-value transaction requires multi-party approval. Operator Jane approved (1/2). Operator Mike approved (2/2). Time-limited warrant issued: 60-second TTL, max amount $75,000, recipient locked to vendor-456. Execution completed. Verification Engine confirmed: amount $75,000 ≤ $75,000 ✓, recipient vendor-456 ∈ [vendor-456] ✓, within TTL ✓.',
  },
  {
    agent: "deploy",
    action: "deploy_production",
    tier: "T2",
    description: "Deploy to production — build #1847 (22:30)",
    policyResult: "ESCALATED to T2 — after-hours policy triggered",
    warrantIssued: false,
    outcome: "denied",
    trustDelta: 0,
    timeLabel: "22:30:00",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "pass" },
      { label: "Escalation", status: "pass" },
      { label: "Approval", status: "fail" },
      { label: "Warrant", status: "skip" },
    ],
    detail:
      "DeployBot submitted production deployment at 22:30 (after-hours). Policy engine auto-escalated from T1 to T2 — after-hours production deploys require on-call engineer AND CTO approval. On-call engineer approved. CTO denied — \"not critical, deploy tomorrow during business hours.\" Request blocked. No warrant issued.",
  },
  {
    agent: "data",
    action: "export_anonymized_data",
    tier: "T1",
    description: "Export anonymized analytics — 8,200 records",
    policyResult: "T1 — approved (anonymized data, within scope)",
    warrantIssued: true,
    warrantDetail: "Scope: export_anonymized | TTL: 180s | Data-type: anonymized_only",
    outcome: "approved",
    trustDelta: 5,
    timeLabel: "14:15:33",
    pipelineStages: [
      { label: "Intent", status: "pass" },
      { label: "Policy", status: "pass" },
      { label: "Approval", status: "pass" },
      { label: "Warrant", status: "pass" },
      { label: "Execute", status: "pass" },
    ],
    detail:
      'DataExporter submitted anonymized data export request. Policy engine classified as T1 — anonymized data is within scope for supervised agents. Operator approved. Warrant issued with data-type constraint: "anonymized_only". Execution completed. Verification Engine confirmed data-type compliance. Trust score recovered +5 to 45.',
  },
];

/* ============================================================
   HELPER COMPONENTS
   ============================================================ */

function TierBadge({ tier }: { tier: Tier }) {
  const colors: Record<Tier, string> = {
    T0: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    T1: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    T2: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${colors[tier]}`}>
      {tier}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return outcome === "approved" ? (
    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
      <CheckCircle className="w-3.5 h-3.5" /> Approved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold">
      <XCircle className="w-3.5 h-3.5" /> Denied
    </span>
  );
}

function Pipeline({
  stages,
  animate,
}: {
  stages: { label: string; status: "pass" | "fail" | "skip" }[];
  animate: boolean;
}) {
  const [visibleIdx, setVisibleIdx] = useState(-1);

  useEffect(() => {
    if (!animate) {
      setVisibleIdx(-1);
      return;
    }
    let i = 0;
    const iv = setInterval(() => {
      setVisibleIdx(i);
      i++;
      if (i >= stages.length) clearInterval(iv);
    }, 350);
    return () => clearInterval(iv);
  }, [animate, stages.length]);

  return (
    <div className="flex items-center gap-1 mt-2">
      {stages.map((s, i) => {
        const active = animate && i <= visibleIdx;
        const color =
          !active
            ? "bg-navy-700 text-slate-600 border-navy-600"
            : s.status === "pass"
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            : s.status === "fail"
            ? "bg-red-500/15 text-red-400 border-red-500/30"
            : "bg-slate-800 text-slate-600 border-slate-700";
        return (
          <div key={i} className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all duration-300 ${color}`}
            >
              {s.label}
            </span>
            {i < stages.length - 1 && (
              <span className={`text-[8px] transition-colors duration-300 ${active ? "text-slate-500" : "text-navy-700"}`}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentCard({
  agent,
  trust,
  highlight,
}: {
  agent: Agent;
  trust: number;
  highlight: boolean;
}) {
  const trustColor =
    trust >= 70 ? "text-emerald-400" : trust >= 50 ? "text-amber-400" : "text-red-400";
  const trustBg =
    trust >= 70 ? "bg-emerald-500/20" : trust >= 50 ? "bg-amber-500/20" : "bg-red-500/20";
  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-500 ${
        highlight
          ? `${agent.borderColor} ${agent.bgColor} shadow-lg shadow-${agent.color}/5`
          : "border-navy-700 bg-navy-800/50"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{agent.icon}</span>
        <div>
          <div className={`font-semibold text-sm ${highlight ? agent.color : "text-white"}`}>{agent.name}</div>
          <div className="text-[10px] text-slate-500">{agent.role} · {agent.mode}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Trust</span>
        <span className={`font-mono text-sm font-bold ${trustColor}`}>{trust}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-navy-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${trustBg}`}
          style={{ width: `${trust}%` }}
        />
      </div>
    </div>
  );
}

function MetricsBar({
  actions,
  approved,
  denied,
  warrants,
  violations,
}: {
  actions: number;
  approved: number;
  denied: number;
  warrants: number;
  violations: number;
}) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {[
        { label: "Actions", value: actions, color: "text-white" },
        { label: "Approved", value: approved, color: "text-emerald-400" },
        { label: "Denied", value: denied, color: "text-red-400" },
        { label: "Warrants", value: warrants, color: "text-amber-400" },
        { label: "Violations", value: violations, color: "text-red-400" },
      ].map((m) => (
        <div key={m.label} className="text-center bg-navy-800/60 rounded-lg border border-navy-700 py-2.5 px-2">
          <div className={`font-mono text-lg font-bold ${m.color}`}>{m.value}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function MultiAgentDemo() {
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [trusts, setTrusts] = useState<Record<string, number>>({ payments: 78, deploy: 85, data: 45 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  const metrics = {
    actions: Math.min(currentStep + 1, STEPS.length),
    approved: STEPS.slice(0, currentStep + 1).filter((s) => s.outcome === "approved").length,
    denied: STEPS.slice(0, currentStep + 1).filter((s) => s.outcome === "denied").length,
    warrants: STEPS.slice(0, currentStep + 1).filter((s) => s.warrantIssued).length,
    violations: STEPS.slice(0, currentStep + 1).filter((s) => s.outcome === "denied" && s.trustDelta < 0).length,
  };

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentStep(-1);
    setExpandedStep(null);
    setTrusts({ payments: 78, deploy: 85, data: 45 });
    setAlerts([]);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const advanceStep = useCallback(
    (step: number) => {
      if (step >= STEPS.length) {
        setPlaying(false);
        return;
      }
      setCurrentStep(step);
      const s = STEPS[step];
      if (s.trustDelta !== 0) {
        setTrusts((prev) => ({ ...prev, [s.agent]: prev[s.agent] + s.trustDelta }));
      }
      if (s.outcome === "denied" && s.trustDelta < 0) {
        setAlerts((prev) => [
          ...prev,
          `⚠ Policy violation: ${s.action} by ${AGENTS.find((a) => a.id === s.agent)?.name} — trust decayed to ${
            AGENTS.find((a) => a.id === s.agent)!.trust + STEPS.slice(0, step + 1).filter((x) => x.agent === s.agent).reduce((acc, x) => acc + x.trustDelta, 0)
          }`,
        ]);
      }
      if (s.outcome === "denied" && s.trustDelta === 0) {
        setAlerts((prev) => [
          ...prev,
          `⛔ Blocked: ${s.action} by ${AGENTS.find((a) => a.id === s.agent)?.name} — ${s.policyResult}`,
        ]);
      }
      timerRef.current = setTimeout(() => advanceStep(step + 1), 3000 / speed);
    },
    [speed]
  );

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      setPlaying(true);
      const next = currentStep < 0 ? 0 : currentStep + 1;
      if (next >= STEPS.length) {
        reset();
        setTimeout(() => {
          setPlaying(true);
          advanceStep(0);
        }, 100);
      } else {
        advanceStep(next);
      }
    }
  }, [playing, currentStep, advanceStep, reset]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // When speed changes while playing, restart the timer for the next step
  useEffect(() => {
    if (playing && currentStep >= 0 && currentStep < STEPS.length - 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => advanceStep(currentStep + 1), 3000 / speed);
    }
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50 bg-navy-900/80 backdrop-blur sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm">Vienna OS</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/demo/warrant" className="text-xs text-slate-400 hover:text-white transition">Warrant Demo</a>
          <a href="/try" className="text-xs text-slate-400 hover:text-white transition">Try API</a>
          <a href="/signup" className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-navy-700 bg-navy-800/50 text-[11px] text-slate-400 mb-4">
            <Eye className="w-3 h-3" /> Live Simulation
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            A Day at a <span className="text-amber-400">Governed Fintech</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm">
            Watch 3 AI agents operate under Vienna OS governance. Real policy enforcement,
            cryptographic warrants, trust scoring, and operator approvals — all in real time.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition font-semibold text-sm"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playing ? "Pause" : currentStep >= STEPS.length - 1 ? "Replay" : "Play Demo"}
          </button>
          <button onClick={reset} className="p-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-navy-700 transition" title="Reset">
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex items-center gap-1 bg-navy-800 border border-navy-700 rounded-xl p-1">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  speed === s ? "bg-navy-600 text-white" : "text-slate-500 hover:text-white"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-8">
          <MetricsBar {...metrics} />
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              trust={trusts[agent.id]}
              highlight={currentStep >= 0 && STEPS[currentStep]?.agent === agent.id}
            />
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-3 mb-8">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">
            Governance Timeline
          </h2>
          {STEPS.map((step, i) => {
            const active = i <= currentStep;
            const isCurrent = i === currentStep;
            const agent = AGENTS.find((a) => a.id === step.agent)!;
            const isExpanded = expandedStep === i;

            return (
              <div
                key={i}
                className={`rounded-xl border p-4 transition-all duration-500 cursor-pointer ${
                  isCurrent
                    ? `${agent.borderColor} ${agent.bgColor} shadow-lg`
                    : active
                    ? "border-navy-700 bg-navy-800/60"
                    : "border-navy-700/50 bg-navy-800/30 opacity-40"
                }`}
                onClick={() => {
                  if (active) setExpandedStep(isExpanded ? null : i);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0 mt-0.5">{agent.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${active ? agent.color : "text-slate-600"}`}>
                          {agent.name}
                        </span>
                        <TierBadge tier={step.tier} />
                        <span className="text-[10px] text-slate-500 font-mono">{step.timeLabel}</span>
                      </div>
                      <div className={`text-xs mt-1 ${active ? "text-slate-300" : "text-slate-600"}`}>
                        {step.description}
                      </div>
                      <div className={`text-[10px] mt-1 font-mono ${
                        active
                          ? step.outcome === "approved"
                            ? "text-emerald-400/80"
                            : "text-red-400/80"
                          : "text-slate-700"
                      }`}>
                        {step.policyResult}
                      </div>
                      <Pipeline stages={step.pipelineStages} animate={active} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {active && <OutcomeBadge outcome={step.outcome} />}
                    {active && step.warrantIssued && (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {active && (
                      <span className="text-slate-600">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && active && (
                  <div className="mt-4 pt-3 border-t border-navy-700/50 space-y-3 animate-fade-in">
                    <p className="text-xs text-slate-400 leading-relaxed">{step.detail}</p>
                    {step.warrantDetail && (
                      <div className="bg-navy-900/50 rounded-lg p-3 border border-navy-700/50">
                        <div className="text-[9px] text-amber-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Warrant
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{step.warrantDetail}</div>
                      </div>
                    )}
                    {step.trustDelta !== 0 && (
                      <div className={`text-[10px] font-mono ${step.trustDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        Trust: {step.trustDelta > 0 ? "+" : ""}{step.trustDelta} → {trusts[step.agent]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs text-red-400 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Alerts
            </h2>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2.5 text-xs text-red-300 font-mono"
                >
                  {alert}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo links */}
        <div className="mb-12 text-center">
          <a
            href="/demo/warrant"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition"
          >
            <Lock className="w-4 h-4" />
            Explore the Warrant Verification Demo →
          </a>
        </div>

        {/* CTA */}
        <div className="text-center py-12 border-t border-navy-700/50">
          <h2 className="text-2xl font-bold mb-3">
            This is what Vienna OS does for your agent fleet.
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
            Every action governed. Every decision audited. Every warrant cryptographically sealed.
            Start governing your AI agents today.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm"
            >
              Start Governing <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition text-sm border border-navy-700"
            >
              Read the Docs
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
