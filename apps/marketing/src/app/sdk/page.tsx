"use client";

import { Code, Book, Github, Zap, CheckCircle, ArrowRight, Terminal, Package } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

export default function SDKPage() {
  useEffect(() => {
    analytics.page("SDK");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-6">
            <Terminal className="w-4 h-4" />
            Developer Resources
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Vienna OS SDKs
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Official client libraries for JavaScript, TypeScript, and Python. Build AI governance into your applications in minutes.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/risk-ai/regulator.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg font-medium hover:border-slate-300 transition-all"
            >
              <Book className="w-5 h-5" />
              Read the Docs
            </Link>
          </div>
        </div>
      </div>

      {/* Installation */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Installation</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* JavaScript/TypeScript */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">JavaScript / TypeScript</h3>
                  <p className="text-sm text-slate-600">via npm</p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-x-auto">
                npm install vienna-os
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>TypeScript types included</span>
              </div>
            </div>

            {/* Python */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Python</h3>
                  <p className="text-sm text-slate-600">via PyPI</p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-x-auto">
                pip install vienna-os
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Type hints included</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Quick Start</h2>
            
            {/* JavaScript Example */}
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">JavaScript / TypeScript</h3>
              <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm text-slate-100 overflow-x-auto">
                <pre className="whitespace-pre-wrap">{`import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
  baseUrl: 'https://console.regulator.ai/api/v1'
});

// Register your agent
await vienna.agents.register({
  id: 'my-agent-v1',
  name: 'My AI Agent',
  capabilities: ['read_files', 'send_emails'],
  riskTier: 2
});

// Request approval for high-risk action
const proposal = await vienna.proposals.create({
  agentId: 'my-agent-v1',
  action: 'send_email',
  target: 'customer@example.com',
  payload: { subject: 'Update', body: '...' }
});

// Check if approved
if (proposal.state === 'approved') {
  // Execute action with warrant
  await vienna.executions.create({
    proposalId: proposal.id,
    warrantId: proposal.warrantId,
    result: { status: 'sent' }
  });
}`}</pre>
              </div>
            </div>

            {/* Python Example */}
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Python</h3>
              <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm text-slate-100 overflow-x-auto">
                <pre className="whitespace-pre-wrap">{`from vienna_os import ViennaClient
import os

vienna = ViennaClient(
    api_key=os.environ['VIENNA_API_KEY'],
    base_url='https://console.regulator.ai/api/v1'
)

# Register your agent
vienna.agents.register(
    id='my-agent-v1',
    name='My AI Agent',
    capabilities=['read_files', 'send_emails'],
    risk_tier=2
)

# Request approval for high-risk action
proposal = vienna.proposals.create(
    agent_id='my-agent-v1',
    action='send_email',
    target='customer@example.com',
    payload={'subject': 'Update', 'body': '...'}
)

# Check if approved
if proposal.state == 'approved':
    # Execute action with warrant
    vienna.executions.create(
        proposal_id=proposal.id,
        warrant_id=proposal.warrant_id,
        result={'status': 'sent'}
    )`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Simple API</h3>
                <p className="text-slate-600">
                  Intuitive methods for agent registration, proposal creation, warrant verification, and execution tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Type Safety</h3>
                <p className="text-slate-600">
                  Full TypeScript definitions and Python type hints for IDE autocomplete and error checking.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Terminal className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Async/Await</h3>
                <p className="text-slate-600">
                  Modern async patterns for non-blocking governance checks in your application.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Webhook Handlers</h3>
                <p className="text-slate-600">
                  Built-in utilities for verifying and handling Vienna OS webhook events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-slate-50 py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Resources</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                href="/docs"
                className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all group"
              >
                <Book className="w-8 h-8 text-violet-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">API Reference</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Complete API documentation with examples for every endpoint.
                </p>
                <div className="flex items-center gap-2 text-violet-600 font-medium group-hover:gap-3 transition-all">
                  Read Docs
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link
                href="https://github.com/risk-ai/regulator.ai"
                className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all group"
              >
                <Github className="w-8 h-8 text-slate-900 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">GitHub Repository</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Browse source code, report issues, and contribute to Vienna OS.
                </p>
                <div className="flex items-center gap-2 text-violet-600 font-medium group-hover:gap-3 transition-all">
                  View on GitHub
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              <Link
                href="https://github.com/risk-ai/vienna-os/tree/main/examples"
                className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-violet-300 hover:shadow-lg transition-all group"
              >
                <Code className="w-8 h-8 text-violet-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Example Projects</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Full working examples for common use cases and integrations.
                </p>
                <div className="flex items-center gap-2 text-violet-600 font-medium group-hover:gap-3 transition-all">
                  See Examples
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-5xl">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Build?
            </h2>
            <p className="text-violet-100 text-lg mb-8 max-w-2xl mx-auto">
              Start governing your AI agents in minutes. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-600 rounded-lg font-semibold hover:bg-violet-50 transition-all shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
