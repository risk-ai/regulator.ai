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
  GraduationCap,
  Building2,
  Globe,
  Menu,
  X,
} from "lucide-react";

const coreServices = [
  {
    icon: Workflow,
    name: "Intent Gateway",
    desc: "Canonical entry point for all agent requests. Normalizes proposals into governed execution pipeline.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: FileCheck,
    name: "Policy Engine",
    desc: "Policy-as-code rule evaluation. Define guardrails, enforce them automatically.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Lock,
    name: "Execution Warrants",
    desc: "Cryptographic authorization issuance. No warrant, no execution.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: Server,
    name: "State Graph",
    desc: "Canonical system state. Single source of truth for execution, objectives, and governance.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    icon: Eye,
    name: "Verification Engine",
    desc: "Confirms execution matched intent. Trust, but verify.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  {
    icon: BookOpen,
    name: "Audit Trail",
    desc: "Append-only permanent event ledger. Every action recorded forever.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const governanceFeatures = [
  {
    icon: Users,
    name: "Multi-Tenant Identity",
    desc: "Tenant-based isolation with cost tracking and quota enforcement.",
    color: "text-cyan-400",
  },
  {
    icon: Zap,
    name: "Operator Approval",
    desc: "T1/T2 approval workflow for high-impact actions. Operators authorize, agents execute.",
    color: "text-purple-400",
  },
  {
    icon: Shield,
    name: "Simulation Mode",
    desc: "Test agent proposals in dry-run mode. No side effects, full governance validation.",
    color: "text-emerald-400",
  },
];

const riskTiers = [
  {
    tier: "T0",
    label: "Reversible / Low-Stakes",
    example: "Log reads, status checks, internal queries",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
  },
  {
    tier: "T1",
    label: "Moderate Stakes",
    example: "Config updates, service restarts, data writes",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    approval: true,
  },
  {
    tier: "T2",
    label: "Irreversible / High-Impact",
    example: "Production deployments, payments, data deletion",
    color: "text-red-400",
    bg: "bg-red-500/10",
    approval: true,
  },
];

const lifecycle = [
  "Intent",
  "Policy",
  "Plan",
  "Warrant",
  "Execute",
  "Verify",
  "Learn",
];

const pricingTiers = [
  {
    name: "Community",
    price: "Free",
    period: "",
    desc: "Open-source core, self-hosted",
    features: [
      "Up to 5 agents",
      "Full governance pipeline",
      "SQLite state graph",
      "Community support",
      "Self-hosted deployment",
    ],
    cta: "Get Started Free",
    href: "/signup?plan=community",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$49",
    period: "/agent/mo",
    desc: "Cloud-hosted for growing teams",
    features: [
      "Up to 25 agents",
      "Cloud-hosted console",
      "Basic policy templates",
      "Email support",
      "SSE real-time streaming",
    ],
    cta: "Get Started",
    href: "/signup?plan=team",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$99",
    period: "/agent/mo",
    desc: "Advanced governance at scale",
    features: [
      "Up to 100 agents",
      "Custom policy engine rules",
      "SSO / SAML",
      "Priority support",
      "Advanced audit exports",
    ],
    cta: "Get Started",
    href: "/signup?plan=business",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "On-prem, unlimited, dedicated",
    features: [
      "Unlimited agents",
      "On-premise deployment",
      "SLA & dedicated CSM",
      "Compliance certs (SOC 2)",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/signup?plan=enterprise",
    highlighted: false,
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-navy-900 to-blue-900/20" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              <span className="text-xl font-bold text-white tracking-tight">
                Vienna<span className="text-purple-400">OS</span>
              </span>
            </div>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#services" className="text-sm text-slate-400 hover:text-white transition">Core Services</a>
              <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
              <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
              <a href="/blog" className="text-sm text-slate-400 hover:text-white transition">Blog</a>
              <a href="/security" className="text-sm text-slate-400 hover:text-white transition">Security</a>
              <a
                href="https://vienna-os.fly.dev"
                className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium"
              >
                Console
              </a>
            </div>
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 bg-navy-900/95 backdrop-blur border-b border-navy-700 px-6 py-4 space-y-3 z-50">
              <a href="#services" className="block text-sm text-slate-400 hover:text-white transition" onClick={() => setMobileMenuOpen(false)}>Core Services</a>
              <a href="#pricing" className="block text-sm text-slate-400 hover:text-white transition" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="/docs" className="block text-sm text-slate-400 hover:text-white transition">Docs</a>
              <a href="/blog" className="block text-sm text-slate-400 hover:text-white transition">Blog</a>
              <a href="/security" className="block text-sm text-slate-400 hover:text-white transition">Security</a>
              <a href="https://vienna-os.fly.dev" className="block text-sm text-purple-400 font-medium">Console</a>
              <a href="/signup" className="block text-sm bg-purple-600 text-white px-4 py-2 rounded-lg text-center font-medium">Get Started</a>
            </div>
          )}

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-400 font-medium">
                Governed AI Execution Layer
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              The control plane
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                agents answer to.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl">
              Enterprise-grade governance layer for autonomous AI systems.
              Agents propose, Vienna enforces policy, operators approve
              high-stakes actions. No warrant, no execution.
            </p>

            {/* Lifecycle flow */}
            <div className="flex items-center gap-2 flex-wrap">
              {lifecycle.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono px-3 py-1.5 rounded-lg ${
                      step === "Warrant"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-navy-800 text-slate-400 border border-navy-700"
                    }`}
                  >
                    {step}
                  </span>
                  {i < lifecycle.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-navy-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Core Services */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">Core Services</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Vienna OS provides a complete governance layer for AI agents. Each
          service enforces separation of concerns between reasoning and
          execution authority.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreServices.map((s) => (
            <div
              key={s.name}
              className={`${s.bg} border ${s.border} rounded-xl p-6 hover:scale-[1.02] transition-transform`}
            >
              <s.icon className={`w-6 h-6 ${s.color} mb-4`} />
              <h3 className="text-white font-semibold mb-2">{s.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Governance Features */}
      <section id="governance" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">
          Governance Layer
        </h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Vienna OS enforces identity, policy, quotas, and approval workflows.
          Multi-tenant by design, production-ready from day one.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {governanceFeatures.map((f) => (
            <div
              key={f.name}
              className="bg-navy-800 border border-navy-700 rounded-xl p-6"
            >
              <f.icon className={`w-8 h-8 ${f.color} mb-4`} />
              <h3 className="text-white font-semibold mb-2">{f.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Risk Tiers */}
      <section id="risk-tiers" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">Risk Tiers</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Every action is classified by risk level. Higher tiers require
          operator approval. Agents cannot bypass governance.
        </p>
        <div className="space-y-3">
          {riskTiers.map((t) => (
            <div
              key={t.tier}
              className={`${t.bg} border border-navy-700 rounded-xl p-5 flex items-center gap-6`}
            >
              <div
                className={`text-2xl font-bold ${t.color} w-16 text-center`}
              >
                {t.tier}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{t.label}</h3>
                <p className="text-sm text-slate-500">{t.example}</p>
              </div>
              {t.approval && (
                <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">
                    Approval Required
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">How It Works</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Vienna OS sits between agent intent and real-world execution. Agents
          remain autonomous within governed boundaries.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {[
              {
                icon: CheckCircle,
                text: "Intent Gateway — Canonical entry for all agent requests",
              },
              {
                icon: CheckCircle,
                text: "Policy Engine — Guardrails enforced automatically",
              },
              {
                icon: CheckCircle,
                text: "Operator Approval — T1/T2 actions require authorization",
              },
              {
                icon: CheckCircle,
                text: "Execution Warrants — Cryptographically signed, time-limited",
              },
              {
                icon: CheckCircle,
                text: "Verification — Every action verified post-execution",
              },
              {
                icon: CheckCircle,
                text: "Audit Trail — Permanent append-only ledger",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-300">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="font-mono text-sm space-y-2">
              <div className="text-slate-500">
                {"// Agent submits intent"}
              </div>
              <div>
                <span className="text-purple-400">POST</span>{" "}
                <span className="text-green-300">
                  {"/api/v1/agent/intent"}
                </span>
              </div>
              <div>
                <span className="text-amber-400">{"{"}</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">action</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"restart_service"'}</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">source</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"openclaw"'}</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">tenant_id</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"prod"'}</span>
              </div>
              <div>
                <span className="text-amber-400">{"}"}</span>
              </div>
              <div className="mt-3 text-slate-500">
                {"// Vienna evaluates policy + issues warrant"}
              </div>
              <div>
                <span className="text-amber-400">{"{"}</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">success</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-blue-400">true</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">status</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"executed"'}</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">execution_id</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"exec-a3f2..."'}</span>
              </div>
              <div>
                <span className="text-amber-400">{"}"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">
          Production Ready
        </h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Vienna OS is operational in production. Agent Intent Layer supports
          11 actions, multi-tenant isolation, and full governance pipeline.
        </p>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-white mb-2">111/111</div>
              <div className="text-sm text-slate-400">
                Integration tests passing
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">Phase 28</div>
              <div className="text-sm text-slate-400">
                Real external integration proven
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">
                Multi-Tenant
              </div>
              <div className="text-sm text-slate-400">
                Identity, quotas, cost tracking
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">Pricing</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Start free with the open-source core. Scale to cloud-hosted or
          on-premise as your agent fleet grows.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 flex flex-col ${
                tier.highlighted
                  ? "bg-purple-500/10 border-2 border-purple-500/40 relative"
                  : "bg-navy-800 border border-navy-700"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-white font-semibold text-lg mb-1">
                {tier.name}
              </h3>
              <div className="mb-3">
                <span className="text-3xl font-bold text-white">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-slate-500">{tier.period}</span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-6">{tier.desc}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={tier.href}
                className={`text-center text-sm font-medium px-4 py-2.5 rounded-lg transition ${
                  tier.highlighted
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-navy-700 hover:bg-navy-600 text-white border border-navy-600"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Credibility */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-8">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-4">
              <GraduationCap className="w-10 h-10 text-purple-400 shrink-0" />
              <div>
                <h3 className="text-white font-semibold">Cornell Law × ai.ventures</h3>
                <p className="text-sm text-slate-400">
                  Built by a legal technologist who understands both compliance
                  and distributed systems.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Building2 className="w-10 h-10 text-blue-400 shrink-0" />
              <div>
                <h3 className="text-white font-semibold">Enterprise-First</h3>
                <p className="text-sm text-slate-400">
                  Designed for regulated industries: financial services,
                  healthcare, legal, government.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Globe className="w-10 h-10 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-white font-semibold">Runtime Agnostic</h3>
                <p className="text-sm text-slate-400">
                  Works with OpenClaw, LangChain, CrewAI, AutoGen, or your
                  custom agent framework.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to govern your agents?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Vienna OS is operational in production. Access the console to
            deploy governed AI execution for your organization.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://vienna-os.fly.dev"
              className="inline-flex items-center gap-2 bg-navy-700 hover:bg-navy-600 text-white px-8 py-3 rounded-xl transition font-medium border border-navy-600"
            >
              Open Console
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-500">
                Vienna OS — Governed AI Execution Layer
              </span>
            </div>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <a href="/docs" className="text-xs text-slate-600 hover:text-slate-400 transition">Docs</a>
              <a href="/blog" className="text-xs text-slate-600 hover:text-slate-400 transition">Blog</a>
              <a href="/security" className="text-xs text-slate-600 hover:text-slate-400 transition">Security</a>
              <a href="https://github.com/risk-ai/regulator.ai" className="text-xs text-slate-600 hover:text-slate-400 transition">GitHub</a>
              <a href="/terms" className="text-xs text-slate-600 hover:text-slate-400 transition">Terms</a>
              <a href="/privacy" className="text-xs text-slate-600 hover:text-slate-400 transition">Privacy</a>
              <span className="text-xs text-slate-600">
                © 2026 ai.ventures. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
