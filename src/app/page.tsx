import {
  Shield,
  Lock,
  FileCheck,
  Eye,
  BookOpen,
  Workflow,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const services = [
  {
    icon: Workflow,
    name: "Proposal Gateway",
    desc: "Entry point for all agent proposals. Every action starts here.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Shield,
    name: "Governance Kernel",
    desc: "Central state machine orchestration. The brain of the control plane.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
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
    name: "Warrant Authority",
    desc: "Cryptographic authorization issuance. No warrant, no execution.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: ArrowRight,
    name: "Execution Router",
    desc: "Routes signed warrants to execution adapters. The last mile.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
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
    name: "Audit & Learning",
    desc: "Append-only permanent event ledger. Every action recorded forever.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const riskTiers = [
  { tier: 0, label: "Internal Reasoning", example: "Agent planning, chain-of-thought", color: "text-slate-400", bg: "bg-slate-500/10" },
  { tier: 1, label: "Read-Only Operations", example: "Database queries, API reads", color: "text-blue-400", bg: "bg-blue-500/10" },
  { tier: 2, label: "Moderate Changes", example: "Config updates, data writes", color: "text-amber-400", bg: "bg-amber-500/10" },
  { tier: 3, label: "High-Impact / External", example: "Email sends, deployments, payments", color: "text-red-400", bg: "bg-red-500/10" },
];

const lifecycle = [
  "Truth",
  "Plan",
  "Validate",
  "Warrant",
  "Execute",
  "Verify",
  "Learn",
];

export default function Home() {
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
                Regulator<span className="text-purple-400">.ai</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#services" className="text-sm text-slate-400 hover:text-white transition">
                Services
              </a>
              <a href="#lifecycle" className="text-sm text-slate-400 hover:text-white transition">
                Lifecycle
              </a>
              <a href="#risk-tiers" className="text-sm text-slate-400 hover:text-white transition">
                Risk Tiers
              </a>
              <a
                href="#contact"
                className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium"
              >
                Request Access
              </a>
            </div>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-400 font-medium">
                Vienna Governance System
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              The governance layer
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                agents answer to.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-2xl">
              Enterprise-grade control plane that separates reasoning authority
              from execution authority. Agents propose — Regulator authorizes
              through cryptographically signed warrants. No warrant, no
              execution.
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

      {/* Seven Services */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">Seven Services</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Each service is independently deployable, horizontally scalable, and
          communicates through an event-driven architecture.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
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

      {/* Risk Tiers */}
      <section id="risk-tiers" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">Risk Tiers</h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Every agent action is classified by risk level. Higher tiers require
          stricter policy checks and more authoritative warrants.
        </p>
        <div className="space-y-3">
          {riskTiers.map((t) => (
            <div
              key={t.tier}
              className={`${t.bg} border border-navy-700 rounded-xl p-5 flex items-center gap-6`}
            >
              <div
                className={`text-2xl font-bold ${t.color} w-12 text-center`}
              >
                {t.tier}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{t.label}</h3>
                <p className="text-sm text-slate-500">{t.example}</p>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {Array.from({ length: t.tier + 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${t.bg} border ${
                      t.tier === 3
                        ? "border-red-500/50"
                        : t.tier === 2
                        ? "border-amber-500/50"
                        : t.tier === 1
                        ? "border-blue-500/50"
                        : "border-slate-500/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="lifecycle" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white mb-2">
          How It Works
        </h2>
        <p className="text-slate-500 mb-12 max-w-2xl">
          Regulator sits between agent intent and real-world execution.
          It&apos;s a control plane, not a replacement for agents.
        </p>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {[
              { icon: CheckCircle, text: "Audit trails for full compliance" },
              { icon: CheckCircle, text: "Policy enforcement as guardrails" },
              { icon: CheckCircle, text: "Warrant expiration prevents stale authorizations" },
              { icon: CheckCircle, text: "Learning loop improves governance over time" },
              { icon: CheckCircle, text: "Event-driven — integrates without rearchitecting" },
              { icon: CheckCircle, text: "Policy-as-code for flexible rule definition" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-300">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="font-mono text-sm space-y-2">
              <div className="text-slate-500">{"// Agent proposes an action"}</div>
              <div>
                <span className="text-purple-400">const</span>{" "}
                <span className="text-white">proposal</span>{" "}
                <span className="text-slate-500">=</span>{" "}
                <span className="text-amber-400">{"{"}</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">agent</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"ellie-email"'}</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">action</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-green-300">{'"send_campaign"'}</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">riskTier</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-amber-400">3</span>
                <span className="text-slate-500">,</span>
              </div>
              <div className="pl-4">
                <span className="text-emerald-400">recipients</span>
                <span className="text-slate-500">:</span>{" "}
                <span className="text-amber-400">2847</span>
              </div>
              <div>
                <span className="text-amber-400">{"}"}</span>
              </div>
              <div className="mt-3 text-slate-500">{"// Regulator evaluates & issues warrant"}</div>
              <div>
                <span className="text-purple-400">const</span>{" "}
                <span className="text-white">warrant</span>{" "}
                <span className="text-slate-500">=</span>{" "}
                <span className="text-purple-400">await</span>{" "}
                <span className="text-blue-400">regulator</span>
                <span className="text-slate-500">.</span>
                <span className="text-amber-400">authorize</span>
                <span className="text-slate-500">(</span>
                <span className="text-white">proposal</span>
                <span className="text-slate-500">)</span>
              </div>
              <div className="mt-3 text-slate-500">{"// ✅ Signed warrant with expiration"}</div>
              <div className="text-emerald-400/60 text-xs mt-1">
                {"warrant.signature: 0x7f3a...b2c1"}
              </div>
              <div className="text-emerald-400/60 text-xs">
                {"warrant.expiresAt: 2026-03-14T19:00:00Z"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to govern your agents?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Regulator.AI is currently in private beta. Request access to be among
            the first to deploy enterprise-grade agent governance.
          </p>
          <a
            href="mailto:admin@ai.ventures?subject=Regulator.AI%20Access%20Request"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-medium"
          >
            Request Access
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-500">
              Regulator.AI — Vienna Governance System
            </span>
          </div>
          <span className="text-xs text-slate-600">
            © 2026 ai.ventures. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
