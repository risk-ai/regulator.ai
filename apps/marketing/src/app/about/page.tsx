"use client";

import {
  Shield,
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
import ScrollReveal from "@/components/ScrollReveal";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          {/* Mission Hero */}
          <section className="mb-24">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h1 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight font-mono">
                  <span className="text-white">AI agents should be</span>
                  <br />
                  <span className="text-amber-500">
                    governed, not guardrailed
                  </span>
                </h1>
                <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl mx-auto">
                  Vienna OS exists because the AI industry has a governance gap.
                  As enterprises deploy autonomous agents, there&apos;s no standardized
                  layer for approval workflows, policy enforcement, or audit trails.
                  <strong className="text-zinc-300"> We&apos;re building that layer.</strong>
                </p>
              </div>
            </ScrollReveal>
          </section>

          {/* Core Thesis */}
          <ScrollReveal delay={0.2}>
            <section className="mb-24">
              <div className="bg-black border border-amber-500/30 p-8 md:p-10">
                <div className="flex items-start gap-6 mb-8">
                  <Scale className="w-10 h-10 text-amber-500 shrink-0 mt-1 seal-glow" />
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4 font-mono">OUR_THESIS</h2>
                    <p className="text-lg text-zinc-300 leading-relaxed mb-4">
                      Content guardrails filter what AI <em className="text-amber-500">says</em>. Governance controls
                      what AI <em className="text-amber-500">does</em>. As agents move from demos to production — executing
                      real transactions, deploying real code, sending real communications —
                      the question shifts from <span className="text-zinc-200">&quot;Is the output safe?&quot;</span> to{" "}
                      <span className="text-zinc-200">&quot;Is the action authorized?&quot;</span>
                    </p>
                  </div>
                </div>
                <div className="bg-black border border-amber-500/20 p-6">
                  <div className="font-mono text-lg text-amber-500 text-center">
                    AI explains → Runtime executes → Operator approves
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Patent & IP */}
          <ScrollReveal delay={0.3}>
            <section className="mb-24">
              <div className="bg-amber-500/10 border border-amber-500/30 p-8">
                <div className="flex items-start gap-6">
                  <FileText className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3 font-mono">
                      PATENTED_INNOVATION
                      <Award className="w-6 h-6 text-amber-500" />
                    </h2>
                    <p className="text-lg text-zinc-300 leading-relaxed mb-4">
                      Vienna OS&apos;s warrant-based governance architecture is protected by
                      <strong className="text-amber-500"> USPTO Patent Application #64/018,152</strong>.
                      The invention covers the cryptographic warrant system, scope-constrained authorization,
                      and post-execution verification that makes Vienna unique.
                    </p>
                    <div className="text-sm text-zinc-400 bg-black p-4 border border-amber-500/20">
                      <strong className="text-amber-500">Filing:</strong> &quot;Methods and Systems for Warrant-Based Autonomous Agent Governance&quot;
                      <br />
                      <strong className="text-amber-500">Filed:</strong> March 2026 • <strong className="text-amber-500">Status:</strong> Patent Pending
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Market Timing */}
          <ScrollReveal delay={0.4}>
            <section className="mb-24">
              <h2 className="text-3xl font-bold text-center mb-12 font-mono">
                <span className="text-amber-500">
                  WHY_NOW
                </span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Users,
                    title: "Agent Explosion",
                    desc: "Every major AI lab shipped agent frameworks in 2025-2026. 60%+ of Fortune 500 are experimenting. The governance gap is visible at scale.",
                    color: "amber",
                  },
                  {
                    icon: Scale,
                    title: "Regulation Arrives",
                    desc: "EU AI Act enforcement (2026), SEC AI guidance, NIST AI RMF — all demanding transparency, human oversight, and audit trails.",
                    color: "amber",
                  },
                  {
                    icon: Lightbulb,
                    title: "Insurance Pressure",
                    desc: "Cyber insurers are asking: 'How do you govern your AI agents?' Companies without answers face higher premiums or coverage denials.",
                    color: "amber",
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-zinc-900 border border-zinc-800 p-6 hover:border-amber-500/20 transition-colors group">
                    <item.icon className={`w-8 h-8 text-${item.color}-400 mb-4 group-hover:scale-110 transition-transform`} />
                    <h3 className="text-white font-semibold mb-3 text-lg font-mono">{item.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          {/* Team */}
          <ScrollReveal delay={0.5}>
            <section className="mb-24">
              <h2 className="text-3xl font-bold text-center mb-12 font-mono">
                <span className="text-amber-500">
                  CORNELL_LAW_X_AI_VENTURES
                </span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-8 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <GraduationCap className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl font-mono">Max Anderson</h3>
                      <p className="text-amber-500 font-medium">Founder & Lead Developer</p>
                      <p className="text-zinc-500 text-sm">Cornell Law School 3L</p>
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Built Vienna OS from the conviction that legal frameworks and distributed systems 
                    share the same primitives: <strong className="text-white">authority, scope, evidence, and accountability</strong>. 
                    Combines formal legal training with deep technical expertise in distributed governance.
                  </p>
                </div>
                
                <div className="bg-zinc-900 border border-zinc-800 p-8 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl font-mono">ai.ventures</h3>
                      <p className="text-amber-500 font-medium">Platform & Operations</p>
                      <p className="text-zinc-500 text-sm">Technetwork 2 LLC</p>
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Portfolio company with shared infrastructure, agent pool, and cross-portfolio
                    synergies across 12+ AI-focused sites. Vienna OS benefits from unique distribution 
                    and customer validation across the entire ai.ventures ecosystem.
                  </p>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* Portfolio Synergies */}
          <ScrollReveal delay={0.6}>
            <section className="mb-24">
              <h3 className="text-2xl font-bold text-white mb-6 font-mono">PORTFOLIO_SYNERGIES</h3>
              <p className="text-zinc-400 mb-8">
                Vienna OS has unique cross-portfolio synergies across the ai.ventures ecosystem.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "law.ai", role: "First vertical customer (legal AI)", color: "amber" },
                  { name: "corporate.ai", role: "Distribution channel (vendor marketplace)", color: "amber" },
                  { name: "agents.net", role: "Agent certification marketplace", color: "amber" },
                  { name: "risk.ai", role: "Complementary risk assessment", color: "amber" },
                ].map((s) => (
                  <div key={s.name} className="bg-black border border-zinc-800 p-4 text-center hover:bg-zinc-900 transition-colors">
                    <div className={`text-lg font-bold text-${s.color}-500 mb-2 font-mono`}>{s.name}</div>
                    <div className="text-xs text-zinc-500 leading-relaxed">{s.role}</div>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          {/* Contact CTA */}
          <ScrollReveal delay={0.7}>
            <section>
              <div className="bg-black border border-amber-500/30 p-10 text-center">
                <Target className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white mb-4 font-mono">WANT_TO_LEARN_MORE</h2>
                <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                  Whether you&apos;re an enterprise evaluating governance solutions,
                  an investor interested in our patent portfolio, or a developer building agents — we&apos;d love to talk.
                </p>
                <div className="flex items-center justify-center gap-6">
                  <a href="/signup" className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 font-mono font-bold uppercase text-sm shadow-lg shadow-amber-500/5">
                    Get Started Free
                  </a>
                  <a href="/contact" className="border border-amber-500/30 hover:border-amber-500 text-amber-500 font-mono font-bold uppercase text-sm px-8 py-3">
                    Contact Us
                  </a>
                </div>
              </div>
            </section>
          </ScrollReveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}