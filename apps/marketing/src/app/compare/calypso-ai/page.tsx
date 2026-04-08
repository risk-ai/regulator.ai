import { Shield, Check, ArrowLeft, Activity, Target, Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Vienna OS vs Calypso AI — Comparison | Governance Kernel vs Security Testing",
  description: "Compare Vienna OS and Calypso AI. Calypso tests AI models for vulnerabilities; Vienna OS is the governance kernel for autonomous AI with warrants-based governance.",
  openGraph: {
    title: "Vienna OS vs Calypso AI — Governance Kernel vs Security Testing",
    description: "When you need more than testing — detailed comparison of Calypso AI vs Vienna OS Governance Kernel with cryptographic execution authority.",
  },
};

const comparison = [
  { category: "CORE_FUNCTION", vienna: "Controls what AI agents can do", calypso: "Tests AI models for vulnerabilities" },
  { category: "PRIMARY_USE_CASE", vienna: "Prevent unauthorized agent actions", calypso: "Find model vulnerabilities before deploy" },
  { category: "APPROACH", vienna: "Runtime execution control (enforce)", calypso: "Pre-deployment testing (test)" },
  { category: "AGENT_SUPPORT", vienna: "LangChain, CrewAI, AutoGen, custom", calypso: "Model-level testing (not agent-specific)" },
  { category: "AUTHORIZATION", vienna: "Cryptographic warrants required", calypso: "No execution authorization" },
  { category: "RISK_ASSESSMENT", vienna: "4-tier risk classification per action", calypso: "Vulnerability scoring and red-team results" },
  { category: "HUMAN_APPROVAL", vienna: "Built-in multi-party approval chains", calypso: "Testing report review workflows" },
  { category: "AUDIT_TRAIL", vienna: "Immutable, warrant-linked, compliance-ready", calypso: "Testing logs and vulnerability reports" },
  { category: "COMPLIANCE", vienna: "SOC 2, HIPAA, SOX, EU AI Act reports", calypso: "Security testing documentation" },
  { category: "RUNTIME_ENFORCEMENT", vienna: "Yes — blocks unauthorized actions", calypso: "No — testing only, no runtime control" },
  { category: "DEPLOYMENT", vienna: "Self-hosted or cloud", calypso: "Enterprise platform" },
  { category: "PRICING", vienna: "Free tier + $49-99/mo", calypso: "Enterprise pricing (custom)" },
  { category: "NATURAL_LANGUAGE_POLICIES", vienna: "Write policies in plain English", calypso: "Code or configuration required" },
  { category: "MERKLE_WARRANT_CHAIN", vienna: "Tamper-proof cryptographic audit history", calypso: "Standard logging" },
  { category: "POLICY_SIMULATION", vienna: "Dry-run policy changes before deploying", calypso: "No simulation capability" },
  { category: "AGENT_TRUST_SCORING", vienna: "Dynamic trust scores from behavior history", calypso: "No agent trust metrics" },
  { category: "CROSS_AGENT_DELEGATION", vienna: "Agents delegate authority with constraints", calypso: "No delegation model" },
];

export default function CalypsoAiPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e14] text-white">
      <SiteNav />
      
      <main className="font-mono flex-1">
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
          <Link href="/compare" className="inline-flex items-center text-sm text-gray-400 hover:text-amber-500 mb-8 transition font-mono">
            <ArrowLeft className="w-4 h-4 mr-2" /> ALL_COMPARISONS
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-mono font-bold mb-4 text-amber-500">VIENNA_OS_VS_CALYPSO_AI</h1>
          <p className="text-xl text-gray-400 max-w-3xl mb-8 font-mono">
            Testing finds vulnerabilities before deploy. Execution control prevents bad actions in production.
          </p>
        </div>

        {/* Key Difference */}
        <div className="max-w-5xl mx-auto px-6 pb-12">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-black border border-amber-500/30 p-6 text-center">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-amber-500 mb-2">VIENNA_OS</h3>
              <p className="text-sm text-gray-400 mb-4 font-mono">RUNTIME_EXECUTION_CONTROL</p>
              <p className="text-gray-500 text-sm font-mono">
                Agent wants to delete production data → Vienna checks risk tier → requires SRE approval → 
                issues cryptographic warrant → allows execution → logs audit trail
              </p>
              <p className="mt-4 text-green-400 text-sm font-mono font-bold">BAD_ACTION_NEVER_HAPPENS</p>
            </div>
            
            <div className="bg-black border border-amber-500/10 p-6 text-center">
              <Target className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <h3 className="text-lg font-mono font-bold text-gray-400 mb-2">CALYPSO_AI</h3>
              <p className="text-sm text-gray-500 mb-4 font-mono">PRE_DEPLOYMENT_TESTING</p>
              <p className="text-gray-600 text-sm font-mono">
                Model built → Calypso runs adversarial attacks → tests for prompt injection → 
                finds vulnerabilities → generates security report → recommends fixes
              </p>
              <p className="mt-4 text-gray-600 text-sm font-mono font-bold">VULNERABILITIES_FOUND_BEFORE_DEPLOY_BUT_NO_RUNTIME_CONTROL</p>
            </div>
          </div>
          
          {/* Comparison Table */}
          <div className="space-y-2">
            {comparison.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 bg-black/50 border border-amber-500/10 text-sm">
                <div className="font-mono font-bold text-gray-500">{row.category}</div>
                <div className="font-mono text-gray-400">{row.vienna}</div>
                <div className="font-mono text-gray-500">{row.calypso}</div>
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
              Use Calypso AI to test models for vulnerabilities before deployment. Use Vienna OS to control what agents 
              do in production. Testing + control = complete AI security.
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
