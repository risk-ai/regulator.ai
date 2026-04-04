import type { Metadata } from "next";
import { Shield, ArrowRight, Code, Terminal, FileText, Zap, Server, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Examples — Vienna OS",
  description:
    "Production-ready code examples for Vienna OS. Learn how to implement AI governance with warrants, policies, and audit trails in your applications.",
  openGraph: {
    title: "Examples — Vienna OS",
    description:
      "Production-ready code examples for Vienna OS governance platform.",
    url: "https://regulator.ai/examples",
  },
};

const examples = [
  {
    title: "Customer Support Agent — Tiered Governance",
    description: "AI-powered customer support with T0/T1 auto-approval and T2/T3 human-in-the-loop for high-risk actions.",
    language: "JavaScript",
    icon: Zap,
    code: `import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'customer-support-agent',
});

// T0: Information request (instant approval)
const checkOrder = await vienna.submitIntent({
  action: 'check_order_status',
  payload: { order_id: '#12345' }
});
// → Auto-approved, no review needed

// T1: Small refund (instant approval)
const smallRefund = await vienna.submitIntent({
  action: 'process_refund',
  payload: { amount: 35, reason: 'Damaged item' }
});
// → Auto-approved, logged for audit

// T2: Large refund (requires approval)
const largeRefund = await vienna.submitIntent({
  action: 'process_refund',
  payload: { amount: 250, reason: 'Defective' }
});
// → Pending human approval

// T3: Account deletion (requires senior approval)
const deletion = await vienna.submitIntent({
  action: 'delete_account',
  payload: { customer_id: 'cust_789' }
});
// → Pending senior approval + compliance review`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/customer-support-agent",
  },
  {
    title: "Quick Start — Submit Your First Intent",
    description: "Register an agent, create a policy, and submit an intent for approval in under 5 minutes.",
    language: "TypeScript",
    icon: Zap,
    code: `import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY!,
  baseUrl: 'https://console.regulator.ai',
});

// Submit an intent for governance review
const intent = await vienna.intents.submit({
  agentId: 'deploy-bot',
  action: 'deploy',
  resource: 'api-v2',
  riskTier: 'T1',
  context: { environment: 'production', version: '2.3.0' },
});

console.log('Intent status:', intent.status);
// → "pending_approval" (T1 requires operator sign-off)`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/quickstart",
  },
  {
    title: "Policy-as-Code",
    description: "Define governance policies that automatically classify risk tiers and route approvals.",
    language: "TypeScript",
    icon: FileText,
    code: `// Create a policy that auto-approves read-only actions
// but requires approval for writes
const policy = await vienna.policies.create({
  name: 'production-access',
  rules: [
    {
      match: { action: 'read', resource: '*' },
      riskTier: 'T0', // Auto-approved
    },
    {
      match: { action: 'deploy', resource: 'production' },
      riskTier: 'T2', // Multi-party approval
      approvers: ['ops-lead', 'security-team'],
    },
  ],
});`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/policies",
  },
  {
    title: "Execution Warrants",
    description: "Issue cryptographic warrants that authorize and verify agent execution.",
    language: "TypeScript",
    icon: Lock,
    code: `// After approval, issue an execution warrant
const warrant = await vienna.warrants.issue({
  intentId: intent.id,
  expiresIn: '1h',
  scope: ['deploy:api-v2:production'],
});

// Agent verifies warrant before executing
const verified = await vienna.warrants.verify(warrant.token);
if (verified.valid) {
  await deployToProduction(); // Authorized execution
  await vienna.warrants.complete(warrant.id, {
    result: 'success',
    artifacts: { deployId: 'dep_abc123' },
  });
}`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/warrants",
  },
  {
    title: "Python SDK — Regulatory Monitor",
    description: "Build a compliance monitoring agent that tracks regulatory changes with full governance.",
    language: "Python",
    icon: Terminal,
    code: `from vienna_os import ViennaClient

client = ViennaClient(
    api_key=os.environ["VIENNA_API_KEY"],
    base_url="https://console.regulator.ai",
)

# Register a compliance monitoring agent
agent = client.agents.register(
    name="compliance-monitor",
    capabilities=["scan", "report", "alert"],
)

# Submit regulatory scan intent
intent = client.intents.submit(
    agent_id=agent.id,
    action="regulatory_scan",
    resource="eu-ai-act",
    context={"scope": "high-risk-systems"},
)`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/regulatory-monitor",
  },
  {
    title: "GitHub Action — CI/CD Governance",
    description: "Add governance gates to your CI/CD pipeline with the Vienna OS GitHub Action.",
    language: "YAML",
    icon: Server,
    code: `# .github/workflows/governed-deploy.yml
name: Governed Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Request deployment warrant
        uses: risk-ai/vienna-os-action@v1
        with:
          api-key: \${{ secrets.VIENNA_API_KEY }}
          action: deploy
          resource: production
          risk-tier: T1
          wait-for-approval: true
          timeout: 30m
      
      - name: Deploy (only runs if approved)
        run: npm run deploy`,
    href: "/docs/github-action",
  },
  {
    title: "Audit Trail & Compliance Reporting",
    description: "Query the immutable audit trail for compliance reporting and incident investigation.",
    language: "TypeScript",
    icon: Shield,
    code: `// Get audit trail for a specific time range
const events = await vienna.audit.query({
  from: '2026-01-01',
  to: '2026-03-31',
  agentId: 'deploy-bot',
  actions: ['deploy', 'rollback'],
});

// Generate compliance report
const report = await vienna.audit.report({
  framework: 'SOC2',
  period: 'Q1-2026',
  format: 'pdf',
});

console.log(\`Found \${events.length} governed actions\`);
console.log(\`Report: \${report.url}\`);`,
    href: "https://github.com/risk-ai/vienna-os/tree/main/examples/audit",
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <div className="border-b border-navy-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Shield className="w-5 h-5 text-purple-400" />
            Vienna OS
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-slate-400 hover:text-white transition">Docs</a>
            <a href="/pricing" className="text-sm text-slate-400 hover:text-white transition">Pricing</a>
            <a
              href="https://console.regulator.ai"
              className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition"
            >
              Console
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-purple-400 text-sm font-medium mb-4 bg-purple-500/10 px-4 py-2 rounded-full">
            <Code className="w-4 h-4" />
            Production-ready examples
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Learn by Example
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Copy-paste examples to integrate AI governance into your applications.
            From quick starts to production patterns.
          </p>
        </div>

        {/* Examples Grid */}
        <div className="space-y-8">
          {examples.map((example, i) => (
            <div
              key={i}
              className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden hover:border-purple-500/30 transition"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                      <example.icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{example.title}</h2>
                      <p className="text-sm text-slate-400 mt-1">{example.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full">
                    {example.language}
                  </span>
                </div>
                <pre className="bg-navy-900 border border-navy-600 rounded-xl p-6 overflow-x-auto text-sm">
                  <code className="text-slate-300 font-mono whitespace-pre">{example.code}</code>
                </pre>
                <div className="mt-4 flex items-center justify-end">
                  <a
                    href={example.href}
                    target={example.href.startsWith("http") ? "_blank" : undefined}
                    rel={example.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition"
                  >
                    View full example
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/30 rounded-2xl p-12">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to add governance to your AI?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Get started in under 5 minutes with our free Community tier. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup?plan=community"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl transition font-semibold"
            >
              <Zap className="w-5 h-5" />
              Get Started Free
            </a>
            <a
              href="https://github.com/risk-ai/vienna-os"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 px-8 py-3 rounded-xl transition font-semibold"
            >
              View on GitHub
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-700 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-sm text-slate-500">© 2026 Technetwork 2 LLC dba ai.ventures</span>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-500">Vienna OS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
