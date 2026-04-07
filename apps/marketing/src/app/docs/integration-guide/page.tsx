import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integration Guide — Connect Your Agent Framework",
  description:
    "Step-by-step guide to integrating the Vienna OS Governance Kernel with LangChain, CrewAI, AutoGen, OpenClaw frameworks for warrants-based governance and cryptographic execution authority.",
};

export default function IntegrationGuidePage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">Integration Guide</h1>
        <p className="text-gray-400 text-lg mb-12">
          Connect any AI agent framework to Vienna OS in under 10 minutes.
        </p>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-gold-400">
            Quick Start
          </h2>

          <div className="space-y-6">
            <Step
              number={1}
              title="Install the SDK"
              code={`npm install @vienna/sdk\n# or\npip install vienna-sdk`}
            />

            <Step
              number={2}
              title="Initialize the adapter"
              code={`import { createLangChainAdapter } from '@vienna/sdk';

const vienna = createLangChainAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: 'vos_your_api_key',
  agentId: 'my-langchain-agent'
});

// Register agent on startup
await vienna.register({
  name: 'My LangChain Agent',
  capabilities: ['deploy_code', 'send_email', 'query_database']
});`}
            />

            <Step
              number={3}
              title="Submit intents before acting"
              code={`// Before executing any action, submit intent to Vienna
const result = await vienna.submitIntent({
  action: 'deploy_code',
  params: { service: 'api-gateway', version: '2.3.1' },
  objective: 'Deploy API v2.3.1 to production'
});

if (result.status === 'approved') {
  // Execute with warrant
  await deployService('api-gateway', '2.3.1');
  
  // Report execution result
  await vienna.reportExecution(result.warrant_id, {
    success: true,
    output: 'Deployed api-gateway v2.3.1'
  });
} else if (result.status === 'pending') {
  // T2/T3 — wait for human approval
  const approved = await vienna.waitForApproval(result.intent_id);
  if (approved.status === 'approved') {
    await deployService('api-gateway', '2.3.1');
    await vienna.reportExecution(approved.warrant_id, { success: true });
  }
}`}
            />
          </div>
        </section>

        {/* Framework Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-gold-400">
            Framework Examples
          </h2>

          <div className="space-y-8">
            <FrameworkExample
              name="LangChain / LangGraph"
              description="Wrap tool calls with Vienna governance"
              code={`import { createLangChainAdapter } from '@vienna/sdk';

const vienna = createLangChainAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'langchain-agent-01'
});

// Create a governed tool
function governedTool(toolFn, action) {
  return async (...args) => {
    const result = await vienna.submitIntent({
      action,
      params: { args },
      objective: \`Execute \${action}\`
    });
    
    if (result.status !== 'approved') {
      throw new Error(\`Action \${action} requires approval\`);
    }
    
    const output = await toolFn(...args);
    await vienna.reportExecution(result.warrant_id, { 
      success: true, output: JSON.stringify(output) 
    });
    return output;
  };
}`}
            />

            <FrameworkExample
              name="CrewAI"
              description="Add governance to crew task execution"
              code={`from vienna import create_crewai_adapter

vienna = create_crewai_adapter(
    api_url="https://api.regulator.ai",
    api_key=os.environ["VIENNA_API_KEY"],
    agent_id="crewai-research-crew"
)

# Before each task execution
result = vienna.submit_intent(
    action="web_search",
    params={"query": "AI governance market analysis"},
    objective="Research AI governance market for quarterly report"
)

if result["status"] == "approved":
    # Proceed with crew task
    crew.kickoff()
    vienna.report_execution(result["warrant_id"], success=True)`}
            />

            <FrameworkExample
              name="OpenClaw"
              description="Native integration via OpenClaw bridge"
              code={`import { createOpenClawAdapter } from '@vienna/sdk';

const vienna = createOpenClawAdapter({
  apiUrl: 'https://api.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'openclaw-main-agent'
});

// OpenClaw sessions automatically route through Vienna
// when VIENNA_API_URL is set in environment`}
            />

            <FrameworkExample
              name="Microsoft AutoGen"
              description="Govern multi-agent conversations"
              code={`from vienna import FrameworkAdapter

vienna = FrameworkAdapter(
    api_url="https://api.regulator.ai",
    api_key=os.environ["VIENNA_API_KEY"],
    agent_id="autogen-group-chat",
    framework="autogen"
)

# Wrap the GroupChatManager's execution step
# Each agent action goes through Vienna governance
result = vienna.submit_intent(
    action="code_execution",
    params={"language": "python", "sandbox": True},
    objective="Execute generated code in sandbox"
)`}
            />
          </div>
        </section>

        {/* API Reference */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-gold-400">
            API Reference
          </h2>

          <div className="space-y-6">
            <ApiEndpoint
              method="POST"
              path="/api/v1/intents"
              description="Submit an intent for governance evaluation"
              body={{
                agent_id: "string — Agent identifier",
                action: "string — Action to perform",
                params: "object — Action parameters",
                objective: "string — Human-readable description",
              }}
              response={{
                intent_id: "string",
                status: "'approved' | 'pending' | 'denied'",
                risk_tier: "'T0' | 'T1' | 'T2' | 'T3'",
                warrant_id: "string (if approved)",
              }}
            />

            <ApiEndpoint
              method="POST"
              path="/api/v1/executions"
              description="Report execution result after warrant-authorized action"
              body={{
                warrant_id: "string — Warrant that authorized this execution",
                success: "boolean — Whether execution succeeded",
                output: "string — Execution output",
              }}
              response={{
                execution_id: "string",
                verified: "boolean",
              }}
            />

            <ApiEndpoint
              method="POST"
              path="/api/v1/agents"
              description="Register an agent with Vienna OS"
              body={{
                agent_id: "string — Unique agent identifier",
                name: "string — Display name",
                capabilities: "string[] — Actions this agent can perform",
              }}
              response={{
                registered: "boolean",
                agent_id: "string",
              }}
            />

            <ApiEndpoint
              method="GET"
              path="/api/v1/warrants/:warrantId"
              description="Verify a warrant's validity"
              body={{}}
              response={{
                valid: "boolean",
                warrant: "object — Full warrant details",
              }}
            />
          </div>
        </section>

        {/* Risk Tiers */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-gold-400">
            Risk Tiers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="py-3 pr-4 text-gray-400">Tier</th>
                  <th className="py-3 pr-4 text-gray-400">Risk</th>
                  <th className="py-3 pr-4 text-gray-400">Approval</th>
                  <th className="py-3 pr-4 text-gray-400">Max TTL</th>
                  <th className="py-3 text-gray-400">Example</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-3 pr-4 font-mono text-green-400">T0</td>
                  <td className="py-3 pr-4">Informational</td>
                  <td className="py-3 pr-4">Auto</td>
                  <td className="py-3 pr-4">60 min</td>
                  <td className="py-3">Read file, check status</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 pr-4 font-mono text-blue-400">T1</td>
                  <td className="py-3 pr-4">Low</td>
                  <td className="py-3 pr-4">Policy auto</td>
                  <td className="py-3 pr-4">30 min</td>
                  <td className="py-3">Send email, create ticket</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-3 pr-4 font-mono text-yellow-400">T2</td>
                  <td className="py-3 pr-4">Medium</td>
                  <td className="py-3 pr-4">1 human</td>
                  <td className="py-3 pr-4">15 min</td>
                  <td className="py-3">Deploy code, modify DB</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-mono text-red-400">T3</td>
                  <td className="py-3 pr-4">High</td>
                  <td className="py-3 pr-4">2+ humans</td>
                  <td className="py-3 pr-4">5 min</td>
                  <td className="py-3">Wire transfer, delete prod</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 border-t border-gray-800">
          <h2 className="text-2xl font-semibold mb-4">Ready to govern your agents?</h2>
          <p className="text-gray-400 mb-6">Start with the free Community tier. No credit card required.</p>
          <a
            href="/signup"
            className="inline-block bg-gold-400 hover:bg-gold-500 text-white font-semibold px-8 py-3 rounded-lg transition"
          >
            Get Started Free
          </a>
        </section>
      </div>
    </main>
  );
}

