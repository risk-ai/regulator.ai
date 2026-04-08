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
import { useEffect, useRef } from "react";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

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
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />

      <main className="font-mono flex-1 max-w-5xl mx-auto px-6 py-16">
        {/* Mission Hero */}
        <section className="mb-24">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-mono font-bold mb-8 tracking-tight">
                <span className="text-gray-400">AI_AGENTS_SHOULD_BE</span>
                <br />
                <span className="text-amber-500">
                  GOVERNED_NOT_GUARDRAILED
                </span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
                Vienna OS exists because the AI industry has a governance gap.
                As enterprises deploy autonomous agents, there's no standardized
                layer for approval workflows, policy enforcement, or audit trails.
                <strong className="text-gray-300"> We're building that layer.</strong>
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* Core Thesis */}
        <ScrollReveal delay={0.2}>
          <section className="mb-24">
            <div className="bg-black border border-amber-500/30 p-8 md:p-10">
              <div className="flex items-start gap-6 mb-8">
                <Scale className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-mono font-bold text-amber-500 mb-4">OUR_THESIS</h2>
                  <p className="text-lg text-gray-400 leading-relaxed mb-4 font-mono">
                    Content guardrails filter what AI <em className="text-amber-500">says</em>. Governance controls
                    what AI <em className="text-amber-500">does</em>. As agents move from demos to production — executing
                    real transactions, deploying real code, sending real communications —
                    the question shifts from <span className="text-gray-300">"Is the output safe?"</span> to{" "}
                    <span className="text-gray-300">"Is the action authorized?"</span>
                  </p>
                </div>
              </div>
              <div className="bg-black/50 border border-amber-500/10 p-6">
                <div className="font-mono text-lg text-amber-500 text-center">
                  AI_EXPLAINS → RUNTIME_EXECUTES → OPERATOR_APPROVES
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Patent & IP */}
        <ScrollReveal delay={0.3}>
          <section className="mb-24">
            <div className="bg-black border border-amber-500/30 p-8">
              <div className="flex items-start gap-6">
                <FileText className="w-10 h-10 text-amber-500 shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-mono font-bold text-amber-500 mb-4 flex items-center gap-3">
                    PATENTED_INNOVATION
                    <Award className="w-6 h-6 text-amber-500" />
                  </h2>
                  <p className="text-lg text-gray-400 leading-relaxed mb-4 font-mono">
                    Vienna OS's warrant-based governance architecture is protected by
                    <strong className="text-amber-500"> USPTO Patent Application #64/018,152</strong>.
                    The invention covers the cryptographic warrant system, scope-constrained authorization,
                    and post-execution verification that makes Vienna unique.
                  </p>
                  <div className="text-sm text-gray-500 bg-black/50 border border-amber-500/10 p-4 font-mono">
                    <strong className="text-amber-500">FILING:</strong> "Methods and Systems for Warrant-Based Autonomous Agent Governance"
                    <br />
                    <strong className="text-amber-500">FILED:</strong> March 2026 • <strong className="text-amber-500">STATUS:</strong> Patent Pending
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Market Timing */}
        <ScrollReveal delay={0.4}>
          <section className="mb-24">
            <h2 className="text-3xl font-mono font-bold text-center mb-12 text-amber-500">
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
                <div key={item.title} className="bg-black border border-amber-500/10 p-6 hover:border-amber-500/30 transition-colors group">
                  <item.icon className="w-8 h-8 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-amber-500 font-mono font-bold mb-3 text-lg">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed font-mono">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Team */}
        <ScrollReveal delay={0.5}>
          <section className="mb-24">
            <h2 className="text-3xl font-mono font-bold text-center mb-12 text-amber-500">
              CORNELL_LAW_X_AI_VENTURES
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black border border-amber-500/30 p-8 hover:border-amber-500/50 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold text-xl">MAX_ANDERSON</h3>
                    <p className="text-amber-500 font-mono font-bold">FOUNDER_LEAD_DEVELOPER</p>
                    <p className="text-gray-600 text-sm font-mono">CORNELL_LAW_SCHOOL_3L</p>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed font-mono text-sm">
                  Built Vienna OS from the conviction that legal frameworks and distributed systems 
                  share the same primitives: <strong className="text-white">authority, scope, evidence, and accountability</strong>. 
                  Combines formal legal training with deep technical expertise in distributed governance.
                </p>
              </div>
              
              <div className="bg-black border border-amber-500/30 p-8 hover:border-amber-500/50 transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-mono font-bold text-xl">AI_VENTURES</h3>
                    <p className="text-amber-500 font-mono font-bold">PLATFORM_OPERATIONS</p>
                    <p className="text-gray-600 text-sm font-mono">TECHNETWORK_2_LLC</p>
                  </div>
                </div>
                <p className="text-gray-400 leading-relaxed font-mono text-sm">
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
            <h3 className="text-2xl font-mono font-bold text-amber-500 mb-6">PORTFOLIO_SYNERGIES</h3>
            <p className="text-gray-500 mb-8 font-mono">
              Vienna OS has unique cross-portfolio synergies across the ai.ventures ecosystem.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "law.ai", role: "First vertical customer (legal AI)" },
                { name: "corporate.ai", role: "Distribution channel (vendor marketplace)" },
                { name: "agents.net", role: "Agent certification marketplace" },
                { name: "risk.ai", role: "Complementary risk assessment" },
              ].map((s) => (
                <div key={s.name} className="bg-black border border-amber-500/10 p-4 text-center hover:bg-black/50 hover:border-amber-500/30 transition-colors">
                  <div className="text-lg font-mono font-bold text-amber-500 mb-2">{s.name}</div>
                  <div className="text-xs text-gray-600 leading-relaxed font-mono">{s.role}</div>
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
              <h2 className="text-3xl font-mono font-bold text-amber-500 mb-4">WANT_TO_LEARN_MORE?</h2>
              <p className="text-gray-500 text-lg mb-8 max-w-2xl mx-auto leading-relaxed font-mono">
                Whether you're an enterprise evaluating governance solutions,
                an investor interested in our patent portfolio, or a developer building agents — we'd love to talk.
              </p>
              <div className="flex items-center justify-center gap-6">
                <a href="/signup" className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 transition font-mono font-bold uppercase">
                  GET_STARTED_FREE
                </a>
                <a href="/contact" className="bg-black border border-amber-500/30 hover:border-amber-500/50 text-amber-500 px-8 py-3 transition font-mono font-bold uppercase">
                  CONTACT_US
                </a>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>
      
      <SiteFooter />
    </div>
  );
}
