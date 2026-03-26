"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  FileCheck,
  Eye,
  BookOpen,
  Workflow,
  ArrowRight,
  CheckCircle,
  Zap,
  Users,
  Server,
  Check,
  Menu,
  X,
  BarChart3,
  Fingerprint,
  Scale,
} from "lucide-react";

/* ============================================================
   REGULATOR.AI — LANDING PAGE
   Design reference: fraud.net (visual complexity + succinctness)
   ============================================================ */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-900">

      {/* ============================================
          HERO
          ============================================ */}
      <header className="relative overflow-hidden grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-navy-900/90 to-navy-900" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16" aria-label="Main navigation">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-400" />
              <span className="text-lg font-bold text-white tracking-tight">
                Vienna<span className="text-purple-400">OS</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-5">
              {[
                ["#platform", "Platform"],
                ["#industries", "Industries"],
                ["#pricing", "Pricing"],
                ["/docs", "Docs"],
                ["/blog", "Blog"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-sm text-slate-400 hover:text-white transition">{label}</a>
              ))}
              <a href="https://console.regulator.ai" className="text-sm text-slate-400 hover:text-white transition">Console</a>
              <a href="/signup" className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition font-medium">
                Get Started
              </a>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
          {mobileMenuOpen && (
            <div className="md:hidden bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 mb-8 space-y-3">
              <a href="#platform" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Platform</a>
              <a href="#industries" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Industries</a>
              <a href="#pricing" className="block text-sm text-slate-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/docs" className="block text-sm text-slate-300">Docs</a>
              <a href="/blog" className="block text-sm text-slate-300">Blog</a>
              <a href="/signup" className="block text-sm bg-purple-600 text-white px-4 py-2 rounded-lg text-center font-medium mt-2">Get Started</a>
            </div>
          )}

          {/* Hero content */}
          <div id="main-content" className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-live" />
                <span className="text-[11px] text-emerald-400 font-medium">Live in Production</span>
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-[1.08] mb-5 tracking-tight">
              AI Governance for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Enterprises
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
              The control plane that sits between agent intent and execution.
              Policy enforcement, cryptographic warrants, operator approvals,
              and immutable audit trails — for every AI action.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a href="/signup" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm">
                Start Free <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/try" className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition font-medium text-sm border border-navy-700">
                Try Live API →
              </a>
              <a href="/docs" className="text-sm text-slate-500 hover:text-white transition ml-1">
                Read Docs
              </a>
            </div>
          </div>

          {/* Trusted by */}
          <div className="mt-14 pt-8 border-t border-navy-700/50">
            <p className="text-[11px] text-slate-600 uppercase tracking-widest mb-4 font-medium">Built for regulated industries</p>
            <div className="flex items-center gap-8 text-slate-500 text-sm flex-wrap">
              {["🏦 Financial Services", "🏥 Healthcare", "⚖️ Legal", "🏛️ Government", "🚀 DevOps"].map((v) => (
                <span key={v} className="flex items-center gap-1.5 whitespace-nowrap">{v}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          STATS BAR — Fraud.net-style big numbers
          ============================================ */}
      <section className="bg-navy-800 border-y border-navy-700 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { stat: "100%", label: "Audit Coverage", sub: "Every action logged" },
              { stat: "300+", label: "Governance Files", sub: "Full engine codebase" },
              { stat: "11", label: "Intent Actions", sub: "Governed operations" },
              { stat: "5", label: "Engine Services", sub: "Policy · Verify · Watch · Reconcile · Circuit" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{s.stat}</div>
                <div className="text-sm text-purple-400 font-semibold mb-0.5">{s.label}</div>
                <div className="text-xs text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          PLATFORM — Core capabilities
          ============================================ */}
      <section id="platform" aria-label="Platform features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">
            Complete Governance Platform
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Everything you need to govern autonomous AI agents at scale.
            Modular, extensible, and runtime-agnostic.
          </p>
        </div>

        {/* Two-column feature grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {[
            { icon: Workflow, title: "Intent Gateway", desc: "Single entry point for all agent requests. Normalizes proposals into the governed pipeline.", color: "text-blue-400", bg: "bg-blue-500/8" },
            { icon: FileCheck, title: "Policy Engine", desc: "Policy-as-code rule evaluation. Define guardrails that enforce automatically — no manual review for low-risk.", color: "text-emerald-400", bg: "bg-emerald-500/8" },
            { icon: Lock, title: "Execution Warrants", desc: "Cryptographically signed, time-limited, scope-constrained authorization. No warrant, no execution.", color: "text-amber-400", bg: "bg-amber-500/8" },
            { icon: Eye, title: "Verification Engine", desc: "Post-execution check: did the agent do exactly what the warrant authorized? Mismatches trigger alerts.", color: "text-rose-400", bg: "bg-rose-500/8" },
            { icon: BookOpen, title: "Audit Trail", desc: "Append-only immutable ledger. Every intent, policy decision, warrant, execution, and verification — permanently recorded.", color: "text-orange-400", bg: "bg-orange-500/8" },
            { icon: BarChart3, title: "Risk Tiering", desc: "T0 auto-approves. T1 needs one operator. T2 needs multi-party. Agent actions classified by blast radius.", color: "text-purple-400", bg: "bg-purple-500/8" },
          ].map((f) => (
            <div key={f.title} className={`${f.bg} border border-navy-700 rounded-xl p-5 card-hover flex gap-4`}>
              <f.icon className={`w-6 h-6 ${f.color} shrink-0 mt-0.5`} />
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline visualization */}
        <div className="doc-border rounded-2xl">
          <div className="bg-navy-800/50 rounded-2xl p-6 md:p-8">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Governance Pipeline</p>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {["Intent", "Policy", "Risk Tier", "Approval", "Warrant", "Execute", "Verify", "Audit"].map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <div className={`px-3 py-2 rounded-lg text-xs font-mono font-medium ${
                    step === "Warrant" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 seal-glow"
                    : step === "Approval" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : step === "Execute" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : step === "Verify" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-navy-900/80 text-slate-400 border border-navy-700"
                  }`}>
                    {step}
                  </div>
                  {i < 7 && <ArrowRight className="w-3 h-3 text-navy-600 pipeline-arrow" style={{ animationDelay: `${i * 0.15}s` }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warrant specimen */}
        <div className="mt-10 doc-border rounded-2xl">
          <div className="bg-navy-800/40 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 font-mono font-semibold uppercase tracking-wider">Execution Warrant</div>
                  <div className="text-[10px] text-slate-500 font-mono">wrt-7f3a2b1c-e8d4-4a9f-b2c1</div>
                </div>
              </div>
              <div className="stamp bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Verified</div>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { title: "Scope", rows: [["action", "restart_service"], ["target", "api-gateway"], ["strategy", "rolling"]] },
                { title: "Authority", rows: [["issuer", "operator:jane"], ["risk tier", "T1"], ["policy", "svc-restart-v2"]] },
                { title: "Constraints", rows: [["ttl", "300s"], ["max_retries", "1"], ["rollback", "enabled"]] },
              ].map((col) => (
                <div key={col.title}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-semibold">{col.title}</div>
                  <div className="space-y-1 font-mono text-xs">
                    {col.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}</span>
                        <span className={v === "rolling" || v === "enabled" ? "text-emerald-400" : v === "T1" ? "text-amber-400" : "text-white"}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-navy-700/40 flex items-center justify-between font-mono text-[10px] text-slate-600">
              <span>sig: 0x7f3a…b2c1 · sha256 · tamper-evident</span>
              <span>issued 14:00:00Z · expires 14:05:00Z</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          INDUSTRIES — Fraud.net-style vertical cards
          ============================================ */}
      <section id="industries" aria-label="Industries served" className="bg-navy-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Built for Regulated Industries
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              The same governance gap exists everywhere AI agents take real-world actions.
              Vienna OS fills it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: "🏦", title: "Financial Services", desc: "Wire transfers, trading, underwriting. SEC compliance, SOX audit trails. T2 multi-party approval for high-value transactions.", reg: "SEC · SOX · FINRA" },
              { icon: "🏥", title: "Healthcare", desc: "Patient record updates, clinical decisions, billing. HIPAA-scoped warrants with PHI constraints and 7-year retention.", reg: "HIPAA · HITECH" },
              { icon: "⚖️", title: "Legal", desc: "Court filings, document review, client communications. Attorney-supervisor dual approval for external submissions.", reg: "ABA Rules · Court reqs" },
              { icon: "🏛️", title: "Government", desc: "Federal AI mandates, classified system governance. Air-gapped deployment option. FedRAMP path.", reg: "NIST AI RMF · FedRAMP" },
            ].map((ind) => (
              <div key={ind.title} className="bg-navy-900 border border-navy-700 rounded-xl p-5 card-hover">
                <div className="text-2xl mb-3">{ind.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-2">{ind.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{ind.desc}</p>
                <div className="text-[10px] text-purple-400 font-mono font-medium">{ind.reg}</div>
              </div>
            ))}
          </div>

          {/* Platform breadth */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Frameworks", value: "OpenClaw · LangChain · CrewAI · AutoGen · REST" },
              { label: "Deploy", value: "Cloud · On-prem · Hybrid · Air-gapped" },
              { label: "Compliance", value: "EU AI Act · SEC · HIPAA · SOX · NIST" },
              { label: "Stack", value: "Node 22 · SQLite · Express · React · Fly.io" },
            ].map((c) => (
              <div key={c.label} className="bg-navy-900/50 border border-navy-700 rounded-lg p-4">
                <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-2">{c.label}</div>
                <div className="text-[11px] text-slate-400 font-mono leading-relaxed">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS — concise
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">How it works</h2>
            <p className="text-slate-400 text-sm mb-6">
              Vienna OS sits between agent intent and real-world execution. Agents stay autonomous within governed boundaries.
            </p>
            <div className="space-y-3">
              {[
                { icon: Fingerprint, text: "Agent submits intent to the Gateway" },
                { icon: FileCheck, text: "Policy Engine evaluates against rules" },
                { icon: Scale, text: "Risk tier assigned — T0/T1/T2" },
                { icon: Users, text: "Operator approves if T1/T2" },
                { icon: Lock, text: "Warrant issued — signed, scoped, time-limited" },
                { icon: Zap, text: "Execution router runs the action" },
                { icon: Eye, text: "Verification confirms scope compliance" },
                { icon: BookOpen, text: "Audit trail records everything" },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <step.icon className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-300">{step.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Code example */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 font-mono text-xs text-slate-300 overflow-x-auto">
            <div className="text-slate-500 mb-2">{"// Agent submits intent"}</div>
            <div><span className="text-purple-400">POST</span> <span className="text-emerald-400">/api/v1/agent/intent</span></div>
            <div className="text-amber-400">{"{"}</div>
            <div className="pl-3"><span className="text-emerald-400">action</span>: <span className="text-green-300">&quot;restart_service&quot;</span>,</div>
            <div className="pl-3"><span className="text-emerald-400">source</span>: <span className="text-green-300">&quot;your-agent&quot;</span>,</div>
            <div className="pl-3"><span className="text-emerald-400">tenant_id</span>: <span className="text-green-300">&quot;prod&quot;</span></div>
            <div className="text-amber-400">{"}"}</div>
            <div className="mt-3 text-slate-500">{"// Vienna evaluates → issues warrant → executes"}</div>
            <div className="text-amber-400">{"{"}</div>
            <div className="pl-3"><span className="text-emerald-400">success</span>: <span className="text-blue-400">true</span>,</div>
            <div className="pl-3"><span className="text-emerald-400">status</span>: <span className="text-green-300">&quot;executed&quot;</span>,</div>
            <div className="pl-3"><span className="text-emerald-400">warrant_id</span>: <span className="text-green-300">&quot;wrt-7f3a...&quot;</span>,</div>
            <div className="pl-3"><span className="text-emerald-400">verified</span>: <span className="text-blue-400">true</span></div>
            <div className="text-amber-400">{"}"}</div>
          </div>
        </div>
      </section>

      {/* ============================================
          PRICING
          ============================================ */}
      <section id="pricing" aria-label="Pricing plans" className="bg-navy-800/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Pricing</h2>
            <p className="text-slate-400">Start free. Scale as your agent fleet grows.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Community", price: "Free", period: "", desc: "Open-source core", features: ["5 agents", "Full pipeline", "Sandbox console", "Community support"], cta: "Get Started", href: "/signup?plan=community", pop: false },
              { name: "Team", price: "$49", period: "/agent/mo", desc: "Cloud-hosted teams", features: ["25 agents", "Cloud console", "Policy templates", "Email support"], cta: "Get Started", href: "/signup?plan=team", pop: false },
              { name: "Business", price: "$99", period: "/agent/mo", desc: "Governance at scale", features: ["100 agents", "Custom policies", "SSO / SAML", "Priority support"], cta: "Get Started", href: "/signup?plan=business", pop: true },
              { name: "Enterprise", price: "Custom", period: "", desc: "On-prem, unlimited", features: ["Unlimited agents", "On-premise deploy", "SLA + CSM", "SOC 2 cert"], cta: "Contact Sales", href: "/signup?plan=enterprise", pop: false },
            ].map((t) => (
              <div key={t.name} className={`rounded-xl p-5 flex flex-col ${t.pop ? "bg-purple-500/10 border-2 border-purple-500/30 relative" : "bg-navy-900 border border-navy-700"}`}>
                {t.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Popular</div>}
                <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                <div className="mb-2"><span className="text-2xl font-bold text-white">{t.price}</span>{t.period && <span className="text-xs text-slate-500">{t.period}</span>}</div>
                <p className="text-xs text-slate-500 mb-4">{t.desc}</p>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <a href={t.href} className={`text-center text-xs font-semibold px-4 py-2.5 rounded-lg transition ${t.pop ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-navy-800 hover:bg-navy-700 text-white border border-navy-600"}`}>
                  {t.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CREDIBILITY
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 flex items-start gap-4">
            <Shield className="w-8 h-8 text-purple-400 shrink-0" />
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Cornell Law × ai.ventures</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Built by a legal technologist who understands both compliance frameworks and distributed systems.</p>
            </div>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 flex items-start gap-4">
            <Server className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Production Operational</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Live at console.regulator.ai. 5 governance engines, 11 intent actions, full audit trail. Not vaporware.</p>
            </div>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 flex items-start gap-4">
            <Zap className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-white font-semibold text-sm mb-1">Runtime Agnostic</h3>
              <p className="text-xs text-slate-400 leading-relaxed">One API works with OpenClaw, LangChain, CrewAI, AutoGen, or any framework that makes HTTP requests.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA
          ============================================ */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-br from-purple-900/30 to-navy-800/50 border border-purple-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to govern your agents?</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Free tier available. No credit card. Start in under 60 seconds.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-7 py-3 rounded-xl transition font-semibold text-sm">
              Start Free
            </a>
            <a href="/try" className="bg-navy-800 hover:bg-navy-700 text-white px-7 py-3 rounded-xl transition text-sm border border-navy-700">
              Try Live API
            </a>
            <a href="/contact" className="text-sm text-slate-400 hover:text-white transition">
              Contact Sales →
            </a>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="border-t border-navy-700 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-white text-sm">ViennaOS</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The governance layer<br />agents answer to.
              </p>
            </div>
            {[
              { title: "Product", links: [["Console", "https://console.regulator.ai"], ["Try Live", "/try"], ["Docs", "/docs"], ["Integrations", "/integrations"], ["Status", "/status"]] },
              { title: "Company", links: [["About", "/about"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Contact", "/contact"], ["Security", "/security"]] },
              { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["FAQ", "/faq"]] },
              { title: "Connect", links: [["GitHub", "https://github.com/risk-ai/regulator.ai"], ["Email", "mailto:admin@ai.ventures"]] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{col.title}</h4>
                <div className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <a key={label} href={href} className="block text-xs text-slate-500 hover:text-white transition">{label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-navy-700/50 text-center">
            <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
