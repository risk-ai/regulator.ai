import { Shield, Check, X, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Vienna OS vs Guardrails AI — Detailed Comparison",
  description: "Compare Vienna OS and Guardrails AI for AI governance. See how Governance Kernel with warrants-based governance differs from prompt validation — features and use cases side by side.",
  openGraph: {
    title: "Vienna OS vs Guardrails AI — Detailed Comparison",
    description: "Governance Kernel vs prompt validation. Comparing Vienna OS warrants-based governance with cryptographic execution authority vs Guardrails AI.",
  },
};

const features = [
  { feature: "CORE_APPROACH", vienna: "Execution control — governs what agents do", guardrails: "Prompt validation — governs what LLMs say", advantage: "vienna" },
  { feature: "CRYPTOGRAPHIC_WARRANTS", vienna: "HMAC-SHA256 signed, time-limited, scope-constrained", guardrails: "Not available", advantage: "vienna" },
  { feature: "RISK_TIERING", vienna: "4 tiers (T0-T3) with escalating approval requirements", guardrails: "Not available", advantage: "vienna" },
  { feature: "HUMAN_APPROVAL_WORKFLOWS", vienna: "Built-in multi-party approval chains", guardrails: "Not available", advantage: "vienna" },
  { feature: "AUDIT_TRAIL", vienna: "Immutable, cryptographically verifiable, compliance-ready", guardrails: "Logging only", advantage: "vienna" },
  { feature: "INPUT_OUTPUT_VALIDATION", vienna: "Available via policy engine", guardrails: "Core strength — validators, reasking, structured output", advantage: "guardrails" },
  { feature: "PROMPT_ENGINEERING", vienna: "Not the focus (complementary)", guardrails: "Core strength — RAIL spec, structured prompts", advantage: "guardrails" },
  { feature: "FRAMEWORK_SUPPORT", vienna: "LangChain, CrewAI, AutoGen, any HTTP-based agent", guardrails: "LangChain, LlamaIndex, direct LLM calls", advantage: "tie" },
  { feature: "COMPLIANCE_REPORTING", vienna: "SOC 2, HIPAA, SOX, EU AI Act automated reports", guardrails: "Not available", advantage: "vienna" },
  { feature: "FLEET_MANAGEMENT", vienna: "Centralized dashboard for 100s of agents", guardrails: "Not available", advantage: "vienna" },
  { feature: "OPEN_SOURCE", vienna: "BSL 1.1 (converts to Apache 2.0 in 2030)", guardrails: "Apache 2.0", advantage: "guardrails" },
  { feature: "SELF_HOSTED", vienna: "Yes (Docker, Node.js)", guardrails: "Yes (Python package)", advantage: "tie" },
  { feature: "ENTERPRISE_SUPPORT", vienna: "Available (Business tier)", guardrails: "Guardrails Hub (paid)", advantage: "tie" },
  { feature: "ROLLBACK_PLANS", vienna: "Required for T3 actions, built into warrant", guardrails: "Not available", advantage: "vienna" },
  { feature: "POLICY_AS_CODE", vienna: "JSON/YAML policies with conditions, scopes, and escalation", guardrails: "RAIL XML spec", advantage: "tie" },
  { feature: "NATURAL_LANGUAGE_POLICIES", vienna: "Write policies in plain English, compiled to rules", guardrails: "RAIL spec (XML-based)", advantage: "vienna" },
  { feature: "MERKLE_WARRANT_CHAIN", vienna: "Tamper-proof cryptographic audit history", guardrails: "Standard logging", advantage: "vienna" },
  { feature: "POLICY_SIMULATION", vienna: "Dry-run policy changes before deploying", guardrails: "Not available", advantage: "vienna" },
  { feature: "AGENT_TRUST_SCORING", vienna: "Dynamic trust scores from behavior history", guardrails: "Not available", advantage: "vienna" },
  { feature: "CROSS_AGENT_DELEGATION", vienna: "Agents delegate authority with constraints", guardrails: "Not available", advantage: "vienna" },
];

