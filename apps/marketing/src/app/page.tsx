"use client";

import { useEffect } from "react";
import {
  Shield,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Activity,
  Users,
  Lock,

  AlertTriangle,
  Terminal,
  BadgeCheck,
  Building2,
  Wrench,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  useEffect(() => {
    analytics.page("Homepage");
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#09090b] text-white">
      {/* Background Glows */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(60% 60% at 50% 0%, rgba(139, 92, 246, 0.15) 0%, rgba(9, 9, 11, 0) 100%)'
        }}
      ></div>

      <SiteNav />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-20 pb-32 px-6 relative z-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  V1.2.0 GOVERNANCE PROTOCOL ACTIVE
                </span>
              </div>

              <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tighter leading-[0.95]">
                Authorization at the <span className="text-zinc-500">Speed of Intelligence.</span>
              </h1>

              <p className="text-xl text-zinc-400 max-w-xl leading-relaxed">
                The governance operating system for autonomous AI agents. Issue tamper-proof cryptographic warrants to authorize high-stakes operations in real-time.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://console.regulator.ai/signup" 
                  className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all group" aria-label="Start free trial"
                >
                  Start Free — No Credit Card
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <Link 
                  href="/docs"
                  className="bg-zinc-900 border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-xl font-bold transition-all"
                >
                  Read Technical Spec
                </Link>
              </div>

              <div className="flex items-center gap-8 pt-8 border-t border-white/5">
                <div>
                  <div className="text-2xl font-display font-bold">100ms</div>
                  <div className="text-xs text-zinc-500 uppercase font-mono">Policy Evaluation</div>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold">SHA-256</div>
                  <div className="text-xs text-zinc-500 uppercase font-mono">Audit Integrity</div>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold">Zero-Trust</div>
                  <div className="text-xs text-zinc-500 uppercase font-mono">Agent Architecture</div>
                </div>
              </div>
            </div>

            {/* Right Column: Warrant Card */}
            <div className="relative lg:block flex justify-center">
              <div className="w-full max-w-[520px] animate-float bg-zinc-950 border border-zinc-800 animate-pulse-glow rounded-2xl shadow-2xl p-1 overflow-hidden animate-float">
                <div 
                  className="bg-zinc-900/50 rounded-xl p-8 relative overflow-hidden"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }}
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl"></div>

                  <div className="flex justify-between items-start mb-12">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-6 h-6 text-amber-500" />
                        <span className="font-mono text-sm font-bold tracking-tighter">EXECUTION_WARRANT</span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">SERIAL: WRT-7F3A-82B1-4D9E</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-mono font-bold text-green-500">VERIFIED AUTH</span>
                      </div>
                      <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                        <span className="text-[10px] font-mono font-bold text-amber-500">TIER: T2</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Principal Agent</div>
                        <div className="font-mono text-sm text-zinc-200">AGENT_SIGMA_V4</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Action Scope</div>
                        <div className="font-mono text-sm text-zinc-200">DB_SCHEMA_MIGRATION</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Authorized By</div>
                        <div className="font-mono text-sm text-zinc-200">S. CHEN (VP ENG)</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase mb-1">Target Env</div>
                        <div className="font-mono text-sm text-amber-500 underline underline-offset-4 decoration-amber-500/30">
                          PRODUCTION_CLUSTER_01
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-dashed border-zinc-800">
                    <div className="text-[10px] text-zinc-500 font-mono uppercase mb-3">
                      Cryptographic Signature (SHA-256)
                    </div>
                    <div className="bg-black/40 p-4 rounded-lg font-mono text-[11px] leading-relaxed text-zinc-400 break-all border border-white/5">
                      0x7f3a2b1c00918e77a2d1f4e5c8b9a0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f90
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-[9px] text-zinc-600 font-mono">
                        ISSUED: 14:02:44 GMT • EXPIRES: +300S
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Background accents */}
              <div className="absolute -bottom-6 -left-6 w-full h-full bg-violet-500/10 -z-10 rounded-2xl blur-2xl"></div>
              <div className="absolute top-1/2 -right-12 w-24 h-24 bg-amber-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                How It Works
              </h2>
              <p className="text-zinc-400">
                Three steps to govern autonomous AI operations with cryptographic integrity.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <div className="text-[10px] font-mono text-amber-500 mb-4 uppercase tracking-wider">
                  Step 1
                </div>
                <h3 className="text-2xl font-display font-bold mb-6">Define Policy</h3>
                <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-zinc-400 border border-white/5">
                  <pre className="whitespace-pre-wrap">{`vienna.policy({
  action: 'db:migration',
  tier: 2,
  quorum: 2,
  approvers: ['eng-lead', 'cto']
})`}</pre>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <div className="text-[10px] font-mono text-amber-500 mb-4 uppercase tracking-wider">
                  Step 2
                </div>
                <h3 className="text-2xl font-display font-bold mb-6">Issue Warrant</h3>
                <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-zinc-400 border border-white/5">
                  <pre className="whitespace-pre-wrap">{`const warrant = await vienna
  .requestWarrant({
    action: 'db:migration',
    context: { env: 'production' }
  })`}</pre>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <div className="text-[10px] font-mono text-amber-500 mb-4 uppercase tracking-wider">
                  Step 3
                </div>
                <h3 className="text-2xl font-display font-bold mb-6">Verify Execution</h3>
                <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-zinc-400 border border-white/5">
                  <pre className="whitespace-pre-wrap">{`await vienna.verify(warrant)
// ✓ Approved by 2/2 signers
// ✓ SHA-256 audit trail  
// → Execute with confidence`}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TIERED RISK GOVERNANCE */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Tiered Risk Governance
              </h2>
              <p className="text-zinc-400">
                A unified framework for human-in-the-loop and autonomous workflows. Move from manual oversight to policy-based automation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* T0 Card */}
              <div className="group p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-zinc-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6">
                  <Zap className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wider">
                  Tier Zero
                </div>
                <h3 className="text-xl font-bold mb-3">Auto-Pass</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Non-destructive read operations and low-latency API polling. Zero friction.
                </p>
              </div>

              {/* T1 Card */}
              <div className="group p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-zinc-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wider">
                  Tier One
                </div>
                <h3 className="text-xl font-bold mb-3">Heuristic Log</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Routine state changes. Automated approval with high-resolution audit trails.
                </p>
              </div>

              {/* T2 Card */}
              <div className="group p-8 rounded-2xl bg-zinc-900 border border-zinc-700/50 hover:border-zinc-500 transition-all ring-1 ring-amber-500/10">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-6">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-[10px] font-mono text-amber-500 mb-2 uppercase tracking-wider">
                  Tier Two
                </div>
                <h3 className="text-xl font-bold mb-3">Human Gate</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Critical infrastructure or financial access. Requires signed human quorum.
                </p>
              </div>

              {/* T3 Card */}
              <div className="group p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-zinc-700 transition-all">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6">
                  <Lock className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-wider">
                  Tier Three
                </div>
                <h3 className="text-xl font-bold mb-3">Strict Halt</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Irreversible destructive actions. Multi-sig root approval mandatory.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-4">Capabilities no one else has</div>
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Core Capabilities
              </h2>
              <p className="text-zinc-400">
                Seven production-ready features that make Vienna OS the only real governance layer for autonomous AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-100">
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

              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-200">
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

              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-300">
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

              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-400">
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

              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-500">
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

              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-600">
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
            <div className="mt-8 p-8 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-white/5 card-hover animate-fade-up">
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

        {/* INTEGRATION */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Integration
              </h2>
              <p className="text-zinc-400">
                Production-ready SDKs with full type safety. Submit intents, manage policies, and govern your fleet from any language.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Code Examples */}
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-auto text-xs font-mono text-zinc-500">Python</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-zinc-400">
                    <pre className="whitespace-pre-wrap">{`pip install vienna-os`}</pre>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-auto text-xs font-mono text-zinc-500">Node.js</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-zinc-400">
                    <pre className="whitespace-pre-wrap">{`npm install @vienna-os/sdk`}</pre>
                  </div>
                </div>
              </div>

              {/* Right: Integration Logos */}
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 uppercase font-mono tracking-wider mb-6">
                  Works With
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {['GitHub Actions', 'Terraform', 'LangChain', 'CrewAI'].map((tool) => (
                    <div 
                      key={tool}
                      className="px-6 py-4 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-center font-display font-bold text-sm text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OPEN WARRANT STANDARD */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl mx-auto text-center animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Open Warrant Standard
              </h2>
              <p className="text-zinc-400">
                Vienna OS implements OWS v1.0 — a portable execution authorization protocol. Warrants are cross-platform, framework-agnostic, and cryptographically verifiable. Developed at Cornell Law × ai.ventures.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Stat 1 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 text-center">
                <div className="text-4xl font-display font-bold mb-2 text-white">100ms</div>
                <div className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Policy Evaluation</div>
                <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
                  Sub-second policy checks ensure governance never becomes a bottleneck for agent operations.
                </p>
              </div>

              {/* Stat 2 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 text-center">
                <div className="text-4xl font-display font-bold mb-2 text-white">SHA-256</div>
                <div className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Audit Integrity</div>
                <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
                  Cryptographic hashing creates tamper-evident audit trails for every authorization decision.
                </p>
              </div>

              {/* Stat 3 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 text-center">
                <div className="text-4xl font-display font-bold mb-2 text-white">Zero-Trust</div>
                <div className="text-xs text-zinc-500 uppercase font-mono tracking-wider">Agent Architecture</div>
                <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
                  Every agent action requires explicit authorization. No implicit trust, no ambient authority.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BEFORE/AFTER SCENARIO */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                What Happens Without Governance
              </h2>
              <p className="text-zinc-400">
                The difference between a governed agent and an ungoverned one is the difference between confidence and liability.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Without */}
              <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <span className="text-sm font-mono text-red-400 uppercase tracking-wider">Without Vienna</span>
                </div>
                <div className="space-y-4 text-sm text-zinc-400">
                  <div className="flex gap-3">
                    <span className="text-red-500 font-mono text-xs mt-1">03:14 AM</span>
                    <p>Billing agent processes $200K refund. No approval required.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-red-500 font-mono text-xs mt-1">03:14 AM</span>
                    <p>Funds transferred. No audit trail. No rollback.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-red-500 font-mono text-xs mt-1">09:00 AM</span>
                    <p className="text-red-400 font-medium">CFO finds out Monday morning.</p>
                  </div>
                </div>
              </div>

              {/* With */}
              <div className="p-8 rounded-2xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-green-500" />
                  <span className="text-sm font-mono text-green-400 uppercase tracking-wider">With Vienna</span>
                </div>
                <div className="space-y-4 text-sm text-zinc-400">
                  <div className="flex gap-3">
                    <span className="text-green-500 font-mono text-xs mt-1">03:14 AM</span>
                    <p>Agent submits refund intent. Vienna classifies as <span className="text-amber-400">T2</span>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-500 font-mono text-xs mt-1">03:14 AM</span>
                    <p>Policy requires CFO approval for transactions {'>'}$50K. Warrant held.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-green-500 font-mono text-xs mt-1">09:15 AM</span>
                    <p className="text-green-400 font-medium">CFO reviews, approves. Warrant issued. Refund processed with full audit chain.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICKSTART */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Running in 5 Minutes
              </h2>
              <p className="text-zinc-400">
                Three commands. No infrastructure. See governance in action immediately.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Terminal className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Terminal</span>
                </div>
                <div className="bg-black/40 p-6 rounded-lg font-mono text-sm text-zinc-300 space-y-2">
                  <div><span className="text-zinc-500">$</span> git clone https://github.com/risk-ai/regulator.ai</div>
                  <div><span className="text-zinc-500">$</span> cd regulator.ai/examples/quickstart</div>
                  <div><span className="text-zinc-500">$</span> VIENNA_API_KEY=vos_pk_live_7f3a2b1c node index.js</div>
                  <div className="pt-4 border-t border-white/5 text-green-400 text-xs">
                    <div>✓ Policy evaluated: T1 (auto-approved)</div>
                    <div>✓ Warrant issued: wrt_7f3a...82b1</div>
                    <div>✓ Execution verified, audit logged</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-400 font-bold font-mono">1</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Sign up for free</h3>
                    <p className="text-sm text-zinc-500">Get an API key at console.regulator.ai. No credit card required.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-400 font-bold font-mono">2</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Define your first policy</h3>
                    <p className="text-sm text-zinc-500">Write it in plain English or use the visual builder. Vienna handles the rest.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-400 font-bold font-mono">3</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Submit your first intent</h3>
                    <p className="text-sm text-zinc-500">Watch it flow through the governance pipeline in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE AS BUYING TRIGGER */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Audit-Ready from Day One
              </h2>
              <p className="text-zinc-400">
                When your auditor asks "how do you control what your AI agents can do?" — Vienna is the answer.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <Scale className="w-8 h-8 text-violet-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">EU AI Act</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Article 14 requires human oversight of high-risk AI. Vienna&apos;s tiered approval system with cryptographic audit trails satisfies this by design.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <BadgeCheck className="w-8 h-8 text-violet-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">SOC 2 Type II</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Every action produces a signed, timestamped record in the Merkle chain. Export your audit trail as compliance evidence with one API call.
                </p>
              </div>
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <Shield className="w-8 h-8 text-violet-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">SEC / FINRA</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Financial agents require pre-trade authorization and post-trade reporting. Vienna&apos;s warrant system provides cryptographic proof of both.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WHO USES THIS — USE CASE PERSONAS */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Built for Your Role
              </h2>
              <p className="text-zinc-400">
                Different teams, same governance platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Link href="/use-cases" className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-violet-500/30 transition-all group">
                <Wrench className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold mb-2 group-hover:text-violet-400 transition-colors">DevOps Lead</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  &ldquo;I need deployment agents that can&apos;t push to prod without CI passing and team lead approval.&rdquo;
                </p>
                <span className="text-xs text-violet-400 font-mono">View use cases →</span>
              </Link>
              <Link href="/use-cases" className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-violet-500/30 transition-all group">
                <Scale className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold mb-2 group-hover:text-violet-400 transition-colors">Compliance Officer</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  &ldquo;I need an audit trail that proves our AI systems follow policy — exportable, signed, tamper-proof.&rdquo;
                </p>
                <span className="text-xs text-violet-400 font-mono">View use cases →</span>
              </Link>
              <Link href="/use-cases" className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-violet-500/30 transition-all group">
                <Building2 className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-bold mb-2 group-hover:text-violet-400 transition-colors">CTO</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">
                  &ldquo;I need to give agents more autonomy without more risk. Scale the fleet, not the oversight team.&rdquo;
                </p>
                <span className="text-xs text-violet-400 font-mono">View use cases →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* INDUSTRY VERTICALS */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl animate-fade-up">
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Industry Solutions</div>
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Without Governance, AI Cannot Operate
              </h2>
              <p className="text-zinc-400">
                Every regulated industry needs verifiable control over autonomous systems. Vienna provides it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-100">
                <div className="text-2xl mb-4">🏦</div>
                <h3 className="text-lg font-bold mb-2">Financial Services</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  Pre-trade authorization, transaction limits, multi-sig for high-value operations. SEC/FINRA compliant audit trails.
                </p>
                <div className="text-xs font-mono text-violet-400">T2: wire_transfer {'>'}$50K → CFO approval</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-200">
                <div className="text-2xl mb-4">🏥</div>
                <h3 className="text-lg font-bold mb-2">Healthcare</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  PHI access controls, treatment recommendation governance, HIPAA-compliant execution records with cryptographic proof.
                </p>
                <div className="text-xs font-mono text-violet-400">T3: access_phi → privacy_officer + attending</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-300">
                <div className="text-2xl mb-4">⚖️</div>
                <h3 className="text-lg font-bold mb-2">Legal</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  Document filing controls, privilege enforcement, matter-scoped agent authorization with complete chain of custody.
                </p>
                <div className="text-xs font-mono text-violet-400">T2: file_motion → partner approval</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-400">
                <div className="text-2xl mb-4">🏗️</div>
                <h3 className="text-lg font-bold mb-2">DevOps</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  Deployment authorization, infrastructure changes, CI/CD gate control. Agents deploy with warrants, not just credentials.
                </p>
                <div className="text-xs font-mono text-violet-400">T1: deploy_staging → auto | T2: deploy_prod → lead</div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING PREVIEW */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl mx-auto text-center animate-fade-up">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Start Free. Scale as Your Fleet Grows.
              </h2>
              <p className="text-zinc-400">
                No credit card required. Upgrade when you need fleet management and enterprise controls.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-100">
                <h3 className="text-lg font-bold mb-1">Community</h3>
                <div className="text-3xl font-display font-bold mb-4">Free</div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 5 agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 1,000 evaluations/mo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Full governance pipeline</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Community support</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-violet-500/20 card-hover animate-fade-up delay-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-violet-500 text-[10px] font-mono font-bold rounded-bl-lg">POPULAR</div>
                <h3 className="text-lg font-bold mb-1">Team</h3>
                <div className="text-3xl font-display font-bold mb-4">$49<span className="text-lg text-zinc-500">/mo</span></div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 25 agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 10,000 evaluations/mo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Policy simulation</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Priority support</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-300">
                <h3 className="text-lg font-bold mb-1">Business</h3>
                <div className="text-3xl font-display font-bold mb-4">$99<span className="text-lg text-zinc-500">/mo</span></div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 100 agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Unlimited evaluations</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Compliance reports</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> SSO + RBAC</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover animate-fade-up delay-400">
                <h3 className="text-lg font-bold mb-1">Enterprise</h3>
                <div className="text-3xl font-display font-bold mb-4">Custom</div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Unlimited agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Dedicated infrastructure</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Custom policies</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> SLA + on-call support</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors font-mono px-6 py-3 border border-violet-500/20 rounded-xl hover:border-violet-500/40">
                View full pricing details →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA SECTION — UPDATED */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-amber-500 mb-8">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-8">
              Built for the <span className="text-zinc-500">Autonomous Era.</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4">
              Start governing your AI agents today. Free forever for small teams.
            </p>
            <p className="text-sm text-zinc-500 mb-12">
              Free tier: 5 agents, 1,000 evaluations/month, full governance pipeline. No credit card.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="https://console.regulator.ai/signup" 
                className="w-full sm:w-auto px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all"
              >
                Start Free — No Credit Card
              </a>
              <Link 
                href="/try"
                className="w-full sm:w-auto px-10 py-5 bg-zinc-900 border border-white/10 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all"
              >
                Try Interactive Demo
              </Link>
            </div>
            <p className="mt-8 text-xs text-zinc-600">
              The only AI governance platform with a patented cryptographic warrant system. USPTO #64/018,152.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
