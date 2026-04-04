"use client";

import { useState, useCallback } from "react";
import { 
  Shield, 
  ArrowLeft, 
  Copy, 
  Check, 
  Terminal,
  Zap,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  BookOpen
} from "lucide-react";

/* ─────────────────────── Code Block Component ─────────────────────── */

function CodeBlock({
  children,
  language = "bash",
  title,
}: {
  children: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="group relative bg-[#0D0F14] border border-[#1C222E] rounded-xl overflow-hidden mb-6">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1C222E] bg-[#141820]">
          <span className="text-xs font-mono text-slate-500">{title}</span>
          <span className="text-xs font-mono text-slate-600">{language}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-[#1C222E] text-slate-500 hover:text-white hover:bg-[#252B3B] transition opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <pre className="p-4 overflow-x-auto">
          <code className="font-mono text-sm text-slate-300 leading-relaxed">{children}</code>
        </pre>
      </div>
    </div>
  );
}

/* ─────────────────────── Callout Component ─────────────────────── */

function Callout({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    tip: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  };
  const icons = {
    info: <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    tip: <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`border rounded-xl p-4 mb-6 flex gap-3 ${styles[type]}`}>
      {icons[type]}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="text-purple-400 bg-[#141820] px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
}

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-[#0D0F14]">
      {/* ── Top Navigation ── */}
      <nav className="border-b border-[#1C222E] sticky top-0 bg-[#0D0F14]/95 backdrop-blur-xl z-50">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/docs" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Docs</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-violet-400" />
              <span className="font-bold text-white text-sm">Vienna<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://console.regulator.ai"
              className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Console
            </a>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-16 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-400" />
            Govern Your Agent in 5 Minutes
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Get from zero to a governed agent intent in under five minutes. This quickstart walks you through 
            installation, initialization, and your first governed action with Vienna OS.
          </p>
        </div>

        <Callout type="info">
          Vienna OS supports any framework that can make HTTP requests. This guide shows JavaScript/TypeScript and Python examples, 
          plus framework integrations for LangChain, CrewAI, and OpenAI function calling.
        </Callout>

        {/* Step 1: Install */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">1</span>
            Install
          </h2>
          <p className="text-slate-400 mb-4">
            Install the Vienna OS SDK for your language. Choose JavaScript/Node.js or Python:
          </p>
          
          <CodeBlock language="bash" title="Node.js / JavaScript">
npm install vienna-os
</CodeBlock>

          <CodeBlock language="bash" title="Python">
pip install vienna-os
</CodeBlock>
        </div>

        {/* Step 2: Initialize */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">2</span>
            Initialize
          </h2>
          <p className="text-slate-400 mb-4">
            Get your API key from <a href="https://console.regulator.ai" className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer">console.regulator.ai → API Keys</a> and initialize the Vienna client:
          </p>

          <CodeBlock language="javascript" title="JavaScript / TypeScript">
{`import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY, // Get from console.regulator.ai → API Keys
});`}
          </CodeBlock>

          <CodeBlock language="python" title="Python">
{`from vienna_os import ViennaClient
import os

vienna = ViennaClient(
    api_key=os.environ['VIENNA_API_KEY']  # Get from console.regulator.ai → API Keys
)`}
          </CodeBlock>
        </div>

        {/* Step 3: Govern an Action */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">3</span>
            Govern an Action
          </h2>
          <p className="text-slate-400 mb-4">
            Before your agent acts, check with Vienna. The governance pipeline will evaluate policies, 
            handle approvals if needed, and issue execution warrants:
          </p>

          <CodeBlock language="javascript" title="JavaScript / TypeScript">
{`// Before your agent acts, submit an intent
const result = await vienna.submitIntent({
  action: 'deploy_to_production',
  payload: { 
    service: 'api-gateway',
    version: '2.4.1',
    environment: 'production' 
  }
});

if (result.pipeline === 'executed') {
  // Auto-approved and executed
  console.log('Deployed:', result.execution_id);
  console.log('Warrant:', result.warrant?.id);
} else if (result.pipeline === 'pending_approval') {
  // Requires human approval
  console.log('Awaiting approval:', result.proposal_id);
} else if (result.pipeline === 'denied') {
  // Blocked by policy
  console.error('Denied:', result.reason);
}`}
          </CodeBlock>

          <CodeBlock language="python" title="Python">
{`# Before your agent acts, submit an intent
result = vienna.submit_intent(
    action='deploy_to_production',
    payload={
        'service': 'api-gateway',
        'version': '2.4.1',
        'environment': 'production'
    }
)

if result.pipeline == 'executed':
    # Auto-approved and executed
    print(f"Deployed: {result.execution_id}")
    print(f"Warrant: {result.warrant.id if result.warrant else None}")
elif result.pipeline == 'pending_approval':
    # Requires human approval
    print(f"Awaiting approval: {result.proposal_id}")
elif result.pipeline == 'denied':
    # Blocked by policy
    print(f"Denied: {result.reason}")`}
          </CodeBlock>
        </div>

        {/* Step 4: Handle Errors */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">4</span>
            Handle Errors
          </h2>
          <p className="text-slate-400 mb-4">
            Always wrap Vienna calls in error handling. Common errors include authentication failures, rate limits, and network issues:
          </p>

          <CodeBlock language="javascript" title="JavaScript Error Handling">
{`try {
  const result = await vienna.submitIntent({
    action: 'deploy_to_production',
    payload: { service: 'api-gateway', version: '2.4.1' }
  });

  if (result.pipeline === 'executed') {
    console.log('Deployed:', result.execution_id);
  } else if (result.pipeline === 'pending_approval') {
    console.log('Awaiting approval:', result.proposal_id);
  } else if (result.pipeline === 'denied') {
    console.error('Denied:', result.reason);
  }
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    console.error('Invalid API key. Get one from console.regulator.ai → API Keys');
  } else if (error.code === 'RATE_LIMITED') {
    console.error('Rate limit exceeded. Retry in', error.retryAfter, 'seconds');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Network error. Check your connection.');
  } else {
    console.error('Vienna error:', error.message);
  }
}`}
          </CodeBlock>

          <CodeBlock language="python" title="Python Error Handling">
{`from vienna_os import ViennaClient, ViennaError, UnauthorizedError, RateLimitError

try:
    result = vienna.submit_intent(
        action='deploy_to_production',
        payload={'service': 'api-gateway', 'version': '2.4.1'}
    )

    if result.pipeline == 'executed':
        print(f"Deployed: {result.execution_id}")
    elif result.pipeline == 'pending_approval':
        print(f"Awaiting approval: {result.proposal_id}")
    elif result.pipeline == 'denied':
        print(f"Denied: {result.reason}")

except UnauthorizedError:
    print("Invalid API key. Get one from console.regulator.ai → API Keys")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry in {e.retry_after} seconds")
except ViennaError as e:
    print(f"Vienna error: {e.message}")`}
          </CodeBlock>

          <Callout type="warning">
            <strong>Common Errors:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><InlineCode>UNAUTHORIZED</InlineCode> — Invalid or missing API key</li>
              <li><InlineCode>RATE_LIMITED</InlineCode> — Too many requests (5000/15min default)</li>
              <li><InlineCode>NETWORK_ERROR</InlineCode> — Connection timeout or DNS failure</li>
              <li><InlineCode>INVALID_REQUEST</InlineCode> — Missing required fields (action, payload)</li>
            </ul>
          </Callout>
        </div>

        {/* Step 5: See It Live */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-purple-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">5</span>
            See It Live
          </h2>
          <p className="text-slate-400 mb-4">
            Check the Vienna OS console to see your governance events, audit trail, and agent activity:
          </p>
          
          <div className="bg-[#141820] border border-[#1C222E] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Console Dashboard</h3>
              <a 
                href="https://console.regulator.ai" 
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Real-time governance events and decisions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Complete audit trail for compliance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Agent fleet management and trust scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Policy configuration and testing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Framework Integrations */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-emerald-400" />
            Framework Integrations
          </h2>
          <p className="text-slate-400 mb-6">
            Vienna OS integrates seamlessly with popular AI frameworks. Here's how to add governance to your existing agents:
          </p>

          {/* LangChain */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">LangChain</h3>
            <p className="text-slate-400 mb-4 text-sm">
              Add Vienna governance as a callback handler to automatically govern every LLM call:
            </p>
            <CodeBlock language="python" title="LangChain Integration">
{`from vienna_os import ViennaGovernance

# Add as a callback handler
chain = LLMChain(
    llm=ChatOpenAI(),
    callbacks=[ViennaGovernance(api_key="vos_...")]
)
# Every LLM call is now governed`}
            </CodeBlock>
          </div>

          {/* CrewAI */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">CrewAI</h3>
            <p className="text-slate-400 mb-4 text-sm">
              Govern CrewAI agent actions automatically:
            </p>
            <CodeBlock language="python" title="CrewAI Integration">
{`from vienna_os.crewai import ViennaCrewGovernance

crew = Crew(
    agents=[researcher, writer],
    governance=ViennaCrewGovernance(api_key="vos_...")
)
# Agent actions governed automatically`}
            </CodeBlock>
          </div>

          {/* OpenAI Function Calling */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">OpenAI Function Calling</h3>
            <p className="text-slate-400 mb-4 text-sm">
              Wrap your function calls with Vienna governance:
            </p>
            <CodeBlock language="javascript" title="OpenAI Function Calling">
{`import { ViennaClient } from 'vienna-os';
const vienna = new ViennaClient({ 
  apiKey: 'vos_...',
  agentId: 'openai-agent',
  baseUrl: 'https://console.regulator.ai'
});

// Submit intent before each function call
const result = await vienna.submitIntent({
  action: 'call_function',
  payload: { function: 'transfer_funds', args: {...} }
});
// Use result.warrant to prove authorization`}
            </CodeBlock>
          </div>
        </div>

        <Callout type="tip">
          <strong>That's it!</strong> In 4 steps you've added enterprise-grade governance to your AI agent. 
          Every action is now policy-evaluated, audited, and potentially approved before execution. 
          Your agent can't go rogue or make unauthorized changes.
        </Callout>

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-purple-900/20 to-navy-800/50 border border-purple-500/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-4">Next Steps</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <a 
              href="/docs/github-action" 
              className="bg-[#141820] border border-[#1C222E] rounded-lg p-4 hover:border-purple-500/30 transition group"
            >
              <div className="font-semibold text-white mb-2 group-hover:text-purple-400 transition">GitHub Action</div>
              <div className="text-slate-400">Add Vienna to your CI/CD pipeline</div>
            </a>
            <a 
              href="/docs/api-reference" 
              className="bg-[#141820] border border-[#1C222E] rounded-lg p-4 hover:border-purple-500/30 transition group"
            >
              <div className="font-semibold text-white mb-2 group-hover:text-purple-400 transition">API Reference</div>
              <div className="text-slate-400">Complete API documentation</div>
            </a>
            <a 
              href="/docs/integration-guide" 
              className="bg-[#141820] border border-[#1C222E] rounded-lg p-4 hover:border-purple-500/30 transition group"
            >
              <div className="font-semibold text-white mb-2 group-hover:text-purple-400 transition">Integration Guide</div>
              <div className="text-slate-400">Deep dive into framework integrations</div>
            </a>
            <a 
              href="https://console.regulator.ai" 
              className="bg-[#141820] border border-[#1C222E] rounded-lg p-4 hover:border-purple-500/30 transition group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="font-semibold text-white mb-2 group-hover:text-purple-400 transition flex items-center gap-1">
                Vienna Console <ExternalLink className="w-3 h-3" />
              </div>
              <div className="text-slate-400">Configure policies and monitor agents</div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}