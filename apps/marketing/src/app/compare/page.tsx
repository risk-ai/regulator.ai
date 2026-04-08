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
  { key: "preExecution", label: "Pre-execution enforcement", category: "EXECUTION_CONTROL" },
  { key: "cryptoWarrants", label: "Cryptographic warrants (HMAC-SHA256)", category: "EXECUTION_CONTROL" },
  { key: "riskTiering", label: "Risk tiering (T0–T3)", category: "EXECUTION_CONTROL" },
  { key: "scopeVerification", label: "Post-execution scope verification", category: "EXECUTION_CONTROL" },
  { key: "tamperDetection", label: "Tamper detection", category: "EXECUTION_CONTROL" },
  { key: "policyEngine", label: "Policy-as-code engine", category: "POLICY_AND_APPROVAL" },
  { key: "multiPartyApproval", label: "Multi-party approval workflows", category: "POLICY_AND_APPROVAL" },
  { key: "auditTrail", label: "Immutable audit trail", category: "COMPLIANCE" },
  { key: "complianceDocs", label: "Compliance documentation", category: "COMPLIANCE" },
  { key: "promptFiltering", label: "Prompt/output filtering", category: "LLM_LAYER" },
  { key: "modelMonitoring", label: "Model performance monitoring", category: "LLM_LAYER" },
];

function FeatureIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-amber-500" />;
  if (value === false) return <X className="w-4 h-4 text-zinc-600" />;
  if (value === "partial") return <Minus className="w-4 h-4 text-zinc-400" />;
  return <span className="text-xs text-zinc-400 font-mono">{value}</span>;
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
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white font-mono">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <SiteNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 mb-8">
              <span className="flex h-2 w-2 bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">COMPARE</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight mb-6">
              <span className="text-amber-500">FOUR_LAYERS</span>
              <br />
              <span className="text-zinc-400">/ ONE_CONTROLS_EXECUTION</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-3xl leading-relaxed font-mono mb-8">
              Guardrails AI filters prompts. Arthur monitors models. Credo generates compliance docs. Vienna OS controls what agents can actually do.
            </p>
          </div>

          {/* Layer diagram */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
            {[
              { layer: "Documentation", tool: "Credo AI", desc: "Generates compliance reports after the fact", active: false },
              { layer: "Observability", tool: "Arthur AI", desc: "Monitors model performance and drift", active: false },
              { layer: "Prompt Filtering", tool: "Guardrails AI", desc: "Validates LLM inputs and outputs", active: false },
              { layer: "Execution Control", tool: "Vienna OS", desc: "Enforces authorization before any action", active: true },
            ].map((l) => (
              <div
                key={l.layer}
                className={`p-5 border transition-all font-mono ${
                  l.active
                    ? "bg-amber-500/10 border-amber-500/30 shadow-lg scale-105"
                    : "bg-black border-amber-500/10"
                }`}
              >
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${l.active ? "text-amber-500" : "text-zinc-600"}`}>
                  {l.layer}
                </div>
                <div className={`text-sm font-semibold mb-1 ${l.active ? "text-white" : "text-zinc-400"}`}>{l.tool}</div>
                <div className="text-xs text-zinc-400">{l.desc}</div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full font-mono">
              <thead>
                <tr className="border-b border-amber-500/10">
                  <th className="text-left py-4 px-4 text-sm text-zinc-600 font-mono uppercase tracking-wide w-1/3">FEATURE</th>
                  {competitors.map((c) => (
                    <th key={c.name} className={`text-center py-4 px-3 ${c.highlight ? "bg-amber-500/5" : ""}`}>
                      <div className={`text-sm font-bold ${c.highlight ? "text-amber-500" : "text-zinc-400"}`}>{c.name}</div>
                      <div className="text-xs text-zinc-600 mt-1">{c.layer}</div>
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
                            <span className="text-xs text-amber-500 uppercase tracking-wider font-bold">{row.category}</span>
                          </td>
                        </tr>
                      )}
                      <tr key={row.key} className="border-b border-amber-500/10 hover:bg-amber-500/5 transition">
                        <td className="py-3 px-4 text-sm text-zinc-400">{row.label}</td>
                        {competitors.map((c) => (
                          <td key={c.name} className={`text-center py-3 px-3 ${c.highlight ? "bg-amber-500/5" : ""}`}>
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
                <tr className="border-t border-amber-500/10">
                  <td colSpan={5} className="pt-6 pb-2 px-4">
                    <span className="text-xs text-amber-500 uppercase tracking-wider font-bold">OTHER</span>
                  </td>
                </tr>
                <tr className="border-b border-amber-500/10">
                  <td className="py-3 px-4 text-sm text-zinc-400">License</td>
                  {competitors.map((c) => (
                    <td key={c.name} className={`text-center py-3 px-3 text-xs text-zinc-400 font-mono ${c.highlight ? "bg-amber-500/5" : ""}`}>
                      {c.features.openSource}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-amber-500/10">
                  <td className="py-3 px-4 text-sm text-zinc-400">Pricing</td>
                  {competitors.map((c) => (
                    <td key={c.name} className={`text-center py-3 px-3 text-xs text-zinc-400 font-mono ${c.highlight ? "bg-amber-500/5" : ""}`}>
                      {c.features.pricing}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detailed Comparisons */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-amber-500 mb-6 text-center font-mono uppercase tracking-wide">DETAILED_COMPARISONS</h2>
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              <a href="/compare/guardrails-ai" className="bg-black border border-amber-500/10 hover:border-amber-500/30 p-6 transition group">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition mb-2 font-mono">Vienna OS vs Guardrails AI</h3>
                <p className="text-sm text-zinc-400 font-mono">Execution control vs prompt validation — feature-by-feature breakdown</p>
              </a>
              <a href="/compare/arthur-ai" className="bg-black border border-amber-500/10 hover:border-amber-500/30 p-6 transition group">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition mb-2 font-mono">Vienna OS vs Arthur AI</h3>
                <p className="text-sm text-zinc-400 font-mono">When you need more than monitoring — control vs observability</p>
              </a>
              <a href="/compare/credo-ai" className="bg-black border border-amber-500/10 hover:border-amber-500/30 p-6 transition group">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition mb-2 font-mono">Vienna OS vs Credo AI</h3>
                <p className="text-sm text-zinc-400 font-mono">Execution control vs compliance documentation — prevent vs document</p>
              </a>
              <a href="/compare/calypso-ai" className="bg-black border border-amber-500/10 hover:border-amber-500/30 p-6 transition group">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition mb-2 font-mono">Vienna OS vs Calypso AI</h3>
                <p className="text-sm text-zinc-400 font-mono">Runtime enforcement vs pre-deployment testing — enforce vs test</p>
              </a>
              <a href="/compare/holistic-ai" className="bg-black border border-amber-500/10 hover:border-amber-500/30 p-6 transition group">
                <h3 className="font-bold text-white group-hover:text-amber-500 transition mb-2 font-mono">Vienna OS vs Holistic AI</h3>
                <p className="text-sm text-zinc-400 font-mono">Continuous control vs periodic auditing — enforce vs audit</p>
              </a>
            </div>
          </div>

          {/* Key insight */}
          <div className="mt-16 bg-black border border-amber-500/30 p-8 text-center">
            <h2 className="text-2xl font-bold text-amber-500 mb-3 font-mono uppercase tracking-wide">ONLY_ONE_IS_MANDATORY</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto mb-6 font-mono">
              You can deploy AI agents without prompt filtering. You can deploy without model monitoring.
              You can deploy without compliance docs. You <strong className="text-amber-500">cannot</strong> deploy
              responsibly without execution control.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="/signup"
                onClick={() => analytics.ctaClick("compare_cta", "start_free")}
                className="bg-amber-500 text-black px-8 py-3 transition font-mono font-bold uppercase inline-flex items-center gap-2"
              >
                START_FREE <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/try"
                onClick={() => analytics.ctaClick("compare_cta", "try_playground")}
                className="bg-black hover:bg-amber-500/10 text-white px-8 py-3 transition font-mono font-bold uppercase border border-amber-500/30"
              >
                TRY_PLAYGROUND
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