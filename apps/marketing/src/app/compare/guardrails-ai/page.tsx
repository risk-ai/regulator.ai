import { Shield, Check, X, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vienna OS vs Guardrails AI — Detailed Comparison",
  description: "Compare Vienna OS and Guardrails AI for AI governance. See how Governance Kernel with warrants-based governance differs from prompt validation — features and use cases side by side.",
  openGraph: {
    title: "Vienna OS vs Guardrails AI — Detailed Comparison",
    description: "Governance Kernel vs prompt validation. Comparing Vienna OS warrants-based governance with cryptographic execution authority vs Guardrails AI.",
  },
};

const features = [
  { feature: "Core approach", vienna: "Execution control — governs what agents do", guardrails: "Prompt validation — governs what LLMs say", advantage: "vienna" },
  { feature: "Cryptographic warrants", vienna: "HMAC-SHA256 signed, time-limited, scope-constrained", guardrails: "Not available", advantage: "vienna" },
  { feature: "Risk tiering", vienna: "4 tiers (T0-T3) with escalating approval requirements", guardrails: "Not available", advantage: "vienna" },
  { feature: "Human approval workflows", vienna: "Built-in multi-party approval chains", guardrails: "Not available", advantage: "vienna" },
  { feature: "Audit trail", vienna: "Immutable, cryptographically verifiable, compliance-ready", guardrails: "Logging only", advantage: "vienna" },
  { feature: "Input/output validation", vienna: "Available via policy engine", guardrails: "Core strength — validators, reasking, structured output", advantage: "guardrails" },
  { feature: "Prompt engineering", vienna: "Not the focus (complementary)", guardrails: "Core strength — RAIL spec, structured prompts", advantage: "guardrails" },
  { feature: "Framework support", vienna: "LangChain, CrewAI, AutoGen, any HTTP-based agent", guardrails: "LangChain, LlamaIndex, direct LLM calls", advantage: "tie" },
  { feature: "Compliance reporting", vienna: "SOC 2, HIPAA, SOX, EU AI Act automated reports", guardrails: "Not available", advantage: "vienna" },
  { feature: "Fleet management", vienna: "Centralized dashboard for 100s of agents", guardrails: "Not available", advantage: "vienna" },
  { feature: "Open source", vienna: "BSL 1.1 (converts to Apache 2.0 in 2030)", guardrails: "Apache 2.0", advantage: "guardrails" },
  { feature: "Self-hosted", vienna: "Yes (Docker, Node.js)", guardrails: "Yes (Python package)", advantage: "tie" },
  { feature: "Enterprise support", vienna: "Available (Business tier)", guardrails: "Guardrails Hub (paid)", advantage: "tie" },
  { feature: "Rollback plans", vienna: "Required for T3 actions, built into warrant", guardrails: "Not available", advantage: "vienna" },
  { feature: "Policy-as-code", vienna: "JSON/YAML policies with conditions, scopes, and escalation", guardrails: "RAIL XML spec", advantage: "tie" },
  { feature: "Natural language policies", vienna: "Write policies in plain English, compiled to rules", guardrails: "RAIL spec (XML-based)", advantage: "vienna" },
  { feature: "Merkle warrant chain", vienna: "Tamper-proof cryptographic audit history", guardrails: "Standard logging", advantage: "vienna" },
  { feature: "Policy simulation", vienna: "Dry-run policy changes before deploying", guardrails: "Not available", advantage: "vienna" },
  { feature: "Agent trust scoring", vienna: "Dynamic trust scores from behavior history", guardrails: "Not available", advantage: "vienna" },
  { feature: "Cross-agent delegation", vienna: "Agents delegate authority with constraints", guardrails: "Not available", advantage: "vienna" },
];

export default function CompareGuardrailsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Link href="/compare" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Comparisons
        </Link>
        
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl md:text-4xl font-bold">Vienna OS vs Guardrails AI</h1>
        </div>
        
        <p className="text-xl text-slate-300 max-w-3xl mb-4">
          Execution control vs prompt validation — different tools for different problems.
        </p>
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8">
          <p className="text-sm text-amber-300">
            <strong>Key insight:</strong> Guardrails AI validates LLM inputs/outputs. Vienna OS controls agent execution. 
            They solve different layers of the AI safety stack — and work well together.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold mb-6">Feature Comparison</h2>
        
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-slate-400">
            <div>Feature</div>
            <div className="text-center">Vienna OS</div>
            <div className="text-center">Guardrails AI</div>
          </div>
          
          {features.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm">
              <div className="font-medium text-slate-200">{row.feature}</div>
              <div className={`text-center ${row.advantage === "vienna" ? "text-emerald-400" : "text-slate-300"}`}>
                {row.vienna === "Not available" || row.vienna === "Not the focus (complementary)" ? (
                  <span className="text-slate-500">{row.vienna}</span>
                ) : (
                  <span>{row.vienna}</span>
                )}
              </div>
              <div className={`text-center ${row.advantage === "guardrails" ? "text-emerald-400" : "text-slate-300"}`}>
                {row.guardrails === "Not available" || row.guardrails === "Logging only" ? (
                  <span className="text-slate-500">{row.guardrails}</span>
                ) : (
                  <span>{row.guardrails}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* When to use each */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold mb-6">When to Use Each</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-amber-500 mb-4">Choose Vienna OS when:</h3>
            <ul className="space-y-3">
              {[
                "Your AI agents take real-world actions (deploy code, move money, update records)",
                "You need compliance audit trails (SOC 2, HIPAA, SOX)",
                "You need human approval workflows for high-risk actions",
                "You want cryptographic proof of authorization",
                "You manage a fleet of agents across departments",
                "Regulators might ask \"who approved this?\"",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-400 mb-4">Choose Guardrails AI when:</h3>
            <ul className="space-y-3">
              {[
                "Your primary concern is LLM output quality and safety",
                "You need structured output validation (JSON schemas, types)",
                "You want to prevent hallucinations and toxic content",
                "Your agents primarily generate text, not take actions",
                "You need prompt engineering tooling (RAIL spec)",
                "You want a lighter-weight, Python-native solution",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-6 bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Use both together</h3>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            Guardrails AI validates what your LLM says. Vienna OS controls what your agent does. 
            Together, they cover the full AI safety stack: content safety + execution safety.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to add execution control?</h2>
        <p className="text-slate-300 mb-8 max-w-xl mx-auto">
          See the governance pipeline in action. No setup required.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/try" className="px-6 py-3 bg-amber-500 hover:bg-amber-500 rounded-lg font-medium transition">
            Try Interactive Demo
          </Link>
          <Link href="/blog/vienna-os-vs-guardrails-ai" className="px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-lg font-medium transition">
            Read Full Comparison
          </Link>
        </div>
      </div>
    </main>
  );
}
