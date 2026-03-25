import {
  Shield,
  ArrowLeft,
  GraduationCap,
  Building2,
  Users,
  Target,
  Lightbulb,
  Scale,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Vienna OS is built by ai.ventures — the governance layer for autonomous AI systems.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-navy-900 grid-bg">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/50 to-navy-900 pointer-events-none" />
      <nav className="relative border-b border-navy-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
          <a href="/signup" className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium">
            Get Started
          </a>
        </div>
      </nav>

      <main className="relative max-w-4xl mx-auto px-6 py-16">
        {/* Mission */}
        <section className="mb-20">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            AI agents should be governed,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              not just guardrailed.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
            Vienna OS exists because the AI industry has a governance gap.
            As enterprises deploy autonomous agents, there&apos;s no standardized
            layer for approval workflows, policy enforcement, or audit trails.
            We&apos;re building that layer.
          </p>
        </section>

        {/* Thesis */}
        <section className="mb-20">
          <div className="gradient-border rounded-2xl">
            <div className="bg-navy-800 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <Scale className="w-8 h-8 text-amber-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Our Thesis</h2>
                  <p className="text-slate-400 leading-relaxed">
                    Content guardrails filter what AI <em>says</em>. Governance controls
                    what AI <em>does</em>. As agents move from demos to production — executing
                    real transactions, deploying real code, sending real communications —
                    the question shifts from &quot;Is the output safe?&quot; to
                    &quot;Is the action authorized?&quot;
                  </p>
                </div>
              </div>
              <div className="font-mono text-sm text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-3">
                AI explains → Runtime executes → Operator approves.
              </div>
            </div>
          </div>
        </section>

        {/* Why now */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Why now</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                title: "Agent Explosion",
                desc: "Every major AI lab shipped agent frameworks in 2025-2026. 60%+ of Fortune 500 are experimenting. The governance gap is visible at scale.",
              },
              {
                icon: Scale,
                title: "Regulation Arrives",
                desc: "EU AI Act enforcement (2026), SEC AI guidance, NIST AI RMF — all demanding transparency, human oversight, and audit trails.",
              },
              {
                icon: Lightbulb,
                title: "Insurance Pressure",
                desc: "Cyber insurers are asking: 'How do you govern your AI agents?' Companies without answers face higher premiums or coverage denials.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <item.icon className="w-6 h-6 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Team</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Max Anderson</h3>
                  <p className="text-xs text-purple-400">Founder & Lead Developer</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cornell Law 3L. Built Vienna OS from the conviction that
                legal frameworks and distributed systems share the same
                primitives: authority, scope, evidence, and accountability.
              </p>
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">ai.ventures</h3>
                  <p className="text-xs text-blue-400">Platform & Operations</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Portfolio company of ai.ventures (Technetwork 2 LLC).
                Shared infrastructure, agent pool, and cross-portfolio
                synergies across 12 AI-focused sites.
              </p>
            </div>
          </div>
        </section>

        {/* Portfolio synergies */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-4">Portfolio synergies</h2>
          <p className="text-slate-400 text-sm mb-6">
            Vienna OS has unique synergies across the ai.ventures portfolio.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "law.ai", role: "First vertical customer (legal AI)" },
              { name: "corporate.ai", role: "Distribution channel (vendor marketplace)" },
              { name: "agents.net", role: "Agent certification marketplace" },
              { name: "risk.ai", role: "Complementary risk assessment" },
            ].map((s) => (
              <div key={s.name} className="bg-navy-800/50 border border-navy-700 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-white mb-1">{s.name}</div>
                <div className="text-xs text-slate-500">{s.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gradient-to-br from-purple-900/30 to-navy-800/50 border border-purple-500/20 rounded-2xl p-8 text-center">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Want to learn more?</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Whether you&apos;re an enterprise evaluating governance solutions,
              an investor, or a developer building agents — we&apos;d love to talk.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm">
                Get Started Free
              </a>
              <a href="/contact" className="bg-navy-700 hover:bg-navy-600 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm border border-navy-600">
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
