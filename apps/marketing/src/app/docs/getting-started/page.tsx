import { Shield, ArrowLeft, Terminal, Package, Play, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Getting Started with Vienna OS — 5-Minute Setup Guide",
  description: "Add the governance kernel to your autonomous AI project in 5 minutes. Install the SDK, submit your first warrants-based intent, and see cryptographic execution authority in action.",
  openGraph: {
    title: "Getting Started with Vienna OS — 5-Minute Setup",
    description: "Install the governance kernel. Submit a warranted intent. See governance in action. 5 minutes.",
  },
};

const steps = [
  {
    number: 1,
    title: "Install the SDK",
    icon: Package,
    content: [
      { type: "text", value: "Choose your language:" },
      { type: "tabs", tabs: [
        { label: "TypeScript/Node.js", code: "npm install @vienna-os/sdk" },
        { label: "Python", code: "pip install vienna-sdk" },
      ]},
      { type: "text", value: "Get your API key from the Vienna OS console or use the sandbox for testing." },
    ],
  },
  {
    number: 2,
    title: "Initialize the Client",
    icon: Terminal,
    content: [
      { type: "tabs", tabs: [
        { label: "TypeScript", code: `import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
  // Use sandbox for testing:
  // baseUrl: 'https://regulator.ai/api/try'
});` },
        { label: "Python", code: `from vienna_sdk import ViennaClient

vienna = ViennaClient(
    api_key=os.environ["VIENNA_API_KEY"],
    # Use sandbox for testing:
    # base_url="https://regulator.ai/api/try"
)` },
      ]},
    ],
  },
  {
    number: 3,
    title: "Submit Your First Intent",
    icon: Play,
    content: [
      { type: "text", value: "An intent declares what your agent wants to do. Vienna OS evaluates it against policies and risk tiers before allowing execution." },
      { type: "tabs", tabs: [
        { label: "TypeScript", code: `// Submit an intent for policy evaluation
const intent = await vienna.intents.submit({
  type: 'deploy',
  resource: 'api-service',
  environment: 'staging',
  version: '2.4.1',
  agent: 'deploy-bot'
});

console.log(intent.status);     // 'approved' | 'pending' | 'denied'
console.log(intent.riskTier);   // 'T0' | 'T1' | 'T2' | 'T3'
console.log(intent.warrant?.id); // warrant ID if approved` },
        { label: "Python", code: `# Submit an intent for policy evaluation
intent = vienna.intents.submit(
    type="deploy",
    resource="api-service",
    environment="staging",
    version="2.4.1",
    agent="deploy-bot"
)

print(intent.status)      # 'approved' | 'pending' | 'denied'
print(intent.risk_tier)   # 'T0' | 'T1' | 'T2' | 'T3'
print(intent.warrant.id)  # warrant ID if approved` },
      ]},
    ],
  },
  {
    number: 4,
    title: "Execute with the Warrant",
    icon: Check,
    content: [
      { type: "text", value: "If the intent is approved, you receive a cryptographic warrant. Use it to execute the action through Vienna OS's controlled execution path." },
      { type: "tabs", tabs: [
        { label: "TypeScript", code: `// Execute using the warrant
if (intent.status === 'approved') {
  const result = await vienna.execute(intent.warrant.id, {
    // Your actual execution logic
    action: () => deployService('api-service', '2.4.1')
  });

  console.log(result.verified);   // true — post-execution verification passed
  console.log(result.auditId);    // immutable audit trail entry ID
}` },
        { label: "Python", code: `# Execute using the warrant
if intent.status == "approved":
    result = vienna.execute(
        warrant_id=intent.warrant.id,
        action=lambda: deploy_service("api-service", "2.4.1")
    )

    print(result.verified)    # True — post-execution verification passed
    print(result.audit_id)    # immutable audit trail entry ID` },
      ]},
    ],
  },
];

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-navy-950 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <Link href="/docs" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-8 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> Documentation
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Getting Started</h1>
        <p className="text-xl text-slate-300 max-w-3xl mb-2">
          Add governance to your AI agents in 5 minutes.
        </p>
        <p className="text-sm text-slate-400">
          No server required for testing — use the sandbox API at regulator.ai/try
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-12">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              {/* Step header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-600 text-white font-bold text-lg">
                  {step.number}
                </div>
                <h2 className="text-2xl font-bold">{step.title}</h2>
              </div>

              {/* Step content */}
              <div className="ml-14 space-y-4">
                {step.content.map((block, i) => {
                  if (block.type === "text") {
                    return <p key={i} className="text-slate-300">{block.value}</p>;
                  }
                  if (block.type === "tabs" && block.tabs) {
                    return (
                      <div key={i} className="space-y-2">
                        {block.tabs.map((tab, j) => (
                          <div key={j}>
                            <p className="text-xs text-slate-500 mb-1 font-medium">{tab.label}</p>
                            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 overflow-x-auto">
                              <code className="text-sm text-slate-200 font-mono">{tab.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* What happens under the hood */}
        <div className="mt-16 bg-slate-900/50 border border-slate-700/50 rounded-xl p-8">
          <h2 className="text-xl font-bold mb-4">What happens under the hood</h2>
          <div className="font-mono text-sm text-slate-300 space-y-2">
            <p><span className="text-slate-500">1.</span> <span className="text-violet-400">Intent received</span> — Gateway validates structure and agent identity</p>
            <p><span className="text-slate-500">2.</span> <span className="text-cyan-400">Policy evaluated</span> — Rules engine checks against configured policies</p>
            <p><span className="text-slate-500">3.</span> <span className="text-amber-400">Risk assessed</span> — Classifier assigns T0-T3 tier based on action type and scope</p>
            <p><span className="text-slate-500">4.</span> <span className="text-emerald-400">Approval obtained</span> — Auto (T0), policy (T1), human (T2), multi-party (T3)</p>
            <p><span className="text-slate-500">5.</span> <span className="text-violet-400">Warrant issued</span> — HMAC-SHA256 signed, time-limited, scope-constrained</p>
            <p><span className="text-slate-500">6.</span> <span className="text-cyan-400">Execution controlled</span> — Action runs within warrant constraints</p>
            <p><span className="text-slate-500">7.</span> <span className="text-emerald-400">Verified</span> — Post-execution state compared to truth snapshot</p>
            <p><span className="text-slate-500">8.</span> <span className="text-slate-400">Audit logged</span> — Immutable record with full warrant chain</p>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">Next Steps</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/try" className="bg-slate-900/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl p-6 transition group">
              <Play className="w-5 h-5 text-violet-400 mb-3" />
              <h3 className="font-bold group-hover:text-violet-400 transition mb-1">Interactive Demo</h3>
              <p className="text-sm text-slate-400">See the pipeline in action without installing anything</p>
            </Link>
            <Link href="/docs/api-reference" className="bg-slate-900/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl p-6 transition group">
              <Terminal className="w-5 h-5 text-cyan-400 mb-3" />
              <h3 className="font-bold group-hover:text-violet-400 transition mb-1">API Reference</h3>
              <p className="text-sm text-slate-400">Full documentation for all SDK modules</p>
            </Link>
            <Link href="/docs/integration-guide" className="bg-slate-900/50 border border-slate-700/50 hover:border-violet-500/30 rounded-xl p-6 transition group">
              <Shield className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="font-bold group-hover:text-violet-400 transition mb-1">Integration Guide</h3>
              <p className="text-sm text-slate-400">LangChain, CrewAI, AutoGen, and custom agents</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
