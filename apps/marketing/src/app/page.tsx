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
    <div className="w-full max-w-[520px] bg-black border border-amber-500/30 p-0 overflow-hidden font-mono group hover:border-amber-500/50 transition-all">
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
        <section id="hero" className="pt-16 sm:pt-20 pb-24 sm:pb-32 px-6 relative z-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Text */}
            <div className="space-y-6 sm:space-y-8 overflow-hidden">
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
            <div className="relative lg:block flex justify-center">
              <InteractiveWarrantCard />
            </div>
          </div>
        </section>

        {/* ═══════════════════ SOCIAL PROOF ═══════════════════ */}
        <RevealSection>
          <section className="py-12 px-6 border-y border-amber-500/10 bg-black/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">
                  TRUSTED_BY
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                {/* ai.ventures */}
                <div className="flex items-center gap-3 px-4 py-2 border border-zinc-800 bg-black/50">
                  <span className="text-sm font-mono text-amber-500 font-bold">
                    ai.ventures
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    portfolio (30+ AI products)
                  </span>
                </div>

                {/* Open Source */}
                <a
                  href="https://github.com/risk-ai/vienna-os"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 border border-zinc-800 bg-black/50 hover:border-amber-500/30 transition-all"
                >
                  <Github className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-mono text-zinc-400">
                    risk-ai/vienna-os
                  </span>
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-mono text-amber-500">
                    Open Source
                  </span>
                </a>

                {/* BSL License */}
                <div className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-black/50">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-mono text-zinc-400">
                    BSL-1.1 Licensed
                  </span>
                </div>
              </div>

              {/* Key stats row */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <div className="text-center py-3">
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                    94+
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    proposals evaluated
                  </div>
                </div>
                <div className="text-center py-3">
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                    75+
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    warrants issued
                  </div>
                </div>
                <div className="text-center py-3">
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                    252+
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    audit events logged
                  </div>
                </div>
                <div className="text-center py-3">
                  <div className="text-lg sm:text-xl font-mono font-bold text-amber-500">
                    10
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    active policies
                  </div>
                </div>
              </div>

              {/* Primary Testimonial — ai.ventures / law.ai (real deployment) */}
              <div className="mt-10 max-w-3xl mx-auto">
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-[10px] font-mono text-amber-500 uppercase">
                      DEPLOYMENT_CASE_STUDY
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      production since 2026-03
                    </span>
                  </div>

                  {/* Deployment stats */}
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
                    anymore. Every prod write requires a T2 warrant with human sign-off. At law.ai,
                    our agents handle legal research, document analysis, and client workflows — all
                    governed by warrant-based execution. The audit trail alone made us compliance-ready
                    in weeks instead of months.&quot;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <span className="text-xs font-mono text-amber-500 font-bold">WA</span>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-zinc-300 font-bold">
                        Whit Anderson
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600">
                        CEO, ai.ventures — 30+ AI products governed by Vienna OS
                      </div>
                    </div>
                  </div>

                  {/* Use case breakdown */}
                  <div className="mt-6 pt-4 border-t border-amber-500/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] font-mono">
                    <div className="space-y-1">
                      <div className="text-amber-500 font-bold">law.ai</div>
                      <div className="text-zinc-600">legal research agents, doc analysis, client workflows</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-amber-500 font-bold">biography.ai</div>
                      <div className="text-zinc-600">content generation, media processing, user data handling</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-amber-500 font-bold">corporate.ai</div>
                      <div className="text-zinc-600">vendor scoring, data enrichment, marketplace ops</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

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

        {/* ═══════════════════ SYSTEM ARCHITECTURE ═══════════════════ */}
        <RevealSection>
          <section id="architecture" className="py-24 px-6 bg-black/30 border-y border-amber-500/10" aria-label="System Architecture">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  SYSTEM_ARCHITECTURE
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  infrastructure-grade governance — every layer purpose-built
                </p>
              </div>

              {/* Architecture Diagram - Terminal Style */}
              <div className="bg-black border border-amber-500/30 p-6 mb-8">
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-4 pb-2 border-b border-amber-500/20">
                  ARCHITECTURE_OVERVIEW
                </div>

                {/* Layer diagram */}
                <div className="space-y-3 font-mono text-[11px]">
                  {/* Agent Layer */}
                  <div className="flex items-stretch gap-3">
                    <div className="w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2">AGENT_LAYER</div>
                    <div className="flex-1 border border-zinc-700 bg-zinc-900/50 p-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700">Agent A</span>
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700">Agent B</span>
                        <span className="text-zinc-400 px-2 py-0.5 border border-zinc-700">Agent N</span>
                        <span className="text-zinc-600 px-2 py-0.5">→ submit intents via SDK</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">│ REST / WebSocket │</div>
                  </div>

                  {/* API Gateway */}
                  <div className="flex items-stretch gap-3">
                    <div className="w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2">API_GATEWAY</div>
                    <div className="flex-1 border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="flex flex-wrap gap-4">
                        <div><span className="text-amber-500">auth:</span> <span className="text-zinc-400">API key + JWT</span></div>
                        <div><span className="text-amber-500">rate_limit:</span> <span className="text-zinc-400">per-tenant</span></div>
                        <div><span className="text-amber-500">protocol:</span> <span className="text-zinc-400">REST + SSE streaming</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">▼</div>
                  </div>

                  {/* Governance Kernel */}
                  <div className="flex items-stretch gap-3">
                    <div className="w-28 sm:w-36 shrink-0 text-right text-amber-500 py-2 font-bold">GOVERNANCE<br/>KERNEL</div>
                    <div className="flex-1 border-2 border-amber-500/50 bg-amber-500/5 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="border border-amber-500/20 p-2">
                          <div className="text-amber-500 text-[10px] mb-1">POLICY_ENGINE</div>
                          <div className="text-zinc-500 text-[10px]">11 operators, conditional rules, priority-ordered evaluation</div>
                        </div>
                        <div className="border border-amber-500/20 p-2">
                          <div className="text-amber-500 text-[10px] mb-1">RISK_ROUTER</div>
                          <div className="text-zinc-500 text-[10px]">T0-T3 tier classification, auto-approve / gate / halt</div>
                        </div>
                        <div className="border border-amber-500/20 p-2">
                          <div className="text-amber-500 text-[10px] mb-1">WARRANT_AUTHORITY</div>
                          <div className="text-zinc-500 text-[10px]">HMAC-SHA256 signing, TTL-bounded, scope-restricted</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">▼</div>
                  </div>

                  {/* Approval + Execution */}
                  <div className="flex items-stretch gap-3">
                    <div className="w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2">EXECUTION<br/>LAYER</div>
                    <div className="flex-1 border border-zinc-700 bg-zinc-900/50 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">●</span>
                          <span className="text-zinc-400">Approval queues (M-of-N quorum)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">●</span>
                          <span className="text-zinc-400">Scoped execution with warrant authority</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">●</span>
                          <span className="text-zinc-400">Anomaly detection + alerting</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">●</span>
                          <span className="text-zinc-400">Dead letter queue for failed ops</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-3">
                    <div className="w-28 sm:w-36 shrink-0"></div>
                    <div className="text-amber-500 text-center flex-1">▼</div>
                  </div>

                  {/* Data Layer */}
                  <div className="flex items-stretch gap-3">
                    <div className="w-28 sm:w-36 shrink-0 text-right text-zinc-600 py-2">DATA_LAYER</div>
                    <div className="flex-1 border border-zinc-700 bg-zinc-900/50 p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">◆</span>
                          <span className="text-zinc-400">PostgreSQL (Neon)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">◆</span>
                          <span className="text-zinc-400">HMAC-signed audit log</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">◆</span>
                          <span className="text-zinc-400">Configurable retention</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment options */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2">DEPLOY_CLOUD</div>
                  <div className="text-[10px] font-mono text-zinc-500">Vercel + Neon — serverless, zero-ops</div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">scale: automatic</div>
                </div>
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2">DEPLOY_SELF_HOST</div>
                  <div className="text-[10px] font-mono text-zinc-500">Docker Compose — your infra, your data</div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">requires: PostgreSQL 15+</div>
                </div>
                <div className="bg-black border border-amber-500/30 p-4">
                  <div className="text-[10px] font-mono text-amber-500 mb-2">DEPLOY_HYBRID</div>
                  <div className="text-[10px] font-mono text-zinc-500">Cloud control plane + on-prem execution</div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">enterprise tier</div>
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

        {/* ═══════════════════ CAPABILITIES ═══════════════════ */}
        <RevealSection>
          <section id="features" className="py-24 px-6 border-t border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  SYSTEM_CAPABILITIES
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  core governance infrastructure
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Policy Engine */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      POLICY_ENGINE
                    </span>
                    <FileText className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-600">throughput:</span>{" "}
                      <span className="text-amber-500">
                        designed for high-throughput
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">eval_latency:</span>{" "}
                      <span className="text-green-500">sub-50ms p99</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">operators:</span>{" "}
                      <span className="text-zinc-400">
                        11 (==, !=, &gt;, &lt;, ...)
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">deployment:</span>{" "}
                      <span className="text-zinc-400">zero_downtime</span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      AUDIT_TRAIL
                    </span>
                    <Shield className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-600">algorithm:</span>{" "}
                      <span className="text-amber-500">HMAC-SHA256</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">tamper_proof:</span>{" "}
                      <span className="text-green-500">verified</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">retention:</span>{" "}
                      <span className="text-zinc-400">configurable (up to 7yr)</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">supports:</span>{" "}
                      <span className="text-zinc-400">SOC2, GDPR, HIPAA</span>
                    </div>
                  </div>
                </div>

                {/* Anomaly Detection */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      ANOMALY_DETECTION
                    </span>
                    <Activity className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-600">detection:</span>{" "}
                      <span className="text-green-500">
                        real-time pattern analysis
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">response:</span>{" "}
                      <span className="text-amber-500">
                        sub-minute alerting
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">signals:</span>{" "}
                      <span className="text-zinc-400">
                        frequency, scope, risk drift
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">channels:</span>{" "}
                      <span className="text-zinc-400">
                        slack, email, pagerduty
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approval System */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      APPROVAL_SYSTEM
                    </span>
                    <Users className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <span className="text-zinc-600">quorum_types:</span>{" "}
                      <span className="text-amber-500">1-of-N, M-of-N</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">avg_approval:</span>{" "}
                      <span className="text-green-500">
                        minutes, not days
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">interface:</span>{" "}
                      <span className="text-zinc-400">
                        responsive web + API
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">mfa:</span>{" "}
                      <span className="text-green-500">enforced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ USE CASES ═══════════════════ */}
        <RevealSection>
          <section id="use-cases" className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  USE_CASE_MATRIX
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  devops | compliance | executive
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* DevOps Lead */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      DEVOPS_LEAD
                    </span>
                    <Code2 className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="text-zinc-400 mb-3">
                      role: infrastructure automation
                    </div>
                    <div>
                      <span className="text-zinc-600">challenge:</span>{" "}
                      <span className="text-red-500">
                        agents deploy prod w/o oversight
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">solution:</span>{" "}
                      <span className="text-green-500">
                        T2 gate on prod writes
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">result:</span>{" "}
                      <span className="text-zinc-400">
                        0 unauthorized deployments
                      </span>
                    </div>
                    <div className="pt-3 border-t border-amber-500/10">
                      <span className="text-[10px] text-green-500">
                        ✓ ZERO_UNAUTHORIZED_DEPLOYS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compliance Officer */}
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      COMPLIANCE_OFFICER
                    </span>
                    <Shield className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div className="text-zinc-400 mb-3">
                      role: regulatory audit
                    </div>
                    <div>
                      <span className="text-zinc-600">challenge:</span>{" "}
                      <span className="text-red-500">
                        no audit trail for AI decisions
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">solution:</span>{" "}
                      <span className="text-green-500">
                        SHA-256 signed warrants
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">result:</span>{" "}
                      <span className="text-zinc-400">
                        audit-ready in weeks, not months
                      </span>
                    </div>
                    <div className="pt-3 border-t border-amber-500/10">
                      <span className="text-[10px] text-green-500">
                        ✓ AUDIT_READY_IN_WEEKS
                      </span>
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
                    <div className="text-zinc-400 mb-3">
                      role: technical strategy
                    </div>
                    <div>
                      <span className="text-zinc-600">challenge:</span>{" "}
                      <span className="text-red-500">
                        scale agents w/o losing control
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">solution:</span>{" "}
                      <span className="text-green-500">
                        policy-based auto-approval
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">result:</span>{" "}
                      <span className="text-zinc-400">
                        govern at scale, not at the expense of speed
                      </span>
                    </div>
                    <div className="pt-3 border-t border-amber-500/10">
                      <span className="text-[10px] text-green-500">
                        ✓ GOVERNED_AT_SCALE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ═══════════════════ MID-PAGE CTA ═══════════════════ */}
        <RevealSection>
          <section className="py-16 px-6 border-y border-amber-500/20 bg-amber-500/[0.03]">
            <div className="max-w-4xl mx-auto text-center">
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">
                READY_TO_GOVERN?
              </div>
              <p className="text-lg sm:text-xl font-mono text-zinc-300 mb-8">
                Deploy warrant-based governance in under 5 minutes.
                <br className="hidden sm:block" />
                <span className="text-zinc-500">
                  Free tier includes 5 agents + full pipeline.
                </span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://console.regulator.ai/signup"
                  className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold transition-all uppercase text-sm inline-flex items-center justify-center gap-2"
                >
                  START_FREE →
                </a>
                <Link
                  href="/compare"
                  className="border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold transition-all uppercase text-sm inline-flex items-center justify-center gap-2"
                >
                  COMPARE_ALTERNATIVES
                </Link>
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

        {/* ═══════════════════ COMPLIANCE ═══════════════════ */}
        <RevealSection>
          <section id="compliance" className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
            <div className="max-w-7xl mx-auto">
              <div className="mb-16 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                  COMPLIANCE_ENABLEMENT
                </h2>
                <p className="text-zinc-500 font-mono text-sm">
                  accelerate your path to regulatory compliance
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
                {/* SOC 2 */}
                <div className="bg-black border border-amber-500/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      SOC_2_TYPE_II
                    </span>
                    <Shield className="w-4 h-4 text-amber-500 hidden sm:block" />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    provides: audit trail controls
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">
                    maps_to: CC6.1–CC8.1
                  </div>
                </div>

                {/* GDPR */}
                <div className="bg-black border border-amber-500/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      GDPR
                    </span>
                    <Shield className="w-4 h-4 text-amber-500 hidden sm:block" />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    provides: data processing logs
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">
                    maps_to: Art. 30 records
                  </div>
                </div>

                {/* ISO 27001 */}
                <div className="bg-black border border-amber-500/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      ISO_27001
                    </span>
                    <Shield className="w-4 h-4 text-amber-500 hidden sm:block" />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    provides: access control evidence
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">
                    maps_to: Annex A.9
                  </div>
                </div>

                {/* HIPAA */}
                <div className="bg-black border border-amber-500/30 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-xs font-mono text-amber-500">
                      HIPAA
                    </span>
                    <Shield className="w-4 h-4 text-amber-500 hidden sm:block" />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600">
                    provides: authorization logging
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-1">
                    maps_to: §164.312 safeguards
                  </div>
                </div>
              </div>

              <div className="bg-black border border-amber-500/30 p-6">
                <div className="text-xs font-mono text-zinc-600 uppercase mb-4">
                  AUDIT_TRAIL_CAPABILITIES
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-xs font-mono">
                  <div className="space-y-2">
                    <div>
                      <span className="text-zinc-600">retention:</span>{" "}
                      <span className="text-zinc-400">
                        7 years (configurable)
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">export:</span>{" "}
                      <span className="text-zinc-400">JSON, CSV, PDF</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">encryption:</span>{" "}
                      <span className="text-amber-500">AES-256 at rest</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-zinc-600">signatures:</span>{" "}
                      <span className="text-zinc-400">HMAC-SHA256</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">tampering:</span>{" "}
                      <span className="text-amber-500">
                        cryptographic verification
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-600">search:</span>{" "}
                      <span className="text-zinc-400">
                        full-text + filters
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
                  href="https://github.com/risk-ai/vienna-os"
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

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    slug: "execution-gap-warrants-not-guardrails",
                    title: "The Execution Gap: Why AI Governance Needs Warrants, Not Just Guardrails",
                    category: "GOVERNANCE",
                    readTime: "9 min",
                  },
                  {
                    slug: "zero-trust-ai-agent-pipeline",
                    title: "Building a Zero-Trust AI Agent Pipeline",
                    category: "SECURITY",
                    readTime: "8 min",
                  },
                  {
                    slug: "ai-agent-disasters-prevented",
                    title: "5 AI Agent Disasters That Could Have Been Prevented",
                    category: "RISK",
                    readTime: "9 min",
                  },
                ].map((post) => (
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
