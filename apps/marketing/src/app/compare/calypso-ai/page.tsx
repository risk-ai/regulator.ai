import { Shield, Check, ArrowLeft, Activity, Target, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vienna OS vs Calypso AI — Comparison | Execution Kernel vs Security Testing",
  description: "Compare Vienna OS and Calypso AI. Calypso tests AI models for vulnerabilities; Vienna OS is the execution kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Calypso AI — Execution Kernel vs Security Testing",
    description: "When you need more than testing — detailed comparison of Calypso AI vs Vienna OS execution kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "Core Function", vienna: "Controls what AI agents can do", calypso: "Tests AI models for vulnerabilities" },
  { category: "Primary Use Case", vienna: "Prevent unauthorized agent actions", calypso: "Find model vulnerabilities before deploy" },
  { category: "Approach", vienna: "Runtime execution control (enforce)", calypso: "Pre-deployment testing (test)" },
  { category: "Agent Support", vienna: "LangChain, CrewAI, AutoGen, custom", calypso: "Model-level testing (not agent-specific)" },
  { category: "Authorization", vienna: "Cryptographic warrants required", calypso: "No execution authorization" },
  { category: "Risk Assessment", vienna: "4-tier risk classification per action", calypso: "Vulnerability scoring and red-team results" },
  { category: "Human Approval", vienna: "Built-in multi-party approval chains", calypso: "Testing report review workflows" },
  { category: "Audit Trail", vienna: "Immutable, warrant-linked, compliance-ready", calypso: "Testing logs and vulnerability reports" },
  { category: "Compliance", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", calypso: "Security testing documentation" },
  { category: "Runtime Enforcement", vienna: "Yes — blocks unauthorized actions", calypso: "No — testing only, no runtime control" },
  { category: "Deployment", vienna: "Self-hosted or cloud", calypso: "Enterprise platform" },
  { category: "Pricing", vienna: "Free tier + $49-99/mo", calypso: "Enterprise pricing (custom)" },
];

export default function CalypsoAiPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Link href="/compare" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Comparisons
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Vienna OS vs Calypso AI</h1>
        <p className="text-xl text-slate-300 max-w-3xl mb-8">
          Testing finds vulnerabilities before deploy. Execution control prevents bad actions in production.
        </p>
      </div>

      {/* Key Difference */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-violet-400 mb-2">Vienna OS</h3>
            <p className="text-sm text-slate-300 mb-4">Runtime Execution Control</p>
            <p className="text-slate-400 text-sm">
              Agent wants to delete production data → Vienna checks risk tier → requires SRE approval → 
              issues cryptographic warrant → allows execution → logs audit trail
            </p>
            <p className="mt-4 text-emerald-400 text-sm font-medium">Bad action never happens</p>
          </div>
          
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-400 mb-2">Calypso AI</h3>
            <p className="text-sm text-slate-300 mb-4">Pre-deployment Testing</p>
            <p className="text-slate-400 text-sm">
              Model built → Calypso runs adversarial attacks → tests for prompt injection → 
              finds vulnerabilities → generates security report → recommends fixes
            </p>
            <p className="mt-4 text-amber-400 text-sm font-medium">Vulnerabilities found before deploy, but no runtime control</p>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="space-y-2">
          {comparison.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm">
              <div className="font-medium text-slate-400">{row.category}</div>
              <div className="text-slate-200">{row.vienna}</div>
              <div className="text-slate-200">{row.calypso}</div>
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
            Use Calypso AI to test models for vulnerabilities before deployment. Use Vienna OS to control what agents 
            do in production. Testing + control = complete AI security.
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