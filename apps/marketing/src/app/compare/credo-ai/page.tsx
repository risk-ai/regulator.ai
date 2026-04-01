import { Shield, Check, ArrowLeft, Activity, FileText, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vienna OS vs Credo AI — Comparison | Governance Kernel vs Compliance Documentation",
  description: "Compare Vienna OS and Credo AI. Credo generates compliance documentation; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Credo AI — Governance Kernel vs Compliance Documentation",
    description: "When you need more than paperwork — detailed comparison of Credo AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "Core Function", vienna: "Controls what AI agents can do", credo: "Generates compliance documentation" },
  { category: "Primary Use Case", vienna: "Prevent unauthorized agent actions", credo: "Create regulatory paperwork" },
  { category: "Approach", vienna: "Pre-execution control (prevent)", credo: "Post-deployment documentation (document)" },
  { category: "Agent Support", vienna: "LangChain, CrewAI, AutoGen, custom", credo: "Documentation-only (not agent-specific)" },
  { category: "Authorization", vienna: "Cryptographic warrants required", credo: "No execution authorization" },
  { category: "Risk Assessment", vienna: "4-tier risk classification per action", credo: "Risk documentation and reporting" },
  { category: "Human Approval", vienna: "Built-in multi-party approval chains", credo: "Document review workflows" },
  { category: "Audit Trail", vienna: "Immutable, warrant-linked, compliance-ready", credo: "Documentation and report generation" },
  { category: "Compliance", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", credo: "Compliance documentation templates" },
  { category: "Real-time Enforcement", vienna: "Yes — blocks unauthorized actions", credo: "No — documents after deployment" },
  { category: "Deployment", vienna: "Self-hosted or cloud", credo: "Enterprise platform" },
  { category: "Pricing", vienna: "Free tier + $49-99/mo", credo: "Enterprise pricing (custom)" },
];

export default function CredoAiPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Link href="/compare" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Comparisons
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Vienna OS vs Credo AI</h1>
        <p className="text-xl text-slate-300 max-w-3xl mb-8">
          Documentation tells you what happened. Execution control prevents bad things from happening.
        </p>
      </div>

      {/* Key Difference */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-violet-400 mb-2">Vienna OS</h3>
            <p className="text-sm text-slate-300 mb-4">Execution Control</p>
            <p className="text-slate-400 text-sm">
              Agent wants to access customer data → Vienna checks risk tier → requires privacy officer approval → 
              issues cryptographic warrant → allows execution → logs audit trail
            </p>
            <p className="mt-4 text-emerald-400 text-sm font-medium">Bad action never happens</p>
          </div>
          
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 text-center">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-blue-400 mb-2">Credo AI</h3>
            <p className="text-sm text-slate-300 mb-4">Compliance Documentation</p>
            <p className="text-slate-400 text-sm">
              AI system deployed → Credo analyzes system documentation → generates compliance reports → 
              creates risk assessments → produces regulatory paperwork
            </p>
            <p className="mt-4 text-amber-400 text-sm font-medium">Bad action documented after the fact</p>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="space-y-2">
          {comparison.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm">
              <div className="font-medium text-slate-400">{row.category}</div>
              <div className="text-slate-200">{row.vienna}</div>
              <div className="text-slate-200">{row.credo}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Use both */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <Activity className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Better together</h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-6">
            Use Credo AI to generate compliance documentation and risk assessments. Use Vienna OS to control what agents 
            actually do in production. Documentation + control = complete AI governance.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/try" className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition">
              Try Vienna OS Demo
            </Link>
            <Link href="/use-cases" className="px-6 py-3 border border-slate-600 hover:border-slate-400 rounded-lg font-medium transition">
              See Use Cases
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}