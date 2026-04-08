"use client";

import {
  Shield,
  ArrowLeft,
  GraduationCap,
  Building2,
  Users,
  Target,
  Lightbulb,
  Scale,
  FileText,
  Award,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white font-mono">
      <SiteNav />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-16">
        {/* Mission Hero */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-mono font-bold mb-8 tracking-tight">
              <span className="text-white">AI_AGENTS_SHOULD_BE</span>
              <br />
              <span className="text-amber-500">GOVERNED_NOT_GUARDRAILED</span>
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl mx-auto font-mono">
              Vienna OS exists because the AI industry has a governance gap.
              As enterprises deploy autonomous agents, there&apos;s no standardized
              layer for approval workflows, policy enforcement, or audit trails.
              <strong className="text-amber-500"> We&apos;re building that layer.</strong>
            </p>
          </div>
        </section>

        {/* Core Thesis */}
        <section className="mb-24">
          <div className="bg-black border border-amber-500/30 p-8 md:p-10">
            <div className="flex items-start gap-6 mb-8">
              <Scale className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-amber-500 mb-4 font-mono uppercase tracking-wide">OUR_THESIS</h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-4 font-mono">
                  Content guardrails filter what AI <em className="text-amber-500">says</em>. Governance controls
                  what AI <em className="text-amber-500">does</em>. As agents move from demos to production — executing
                  real transactions, deploying real code, sending real communications —
                  the question shifts from <span className="text-zinc-400">&quot;Is the output safe?&quot;</span> to{" "}
                  <span className="text-zinc-400">&quot;Is the action authorized?&quot;</span>
                </p>
              </div>
            </div>
            <div className="bg-black border border-amber-500/30 p-6">
              <div className="font-mono text-lg text-amber-500 text-center">
                AI_explains → Runtime_executes → Operator_approves
              </div>
            </div>
          </div>
        </section>

        {/* Patent & IP */}
        <section className="mb-24">
          <div className="bg-black border border-amber-500/30 p-8">
            <div className="flex items-start gap-6">
              <FileText className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-amber-500 mb-4 flex items-center gap-3 font-mono uppercase tracking-wide">
                  PATENTED_INNOVATION
                  <Award className="w-6 h-6 text-amber-500" />
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-4 font-mono">
                  Vienna OS&apos;s warrant-based governance architecture is protected by
                  <strong className="text-amber-500"> USPTO Patent Application #64/018,152</strong>.
                  The invention covers the cryptographic warrant system, scope-constrained authorization,
                  and post-execution verification that makes Vienna unique.
                </p>
                <div className="text-sm text-zinc-400 bg-black border border-amber-500/10 p-4 font-mono">
                  <strong className="text-amber-500">FILING:</strong> &quot;Methods and Systems for Warrant-Based Autonomous Agent Governance&quot;
                  <br />
                  <strong className="text-amber-500">FILED:</strong> March 2026 • <strong className="text-amber-500">STATUS:</strong> Patent Pending
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Market Timing */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono uppercase tracking-wide text-amber-500">
            WHY_NOW
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "AGENT_EXPLOSION",
                desc: "Every major AI lab shipped agent frameworks in 2025-2026. 60%+ of Fortune 500 are experimenting. The governance gap is visible at scale.",
              },
              {
                icon: Scale,
                title: "REGULATION_ARRIVES",
                desc: "EU AI Act enforcement (2026), SEC AI guidance, NIST AI RMF — all demanding transparency, human oversight, and audit trails.",
              },
              {
                icon: Lightbulb,
                title: "INSURANCE_PRESSURE",
                desc: "Cyber insurers are asking: 'How do you govern your AI agents?' Companies without answers face higher premiums or coverage denials.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-black border border-amber-500/10 p-6 hover:border-amber-500/30 transition-colors">
                <item.icon className="w-8 h-8 text-amber-500 mb-4" />
                <h3 className="text-amber-500 font-mono font-bold mb-3 text-lg uppercase tracking-wide">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed font-mono">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-12 font-mono uppercase tracking-wide text-amber-500">
            CORNELL_LAW_X_AI_VENTURES
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black border border-amber-500/10 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-white font-mono font-bold text-xl">Max Anderson</h3>
                  <p className="text-amber-500 font-mono">Founder & Lead Developer</p>
                  <p className="text-zinc-600 text-sm font-mono">Cornell Law School 3L</p>
                </div>
              </div>
              <p className="text-zinc-400 leading-relaxed font-mono">
                Built Vienna OS from the conviction that legal frameworks and distributed systems 
                share the same primitives: <strong className="text-amber-500">authority, scope, evidence, and accountability</strong>. 
                Combines formal legal training with deep technical expertise in distributed governance.
              </p>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-white font-mono font-bold text-xl">ai.ventures</h3>
                  <p className="text-amber-500 font-mono">Platform & Operations</p>
                  <p className="text-zinc-600 text-sm font-mono">Technetwork 2 LLC</p>
                </div>
              </div>
              <p className="text-zinc-400 leading-relaxed font-mono">
                Portfolio company with shared infrastructure, agent pool, and cross-portfolio
                synergies across 12+ AI-focused sites. Vienna OS benefits from unique distribution 
                and customer validation across the entire ai.ventures ecosystem.
              </p>
            </div>
          </div>
        </section>

        {/* Portfolio Synergies */}
        <section className="mb-24">
          <h3 className="text-2xl font-bold text-amber-500 mb-6 font-mono uppercase tracking-wide">PORTFOLIO_SYNERGIES</h3>
          <p className="text-zinc-400 mb-8 font-mono">
            Vienna OS has unique cross-portfolio synergies across the ai.ventures ecosystem.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "law.ai", role: "First vertical customer (legal AI)" },
              { name: "corporate.ai", role: "Distribution channel (vendor marketplace)" },
              { name: "agents.net", role: "Agent certification marketplace" },
              { name: "risk.ai", role: "Complementary risk assessment" },
            ].map((s) => (
              <div key={s.name} className="bg-black border border-amber-500/10 p-4 text-center hover:bg-amber-500/5 transition-colors">
                <div className="text-lg font-bold text-amber-500 mb-2 font-mono">{s.name}</div>
                <div className="text-xs text-zinc-600 leading-relaxed font-mono">{s.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section>
          <div className="bg-black border border-amber-500/30 p-10 text-center">
            <Target className="w-12 h-12 text-amber-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-amber-500 mb-4 font-mono uppercase tracking-wide">WANT_TO_LEARN_MORE</h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed font-mono">
              Whether you&apos;re an enterprise evaluating governance solutions,
              an investor interested in our patent portfolio, or a developer building agents — we&apos;d love to talk.
            </p>
            <div className="flex items-center justify-center gap-6">
              <a href="/signup" className="bg-amber-500 text-black px-8 py-3 transition font-mono font-bold uppercase">
                GET_STARTED_FREE
              </a>
              <a href="/contact" className="bg-black text-white px-8 py-3 transition font-mono font-bold uppercase border border-amber-500/30 hover:bg-amber-500/10">
                CONTACT_US
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}