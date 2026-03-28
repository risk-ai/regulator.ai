"use client";

import { Shield, ArrowLeft, Check, X, Minus, ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";
import NewsletterSignup from "../../components/NewsletterSignup";

const competitors = [
  {
    name: "Vienna OS",
    layer: "Execution Control",
    tagline: "Controls what agents can do",
    highlight: true,
    features: {
      preExecution: true,
      cryptoWarrants: true,
      riskTiering: true,
      policyEngine: true,
      auditTrail: true,
      multiPartyApproval: true,
      tamperDetection: true,
      scopeVerification: true,
      promptFiltering: false,
      modelMonitoring: false,
      complianceDocs: false,
      openSource: "BSL 1.1",
      pricing: "Free / $49-99/agent/mo",
    },
  },
  {
    name: "Guardrails AI",
    layer: "Prompt Filtering",
    tagline: "Filters LLM inputs/outputs",
    highlight: false,
    features: {
      preExecution: false,
      cryptoWarrants: false,
      riskTiering: false,
      policyEngine: "partial",
      auditTrail: "partial",
      multiPartyApproval: false,
      tamperDetection: false,
      scopeVerification: false,
      promptFiltering: true,
      modelMonitoring: false,
      complianceDocs: false,
      openSource: "Apache 2.0",
      pricing: "Free / Enterprise",
    },
  },
  {
    name: "Arthur AI",
    layer: "Observability",
    tagline: "Monitors model performance",
    highlight: false,
    features: {
      preExecution: false,
      cryptoWarrants: false,
      riskTiering: false,
      policyEngine: false,
      auditTrail: "partial",
      multiPartyApproval: false,
      tamperDetection: false,
      scopeVerification: false,
      promptFiltering: false,
      modelMonitoring: true,
      complianceDocs: "partial",
      openSource: "Proprietary",
      pricing: "Enterprise only",
    },
  },
  {
    name: "Credo AI",
    layer: "Documentation",
    tagline: "Generates compliance docs",
    highlight: false,
    features: {
      preExecution: false,
      cryptoWarrants: false,
      riskTiering: false,
      policyEngine: false,
      auditTrail: false,
      multiPartyApproval: false,
      tamperDetection: false,
      scopeVerification: false,
      promptFiltering: false,
      modelMonitoring: "partial",
      complianceDocs: true,
      openSource: "Proprietary",
      pricing: "Enterprise only",
    },
  },
];

const featureRows = [
  { key: "preExecution", label: "Pre-execution enforcement", category: "Execution Control" },
  { key: "cryptoWarrants", label: "Cryptographic warrants (HMAC-SHA256)", category: "Execution Control" },
  { key: "riskTiering", label: "Risk tiering (T0–T3)", category: "Execution Control" },
  { key: "scopeVerification", label: "Post-execution scope verification", category: "Execution Control" },
  { key: "tamperDetection", label: "Tamper detection", category: "Execution Control" },
  { key: "policyEngine", label: "Policy-as-code engine", category: "Policy & Approval" },
  { key: "multiPartyApproval", label: "Multi-party approval workflows", category: "Policy & Approval" },
  { key: "auditTrail", label: "Immutable audit trail", category: "Compliance" },
  { key: "complianceDocs", label: "Compliance documentation", category: "Compliance" },
  { key: "promptFiltering", label: "Prompt/output filtering", category: "LLM Layer" },
  { key: "modelMonitoring", label: "Model performance monitoring", category: "LLM Layer" },
];

function FeatureIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-400" />;
  if (value === false) return <X className="w-4 h-4 text-slate-600" />;
  if (value === "partial") return <Minus className="w-4 h-4 text-amber-400" />;
  return <span className="text-xs text-slate-400">{value}</span>;
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="text-lg font-bold text-white tracking-tight">
              Vienna<span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">OS</span>
            </span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </a>
            <a
              href="/signup"
              onClick={() => analytics.ctaClick("compare", "get_started")}
              className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg transition font-semibold"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 rounded-full px-5 py-2 mb-6">
            <span className="text-sm text-purple-300 font-bold uppercase tracking-wider">Compare</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Four layers of AI governance.{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Only one controls execution.
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Guardrails AI filters prompts. Arthur monitors models. Credo generates compliance docs.
            Vienna OS controls what agents can actually do.
          </p>
        </div>

        {/* Layer diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          {[
            { layer: "Documentation", tool: "Credo AI", desc: "Generates compliance reports after the fact", color: "slate", active: false },
            { layer: "Observability", tool: "Arthur AI", desc: "Monitors model performance and drift", color: "blue", active: false },
            { layer: "Prompt Filtering", tool: "Guardrails AI", desc: "Validates LLM inputs and outputs", color: "amber", active: false },
            { layer: "Execution Control", tool: "Vienna OS", desc: "Enforces authorization before any action", color: "purple", active: true },
          ].map((l) => (
            <div
              key={l.layer}
              className={`rounded-xl p-5 border transition-all ${
                l.active
                  ? "bg-purple-500/10 border-purple-500/40 shadow-lg shadow-purple-500/10 scale-105"
                  : "bg-navy-800/50 border-navy-700/50"
              }`}
            >
              <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${l.active ? "text-purple-400" : "text-slate-500"}`}>
                {l.layer}
              </div>
              <div className={`text-sm font-semibold mb-1 ${l.active ? "text-white" : "text-slate-300"}`}>{l.tool}</div>
              <div className="text-xs text-slate-400">{l.desc}</div>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left py-4 px-4 text-sm text-slate-500 font-medium w-1/3">Feature</th>
                {competitors.map((c) => (
                  <th key={c.name} className={`text-center py-4 px-3 ${c.highlight ? "bg-purple-500/5" : ""}`}>
                    <div className={`text-sm font-bold ${c.highlight ? "text-purple-400" : "text-slate-300"}`}>{c.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{c.layer}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => {
                const prevCategory = i > 0 ? featureRows[i - 1]?.category : null;
                const showCategory = row.category !== prevCategory;

                return (
                  <>
                    {showCategory && (
                      <tr key={`cat-${row.category}`}>
                        <td colSpan={5} className="pt-6 pb-2 px-4">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">{row.category}</span>
                        </td>
                      </tr>
                    )}
                    <tr key={row.key} className="border-b border-navy-800/50 hover:bg-navy-800/30 transition">
                      <td className="py-3 px-4 text-sm text-slate-300">{row.label}</td>
                      {competitors.map((c) => (
                        <td key={c.name} className={`text-center py-3 px-3 ${c.highlight ? "bg-purple-500/5" : ""}`}>
                          <div className="flex justify-center">
                            <FeatureIcon value={(c.features as any)[row.key]} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  </>
                );
              })}
              {/* Pricing & license rows */}
              <tr className="border-t border-navy-700">
                <td colSpan={5} className="pt-6 pb-2 px-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Other</span>
                </td>
              </tr>
              <tr className="border-b border-navy-800/50">
                <td className="py-3 px-4 text-sm text-slate-300">License</td>
                {competitors.map((c) => (
                  <td key={c.name} className={`text-center py-3 px-3 text-xs text-slate-400 ${c.highlight ? "bg-purple-500/5" : ""}`}>
                    {c.features.openSource}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-navy-800/50">
                <td className="py-3 px-4 text-sm text-slate-300">Pricing</td>
                {competitors.map((c) => (
                  <td key={c.name} className={`text-center py-3 px-3 text-xs text-slate-400 ${c.highlight ? "bg-purple-500/5" : ""}`}>
                    {c.features.pricing}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Comparisons */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Detailed Comparisons</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <a href="/compare/guardrails-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-violet-400 transition mb-2">Vienna OS vs Guardrails AI</h3>
              <p className="text-sm text-slate-400">Execution control vs prompt validation — feature-by-feature breakdown</p>
            </a>
            <a href="/compare/arthur-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-violet-400 transition mb-2">Vienna OS vs Arthur AI</h3>
              <p className="text-sm text-slate-400">When you need more than monitoring — control vs observability</p>
            </a>
          </div>
        </div>

        {/* Key insight */}
        <div className="mt-16 bg-gradient-to-br from-purple-900/20 to-navy-800/50 border border-purple-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">They&apos;re complementary — but only one is mandatory.</h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-6">
            You can deploy AI agents without prompt filtering. You can deploy without model monitoring.
            You can deploy without compliance docs. You <strong className="text-white">cannot</strong> deploy
            responsibly without execution control.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="/signup"
              onClick={() => analytics.ctaClick("compare_cta", "start_free")}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold text-sm inline-flex items-center gap-2"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/try"
              onClick={() => analytics.ctaClick("compare_cta", "try_playground")}
              className="bg-navy-800 hover:bg-navy-700 text-white px-8 py-3 rounded-xl transition text-sm border border-navy-700"
            >
              Try the Playground
            </a>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 max-w-2xl mx-auto">
          <NewsletterSignup />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500">
          © 2026 Technetwork 2 LLC dba ai.ventures. Vienna OS — The execution control layer for AI systems.
        </div>
      </footer>
    </div>
  );
}
