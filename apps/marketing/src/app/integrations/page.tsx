import { Shield, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Vienna OS works with any AI agent framework — OpenClaw, LangChain, CrewAI, AutoGen, and custom runtimes.",
};

const integrations = [
  {
    name: "OpenClaw",
    status: "live",
    desc: "First-class integration. OpenClaw agents submit intents natively through the Agent Intent Bridge.",
    example: `curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{"action":"check_health","source":"openclaw","tenant_id":"prod"}'`,
  },
  {
    name: "LangChain",
    status: "compatible",
    desc: "LangChain agents integrate via HTTP tool. Wrap Vienna's Intent API as a LangChain Tool for governed execution.",
    example: `from langchain.tools import Tool

vienna_tool = Tool(
    name="vienna_intent",
    func=lambda action: requests.post(
        "https://vienna-os.fly.dev/api/v1/agent/intent",
        json={"action": action, "source": "langchain", "tenant_id": "prod"}
    ).json(),
    description="Submit governed intent to Vienna OS"
)`,
  },
  {
    name: "CrewAI",
    status: "compatible",
    desc: "CrewAI crews can route high-risk actions through Vienna's approval pipeline before execution.",
    example: `# In your CrewAI agent's tool
import requests

def governed_action(action: str, payload: dict):
    result = requests.post(
        "https://vienna-os.fly.dev/api/v1/agent/intent",
        json={"action": action, "source": "crewai", **payload}
    )
    return result.json()`,
  },
  {
    name: "AutoGen",
    status: "compatible",
    desc: "Microsoft AutoGen agents can use Vienna as an external governance layer for multi-agent orchestration.",
    example: `// AutoGen function call
const result = await fetch("https://vienna-os.fly.dev/api/v1/agent/intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "deploy_service",
    source: "autogen",
    tenant_id: "prod"
  })
});`,
  },
  {
    name: "Custom / REST API",
    status: "live",
    desc: "Any system that can make HTTP requests can integrate. The Intent API is a simple REST endpoint.",
    example: `POST /api/v1/agent/intent
Content-Type: application/json

{
  "action": "your_action",
  "source": "your-framework",
  "tenant_id": "your-tenant",
  "context": { "any": "metadata" }
}`,
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
            <Shield className="w-6 h-6 text-gold-400" />
            <span className="font-bold text-white">Vienna<span className="text-gold-400">OS</span></span>
          </a>
          <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
        <p className="text-slate-400 mb-4">
          Vienna OS is runtime-agnostic. One API, any agent framework.
        </p>
        <div className="flex items-center gap-4 mb-12">
          {Object.entries(statusLabels).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {integrations.map((intg) => {
            const status = statusLabels[intg.status];
            return (
              <div key={intg.name} className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{intg.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{intg.desc}</p>
                </div>
                <div className="bg-navy-900 border-t border-navy-700 p-4">
                  <pre className="font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre">
                    {intg.example}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm mb-4">Using a framework not listed here?</p>
          <p className="text-slate-400 text-sm mb-6">
            If it can make HTTP requests, it works with Vienna OS.
            <br />
            Check our <a href="/docs#integration" className="text-gold-400 hover:text-gold-300">integration guide</a> for details.
          </p>
          <a href="/try" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm">
            Try the API Live <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
