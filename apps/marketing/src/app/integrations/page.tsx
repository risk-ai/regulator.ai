import { Shield, ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Vienna OS integrates with agent frameworks, notification channels, deployment pipelines, and cloud providers.",
};

const agentFrameworks = [
  {
    name: "OpenClaw",
    status: "live",
    desc: "First-class native integration. OpenClaw agents submit intents through the Agent Intent Bridge.",
    example: `curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{"action":"check_health","source":"openclaw","tenant_id":"prod"}'`,
  },
  {
    name: "LangChain",
    status: "compatible",
    desc: "Wrap Vienna's Intent API as a LangChain Tool for governed agent execution.",
    example: `from langchain.tools import Tool
vienna = Tool(name="vienna", func=lambda a: requests.post(
    "https://vienna-os.fly.dev/api/v1/agent/intent",
    json={"action": a, "source": "langchain", "tenant_id": "prod"}
).json())`,
  },
  {
    name: "CrewAI",
    status: "compatible",
    desc: "Route high-risk crew actions through Vienna's approval pipeline before execution.",
    example: `def governed_action(action, payload):
    return requests.post(
        "https://vienna-os.fly.dev/api/v1/agent/intent",
        json={"action": action, "source": "crewai", **payload}
    ).json()`,
  },
  {
    name: "AutoGen / Custom",
    status: "compatible",
    desc: "Any framework that makes HTTP requests integrates via the REST API.",
    example: `const result = await fetch("/api/v1/agent/intent", {
  method: "POST",
  body: JSON.stringify({
    action: "deploy_service", source: "your-agent", tenant_id: "prod"
  })
});`,
  },
];

const notificationAdapters = [
  {
    name: "Slack",
    status: "live",
    desc: "T1/T2 approval requests sent to Slack with interactive Approve/Deny buttons. Execution notifications and policy violation alerts.",
    features: ["Interactive approval buttons", "Execution status notifications", "Policy violation alerts", "Color-coded risk tiers"],
  },
  {
    name: "Email (Resend)",
    status: "live",
    desc: "Approval request emails, execution notifications, and daily governance digest. Dark-theme HTML emails matching Vienna OS brand.",
    features: ["Approval request emails", "Execution result notifications", "Daily governance digest", "One-click console links"],
  },
  {
    name: "GitHub",
    status: "live",
    desc: "Governed deployments with warrant metadata. PR status checks (vienna-os/governance) and audit trail comments on PRs.",
    features: ["Deployment governance", "PR status checks", "Audit trail comments", "Warrant-gated merges"],
  },
  {
    name: "Webhooks",
    status: "live",
    desc: "Generic webhook endpoint for Stripe subscription events and external health monitoring services.",
    features: ["Stripe checkout events", "Subscription lifecycle", "Health ping endpoint", "Custom event handlers"],
  },
];

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  live: { label: "Live", color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" },
  compatible: { label: "Compatible", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" },
  coming: { label: "Coming Soon", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.1)" },
};

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white">Vienna<span className="text-purple-400">OS</span></span>
          </a>
          <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
        <p className="text-slate-400 mb-12">
          Vienna OS connects to your agent frameworks, notification channels, and deployment pipelines.
        </p>

        {/* Agent Frameworks */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-6">Agent Frameworks</h2>
          <div className="space-y-4">
            {agentFrameworks.map((intg) => {
              const status = statusLabels[intg.status];
              return (
                <div key={intg.name} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden card-hover">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{intg.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">{intg.desc}</p>
                  </div>
                  <div className="bg-navy-900 border-t border-navy-700 p-4">
                    <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">{intg.example}</pre>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Notification & Deployment Adapters */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-6">Notifications & Deployment</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {notificationAdapters.map((adapter) => {
              const status = statusLabels[adapter.status];
              return (
                <div key={adapter.name} className="bg-navy-800 border border-navy-700 rounded-xl p-5 card-hover">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-sm">{adapter.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>{status.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{adapter.desc}</p>
                  <ul className="space-y-1">
                    {adapter.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="text-emerald-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* SDK */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-6">TypeScript SDK</h2>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">@vienna-os/sdk</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">Available</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Full TypeScript SDK with typed client, intent submission, policy management, fleet monitoring, compliance reporting, and approval workflows.
            </p>
            <div className="bg-navy-900 border border-navy-700 rounded-lg p-4">
              <pre className="font-mono text-[11px] text-slate-300">{`import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  apiKey: 'vos_your_api_key'
});

// Submit governed intent
const result = await vienna.intent.submit({
  action: 'deploy_service',
  parameters: { service: 'api-gateway', strategy: 'rolling' }
});

// Check approval status
const approval = await vienna.approvals.get(result.approvalId);`}</pre>
            </div>
          </div>
        </section>

        <div className="text-center">
          <p className="text-slate-500 text-sm mb-4">Need a custom integration?</p>
          <p className="text-slate-400 text-sm mb-6">
            Any system that makes HTTP requests works with Vienna OS.
          </p>
          <a href="/try" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm">
            Try the API Live <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