export default function CompareGuardrailsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
          <Link href="/compare" className="inline-flex items-center text-sm text-gray-400 hover:text-amber-500 mb-8 transition font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> ALL_COMPARISONS
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl md:text-4xl font-mono font-bold text-amber-500">VIENNA_OS_VS_GUARDRAILS_AI</h1>
          </div>
          
          <p className="text-xl text-gray-400 max-w-3xl mb-4 font-mono">
            Execution control vs prompt validation — different tools for different problems.
          </p>
          
          <div className="bg-black border border-amber-500/30 p-4 mb-8">
            <p className="text-sm text-amber-500 font-mono">
              <strong>KEY_INSIGHT:</strong> Guardrails AI validates LLM inputs/outputs. Vienna OS controls agent execution. 
              They solve different layers of the AI safety stack — and work well together.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-mono font-bold mb-6 text-amber-500">FEATURE_COMPARISON</h2>
          
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 p-4 text-sm font-mono font-bold text-gray-500">
              <div>FEATURE</div>
              <div className="text-center">VIENNA_OS</div>
              <div className="text-center">GUARDRAILS_AI</div>
            </div>
            
            {features.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-black/50 border border-amber-500/10 text-sm">
                <div className="font-mono font-bold text-gray-400">{row.feature}</div>
                <div className={`text-center font-mono ${row.advantage === "vienna" ? "text-green-400" : "text-gray-400"}`}>
                  {row.vienna === "Not available" || row.vienna === "Not the focus (complementary)" ? (
                    <span className="text-gray-600">{row.vienna}</span>
                  ) : (
                    <span>{row.vienna}</span>
                  )}
                </div>
                <div className={`text-center font-mono ${row.advantage === "guardrails" ? "text-green-400" : "text-gray-400"}`}>
                  {row.guardrails === "Not available" || row.guardrails === "Logging only" ? (
                    <span className="text-gray-600">{row.guardrails}</span>
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
          <h2 className="text-2xl font-mono font-bold mb-6 text-amber-500">WHEN_TO_USE_EACH</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black border border-amber-500/30 p-6">
              <h3 className="text-lg font-mono font-bold text-amber-500 mb-4">CHOOSE_VIENNA_OS_WHEN:</h3>
              <ul className="space-y-3">
                {[
                  "Your AI agents take real-world actions (deploy code, move money, update records)",
                  "You need compliance audit trails (SOC 2, HIPAA, SOX)",
                  "You need human approval workflows for high-risk actions",
                  "You want cryptographic proof of authorization",
                  "You manage a fleet of agents across departments",
                  "Regulators might ask \"who approved this?\"",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400 font-mono">
                    <Check className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-6">
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-4">CHOOSE_GUARDRAILS_AI_WHEN:</h3>
              <ul className="space-y-3">
                {[
                  "Your primary concern is LLM output quality and safety",
                  "You need structured output validation (JSON schemas, types)",
                  "You want to prevent hallucinations and toxic content",
                  "Your agents primarily generate text, not take actions",
                  "You need prompt engineering tooling (RAIL spec)",
                  "You want a lighter-weight, Python-native solution",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500 font-mono">
                    <Check className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 bg-black border border-amber-500/30 p-6 text-center">
            <h3 className="text-lg font-mono font-bold mb-2 text-amber-500">USE_BOTH_TOGETHER</h3>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto font-mono">
              Guardrails AI validates what your LLM says. Vienna OS controls what your agent does. 
              Together, they cover the full AI safety stack: content safety + execution safety.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-5xl mx-auto px-6 pb-24 text-center">
          <h2 className="text-3xl font-mono font-bold mb-4 text-amber-500">READY_TO_ADD_EXECUTION_CONTROL?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto font-mono">
            See the governance pipeline in action. No setup required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/try" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase transition">
              TRY_INTERACTIVE_DEMO
            </Link>
            <Link href="/blog/vienna-os-vs-guardrails-ai" className="px-6 py-3 border border-amber-500/30 hover:border-amber-500/50 text-amber-500 font-mono font-bold uppercase transition">
              READ_FULL_COMPARISON
            </Link>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}
