"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  FileText,
  CheckCircle,
  Zap,
  Activity,
  Users,
  Lock,
  Code2,
  Github,
  Star,
  ExternalLink,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import ScrollReveal from "@/components/ScrollReveal";
import FloatingContact from "@/components/FloatingContact";
import BackToTop from "@/components/BackToTop";
import SectionNav from "@/components/SectionNav";

/* ── Isolated Clock Component (avoids full-page re-render every second) ── */
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(
    new Date().toISOString().split(".")[0] + "Z"
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString().split(".")[0] + "Z");
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>utc: {currentTime}</span>;
}

/* ── Interactive Warrant Card (hero demo) ── */
function InteractiveWarrantCard() {
  const [ttl, setTtl] = useState(298);
  const [phase, setPhase] = useState<"active" | "approving" | "approved" | "denied">("active");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTtl((prev) => {
        if (prev <= 1) {
          setPhase("active");
          setShowDetails(false);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleApprove = () => {
    setPhase("approving");
    setTimeout(() => setPhase("approved"), 800);
  };

  const handleDeny = () => {
    setPhase("denied");
    setTimeout(() => {
      setPhase("active");
      setTtl(300);
    }, 2000);
  };

  return (
    <div className="w-full max-w-[520px] bg-black border border-amber-500/30 p-0 overflow-visible font-mono group hover:border-amber-500/50 transition-all relative z-10">
      {/* Header Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-500">
            EXECUTION_WARRANT
          </span>
        </div>
        <div className="text-[10px] text-zinc-600">ep_id: EP-OPS-3C19</div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Warrant Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-zinc-600 mb-1">warrant_serial</div>
            <div className="text-amber-500">WRT-7F3A-82B1-4D9E</div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">auth_status</div>
            <div className="flex items-center gap-2">
              {phase === "approved" ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">EXECUTED</span>
                </>
              ) : phase === "denied" ? (
                <span className="text-red-500">✗ DENIED</span>
              ) : phase === "approving" ? (
                <span className="text-amber-500 animate-pulse">SIGNING...</span>
              ) : (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">VERIFIED</span>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">risk_tier</div>
            <div className="text-amber-500">T2 (HUMAN_GATE)</div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">issued_at</div>
            <div className="text-zinc-400">2026-04-07T14:02:44Z</div>
          </div>
        </div>

        {/* Execution Context */}
        <div className="border-t border-amber-500/10 pt-4 space-y-3 text-xs">
          <div>
            <div className="text-zinc-600 mb-1">principal_agent</div>
            <div className="text-zinc-200">AGENT_SIGMA_V4</div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">action_scope</div>
            <div className="text-zinc-200">DB_SCHEMA_MIGRATION</div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">authorized_by</div>
            <div className="text-zinc-200">S. CHEN (VP ENG)</div>
          </div>
          <div>
            <div className="text-zinc-600 mb-1">target_env</div>
            <div className="text-amber-500">PRODUCTION_CLUSTER_01</div>
          </div>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left border-t border-amber-500/10 pt-3"
        >
          <div className="text-[10px] text-amber-500 hover:text-amber-400 transition flex items-center gap-1">
            {showDetails ? "▼" : "▶"} {showDetails ? "HIDE" : "SHOW"}_SIGNATURE_DETAILS
          </div>
        </button>

        {showDetails && (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-zinc-600 mb-2">
                ledger_root (SHA-256)
              </div>
              <div className="bg-zinc-900 border border-amber-500/20 p-3 text-[10px] text-amber-500 break-all leading-relaxed">
                0x7e3c2b1a00918e77a2d1f4e5c8b9a0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b19a
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div>
                <span className="text-zinc-600">hash_algo:</span>{" "}
                <span className="text-zinc-400">HMAC-SHA256</span>
              </div>
              <div>
                <span className="text-zinc-600">chain_depth:</span>{" "}
                <span className="text-zinc-400">847</span>
              </div>
              <div>
                <span className="text-zinc-600">prev_hash:</span>{" "}
                <span className="text-zinc-400">0x3a1f...9e2b</span>
              </div>
              <div>
                <span className="text-zinc-600">merkle_root:</span>{" "}
                <span className="text-zinc-400">verified ✓</span>
              </div>
            </div>
          </div>
        )}

        {/* Approve / Deny Buttons */}
        {phase === "active" && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApprove}
              className="flex-1 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-500 py-2 text-[10px] font-bold uppercase transition"
            >
              ✓ APPROVE_WARRANT
            </button>
            <button
              onClick={handleDeny}
              className="flex-1 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 py-2 text-[10px] font-bold uppercase transition"
            >
              ✗ DENY_WARRANT
            </button>
          </div>
        )}

        {phase === "approved" && (
          <div className="bg-green-500/10 border border-green-500/30 p-3 text-center">
            <div className="text-[10px] text-green-500 font-bold">✓ WARRANT_EXECUTED — AUDIT_TRAIL_WRITTEN</div>
          </div>
        )}

        {phase === "denied" && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 text-center">
            <div className="text-[10px] text-red-500 font-bold">✗ WARRANT_DENIED — ACTION_BLOCKED</div>
          </div>
        )}

        {/* TTL */}
        <div className="flex items-center justify-between text-[10px] text-zinc-600">
          <span>ttl_remaining: {ttl}s</span>
          <span className={ttl > 30 ? "text-green-500" : "text-amber-500"}>
            ● {ttl > 30 ? "ACTIVE" : "EXPIRING"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Newsletter Inline Signup ── */
function NewsletterInline() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok || res.status === 409) {
        setStatus("done");
        analytics.ctaClick("homepage_newsletter", "subscribe");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-green-500 text-xs font-mono">
        <CheckCircle className="w-4 h-4" />
        <span>SUBSCRIBED — you&apos;re on the list</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className="flex-1 bg-zinc-900 border border-amber-500/20 px-3 py-2 text-xs font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 transition"
        aria-label="Email for newsletter"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 text-xs font-mono font-bold uppercase transition disabled:opacity-50"
      >
        {status === "sending" ? "..." : "SUBSCRIBE"}
      </button>
    </form>
  );
}

/* ── Animated Pipeline Demo ── */
function AnimatedPipeline() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 9); // 0=idle, 1-8 = steps
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      label: "INTENT_SUBMIT",
      num: "[1/8]",
      desc: "Agent declares intended action",
      detail: "agent → API",
      color: "text-zinc-400",
    },
    {
      label: "POLICY_EVAL",
      num: "[2/8]",
      desc: "Engine evaluates against policies",
      detail: "11 operators",
      color: "text-amber-500",
    },
    {
      label: "RISK_TIER_ROUTE",
      num: "[3/8]",
      desc: "Classify T0-T3, route accordingly",
      detail: "auto | gate | halt",
      color: "text-amber-500",
    },
    {
      label: "PROPOSAL_CREATE",
      num: "[4/8]",
      desc: "Generate proposal for approvers",
      detail: "quorum defined",
      color: "text-zinc-400",
    },
    {
      label: "APPROVAL_GATE",
      num: "[5/8]",
      desc: "Human or policy approves / denies",
      detail: "M-of-N quorum",
      color: "text-amber-500",
    },
    {
      label: "WARRANT_ISSUE",
      num: "[6/8]",
      desc: "Cryptographic warrant signed",
      detail: "SHA-256 + TTL",
      color: "text-green-500",
    },
    {
      label: "EXECUTION",
      num: "[7/8]",
      desc: "Agent executes with warrant authority",
      detail: "scoped + bounded",
      color: "text-green-500",
    },
    {
      label: "AUDIT_CHAIN",
      num: "[8/8]",
      desc: "Immutable record written to ledger",
      detail: "HMAC-signed",
      color: "text-green-500",
    },
  ];

  return (
    <div>
      {/* Full pipeline flow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step, i) => {
          const isActive = activeStep === i + 1;
          const isDone = activeStep > i + 1 || (activeStep === 0);
          return (
            <div
              key={step.label}
              className={`bg-black border p-4 transition-all duration-500 ${
                isActive
                  ? "border-amber-500 shadow-lg shadow-amber-500/10"
                  : isDone
                  ? "border-amber-500/30"
                  : "border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-500/10">
                <span
                  className={`text-[9px] font-mono uppercase transition-colors font-bold ${
                    isActive ? "text-amber-400" : "text-amber-500/70"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[9px] font-mono text-zinc-700">
                  {step.num}
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mb-1">
                {step.desc}
              </div>
              <div className={`text-[10px] font-mono ${step.color}`}>
                {step.detail}
              </div>
              <div className="mt-2 pt-1 border-t border-amber-500/5">
                <span
                  className={`text-[9px] font-mono transition-colors ${
                    isActive
                      ? "text-amber-500 animate-pulse"
                      : isDone
                      ? "text-green-500/60"
                      : "text-zinc-700"
                  }`}
                >
                  {isActive ? "⟳ ACTIVE" : isDone ? "✓ DONE" : "○ PENDING"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture flow line */}
      <div className="mt-6 bg-black border border-amber-500/20 p-4">
        <div className="text-[10px] font-mono text-zinc-600 mb-2">FULL_PIPELINE_FLOW</div>
        <div className="text-[10px] font-mono text-amber-500/80 break-all leading-relaxed">
          Intent → Policy Eval → Risk Tier → Proposal → Approval → Warrant → Execution → Audit Chain
        </div>
      </div>
    </div>
  );
}

