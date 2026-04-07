import { Shield, Check, ArrowLeft, Activity, Eye, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vienna OS vs Arthur AI — Comparison | Governance Kernel vs Model Monitoring",
  description: "Compare Vienna OS and Arthur AI. Arthur monitors model performance; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Arthur AI — Governance Kernel vs Model Monitoring",
    description: "When you need more than monitoring — detailed comparison of Arthur AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "Core Function", vienna: "Controls what AI agents can do", arthur: "Monitors how AI models perform" },
  { category: "Primary Use Case", vienna: "Prevent unauthorized agent actions", arthur: "Detect model drift and bias" },
  { category: "Approach", vienna: "Pre-execution control (prevent)", arthur: "Post-execution monitoring (detect)" },
  { category: "Agent Support", vienna: "LangChain, CrewAI, AutoGen, custom", arthur: "Model-level (not agent-specific)" },
  { category: "Authorization", vienna: "Cryptographic warrants required", arthur: "No execution authorization" },
  { category: "Risk Assessment", vienna: "4-tier risk classification per action", arthur: "Model-level risk scoring" },
  { category: "Human Approval", vienna: "Built-in multi-party approval chains", arthur: "Alert-based (humans review after)" },
  { category: "Audit Trail", vienna: "Immutable, warrant-linked, compliance-ready", arthur: "Monitoring logs and dashboards" },
  { category: "Compliance", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", arthur: "Fairness and bias reporting" },
  { category: "Deployment", vienna: "Self-hosted or cloud", arthur: "Cloud platform" },
  { category: "Pricing", vienna: "Free tier + $49-99/mo", arthur: "Enterprise pricing (custom)" },
  { category: "Natural Language Policies", vienna: "Write policies in plain English", arthur: "Code or configuration required" },
  { category: "Merkle Warrant Chain", vienna: "Tamper-proof cryptographic audit history", arthur: "Standard logging" },
  { category: "Policy Simulation", vienna: "Dry-run policy changes before deploying", arthur: "No simulation capability" },
  { category: "Agent Trust Scoring", vienna: "Dynamic trust scores from behavior history", arthur: "Model performance monitoring" },
  { category: "Cross-Agent Delegation", vienna: "Agents delegate authority with constraints", arthur: "No delegation model" },
];

export default function CompareArthurPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        <Link href="/compare" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> All Comparisons
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Vienna OS vs Arthur AI</h1>
        <p className="text-xl text-slate-300 max-w-3xl mb-8">
          Monitoring tells you something went wrong. Execution control prevents it from happening.
        </p>
      </div>

      {/* Key Difference */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-amber-500 mb-2">Vienna OS</h3>
            <p className="text-sm text-slate-300 mb-4">Execution Control</p>
            <p className="text-slate-400 text-sm">
              Agent wants to deploy to production → Vienna checks risk tier → requires SRE approval → 
              issues cryptographic warrant → allows execution → logs audit trail
            </p>
            <p className="mt-4 text-emerald-400 text-sm font-medium">Bad action never happens</p>
          </div>
          
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6 text-center">
            <Eye className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-orange-400 mb-2">Arthur AI</h3>
            <p className="text-sm text-slate-300 mb-4">Model Monitoring</p>
            <p className="text-slate-400 text-sm">
              Model makes predictions → Arthur analyzes outputs → detects drift or bias → 
              sends alert to team → team investigates and remediates
            </p>
            <p className="mt-4 text-amber-400 text-sm font-medium">Bad action detected after the fact</p>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="space-y-2">
          {comparison.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 border border-slate-800/50 rounded-lg text-sm">
              <div className="font-medium text-slate-400">{row.category}</div>
              <div className="text-slate-200">{row.vienna}</div>
              <div className="text-slate-200">{row.arthur}</div>
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
            Use Arthur AI to monitor model quality and detect drift. Use Vienna OS to control what agents 
            do with those model outputs. Monitoring + control = complete AI governance.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/try" className="px-6 py-3 bg-amber-500 hover:bg-amber-500 rounded-lg font-medium transition">
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
