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
import { useEffect, useRef } from "react";

/* ============================================================
   SCROLL REVEAL ANIMATION
   ============================================================ */

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Navigation */}
      <nav className="border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-gold-400" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent">OS</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
            <a href="/signup" className="text-sm bg-gold-400/20 text-gold-400 hover:bg-gold-400/30 px-4 py-2 rounded-lg transition font-medium">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Mission Hero */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight">
                <span className="text-white">AI agents should be</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-400 to-blue-500">
                  governed, not guardrailed
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
                Vienna OS exists because the AI industry has a governance gap.
                As enterprises deploy autonomous agents, there&apos;s no standardized
                layer for approval workflows, policy enforcement, or audit trails.
                <strong className="text-slate-300"> We&apos;re building that layer.</strong>
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* Core Thesis */}
        <ScrollReveal delay={0.2}>
          <section className="mb-24">
            <div className="bg-gradient-to-br from-gold-900/20 to-navy-800 border border-gold-400/30 rounded-2xl p-8 md:p-10">
              <div className="flex items-start gap-6 mb-8">
                <Scale className="w-10 h-10 text-gold-400 shrink-0 mt-1 seal-glow" />
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Our Thesis</h2>
                  <p className="text-lg text-slate-300 leading-relaxed mb-4">
                    Content guardrails filter what AI <em className="text-gold-400">says</em>. Governance controls
                    what AI <em className="text-gold-400">does</em>. As agents move from demos to production — executing
                    real transactions, deploying real code, sending real communications —
                    the question shifts from <span className="text-slate-200">&quot;Is the output safe?&quot;</span> to{" "}
                    <span className="text-slate-200">&quot;Is the action authorized?&quot;</span>
                  </p>
                </div>
              </div>
              <div className="bg-navy-800/50 border border-gold-400/20 rounded-xl p-6">
                <div className="font-mono text-lg text-gold-400 text-center">
                  AI explains → Runtime executes → Operator approves
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Patent & IP */}
        <ScrollReveal delay={0.3}>
          <section className="mb-24">
            <div className="bg-gradient-to-br from-gold-400/10 to-navy-800 border border-gold-400/30 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <FileText className="w-10 h-10 text-gold-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    Patented Innovation
                    <Award className="w-6 h-6 text-gold-400" />
                  </h2>
                  <p className="text-lg text-slate-300 leading-relaxed mb-4">
                    Vienna OS&apos;s warrant-based governance architecture is protected by
                    <strong className="text-gold-400"> USPTO Patent Application #64/018,152</strong>.
                    The invention covers the cryptographic warrant system, scope-constrained authorization,
                    and post-execution verification that makes Vienna unique.
                  </p>
                  <div className="text-sm text-slate-400 bg-navy-800/50 rounded-lg p-4 border border-gold-400/20">
                    <strong className="text-gold-400">Filing:</strong> &quot;Methods and Systems for Warrant-Based Autonomous Agent Governance&quot;
                    <br />
                    <strong className="text-gold-400">Filed:</strong> March 2026 • <strong className="text-gold-400">Status:</strong> Patent Pending
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Market Timing */}
        <ScrollReveal delay={0.4}>
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                Why Now
              </span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "Agent Explosion",
                  desc: "Every major AI lab shipped agent frameworks in 2025-2026. 60%+ of Fortune 500 are experimenting. The governance gap is visible at scale.",
                  color: "gold",
                },
                {
                  icon: Scale,
                  title: "Regulation Arrives",
                  desc: "EU AI Act enforcement (2026), SEC AI guidance, NIST AI RMF — all demanding transparency, human oversight, and audit trails.",
                  color: "blue",
                },
                {
                  icon: Lightbulb,
                  title: "Insurance Pressure",
                  desc: "Cyber insurers are asking: 'How do you govern your AI agents?' Companies without answers face higher premiums or coverage denials.",
                  color: "emerald",
                },
              ].map((item) => (
                <div key={item.title} className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-navy-600 transition-colors group">
                  <item.icon className={`w-8 h-8 text-${item.color}-400 mb-4 group-hover:scale-110 transition-transform`} />
                  <h3 className="text-white font-semibold mb-3 text-lg">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Team */}
        <ScrollReveal delay={0.5}>
          <section className="mb-24">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                Cornell Law × ai.ventures
              </span>
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 hover:border-gold-400/30 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gold-400/20 border border-gold-400/40 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-gold-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Max Anderson</h3>
                    <p className="text-gold-400 font-medium">Founder & Lead Developer</p>
                    <p className="text-slate-500 text-sm">Cornell Law School 3L</p>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Built Vienna OS from the conviction that legal frameworks and distributed systems 
                  share the same primitives: <strong className="text-white">authority, scope, evidence, and accountability</strong>. 
                  Combines formal legal training with deep technical expertise in distributed governance.
                </p>
              </div>
              
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">ai.ventures</h3>
                    <p className="text-blue-400 font-medium">Platform & Operations</p>
                    <p className="text-slate-500 text-sm">Technetwork 2 LLC</p>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed">
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
            <h3 className="text-2xl font-bold text-white mb-6">Portfolio Synergies</h3>
            <p className="text-slate-400 mb-8">
              Vienna OS has unique cross-portfolio synergies across the ai.ventures ecosystem.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "law.ai", role: "First vertical customer (legal AI)", color: "gold" },
                { name: "corporate.ai", role: "Distribution channel (vendor marketplace)", color: "blue" },
                { name: "agents.net", role: "Agent certification marketplace", color: "emerald" },
                { name: "risk.ai", role: "Complementary risk assessment", color: "gold" },
              ].map((s) => (
                <div key={s.name} className="bg-navy-800/70 border border-navy-600 rounded-xl p-4 text-center hover:bg-navy-700/70 transition-colors">
                  <div className={`text-lg font-bold text-${s.color}-400 mb-2`}>{s.name}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{s.role}</div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Contact CTA */}
        <ScrollReveal delay={0.7}>
          <section>
            <div className="bg-gradient-to-br from-gold-900/30 to-navy-800 border border-gold-400/30 rounded-2xl p-10 text-center">
              <Target className="w-12 h-12 text-gold-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Want to learn more?</h2>
              <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                Whether you&apos;re an enterprise evaluating governance solutions,
                an investor interested in our patent portfolio, or a developer building agents — we&apos;d love to talk.
              </p>
              <div className="flex items-center justify-center gap-6">
                <a href="/signup" className="bg-gold-400 hover:bg-gold-300 text-white px-8 py-3 rounded-xl transition font-semibold shadow-lg hover:shadow-gold-400/25">
                  Get Started Free
                </a>
                <a href="/contact" className="bg-navy-700 hover:bg-navy-600 text-white px-8 py-3 rounded-xl transition font-semibold border border-navy-600 hover:border-navy-500">
                  Contact Us
                </a>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>
    </div>
  );
}
