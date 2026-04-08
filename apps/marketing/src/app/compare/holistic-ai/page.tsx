import { Shield, Check, ArrowLeft, Activity, Search, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Vienna OS vs Holistic AI — Comparison | Governance Kernel vs Risk Auditing",
  description: "Compare Vienna OS and Holistic AI. Holistic audits AI systems for bias and compliance; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Holistic AI — Governance Kernel vs Risk Auditing",
    description: "When you need more than auditing — detailed comparison of Holistic AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "CORE_FUNCTION", vienna: "Controls what AI agents can do", holistic: "Audits AI systems for bias and compliance" },
  { category: "PRIMARY_USE_CASE", vienna: "Prevent unauthorized agent actions", holistic: "Point-in-time risk and bias assessment" },
  { category: "APPROACH", vienna: "Continuous execution control (enforce)", holistic: "Periodic auditing (audit)" },
  { category: "AGENT_SUPPORT", vienna: "LangChain, CrewAI, AutoGen, custom", holistic: "System-level auditing (not agent-specific)" },
  { category: "AUTHORIZATION", vienna: "Cryptographic warrants required", holistic: "No execution authorization" },
  { category: "RISK_ASSESSMENT", vienna: "4-tier risk classification per action", holistic: "Bias and efficacy scoring" },
  { category: "HUMAN_APPROVAL", vienna: "Built-in multi-party approval chains", holistic: "Audit review and remediation workflows" },
  { category: "AUDIT_TRAIL", vienna: "Immutable, warrant-linked, compliance-ready", holistic: "Audit reports and remediation tracking" },
  { category: "COMPLIANCE", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", holistic: "Bias and fairness compliance reporting" },
  { category: "REAL_TIME_ENFORCEMENT", vienna: "Yes — blocks unauthorized actions", holistic: "No — periodic audits, no runtime governance" },
  { category: "DEPLOYMENT", vienna: "Self-hosted or cloud", holistic: "Enterprise platform" },
  { category: "PRICING", vienna: "Free tier + $49-99/mo", holistic: "Enterprise pricing (custom)" },
  { category: "NATURAL_LANGUAGE_POLICIES", vienna: "Write policies in plain English", holistic: "Code or configuration required" },
  { category: "MERKLE_WARRANT_CHAIN", vienna: "Tamper-proof cryptographic audit history", holistic: "Standard logging" },
  { category: "POLICY_SIMULATION", vienna: "Dry-run policy changes before deploying", holistic: "Bias simulation testing" },
  { category: "AGENT_TRUST_SCORING", vienna: "Dynamic trust scores from behavior history", holistic: "No agent trust metrics" },
  { category: "CROSS_AGENT_DELEGATION", vienna: "Agents delegate authority with constraints", holistic: "No delegation model" },
];

export default function HolisticAiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
          <Link href="/compare" className="inline-flex items-center text-sm text-gray-400 hover:text-amber-500 mb-8 transition font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> ALL_COMPARISONS
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-mono font-bold mb-4 text-amber-500">VIENNA_OS_VS_HOLISTIC_AI</h1>
          <p className="text-xl text-gray-400 max-w-3xl mb-8 font-mono">
            Auditing tells you what's wrong. Execution control prevents it from happening.
          </p>
        </div>

        {/* Key Difference */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-black border border-amber-500/30 p-6 text-center">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">VIENNA_OS</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">CONTINUOUS_EXECUTION_CONTROL</p>
              <p className="text-gray-500 text-sm font-mono">
                Agent wants to make hiring decision → Vienna checks risk tier → requires HR approval → 
                issues cryptographic warrant → allows execution → logs audit trail
              </p>
              <p className="mt-4 text-green-400 text-sm font-mono font-bold">BIASED_ACTION_NEVER_HAPPENS</p>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-6 text-center">
              <Search className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-2">HOLISTIC_AI</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">PERIODIC_RISK_AUDITING</p>
              <p className="text-gray-600 text-sm font-mono">
                AI system deployed → Holistic runs bias assessment → analyzes hiring patterns → 
                detects unfair outcomes → generates audit report → recommends remediation
              </p>
              <p className="mt-4 text-gray-600 text-sm font-mono font-bold">BIASED_ACTION_DETECTED_AFTER_THE_FACT</p>
            </div>
          </div>
          
          {/* Comparison Table */}
          <div className="space-y-2">
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-black/50 border border-amber-500/10 text-sm">
                <div className="font-mono font-bold text-gray-500">{row.category}</div>
                <div className="font-mono text-gray-400">{row.vienna}</div>
                <div className="font-mono text-gray-500">{row.holistic}</div>
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
              Use Holistic AI to audit AI systems for bias and compliance issues. Use Vienna OS to control what agents 
              do in real-time to prevent bias. Auditing + control = complete AI governance.
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
