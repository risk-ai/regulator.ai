"use client";

import { useEffect } from "react";
import ScrollAnimator from "@/components/ScrollAnimator";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  Shield,
  CheckCircle,
  BadgeCheck,
  Building2,
  Wrench,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import HeroSection from "@/components/home/HeroSection";
import HowItWorks from "@/components/home/HowItWorks";
import TieredRisk from "@/components/home/TieredRisk";
import CoreCapabilities from "@/components/home/CoreCapabilities";
import BeforeAfter from "@/components/home/BeforeAfter";

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


      <ScrollAnimator />
      <SiteNav />
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />

        <TieredRisk />
        <CoreCapabilities />

        {/* INTEGRATION */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl scroll-reveal">
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
            <div className="mb-16 max-w-2xl mx-auto text-center scroll-reveal">
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

        <BeforeAfter />
        {/* COMPLIANCE AS BUYING TRIGGER */}
        <section className="py-24 bg-zinc-950/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl scroll-reveal">
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
            <div className="mb-16 max-w-2xl scroll-reveal">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Built for Your Role
              </h2>
              <p className="text-zinc-400">
                Different teams, same governance platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 scroll-reveal">
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
            <div className="mb-16 max-w-2xl scroll-reveal">
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Industry Solutions</div>
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Without Governance, AI Cannot Operate
              </h2>
              <p className="text-zinc-400">
                Every regulated industry needs verifiable control over autonomous systems. Vienna provides it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover delay-100">
                <div className="text-2xl mb-4">🏦</div>
                <h3 className="text-lg font-bold mb-2">Financial Services</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  Pre-trade authorization, transaction limits, multi-sig for high-value operations. SEC/FINRA compliant audit trails.
                </p>
                <div className="text-xs font-mono text-violet-400">T2: wire_transfer {'>'}$50K → CFO approval</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <div className="text-2xl mb-4">🏥</div>
                <h3 className="text-lg font-bold mb-2">Healthcare</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  PHI access controls, treatment recommendation governance, HIPAA-compliant execution records with cryptographic proof.
                </p>
                <div className="text-xs font-mono text-violet-400">T3: access_phi → privacy_officer + attending</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <div className="text-2xl mb-4">⚖️</div>
                <h3 className="text-lg font-bold mb-2">Legal</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-3">
                  Document filing controls, privilege enforcement, matter-scoped agent authorization with complete chain of custody.
                </p>
                <div className="text-xs font-mono text-violet-400">T2: file_motion → partner approval</div>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
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
            <div className="mb-16 max-w-2xl mx-auto text-center scroll-reveal">
              <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
                Start Free. Scale as Your Fleet Grows.
              </h2>
              <p className="text-zinc-400">
                No credit card required. Upgrade when you need fleet management and enterprise controls.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover delay-100">
                <h3 className="text-lg font-bold mb-1">Community</h3>
                <div className="text-3xl font-display font-bold mb-4">Free</div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 5 agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 1,000 evaluations/mo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Full governance pipeline</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Community support</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-violet-500/20 card-hover relative overflow-hidden">
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
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
                <h3 className="text-lg font-bold mb-1">Business</h3>
                <div className="text-3xl font-display font-bold mb-4">$99<span className="text-lg text-zinc-500">/mo</span></div>
                <ul className="space-y-2 text-sm text-zinc-500">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> 100 agents</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Unlimited evaluations</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Compliance reports</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> SSO + RBAC</li>
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 card-hover">
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
