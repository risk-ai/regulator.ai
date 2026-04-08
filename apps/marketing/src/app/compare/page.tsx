"use client";

import { Shield, ArrowLeft, Check, X, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import NewsletterSignup from "../../components/NewsletterSignup";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

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
  if (value === "partial") return <Minus className="w-4 h-4 text-gold-300" />;
  return <span className="text-xs text-slate-400">{value}</span>;
}

export default function ComparePage() {
  // Structured data for compare page
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": "https://regulator.ai/compare#software",
        "name": "Vienna OS",
        "description": "governance and authorization layer for AI agents. Unlike prompt filtering (Guardrails AI), model monitoring (Arthur AI), or compliance documentation (Credo AI), Vienna OS controls what agents can actually do through cryptographic warrants and policy enforcement.",
        "url": "https://regulator.ai",
        "applicationCategory": "SecurityApplication",
        "applicationSubCategory": "AI Governance",
        "operatingSystem": "Cross-platform",
        "offers": {
          "@type": "Offer",
          "name": "Vienna OS Governance Platform",
          "priceRange": "$0-99+ per agent/month",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "Pre-execution enforcement",
          "Cryptographic warrants (HMAC-SHA256)",
          "Risk tiering (T0-T3)",
          "Post-execution scope verification",
          "Tamper detection",
          "Policy-as-code engine",
          "Multi-party approval workflows",
          "Immutable audit trail"
        ],
        "competitorOf": [
          {
            "@type": "SoftwareApplication",
            "name": "Guardrails AI"
          },
          {
            "@type": "SoftwareApplication",
            "name": "Arthur AI"
          },
          {
            "@type": "SoftwareApplication",
            "name": "Credo AI"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What makes Vienna OS different from AI guardrails?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Guardrails AI filters prompts and outputs at the LLM layer. Vienna OS controls execution - what agents can actually do. While prompt filtering validates content, Vienna OS enforces authorization with cryptographic warrants before any real-world action happens."
            }
          },
          {
            "@type": "Question",
            "name": "How does Vienna OS compare to model monitoring solutions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Model monitoring tools like Arthur AI observe performance after the fact. Vienna OS prevents unauthorized actions before they happen through pre-execution policy enforcement and cryptographic authorization."
            }
          },
          {
            "@type": "Question",
            "name": "Why is execution control mandatory for AI agents?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can deploy AI agents without prompt filtering, model monitoring, or compliance documentation. You cannot deploy responsibly without execution control. Vienna OS ensures every agent action is authorized, scoped, and auditable."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Terminal Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        <SiteNav />
      </div>

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-400/10 border border-gold-400/20 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-gold-400 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gold-400">COMPARE</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight mb-6">
              <span className="text-gold-400">FOUR_LAYERS</span>
              <br />
              <span className="text-zinc-500">/ ONE_CONTROLS_EXECUTION</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-3xl leading-relaxed font-mono mb-8">
              Guardrails AI filters prompts. Arthur monitors models. Credo generates compliance docs. Vienna OS controls what agents can actually do.
            </p>
          </div>

        {/* Layer diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          {[
            { layer: "Documentation", tool: "Credo AI", desc: "Generates compliance reports after the fact", color: "slate", active: false },
            { layer: "Observability", tool: "Arthur AI", desc: "Monitors model performance and drift", color: "blue", active: false },
            { layer: "Prompt Filtering", tool: "Guardrails AI", desc: "Validates LLM inputs and outputs", color: "gold", active: false },
            { layer: "Execution Control", tool: "Vienna OS", desc: "Enforces authorization before any action", color: "gold", active: true },
          ].map((l) => (
            <div
              key={l.layer}
              className={`rounded-xl p-5 border transition-all ${
                l.active
                  ? "bg-gold-400/10 border-gold-400/40 shadow-lg shadow-gold-400/10 scale-105"
                  : "bg-zinc-900/50 border-navy-700/50"
              }`}
            >
              <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${l.active ? "text-gold-300" : "text-slate-500"}`}>
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
                  <th key={c.name} className={`text-center py-4 px-3 ${c.highlight ? "bg-gold-400/5" : ""}`}>
                    <div className={`text-sm font-bold ${c.highlight ? "text-gold-300" : "text-slate-300"}`}>{c.name}</div>
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
                    <tr key={row.key} className="border-b border-navy-800/50 hover:bg-zinc-900/30 transition">
                      <td className="py-3 px-4 text-sm text-slate-300">{row.label}</td>
                      {competitors.map((c) => (
                        <td key={c.name} className={`text-center py-3 px-3 ${c.highlight ? "bg-gold-400/5" : ""}`}>
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
                  <td key={c.name} className={`text-center py-3 px-3 text-xs text-slate-400 ${c.highlight ? "bg-gold-400/5" : ""}`}>
                    {c.features.openSource}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-navy-800/50">
                <td className="py-3 px-4 text-sm text-slate-300">Pricing</td>
                {competitors.map((c) => (
                  <td key={c.name} className={`text-center py-3 px-3 text-xs text-slate-400 ${c.highlight ? "bg-gold-400/5" : ""}`}>
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
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <a href="/compare/guardrails-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-gold-400/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-gold-400 transition mb-2">Vienna OS vs Guardrails AI</h3>
              <p className="text-sm text-slate-400">Execution control vs prompt validation — feature-by-feature breakdown</p>
            </a>
            <a href="/compare/arthur-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-gold-400/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-gold-400 transition mb-2">Vienna OS vs Arthur AI</h3>
              <p className="text-sm text-slate-400">When you need more than monitoring — control vs observability</p>
            </a>
            <a href="/compare/credo-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-gold-400/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-gold-400 transition mb-2">Vienna OS vs Credo AI</h3>
              <p className="text-sm text-slate-400">Execution control vs compliance documentation — prevent vs document</p>
            </a>
            <a href="/compare/calypso-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-gold-400/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-gold-400 transition mb-2">Vienna OS vs Calypso AI</h3>
              <p className="text-sm text-slate-400">Runtime enforcement vs pre-deployment testing — enforce vs test</p>
            </a>
            <a href="/compare/holistic-ai" className="bg-slate-900/50 border border-slate-700/50 hover:border-gold-400/30 rounded-xl p-6 transition group">
              <h3 className="font-bold text-white group-hover:text-gold-400 transition mb-2">Vienna OS vs Holistic AI</h3>
              <p className="text-sm text-slate-400">Continuous control vs periodic auditing — enforce vs audit</p>
            </a>
          </div>
        </div>

        {/* Key insight */}
        <div className="mt-16 bg-gradient-to-br from-gold-900/20 to-navy-800/50 border border-gold-400/20 rounded-2xl p-8 text-center">
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
              className="bg-gold-500 hover:bg-gold-400 text-white px-8 py-3 rounded-xl transition font-semibold text-sm inline-flex items-center gap-2"
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/try"
              onClick={() => analytics.ctaClick("compare_cta", "try_playground")}
              className="bg-zinc-900 hover:bg-gold-400/30 text-white px-8 py-3 rounded-xl transition text-sm border border-navy-700"
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
      </main>

      <SiteFooter />
    </div>
  );
}
