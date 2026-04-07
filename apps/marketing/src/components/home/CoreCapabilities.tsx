import { AlertTriangle, ArrowRight, BadgeCheck, Building2, Lock, Scale, Shield, Terminal, Wrench, Zap } from "lucide-react";
import Link from "next/link";

export default function CoreCapabilities() {
  return (
    <>
{/* CORE CAPABILITIES */}
<section className="py-24 px-6">
  <div className="max-w-7xl mx-auto">
    <div className="mb-16 max-w-2xl scroll-reveal">
      <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-4">Capabilities no one else has</div>
      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
        Core Capabilities
      </h2>
      <p className="text-zinc-400">
        Seven production-ready features that make Vienna OS the only real governance layer for autonomous AI.
      </p>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 scroll-reveal">
      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6 animate-pulse-glow">
          <FileText className="w-6 h-6 text-violet-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Natural Language Policies</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Write governance rules in plain English. Vienna compiles to formal policy logic — no code, no YAML.
        </p>
        <div className="bg-black/40 p-3 rounded-lg font-mono text-xs text-zinc-500 border border-white/5">
          &ldquo;Require CFO approval for wire transfers over $50K&rdquo;
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-6">
          <Shield className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Merkle Warrant Chain</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Every warrant is chained using Merkle trees. If any record is altered, the entire chain breaks. Tamper-proof by math, not policy.
        </p>
        <div className="flex items-center gap-2 text-xs font-mono text-amber-500/60">
          <span className="w-2 h-2 rounded-full bg-amber-500/40"></span>
          Block #4,271 → SHA-256 → verified
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6">
          <Users className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Cross-Agent Delegation</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Agents delegate execution authority to other agents with cryptographic constraints — scope-limited, time-bound, revocable.
        </p>
        <div className="flex items-center gap-1 text-xs font-mono text-green-500/60">
          agent_a → <span className="text-zinc-600">delegate</span> → agent_b <span className="text-green-500">✓</span>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6">
          <Activity className="w-6 h-6 text-violet-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Policy Simulation</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Dry-run policy changes against historical data. See exactly which past actions would have been blocked or escalated. Zero production risk.
        </p>
        <div className="flex gap-2 text-xs font-mono">
          <span className="text-green-500">142 approved</span>
          <span className="text-zinc-600">·</span>
          <span className="text-amber-500">3 escalated</span>
          <span className="text-zinc-600">·</span>
          <span className="text-red-500">1 blocked</span>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-6">
          <Zap className="w-6 h-6 text-cyan-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Agent Trust Scoring</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Dynamic trust scores from behavior history. High-trust agents get faster approvals. Low-trust agents get additional scrutiny. Trust is earned, not configured.
        </p>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div className="bg-gradient-to-r from-red-500 via-amber-500 to-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
        </div>
        <div className="text-xs font-mono text-zinc-600 mt-2">Trust: 0.78 — auto-approve T0/T1</div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-6">
          <BadgeCheck className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold mb-3">Compliance Reports</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Auto-generate SOC 2, HIPAA, EU AI Act compliance reports from your warrant chain. One API call exports the full audit evidence package.
        </p>
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-1 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">SOC 2</span>
          <span className="px-2 py-1 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">HIPAA</span>
          <span className="px-2 py-1 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">EU AI Act</span>
        </div>
      </div>
    </div>

    {/* Dual Execution Model — full-width feature card */}
    <div className="mt-8 p-8 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-white/5 card-hover">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Unique to Vienna</div>
          <h3 className="text-2xl font-bold mb-3">Dual Execution Model</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Two execution paths in one system. <span className="text-violet-400 font-medium">Vienna Direct</span> — the runtime executes low-risk actions instantly. <span className="text-amber-400 font-medium">Agent Passback</span> — high-risk actions return a signed warrant for the agent to execute with proof of authorization.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 text-center">
            <div className="text-sm font-bold text-violet-400 mb-1">Vienna Direct</div>
            <div className="text-xs text-zinc-500">T0/T1 → Auto-execute</div>
            <div className="text-xs font-mono text-zinc-600 mt-2">&lt;100ms latency</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
            <div className="text-sm font-bold text-amber-400 mb-1">Agent Passback</div>
            <div className="text-xs text-zinc-500">T2/T3 → Warrant issued</div>
            <div className="text-xs font-mono text-zinc-600 mt-2">Agent executes w/ proof</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

    </>
  );
}