// --- Component helpers ---

function Step({ number, title, code }: { number: number; title: string; code: string }) {
  return (
    <div className="bg-[#111826] rounded-lg p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center text-sm font-bold">
          {number}
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <pre className="bg-[#0B0F19] rounded p-4 overflow-x-auto text-sm text-gray-300 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FrameworkExample({
  name,
  description,
  code,
}: {
  name: string;
  description: string;
  code: string;
}) {
  return (
    <div className="bg-[#111826] rounded-lg p-6 border border-gray-800">
      <h3 className="text-lg font-semibold mb-1">{name}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <pre className="bg-[#0B0F19] rounded p-4 overflow-x-auto text-sm text-gray-300 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiEndpoint({
  method,
  path,
  description,
  body,
  response,
}: {
  method: string;
  path: string;
  description: string;
  body: Record<string, string>;
  response: Record<string, string>;
}) {
  const methodColor = method === "POST" ? "text-green-400" : "text-blue-400";
  return (
    <div className="bg-[#111826] rounded-lg p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-2">
        <span className={`font-mono font-bold ${methodColor}`}>{method}</span>
        <span className="font-mono text-gray-300">{path}</span>
      </div>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      {Object.keys(body).length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            Request Body
          </span>
          <div className="mt-1 space-y-1">
            {Object.entries(body).map(([key, desc]) => (
              <div key={key} className="text-sm">
                <span className="font-mono text-gold-300">{key}</span>
                <span className="text-gray-500 ml-2">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          Response
        </span>
        <div className="mt-1 space-y-1">
          {Object.entries(response).map(([key, desc]) => (
            <div key={key} className="text-sm">
              <span className="font-mono text-green-300">{key}</span>
              <span className="text-gray-500 ml-2">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
