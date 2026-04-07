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
  Code2,
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
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Terminal Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      <SiteNav />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-20 pb-32 px-6 relative z-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                  SYSTEM_STATUS: OPERATIONAL
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight">
                <span className="text-amber-500">GOVERN_AUTONOMOUS_AI_OPERATIONS</span>
                <br />
                <span className="text-zinc-500">/ WITH_SIGNED_WARRANTS</span>
              </h1>

              <p className="text-lg text-zinc-400 max-w-xl leading-relaxed font-mono">
                Infrastructure-grade execution control plane. Issue cryptographic warrants for AI agent operations. Immutable audit trails. Zero-trust authorization.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://console.regulator.ai/signup" 
                  className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold flex items-center gap-2 transition-all group uppercase text-sm"
                >
                  GENERATE_WARRANT →
                </a>
                <Link 
                  href="/docs"
                  className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold transition-all uppercase text-sm"
                >
                  VIEW_SPEC
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-amber-500/10">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">latency_p99</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">43ms</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">audit_algo</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">SHA-256</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">arch_model</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">ZeroTrust</div>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="pt-6 border-t border-amber-500/10">
                <div className="text-xs font-mono text-zinc-600 uppercase mb-3">Pricing Tier</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-white">$0</span>
                  <span className="text-sm font-mono text-zinc-500">/mo for first 10k executions</span>
                </div>
                <Link href="/pricing" className="text-xs font-mono text-amber-500 hover:text-amber-400 underline mt-2 inline-block">
                  view_full_pricing →
                </Link>
              </div>
            </div>

            {/* Right Column: Warrant Card - Terminal Style */}
            <div className="relative lg:block flex justify-center">
              <div className="w-full max-w-[520px] bg-black border border-amber-500/30 p-0 overflow-hidden font-mono">
                {/* Header Bar */}
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500">EXECUTION_WARRANT</span>
                  </div>
                  <div className="text-[10px] text-zinc-600">ep_id: EP-OPS-3C19</div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Warrant Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-zinc-600 mb-1">warrant_serial</div>
                      <div className="text-amber-500">WRT-7F3A-82B1-4D9E</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">auth_status</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">VERIFIED</span>
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

                  {/* Cryptographic Signature */}
                  <div className="border-t border-amber-500/10 pt-4">
                    <div className="text-[10px] text-zinc-600 mb-2">ledger_root (SHA-256)</div>
                    <div className="bg-zinc-900 border border-amber-500/20 p-3 text-[10px] text-amber-500 break-all leading-relaxed">
                      0x7e3c2b1a00918e77a2d1f4e5c8b9a0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b19a
                    </div>
                  </div>

                  {/* Expiry Timer */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-600">
                    <span>ttl_remaining: 298s</span>
                    <span className="text-green-500">● ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                How It Works
              </h2>
              <p className="text-zinc-400">
                Three steps to govern autonomous AI operations with cryptographic integrity.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
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
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
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
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
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
            <div className="mb-16 max-w-2xl">
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
            <div className="mb-16 max-w-2xl">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Core Capabilities
              </h2>
              <p className="text-zinc-400">
                Production-ready features for governing autonomous systems at scale.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Capability 1 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Visual Policy Builder</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Define governance rules with point-and-click conditions. No code deployment needed. 11 operators for complex logic without engineering overhead.
                </p>
              </div>

              {/* Capability 2 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Cryptographic Audit Trail</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Every authorization creates an HMAC-SHA256 signed audit record. Tamper-proof lineage from policy evaluation to execution completion.
                </p>
              </div>

              {/* Capability 3 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Multi-Party Approvals</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  High-risk actions require quorum-based human approval. Track who authorized what, when, and why with full audit context.
                </p>
              </div>

              {/* Capability 4 */}
              <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-6">
                  <Activity className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="text-xl font-bold mb-3">Real-Time Monitoring</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Live event streams for all agent activities, policy evaluations, and approval workflows. Server-sent events with sub-second latency.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTEGRATION */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Integration
              </h2>
              <p className="text-zinc-400">
                Native SDKs for Python, Node.js, and popular agentic frameworks.
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
                  {['GitHub Actions', 'Terraform', 'LangChain', 'AutoGPT'].map((tool) => (
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
            <div className="mb-16 max-w-2xl mx-auto text-center">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Open Warrant Standard
              </h2>
              <p className="text-zinc-400">
                Built on cryptographic primitives designed for autonomous systems at scale.
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

        {/* CTA SECTION */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-amber-500 mb-8">
              <Code2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-8">
              Built for the <span className="text-zinc-500">Autonomous Era.</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
              Integrate Vienna OS into your agentic stack in minutes with our native SDKs for Python, Node.js, and Rust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="https://console.regulator.ai/signup" 
                className="w-full sm:w-auto px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all"
              >
                Get Started Now
              </a>
              <Link 
                href="/try"
                className="w-full sm:w-auto px-10 py-5 bg-zinc-900 border border-white/10 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