/* ── Live Stats (fetched from DB via API) ── */
function LiveStats() {
  const [stats, setStats] = useState({
    proposals: 94,
    warrants: 75,
    audit_events: 252,
    policies: 10,
  });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.proposals) setStats(data);
      })
      .catch(() => {});
  }, []);

  const fmt = (n: number) => (n < 1000 ? `${n}+` : `${(n / 1000).toFixed(1)}k`);

  return (
    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
      <div className="text-center py-3">
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
          {fmt(stats.proposals)}
        </div>
        <div className="text-[10px] font-mono text-zinc-600">
          proposals evaluated
        </div>
      </div>
      <div className="text-center py-3">
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
          {fmt(stats.warrants)}
        </div>
        <div className="text-[10px] font-mono text-zinc-600">
          warrants issued
        </div>
      </div>
      <div className="text-center py-3">
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
          {fmt(stats.audit_events)}
        </div>
        <div className="text-[10px] font-mono text-zinc-600">
          audit events logged
        </div>
      </div>
      <div className="text-center py-3">
        <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
          {fmt(stats.policies)}
        </div>
        <div className="text-[10px] font-mono text-zinc-600">
          active policies
        </div>
      </div>
    </div>
  );
}

/* ── Dynamic Blog Posts (fetched from API) ── */
function LatestBlogPosts() {
  const [posts, setPosts] = useState<
    { slug: string; title: string; category: string; readTime: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/blog/latest")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPosts(data);
      })
      .catch(() => {});
  }, []);

  if (posts.length === 0) {
    // Skeleton while loading
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-black border border-zinc-800 p-6 animate-pulse">
            <div className="h-3 bg-zinc-800 rounded w-20 mb-4" />
            <div className="h-4 bg-zinc-800 rounded w-full mb-2" />
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="bg-black border border-zinc-800 hover:border-amber-500/30 p-6 transition-all group"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800 group-hover:border-amber-500/20 transition">
            <span className="text-[10px] font-mono text-amber-500 uppercase">
              {post.category}
            </span>
            <span className="text-[10px] font-mono text-zinc-600">
              {post.readTime}
            </span>
          </div>
          <h3 className="text-sm font-mono font-bold text-zinc-300 group-hover:text-amber-500 transition leading-relaxed">
            {post.title}
          </h3>
        </Link>
      ))}
    </div>
  );
}

/* ── Error Boundary Wrapper ── */
function SafeRender({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (fallback || null) as React.ReactElement;
  }

  return (
    <div onError={() => setHasError(true)}>
      {children}
    </div>
  );
}

