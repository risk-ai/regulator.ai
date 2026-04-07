"use client";

import { Code, Book, Github, Zap, CheckCircle, ArrowRight, Terminal, Package } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function SDKPage() {
  useEffect(() => {
    analytics.page("SDK");
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Terminal Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-50">
        <SiteNav />
      </div>

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                SDK_LIBRARIES
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight mb-6">
              <span className="text-amber-500">VIENNA_OS_SDKS</span>
              <br />
              <span className="text-zinc-500">/ DEVELOPER_LIBRARIES</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed font-mono mb-8">
              Official client libraries for JavaScript, TypeScript, and Python. Build AI governance into your applications in minutes.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="https://github.com/risk-ai/regulator.ai"
                className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold flex items-center gap-2 transition-all uppercase text-sm"
              >
                <Github className="w-4 h-4" />
                VIEW_ON_GITHUB →
              </Link>
              <Link
                href="/docs"
                className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold transition-all uppercase text-sm"
              >
                READ_DOCS
              </Link>
            </div>
          </div>
        </div>

        {/* Installation */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="mb-12">
            <h2 className="text-3xl font-mono font-bold text-amber-500 uppercase mb-8">INSTALLATION</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* JavaScript/TypeScript */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-mono uppercase font-bold text-amber-500">JavaScript / TypeScript</h3>
                    <p className="text-xs font-mono text-zinc-500">via npm</p>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-amber-500/20 p-4 font-mono text-xs text-amber-500 overflow-x-auto mb-4">
                  npm install vienna-os
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-amber-500" />
                  <span>TypeScript types included</span>
                </div>
              </div>

              {/* Python */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-mono uppercase font-bold text-amber-500">Python</h3>
                    <p className="text-xs font-mono text-zinc-500">via PyPI</p>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-amber-500/20 p-4 font-mono text-xs text-amber-500 overflow-x-auto mb-4">
                  pip install vienna-os
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-amber-500" />
                  <span>Type hints included</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-mono font-bold text-amber-500 uppercase mb-8">QUICK_START</h2>
          <div className="bg-black border border-amber-500/30 p-6 overflow-x-auto">
            <div className="font-mono text-xs text-amber-500">
              <pre>{`import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
});

// Register your agent
await vienna.agents.register({
  id: 'my-agent-v1',
  name: 'My AI Agent',
  riskTier: 2
});

// Request approval for action
const proposal = await vienna.proposals.create({
  agentId: 'my-agent-v1',
  action: 'send_email'
});`}</pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-mono font-bold text-amber-500 uppercase mb-8">FEATURES</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black border border-amber-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-mono uppercase font-bold text-amber-500">Simple API</h3>
              </div>
              <p className="text-xs font-mono text-zinc-400">
                Intuitive methods for agent registration, proposal creation, warrant verification, and execution tracking.
              </p>
            </div>

            <div className="bg-black border border-amber-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-mono uppercase font-bold text-amber-500">Type Safety</h3>
              </div>
              <p className="text-xs font-mono text-zinc-400">
                Full TypeScript definitions and Python type hints for IDE autocomplete and error checking.
              </p>
            </div>

            <div className="bg-black border border-amber-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-mono uppercase font-bold text-amber-500">Async/Await</h3>
              </div>
              <p className="text-xs font-mono text-zinc-400">
                Modern async patterns for non-blocking governance checks in your application.
              </p>
            </div>

            <div className="bg-black border border-amber-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Code className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-mono uppercase font-bold text-amber-500">Webhook Handlers</h3>
              </div>
              <p className="text-xs font-mono text-zinc-400">
                Built-in utilities for verifying and handling Vienna OS webhook events.
              </p>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-mono font-bold text-amber-500 uppercase mb-8">RESOURCES</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/docs"
              className="bg-black border border-amber-500/30 p-6 hover:border-amber-500 transition-all group"
            >
              <Book className="w-6 h-6 text-amber-500 mb-4" />
              <h3 className="text-sm font-mono uppercase font-bold text-amber-500 mb-2">API Reference</h3>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Complete API documentation with examples for every endpoint.
              </p>
              <div className="flex items-center gap-2 text-amber-500 font-mono text-xs uppercase group-hover:gap-3 transition-all">
                Read Docs
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="https://github.com/risk-ai/regulator.ai"
              className="bg-black border border-amber-500/30 p-6 hover:border-amber-500 transition-all group"
            >
              <Github className="w-6 h-6 text-amber-500 mb-4" />
              <h3 className="text-sm font-mono uppercase font-bold text-amber-500 mb-2">GitHub Repository</h3>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Browse source code, report issues, and contribute to Vienna OS.
              </p>
              <div className="flex items-center gap-2 text-amber-500 font-mono text-xs uppercase group-hover:gap-3 transition-all">
                View on GitHub
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <Link
              href="https://github.com/risk-ai/vienna-os/tree/main/examples"
              className="bg-black border border-amber-500/30 p-6 hover:border-amber-500 transition-all group"
            >
              <Code className="w-6 h-6 text-amber-500 mb-4" />
              <h3 className="text-sm font-mono uppercase font-bold text-amber-500 mb-2">Example Projects</h3>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Full working examples for common use cases and integrations.
              </p>
              <div className="flex items-center gap-2 text-amber-500 font-mono text-xs uppercase group-hover:gap-3 transition-all">
                See Examples
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="bg-black border border-amber-500/30 p-12">
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Ready?</div>
            <h2 className="text-3xl font-mono font-bold text-amber-500 uppercase mb-4">
              READY_TO_BUILD
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-8 max-w-2xl">
              Start governing your AI agents in minutes. No credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase text-sm transition"
              >
                GET_STARTED_FREE →
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 font-mono font-bold uppercase text-sm transition"
              >
                TALK_TO_SALES
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
