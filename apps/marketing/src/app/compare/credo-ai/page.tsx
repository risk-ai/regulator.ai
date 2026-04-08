import { Shield, Check, ArrowLeft, Activity, FileText, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Vienna OS vs Credo AI — Comparison | Governance Kernel vs Compliance Documentation",
  description: "Compare Vienna OS and Credo AI. Credo generates compliance documentation; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Credo AI — Governance Kernel vs Compliance Documentation",
    description: "When you need more than paperwork — detailed comparison of Credo AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "CORE_FUNCTION", vienna: "Controls what AI agents can do", credo: "Generates compliance documentation" },
  { category: "PRIMARY_USE_CASE", vienna: "Prevent unauthorized agent actions", credo: "Create regulatory paperwork" },
  { category: "APPROACH", vienna: "Pre-execution control (prevent)", credo: "Post-deployment documentation (document)" },
  { category: "AGENT_SUPPORT", vienna: "LangChain, CrewAI, AutoGen, custom", credo: "Documentation-only (not agent-specific)" },
  { category: "AUTHORIZATION", vienna: "Cryptographic warrants required", credo: "No execution authorization" },
  { category: "RISK_ASSESSMENT", vienna: "4-tier risk classification per action", credo: "Risk documentation and reporting" },
  { category: "HUMAN_APPROVAL", vienna: "Built-in multi-party approval chains", credo: "Document review workflows" },
  { category: "AUDIT_TRAIL", vienna: "Immutable, warrant-linked, compliance-ready", credo: "Documentation and report generation" },
  { category: "COMPLIANCE", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", credo: "Compliance documentation templates" },
  { category: "REAL_TIME_ENFORCEMENT", vienna: "Yes — blocks unauthorized actions", credo: "No — documents after deployment" },
  { category: "DEPLOYMENT", vienna: "Self-hosted or cloud", credo: "Enterprise platform" },
  { category: "PRICING", vienna: "Free tier + $49-99/mo", credo: "Enterprise pricing (custom)" },
  { category: "NATURAL_LANGUAGE_POLICIES", vienna: "Write policies in plain English", credo: "Code or configuration required" },
  { category: "MERKLE_WARRANT_CHAIN", vienna: "Tamper-proof cryptographic audit history", credo: "Standard logging" },
  { category: "POLICY_SIMULATION", vienna: "Dry-run policy changes before deploying", credo: "No simulation capability" },
  { category: "AGENT_TRUST_SCORING", vienna: "Dynamic trust scores from behavior history", credo: "No agent trust metrics" },
  { category: "CROSS_AGENT_DELEGATION", vienna: "Agents delegate authority with constraints", credo: "No delegation model" },
];

export default function CredoAiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
          <Link href="/compare" className="inline-flex items-center text-sm text-gray-400 hover:text-amber-500 mb-8 transition font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> ALL_COMPARISONS
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-mono font-bold mb-4 text-amber-500">VIENNA_OS_VS_CREDO_AI</h1>
          <p className="text-xl text-gray-400 max-w-3xl mb-8 font-mono">
            Documentation tells you what happened. Execution control prevents bad things from happening.
          </p>
        </div>

        {/* Key Difference */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-black border border-amber-500/30 p-6 text-center">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">VIENNA_OS</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">EXECUTION_CONTROL</p>
              <p className="text-gray-500 text-sm font-mono">
                Agent wants to access customer data → Vienna checks risk tier → requires privacy officer approval → 
                issues cryptographic warrant → allows execution → logs audit trail
              </p>
              <p className="mt-4 text-green-400 text-sm font-mono font-bold">BAD_ACTION_NEVER_HAPPENS</p>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-6 text-center">
              <FileText className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-2">CREDO_AI</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">COMPLIANCE_DOCUMENTATION</p>
              <p className="text-gray-600 text-sm font-mono">
                AI system deployed → Credo analyzes system documentation → generates compliance reports → 
                creates risk assessments → produces regulatory paperwork
              </p>
              <p className="mt-4 text-gray-600 text-sm font-mono font-bold">BAD_ACTION_DOCUMENTED_AFTER_THE_FACT</p>
            </div>
          </div>
          
          {/* Comparison Table */}
          <div className="space-y-2">
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-black/50 border border-amber-500/10 text-sm">
                <div className="font-mono font-bold text-gray-500">{row.category}</div>
                <div className="font-mono text-gray-400">{row.vienna}</div>
                <div className="font-mono text-gray-500">{row.credo}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Use both */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="bg-black border border-amber-500/30 p-8 text-center">
            <Activity className="w-8 h-8 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-mono font-bold mb-3 text-amber-500">BETTER_TOGETHER</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6 font-mono">
              Use Credo AI to generate compliance documentation and risk assessments. Use Vienna OS to control what agents 
              actually do in production. Documentation + control = complete AI governance.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/try" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase transition">
                TRY_VIENNA_OS_DEMO
              </Link>
              <Link href="/use-cases" className="px-6 py-3 border border-amber-500/30 hover:border-amber-500/50 text-amber-500 font-mono font-bold uppercase transition">
                SEE_USE_CASES
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}
