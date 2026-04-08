import { Shield, Check, ArrowLeft, Activity, Eye, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Vienna OS vs Arthur AI — Comparison | Governance Kernel vs Model Monitoring",
  description: "Compare Vienna OS and Arthur AI. Arthur monitors model performance; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Arthur AI — Governance Kernel vs Model Monitoring",
    description: "When you need more than monitoring — detailed comparison of Arthur AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "CORE_FUNCTION", vienna: "Controls what AI agents can do", arthur: "Monitors how AI models perform" },
  { category: "PRIMARY_USE_CASE", vienna: "Prevent unauthorized agent actions", arthur: "Detect model drift and bias" },
  { category: "APPROACH", vienna: "Pre-execution control (prevent)", arthur: "Post-execution monitoring (detect)" },
  { category: "AGENT_SUPPORT", vienna: "LangChain, CrewAI, AutoGen, custom", arthur: "Model-level (not agent-specific)" },
  { category: "AUTHORIZATION", vienna: "Cryptographic warrants required", arthur: "No execution authorization" },
  { category: "RISK_ASSESSMENT", vienna: "4-tier risk classification per action", arthur: "Model-level risk scoring" },
  { category: "HUMAN_APPROVAL", vienna: "Built-in multi-party approval chains", arthur: "Alert-based (humans review after)" },
  { category: "AUDIT_TRAIL", vienna: "Immutable, warrant-linked, compliance-ready", arthur: "Monitoring logs and dashboards" },
  { category: "COMPLIANCE", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", arthur: "Fairness and bias reporting" },
  { category: "DEPLOYMENT", vienna: "Self-hosted or cloud", arthur: "Cloud platform" },
  { category: "PRICING", vienna: "Free tier + $49-99/mo", arthur: "Enterprise pricing (custom)" },
  { category: "NATURAL_LANGUAGE_POLICIES", vienna: "Write policies in plain English", arthur: "Code or configuration required" },
  { category: "MERKLE_WARRANT_CHAIN", vienna: "Tamper-proof cryptographic audit history", arthur: "Standard logging" },
  { category: "POLICY_SIMULATION", vienna: "Dry-run policy changes before deploying", arthur: "No simulation capability" },
  { category: "AGENT_TRUST_SCORING", vienna: "Dynamic trust scores from behavior history", arthur: "Model performance monitoring" },
  { category: "CROSS_AGENT_DELEGATION", vienna: "Agents delegate authority with constraints", arthur: "No delegation model" },
];

export default function CompareArthurPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
          <Link href="/compare" className="inline-flex items-center text-sm text-gray-400 hover:text-amber-500 mb-8 transition font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> ALL_COMPARISONS
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-mono font-bold mb-4 text-amber-500">VIENNA_OS_VS_ARTHUR_AI</h1>
          <p className="text-xl text-gray-400 max-w-3xl mb-8 font-mono">
            Monitoring tells you something went wrong. Execution control prevents it from happening.
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
                Agent wants to deploy to production → Vienna checks risk tier → requires SRE approval → 
                issues cryptographic warrant → allows execution → logs audit trail
              </p>
              <p className="mt-4 text-green-400 text-sm font-mono font-bold">BAD_ACTION_NEVER_HAPPENS</p>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-6 text-center">
              <Eye className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-2">ARTHUR_AI</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">MODEL_MONITORING</p>
              <p className="text-gray-600 text-sm font-mono">
                Model makes predictions → Arthur analyzes outputs → detects drift or bias → 
                sends alert to team → team investigates and remediates
              </p>
              <p className="mt-4 text-gray-600 text-sm font-mono font-bold">BAD_ACTION_DETECTED_AFTER_THE_FACT</p>
            </div>
          </div>
          
          {/* Comparison Table */}
          <div className="space-y-2">
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-black/50 border border-amber-500/10 text-sm">
                <div className="font-mono font-bold text-gray-500">{row.category}</div>
                <div className="font-mono text-gray-400">{row.vienna}</div>
                <div className="font-mono text-gray-500">{row.arthur}</div>
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
              Use Arthur AI to monitor model quality and detect drift. Use Vienna OS to control what agents 
              do with those model outputs. Monitoring + control = complete AI governance.
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