/* ── Interactive Policy Simulator ── */
function PolicySimulator() {
  const actions = [
    { id: "deploy_production", label: "deploy_production", risk: "high" },
    { id: "read_analytics", label: "read_analytics", risk: "low" },
    { id: "delete_records", label: "delete_records", risk: "critical" },
    { id: "schema_migration", label: "schema_migration", risk: "high" },
    { id: "send_notification", label: "send_notification", risk: "medium" },
  ];

  const envs = [
    { id: "staging", label: "staging" },
    { id: "production", label: "production" },
  ];

  const agents = ["deploy-bot-v3", "analytics-agent", "migration-bot", "ops-agent-alpha"];

  const [selectedAction, setSelectedAction] = useState(actions[0].id);
  const [selectedEnv, setSelectedEnv] = useState("production");
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [phase, setPhase] = useState<"idle" | "evaluating" | "policy" | "risk" | "gated" | "approved" | "denied" | "auto_approved" | "halted">("idle");
  const [evalStep, setEvalStep] = useState(0);
  const [policyLog, setPolicyLog] = useState<string[]>([]);

  const getRiskTier = () => {
    const action = actions.find(a => a.id === selectedAction);
    if (!action) return { tier: "T0", label: "AUTO_APPROVE", color: "text-green-500", borderColor: "border-green-500" };
    
    if (action.risk === "critical" && selectedEnv === "production") {
      return { tier: "T3", label: "STRICT_HALT", color: "text-red-500", borderColor: "border-red-500" };
    }
    if (action.risk === "high" && selectedEnv === "production") {
      return { tier: "T2", label: "HUMAN_GATE", color: "text-amber-500", borderColor: "border-amber-500" };
    }
    if (action.risk === "medium" || (action.risk === "high" && selectedEnv === "staging")) {
      return { tier: "T1", label: "POLICY_GATE", color: "text-blue-400", borderColor: "border-blue-400" };
    }
    return { tier: "T0", label: "AUTO_APPROVE", color: "text-green-500", borderColor: "border-green-500" };
  };

  const simulate = () => {
    setPhase("evaluating");
    setPolicyLog([]);
    setEvalStep(0);
    
    const riskInfo = getRiskTier();
    const logs: string[] = [];
    
    // Step 1: Intent received
    setTimeout(() => {
      logs.push(`> intent.received: ${selectedAction} → ${selectedEnv}`);
      setPolicyLog([...logs]);
      setEvalStep(1);
    }, 400);
    
    // Step 2: Policy eval
    setTimeout(() => {
      logs.push(`> policy.eval: matching against ${Math.floor(Math.random() * 3) + 8} active rules`);
      setPolicyLog([...logs]);
      setEvalStep(2);
      setPhase("policy");
    }, 1000);
    
    // Step 3: Risk classification
    setTimeout(() => {
      logs.push(`> risk.classify: action=${selectedAction} env=${selectedEnv} → ${riskInfo.tier}`);
      setPolicyLog([...logs]);
      setEvalStep(3);
      setPhase("risk");
    }, 1800);
    
    // Step 4: Route decision
    setTimeout(() => {
      if (riskInfo.tier === "T0") {
        logs.push(`> route: auto_approve — low risk, no gate required`);
        logs.push(`> warrant.issued: WRT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-SIM`);
        logs.push(`> execution.complete: ${selectedAction} → success`);
        logs.push(`> audit.written: SHA-256 hash recorded`);
        setPolicyLog([...logs]);
        setPhase("auto_approved");
      } else if (riskInfo.tier === "T3") {
        logs.push(`> route: strict_halt — destructive action on production`);
        logs.push(`> proposal.created: requires 3-of-5 quorum`);
        logs.push(`> ⚠ ACTION_HALTED — manual escalation required`);
        setPolicyLog([...logs]);
        setPhase("halted");
      } else if (riskInfo.tier === "T1") {
        logs.push(`> route: policy_gate — heuristic approval`);
        logs.push(`> heuristic.eval: agent=${selectedAgent} history=clean`);
        logs.push(`> auto_approved: policy conditions met`);
        logs.push(`> warrant.issued: WRT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-SIM`);
        setPolicyLog([...logs]);
        setPhase("auto_approved");
      } else {
        logs.push(`> route: human_gate — awaiting approval`);
        logs.push(`> proposal.created: pending human sign-off`);
        setPolicyLog([...logs]);
        setPhase("gated");
      }
      setEvalStep(4);
    }, 2600);
  };

  const handleApprove = () => {
    const logs = [...policyLog];
    logs.push(`> approval.granted: human sign-off received`);
    logs.push(`> warrant.issued: WRT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-SIM | ttl=300s`);
    logs.push(`> execution.start: ${selectedAction} with warrant authority`);
    logs.push(`> execution.complete: success | audit trail written`);
    setPolicyLog(logs);
    setPhase("approved");
  };

  const handleDeny = () => {
    const logs = [...policyLog];
    logs.push(`> approval.denied: action blocked`);
    logs.push(`> audit.written: denial recorded with reason`);
    setPolicyLog(logs);
    setPhase("denied");
  };

  const reset = () => {
    setPhase("idle");
    setPolicyLog([]);
    setEvalStep(0);
  };

  const riskInfo = getRiskTier();

  return (
    <div className="bg-black border border-amber-500/30 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-mono font-bold text-amber-500">POLICY_SIMULATOR</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">interactive demo</span>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Action selector */}
            <div>
              <div className="text-[10px] font-mono text-zinc-600 mb-2">ACTION_TYPE</div>
              <div className="grid grid-cols-1 gap-1.5">
                {actions.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAction(a.id); if (phase !== "idle") reset(); }}
                    className={`text-left px-3 py-2 text-xs font-mono border transition-all ${
                      selectedAction === a.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-500"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    <span>{a.label}</span>
                    <span className={`ml-2 text-[9px] ${
                      a.risk === "critical" ? "text-red-500" : 
                      a.risk === "high" ? "text-amber-500" :
                      a.risk === "medium" ? "text-blue-400" : "text-green-500"
                    }`}>
                      [{a.risk}]
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Environment */}
            <div>
              <div className="text-[10px] font-mono text-zinc-600 mb-2">TARGET_ENV</div>
              <div className="flex gap-2">
                {envs.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEnv(e.id); if (phase !== "idle") reset(); }}
                    className={`flex-1 px-3 py-2 text-xs font-mono border transition-all ${
                      selectedEnv === e.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-500"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent */}
            <div>
              <div className="text-[10px] font-mono text-zinc-600 mb-2">AGENT_IDENTITY</div>
              <select
                value={selectedAgent}
                onChange={(e) => { setSelectedAgent(e.target.value); if (phase !== "idle") reset(); }}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-mono text-zinc-400 focus:border-amber-500/50 focus:outline-none transition"
              >
                {agents.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Predicted risk tier */}
            <div className={`border ${riskInfo.borderColor}/30 bg-black p-3`}>
              <div className="text-[10px] font-mono text-zinc-600 mb-1">PREDICTED_RISK_TIER</div>
              <div className="flex items-center gap-3">
                <span className={`text-lg font-mono font-bold ${riskInfo.color}`}>{riskInfo.tier}</span>
                <span className={`text-xs font-mono ${riskInfo.color}`}>{riskInfo.label}</span>
              </div>
            </div>

            {/* Submit / Reset */}
            {phase === "idle" ? (
              <button
                onClick={simulate}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-3 text-xs font-mono font-bold uppercase transition"
              >
                ▶ SUBMIT_INTENT
              </button>
            ) : (
              <button
                onClick={reset}
                className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 py-3 text-xs font-mono font-bold uppercase transition"
              >
                ↺ RESET_SIMULATION
              </button>
            )}
          </div>

          {/* Right: Live output */}
          <div className="bg-zinc-950 border border-zinc-800 p-4 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-600">EVAL_OUTPUT</span>
              <span className={`text-[10px] font-mono ${phase === "idle" ? "text-zinc-700" : "text-amber-500"}`}>
                {phase === "idle" ? "○ READY" : phase === "evaluating" || phase === "policy" || phase === "risk" ? "⟳ EVALUATING" : "● COMPLETE"}
              </span>
            </div>
            
            {/* Pipeline progress bar */}
            <div className="flex gap-1 mb-4">
              {["INTENT", "POLICY", "RISK", "ROUTE"].map((step, i) => (
                <div key={step} className="flex-1">
                  <div className={`h-1 transition-all duration-500 ${
                    evalStep > i ? "bg-amber-500" : evalStep === i ? "bg-amber-500 animate-pulse" : "bg-zinc-800"
                  }`} />
                  <div className={`text-[8px] font-mono mt-1 ${
                    evalStep > i ? "text-amber-500" : evalStep === i ? "text-amber-500" : "text-zinc-700"
                  }`}>
                    {step}
                  </div>
                </div>
              ))}
            </div>

            {/* Log output */}
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px]">
              {policyLog.length === 0 && (
                <div className="text-zinc-700 text-[10px]">
                  // select parameters and click SUBMIT_INTENT to begin simulation
                </div>
              )}
              {policyLog.map((line, i) => (
                <div key={i} className={`${
                  line.includes("⚠") ? "text-red-500" :
                  line.includes("success") || line.includes("approved") || line.includes("issued") ? "text-green-500" :
                  line.includes("denied") || line.includes("HALTED") ? "text-red-500" :
                  line.includes("classify") || line.includes("route") ? "text-amber-500" :
                  "text-zinc-400"
                } leading-relaxed`}>
                  {line}
                </div>
              ))}
              {(phase === "evaluating" || phase === "policy" || phase === "risk") && (
                <span className="text-amber-500 animate-pulse">▌</span>
              )}
            </div>

            {/* Approve/Deny buttons for gated scenarios */}
            {phase === "gated" && (
              <div className="flex gap-3 mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-500 py-2 text-[10px] font-mono font-bold uppercase transition"
                >
                  ✓ APPROVE
                </button>
                <button
                  onClick={handleDeny}
                  className="flex-1 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-500 py-2 text-[10px] font-mono font-bold uppercase transition"
                >
                  ✗ DENY
                </button>
              </div>
            )}

            {/* Result badges */}
            {phase === "auto_approved" && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="bg-green-500/10 border border-green-500/30 p-2 text-center text-[10px] font-mono text-green-500 font-bold">
                  ✓ AUTO_APPROVED — WARRANT_ISSUED — EXECUTION_COMPLETE
                </div>
              </div>
            )}
            {phase === "approved" && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="bg-green-500/10 border border-green-500/30 p-2 text-center text-[10px] font-mono text-green-500 font-bold">
                  ✓ HUMAN_APPROVED — WARRANT_SIGNED — AUDIT_RECORDED
                </div>
              </div>
            )}
            {phase === "denied" && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="bg-red-500/10 border border-red-500/30 p-2 text-center text-[10px] font-mono text-red-500 font-bold">
                  ✗ DENIED — ACTION_BLOCKED — DENIAL_LOGGED
                </div>
              </div>
            )}
            {phase === "halted" && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="bg-red-500/10 border border-red-500/30 p-2 text-center text-[10px] font-mono text-red-500 font-bold">
                  ⚠ STRICT_HALT — REQUIRES_ESCALATION — 3-OF-5_QUORUM
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Alias for compatibility ── */
const RevealSection = ScrollReveal;

export default function Home() {
  useEffect(() => {
    analytics.page("Homepage");
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Accessible H1 for SEO */}
      <h1 className="sr-only">
        Vienna OS — Governance Kernel for Autonomous AI Operations with Signed
        Warrants
      </h1>

      {/* Terminal Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      ></div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-50">
        <SiteNav />

        {/* Coordinate/UTC Bar — hidden on mobile */}
        <div className="hidden sm:block bg-black/90 backdrop-blur-sm border-b border-amber-500/20 px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-mono text-zinc-600">
            <div className="flex items-center gap-6">
              <span>lat: 40.7128°N</span>
              <span>lon: -74.0060°W</span>
              <span>grid: 32x32px</span>
            </div>
            <div className="flex items-center gap-6">
              <LiveClock />
              <span className="text-amber-500">● LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1" id="main-content">
        {/* ═══════════════════ HERO ═══════════════════ */}
        <section id="hero" className="pt-16 sm:pt-20 pb-24 sm:pb-32 px-6 relative z-20 overflow-visible">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Text */}
            <div className="space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                  SYSTEM_STATUS: OPERATIONAL
                </span>
              </div>

              <div
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight leading-tight break-words"
                aria-hidden="true"
              >
                <span className="text-amber-500">
                  GOVERN_AUTONOMOUS
                  <br className="hidden sm:block" />
                  _AI_OPERATIONS
                </span>
                <br />
                <span className="text-zinc-500">/ WITH_SIGNED_WARRANTS</span>
              </div>

              <p className="text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed font-mono">
                Infrastructure-grade execution control plane. Issue
                cryptographic warrants for AI agent operations. Immutable audit
                trails. Zero-trust authorization.
              </p>

              <div className="flex flex-wrap gap-4">
                <a
                  href="https://console.regulator.ai/signup"
                  className="bg-amber-500 hover:bg-amber-400 text-black px-6 sm:px-8 py-3 sm:py-4 font-mono font-bold flex items-center gap-2 transition-all group uppercase text-sm"
                >
                  GENERATE_WARRANT →
                  <span className="text-[10px] font-normal opacity-70 hidden sm:inline">
                    (free trial)
                  </span>
                </a>
                <Link
                  href="/docs"
                  className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-6 sm:px-8 py-3 sm:py-4 font-mono font-bold transition-all uppercase text-sm"
                >
                  VIEW_SPEC
                </Link>
              </div>

              {/* Hero Stats — responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-amber-500/10">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">
                    target_p99
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-amber-500">
                    &lt;50ms
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">
                    audit_algo
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-amber-500">
                    SHA-256
                  </div>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">
                    arch_model
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-amber-500">
                    ZeroTrust
                  </div>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="pt-6 border-t border-amber-500/10">
                <div className="text-xs font-mono text-zinc-600 uppercase mb-3">
                  Pricing Tier
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-white">
                    $0
                  </span>
                  <span className="text-sm font-mono text-zinc-500">
                    /mo — community edition (5 agents)
                  </span>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs font-mono text-amber-500 hover:text-amber-400 underline mt-2 inline-block"
                >
                  view_full_pricing →
                </Link>
              </div>
            </div>

            {/* Right Column: Interactive Warrant Card */}
            <div className="relative lg:block flex justify-center z-10">
              <InteractiveWarrantCard />
            </div>
          </div>
        </section>

        {/* ═══════════════════ SOCIAL PROOF (compact bar) ═══════════════════ */}
        <div className="py-6 px-6 border-y border-amber-500/10 bg-black/50 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              <div className="flex items-center gap-3 px-4 py-2 border border-zinc-800 bg-black/50">
                <span className="text-sm font-mono text-amber-500 font-bold">ai.ventures</span>
                <span className="text-[10px] font-mono text-zinc-600">30+ AI products</span>
              </div>
              <a
                href="https://github.com/risk-ai/regulatorai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 border border-zinc-800 bg-black/50 hover:border-amber-500/30 transition-all"
              >
                <Github className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-mono text-zinc-400">risk-ai/regulatorai</span>
                <Star className="w-3 h-3 text-amber-500" />
                <span className="text-xs font-mono text-amber-500">Open Source</span>
              </a>
              <div className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-black/50">
                <Shield className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-mono text-zinc-400">BSL-1.1</span>
              </div>
            </div>
            <SafeRender>
              <LiveStats />
            </SafeRender>
          </div>
        </div>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <RevealSection>
          <section id="pipeline" className="py-24 px-6 border-t border-amber-500/10" aria-label="Execution Pipeline">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  EXECUTION_PIPELINE
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  intent → policy → risk tier → proposal → approval → warrant → execute → audit
                </p>
              </div>

              <AnimatedPipeline />
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ SYSTEM ARCHITECTURE (merged arch + capabilities + compliance) ═══════════════════ */}
        <RevealSection>
          <section id="architecture" className="py-24 px-6 bg-black/30 border-y border-amber-500/10" aria-label="System Architecture">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  SYSTEM_ARCHITECTURE
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  infrastructure-grade governance — every layer purpose-built for autonomous AI operations
                </p>
              </div>

              {/* Interactive Architecture Diagram with hover states */}
              <div className="bg-black border border-amber-500/30 p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-6 pb-2 border-b border-amber-500/20 flex items-center justify-between">
                  <span>ARCHITECTURE_OVERVIEW</span>
                  <span className="text-amber-500">hover layers for details</span>
                </div>

                {/* Animated data flow line */}
                <div className="absolute left-1/2 top-[120px] bottom-[40px] w-px bg-gradient-to-b from-amber-500/0 via-amber-500/40 to-amber-500/0 hidden sm:block" />

                <div className="space-y-4 font-mono text-[11px] relative">
                  {/* Agent Layer */}
                  <div className="group flex items-stretch gap-3 transition-all hover:scale-[1.01]">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2 group-hover:text-zinc-400 transition">AGENT_LAYER</div>
                    <div className="flex-1 border border-zinc-700 bg-zinc-900/50 p-3 group-hover:border-zinc-500 group-hover:bg-zinc-900/80 transition-all">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700 group-hover:border-amber-500/30 transition">Agent A</span>
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700 group-hover:border-amber-500/30 transition">Agent B</span>
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700 group-hover:border-amber-500/30 transition">Agent N</span>
                        <span className="text-zinc-600 px-2 py-0.5">→ submit intents via SDK</span>
                      </div>
                      {/* Expanded detail on hover */}
                      <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100">
                        <div className="pt-2 mt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                          Python, Node.js, GitHub Actions, Terraform — any agent submits structured intents
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1 animate-pulse">│ REST / WebSocket / SSE │</div>
                  </div>

                  {/* API Gateway */}
                  <div className="group flex items-stretch gap-3 transition-all hover:scale-[1.01]">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2 group-hover:text-amber-500/70 transition">API_GATEWAY</div>
                    <div className="flex-1 border border-amber-500/30 bg-amber-500/5 p-3 group-hover:border-amber-500/60 group-hover:shadow-lg group-hover:shadow-amber-500/5 transition-all">
                      <div className="flex flex-wrap gap-4">
                        <div><span className="text-amber-500">auth:</span> <span className="text-zinc-400">API key + JWT</span></div>
                        <div><span className="text-amber-500">rate_limit:</span> <span className="text-zinc-400">per-tenant</span></div>
                        <div><span className="text-amber-500">protocol:</span> <span className="text-zinc-400">REST + SSE streaming</span></div>
                      </div>
                      <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100">
                        <div className="pt-2 mt-2 border-t border-amber-500/10 text-[10px] text-zinc-500">
                          Multi-tenant isolation, scoped API keys, real-time event streaming for approval workflows
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">▼</div>
                  </div>

                  {/* Governance Kernel — the core */}
                  <div className="group flex items-stretch gap-3 transition-all hover:scale-[1.01]">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0 text-right text-amber-500 py-2 font-bold">GOVERNANCE<br/>KERNEL</div>
                    <div className="flex-1 border-2 border-amber-500/50 bg-amber-500/5 p-4 group-hover:border-amber-500/80 group-hover:shadow-lg group-hover:shadow-amber-500/10 transition-all">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="border border-amber-500/20 p-3 group-hover:bg-amber-500/5 transition">
                          <div className="text-amber-500 text-[10px] mb-1 font-bold">POLICY_ENGINE</div>
                          <div className="text-zinc-500 text-[10px]">11 operators, priority-ordered eval</div>
                          <div className="text-zinc-600 text-[9px] mt-1">latency: &lt;50ms p99</div>
                        </div>
                        <div className="border border-amber-500/20 p-3 group-hover:bg-amber-500/5 transition">
                          <div className="text-amber-500 text-[10px] mb-1 font-bold">RISK_ROUTER</div>
                          <div className="text-zinc-500 text-[10px]">T0-T3 classification, auto-route</div>
                          <div className="text-zinc-600 text-[9px] mt-1">auto | gate | halt</div>
                        </div>
                        <div className="border border-amber-500/20 p-3 group-hover:bg-amber-500/5 transition">
                          <div className="text-amber-500 text-[10px] mb-1 font-bold">WARRANT_AUTHORITY</div>
                          <div className="text-zinc-500 text-[10px]">HMAC-SHA256 signed, TTL-bounded</div>
                          <div className="text-zinc-600 text-[9px] mt-1">scope-restricted</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">▼</div>
                  </div>

                  {/* Execution + Audit Layer */}
                  <div className="group flex items-stretch gap-3 transition-all hover:scale-[1.01]">
                    <div className="hidden sm:block w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2 group-hover:text-zinc-400 transition">EXECUTION<br/>+ AUDIT</div>
                    <div className="flex-1 border border-zinc-700 bg-zinc-900/50 p-3 group-hover:border-zinc-500 transition-all">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">●</span>
                          <span className="text-zinc-400">M-of-N approval quorum</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">●</span>
                          <span className="text-zinc-400">Scoped warrant execution</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">●</span>
                          <span className="text-zinc-400">Anomaly detection + alerting</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">●</span>
                          <span className="text-zinc-400">HMAC-signed immutable audit log</span>
                        </div>
                      </div>
                      <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100">
                        <div className="pt-2 mt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                          PostgreSQL (Neon) data layer with configurable retention, dead letter queue, real-time SSE events
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom row: Deployment + Compliance (compact) */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2 font-bold">DEPLOY_CLOUD</div>
                  <div className="text-[10px] font-mono text-zinc-500">Vercel + Neon — serverless, zero-ops</div>
                </div>
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2 font-bold">DEPLOY_SELF_HOST</div>
                  <div className="text-[10px] font-mono text-zinc-500">Docker Compose — your infra, your data</div>
                </div>
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2 font-bold">DEPLOY_HYBRID</div>
                  <div className="text-[10px] font-mono text-zinc-500">Cloud control + on-prem execution</div>
                </div>
                {/* Compliance — single compact box */}
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2 font-bold">COMPLIANCE_READY</div>
                  <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
                    <span className="text-zinc-400 px-1.5 py-0.5 border border-zinc-700">SOC2</span>
                    <span className="text-zinc-400 px-1.5 py-0.5 border border-zinc-700">GDPR</span>
                    <span className="text-zinc-400 px-1.5 py-0.5 border border-zinc-700">ISO27001</span>
                    <span className="text-zinc-400 px-1.5 py-0.5 border border-zinc-700">HIPAA</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-600 mt-1.5">audit trail → compliance mapping</div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ RISK TIER MATRIX ═══════════════════ */}
        <RevealSection>
          <section id="risk" className="py-24 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  RISK_TIER_MATRIX
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  classify → route → enforce → verify
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* T0 */}
                <div className="bg-black border border-zinc-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                    <span className="text-xs font-mono text-green-500">T0</span>
                    <Zap className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="text-zinc-400 mb-3">AUTO_APPROVE</div>
                    <div>
                      <span className="text-zinc-600">latency:</span>{" "}
                      <span className="text-green-500">&lt;5ms</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">scope:</span>{" "}
                      <span className="text-zinc-400">read_only</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">audit:</span>{" "}
                      <span className="text-zinc-400">log_only</span>
                    </div>
                  </div>
                </div>

                {/* T1 */}
                <div className="bg-black border border-zinc-700 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                    <span className="text-xs font-mono text-green-500">T1</span>
                    <Activity className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="text-zinc-400 mb-3">POLICY_GATE</div>
                    <div>
                      <span className="text-zinc-600">max_ttl:</span>{" "}
                      <span className="text-green-500">1h</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">scope:</span>{" "}
                      <span className="text-zinc-400">staging</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">approval:</span>{" "}
                      <span className="text-zinc-400">heuristic</span>
                    </div>
                  </div>
                </div>

                {/* T2 — Highlighted */}
                <div className="bg-amber-500/5 border border-amber-500/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">T2</span>
                    <Users className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="text-amber-500 mb-3">HUMAN_GATE</div>
                    <div>
                      <span className="text-zinc-600">max_ttl:</span>{" "}
                      <span className="text-amber-500">30m</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">targets:</span>{" "}
                      <span className="text-amber-500">prod (write)</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">mode:</span>{" "}
                      <span className="text-amber-500">break-glass</span>
                    </div>
                  </div>
                </div>

                {/* T3 */}
                <div className="bg-black border border-red-900/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-900/20">
                    <span className="text-xs font-mono text-red-500">T3</span>
                    <Lock className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="space-y-2 text-[11px] font-mono">
                    <div className="text-red-500 mb-3">STRICT_HALT</div>
                    <div>
                      <span className="text-zinc-600">quorum:</span>{" "}
                      <span className="text-red-500">3-of-5</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">scope:</span>{" "}
                      <span className="text-red-500">destructive</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">rollback:</span>{" "}
                      <span className="text-zinc-400">mandatory</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ USE CASES + SOCIAL PROOF (merged) ═══════════════════ */}
        <RevealSection>
          <section id="use-cases" className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  DEPLOYMENTS + USE_CASES
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  real production deployments — devops | compliance | executive
                </p>
              </div>

              {/* Case Study (moved from social proof) */}
              <div className="bg-black border border-amber-500/30 p-6 mb-8">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-500 uppercase">DEPLOYMENT_CASE_STUDY</span>
                  <span className="text-[10px] font-mono text-zinc-600">production since 2026-03</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-amber-500/10">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-600">org</div>
                    <div className="text-xs font-mono text-amber-500 font-bold">ai.ventures</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-zinc-600">governed_agents</div>
                    <div className="text-xs font-mono text-amber-500 font-bold">20+</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-zinc-600">products</div>
                    <div className="text-xs font-mono text-amber-500 font-bold">30+ AI sites</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-zinc-600">key_deployment</div>
                    <div className="text-xs font-mono text-amber-500 font-bold">law.ai</div>
                  </div>
                </div>

                <blockquote className="text-sm font-mono text-zinc-300 leading-relaxed mb-4">
                  &quot;We run 20+ autonomous agents across our portfolio — law.ai, biography.ai,
                  corporate.ai, and dozens more. Before Vienna OS, an agent deployed a breaking
                  schema migration to production at 3 AM with zero approval. That can&apos;t happen
                  anymore. Every prod write requires a T2 warrant with human sign-off.&quot;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-xs font-mono text-amber-500 font-bold">WA</span>
                  </div>
                  <div>
                    <div className="text-xs font-mono text-zinc-300 font-bold">Whit Anderson</div>
                    <div className="text-[10px] font-mono text-zinc-600">CEO, ai.ventures</div>
                  </div>
                </div>
              </div>

              {/* Use case cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* DevOps Lead */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">DEVOPS_LEAD</span>
                    <Code2 className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="text-zinc-400 mb-3">role: infrastructure automation</div>
                    <div><span className="text-zinc-600">challenge:</span>{" "}<span className="text-red-500">agents deploy prod w/o oversight</span></div>
                    <div><span className="text-zinc-600">solution:</span>{" "}<span className="text-green-500">T2 gate on prod writes</span></div>
                    <div><span className="text-zinc-600">result:</span>{" "}<span className="text-zinc-400">0 unauthorized deployments</span></div>
                    <div className="pt-3 border-t border-amber-500/10 text-[10px] text-zinc-600">
                      <span className="text-amber-500 font-bold">law.ai</span> — legal research agents, doc analysis
                    </div>
                  </div>
                </div>

                {/* Compliance Officer */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">COMPLIANCE_OFFICER</span>
                    <Shield className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="text-zinc-400 mb-3">role: regulatory audit</div>
                    <div><span className="text-zinc-600">challenge:</span>{" "}<span className="text-red-500">no audit trail for AI decisions</span></div>
                    <div><span className="text-zinc-600">solution:</span>{" "}<span className="text-green-500">SHA-256 signed warrants</span></div>
                    <div><span className="text-zinc-600">result:</span>{" "}<span className="text-zinc-400">audit-ready in weeks, not months</span></div>
                    <div className="pt-3 border-t border-amber-500/10 text-[10px] text-zinc-600">
                      <span className="text-amber-500 font-bold">biography.ai</span> — content gen, media processing
                    </div>
                  </div>
                </div>

                {/* CTO */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">CTO</span>
                    <Activity className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="text-zinc-400 mb-3">role: technical strategy</div>
                    <div><span className="text-zinc-600">challenge:</span>{" "}<span className="text-red-500">scale agents w/o losing control</span></div>
                    <div><span className="text-zinc-600">solution:</span>{" "}<span className="text-green-500">policy-based auto-approval</span></div>
                    <div><span className="text-zinc-600">result:</span>{" "}<span className="text-zinc-400">govern at scale, not at the expense of speed</span></div>
                    <div className="pt-3 border-t border-amber-500/10 text-[10px] text-zinc-600">
                      <span className="text-amber-500 font-bold">corporate.ai</span> — vendor scoring, marketplace ops
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ SDK INSTALLATION ═══════════════════ */}
        <RevealSection>
          <section id="sdk" className="py-24 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  SDK_INSTALLATION
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  npm | pip | github-actions | terraform
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Install + Code Example */}
                <div className="space-y-4">
                  <div className="bg-black border border-amber-500/30 p-6">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                      <span className="text-[10px] font-mono text-amber-500">
                        INSTALL
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">
                        npm | pip
                      </span>
                    </div>
                    <div className="space-y-2 font-mono text-sm text-zinc-400">
                      <div>
                        <span className="text-green-500">$</span> npm install @vienna-os/sdk
                      </div>
                      <div>
                        <span className="text-green-500">$</span> pip install vienna-os
                      </div>
                    </div>
                  </div>

                  {/* Real code example */}
                  <div className="bg-black border border-amber-500/30 p-6">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                      <span className="text-[10px] font-mono text-amber-500">
                        USAGE_EXAMPLE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">
                        node.js
                      </span>
                    </div>
                    <pre className="font-mono text-[11px] text-zinc-400 leading-relaxed overflow-x-auto">
{`import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY
});

// Submit intent — Vienna evaluates policy,
// routes by risk tier, gates if needed
const result = await vienna.intent.submit({
  action: 'deploy_production',
  agent:  'deploy-bot-v3',
  payload: { service: 'api-gateway' }
});

if (result.warrant) {
  // Warrant issued — execute with authority
  await deployService(result.warrant.id);
  await vienna.execution.complete(
    result.warrant.id,
    { status: 'success' }
  );
}`}
                    </pre>
                  </div>

                  <Link
                    href="/docs/getting-started"
                    className="flex items-center gap-2 text-xs font-mono text-amber-500 hover:text-amber-400 transition-all pl-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    full integration guide →
                  </Link>
                </div>

                {/* Right: Framework Support */}
                <div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase mb-4">
                    FRAMEWORK_SUPPORT
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "GitHub Actions",
                      "Terraform",
                      "LangChain",
                      "CrewAI",
                    ].map((tool) => (
                      <div
                        key={tool}
                        className="px-4 py-3 bg-black border border-zinc-700 flex items-center justify-center font-mono text-xs text-zinc-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
                      >
                        {tool}
                      </div>
                    ))}
                  </div>

                  {/* Python example too */}
                  <div className="mt-4 bg-black border border-amber-500/30 p-6">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                      <span className="text-[10px] font-mono text-amber-500">
                        PYTHON
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">
                        3 lines to govern
                      </span>
                    </div>
                    <pre className="font-mono text-[11px] text-zinc-400 leading-relaxed overflow-x-auto">
{`from vienna_os import ViennaClient

vienna = ViennaClient(api_key=os.environ["VIENNA_API_KEY"])

result = vienna.intent.submit(
    action="db_migration",
    agent="migration-bot",
    payload={"target": "production"}
)`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ BEFORE / AFTER SCENARIO ═══════════════════ */}
        <RevealSection>
          <section id="analysis" className="py-24 px-6 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  BEFORE_AFTER
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  real incident at ai.ventures — before and after Vienna OS deployment
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* BEFORE */}
                <div className="bg-black border border-red-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-500/20">
                    <span className="text-xs font-mono text-red-500">
                      BEFORE_VIENNA_OS
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      ai.ventures — pre-March 2026
                    </span>
                  </div>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div className="text-zinc-400">incident:</div>
                      <div className="pl-4 space-y-1 text-zinc-500">
                        <div>03:14 - agent deploys schema migration to prod</div>
                        <div>03:15 - site goes down — breaking change</div>
                        <div>03:47 - team paged, investigation begins</div>
                        <div>04:23 - manual rollback initiated</div>
                        <div>04:58 - service restored</div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-red-500/10">
                      <div>
                        <span className="text-zinc-600">downtime:</span>{" "}
                        <span className="text-red-500">104 minutes</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">approval:</span>{" "}
                        <span className="text-red-500">none — agent acted autonomously</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">audit_trail:</span>{" "}
                        <span className="text-red-500">no record of who authorized</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AFTER */}
                <div className="bg-black border border-green-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-green-500/20">
                    <span className="text-xs font-mono text-green-500">
                      WITH_VIENNA_OS
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      ai.ventures — since March 2026
                    </span>
                  </div>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="space-y-2">
                      <div className="text-zinc-400">same scenario, governed:</div>
                      <div className="pl-4 space-y-1 text-zinc-500">
                        <div>10:22 - agent requests prod migration</div>
                        <div>10:22 - Vienna policy eval → T2 HUMAN_GATE</div>
                        <div>10:26 - engineer reviews + approves warrant</div>
                        <div>10:27 - migration executes with warrant authority</div>
                        <div>10:29 - success, SHA-256 audit record written</div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-green-500/10">
                      <div>
                        <span className="text-zinc-600">downtime:</span>{" "}
                        <span className="text-green-500">0 — human reviewed first</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">approval:</span>{" "}
                        <span className="text-green-500">warrant-signed, time-bounded</span>
                      </div>
                      <div>
                        <span className="text-zinc-600">audit_trail:</span>{" "}
                        <span className="text-green-500">cryptographic, immutable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-amber-500/5 border border-amber-500/30 p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs font-mono text-center">
                  <div>
                    <div className="text-amber-500 text-xl sm:text-2xl font-bold mb-1">
                      100%
                    </div>
                    <div className="text-zinc-600">
                      unauthorized deploys blocked
                    </div>
                  </div>
                  <div>
                    <div className="text-amber-500 text-xl sm:text-2xl font-bold mb-1">
                      4min
                    </div>
                    <div className="text-zinc-600">avg_approval_time</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-amber-500 text-xl sm:text-2xl font-bold mb-1">
                      $0
                    </div>
                    <div className="text-zinc-600">incident_cost (governed)</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ PROTOCOL SPEC ═══════════════════ */}
        <RevealSection>
          <section id="protocol" className="py-24 px-6 border-t border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  PROTOCOL_SPEC
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  open_warrant_standard v1.0
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-500 mb-2">
                      &lt;50ms
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase">
                      target_p99_latency
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-zinc-500">
                    <div>sub-second policy eval</div>
                    <div>no governance bottleneck</div>
                    <div>
                      <Link
                        href="/docs/api-reference"
                        className="text-amber-500 hover:text-amber-400"
                      >
                        view benchmarks →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-500 mb-2">
                      SHA-256
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase">
                      audit_hash
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-zinc-500">
                    <div>cryptographic signatures</div>
                    <div>tamper-evident trail</div>
                    <div>hash-chain integrity</div>
                  </div>
                </div>

                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                    <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-500 mb-2">
                      0-Trust
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase">
                      arch_model
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-zinc-500">
                    <div>explicit authorization</div>
                    <div>no implicit grants</div>
                    <div>no ambient authority</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ POLICY SIMULATOR (interactive) ═══════════════════ */}
        <RevealSection>
          <section id="simulator" className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  POLICY_SIMULATOR
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  try it yourself — submit an intent, watch the governance pipeline evaluate in real time
                </p>
              </div>

              <PolicySimulator />
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ BOTTOM CTA ═══════════════════ */}
        <RevealSection>
          <section id="cta" className="py-24 sm:py-32 border-t border-amber-500/10">
            <div className="max-w-4xl mx-auto px-6">
              <div className="bg-black border border-amber-500/30 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-500/20">
                  <Code2 className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-mono text-amber-500 uppercase">
                    DEPLOY_GOVERNANCE
                  </span>
                </div>

                <h2 className="text-xl sm:text-3xl font-mono font-bold tracking-tight mb-4 text-white">
                  <span className="text-amber-500">$</span> vienna-os init
                  --tier production
                </h2>

                <p className="text-sm font-mono text-zinc-500 mb-8">
                  integrate warrant protocol into agentic infrastructure (python
                  | node | rust)
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="https://console.regulator.ai/signup"
                    className="flex-1 px-8 py-4 bg-amber-500 text-black font-mono font-bold hover:bg-amber-400 transition-all text-center uppercase text-sm"
                  >
                    GENERATE_WARRANT →
                  </a>
                  <Link
                    href="/docs/getting-started"
                    className="flex-1 px-8 py-4 bg-black border border-amber-500/30 text-amber-500 font-mono font-bold hover:border-amber-500 transition-all text-center uppercase text-sm"
                  >
                    QUICKSTART_GUIDE
                  </Link>
                </div>

                <div className="mt-6 pt-4 border-t border-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-600">
                  <span>community_tier: 5 agents, full pipeline</span>
                  <span>setup_time: &lt;5min</span>
                </div>
              </div>

              {/* Explore more links */}
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-mono">
                <Link
                  href="/blog"
                  className="text-zinc-500 hover:text-amber-500 transition-all"
                >
                  /blog
                </Link>
                <Link
                  href="/compare"
                  className="text-zinc-500 hover:text-amber-500 transition-all"
                >
                  /compare
                </Link>
                <Link
                  href="/about"
                  className="text-zinc-500 hover:text-amber-500 transition-all"
                >
                  /about
                </Link>
                <Link
                  href="/enterprise"
                  className="text-zinc-500 hover:text-amber-500 transition-all"
                >
                  /enterprise
                </Link>
                <a
                  href="https://github.com/risk-ai/regulatorai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-amber-500 transition-all"
                >
                  /github
                </a>
              </div>
            </div>
          </section>
        </RevealSection>
        {/* ═══════════════════ LATEST FROM BLOG ═══════════════════ */}
        <RevealSection>
          <section className="py-24 px-6 border-t border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-amber-500">
                    LATEST_DISPATCHES
                  </h2>
                  <p className="text-zinc-500 font-mono text-sm mt-2">
                    governance insights + engineering deep-dives
                  </p>
                </div>
                <Link
                  href="/blog"
                  className="hidden sm:flex items-center gap-2 text-xs font-mono text-amber-500 hover:text-amber-400 transition"
                >
                  VIEW_ALL →
                </Link>
              </div>

              <LatestBlogPosts />

              <div className="mt-6 sm:hidden">
                <Link
                  href="/blog"
                  className="text-xs font-mono text-amber-500 hover:text-amber-400 transition"
                >
                  VIEW_ALL_DISPATCHES →
                </Link>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ NEWSLETTER ═══════════════════ */}
        <RevealSection>
          <section className="py-16 px-6 border-t border-amber-500/10 bg-black/50">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                  DISPATCH_SUBSCRIBE
                </span>
              </div>
              <p className="text-sm font-mono text-zinc-400 mb-6">
                AI governance updates, release notes, and compliance insights.
                No spam.
              </p>
              <div className="flex justify-center">
                <NewsletterInline />
              </div>
            </div>
          </section>
        </RevealSection>
      </main>

      <SectionNav />
      <FloatingContact />
      <BackToTop />
      <SiteFooter />
    </div>
  );
}
