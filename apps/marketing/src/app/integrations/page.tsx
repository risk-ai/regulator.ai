"use client";

import { Shield, ArrowLeft, ArrowRight, Code, Terminal, Check, Copy, Zap, Github } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const agentFrameworks = [
  {
    name: "OpenClaw",
    status: "live" as const,
    desc: "First-class native integration. OpenClaw agents submit intents through the Agent Intent Bridge.",
    language: "bash",
    example: `curl -X POST https://console.regulator.ai/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "action": "send_email",
    "source": {"platform": "openclaw", "agent_id": "agt-123"},
    "tenant_id": "prod",
    "parameters": {
      "to": "customer@example.com",
      "subject": "Your order has shipped"
    }
  }'`,
  },
  {
    name: "LangChain",
    status: "compatible" as const,
    desc: "Wrap Vienna's Intent API as a LangChain Tool for governed agent execution.",
    language: "python",
    example: `from langchain.tools import BaseTool
import requests

class ViennaTool(BaseTool):
    name = "vienna_governed_action"
    description = "Execute actions through Vienna OS governance"
    
    def _run(self, action: str, **kwargs) -> str:
        response = requests.post(
            "https://console.regulator.ai/api/v1/agent/intent",
            headers={"Authorization": f"Bearer {VIENNA_API_KEY}"},
            json={
                "action": action,
                "source": {"platform": "langchain"},
                "tenant_id": "prod",
                "parameters": kwargs
            }
        )
        return response.json()`,
  },
  {
    name: "CrewAI",
    status: "compatible" as const,
    desc: "Route high-risk crew actions through Vienna's approval pipeline before execution.",
    language: "python",
    example: `from crewai import Agent, Task, Crew
import requests

def governed_callback(output):
    response = requests.post(
        "https://console.regulator.ai/api/v1/agent/intent",
        headers={"Authorization": f"Bearer {VIENNA_API_KEY}"},
        json={
            "action": output.get("action", "crew_task"),
            "source": {"platform": "crewai"},
            "tenant_id": "prod",
            "parameters": output
        }
    )
    
    result = response.json()
    if result["data"]["status"] == "denied":
        raise Exception(f"Governance denied: {result['data']['reason']}")
    
    return result["data"]`,
  },
  {
    name: "AutoGen / Custom",
    status: "compatible" as const,
    desc: "Any framework that makes HTTP requests integrates via the REST API.",
    language: "typescript",
    example: `const vienna = {
  async submitIntent(action: string, parameters: any) {
    const response = await fetch("https://console.regulator.ai/api/v1/agent/intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${process.env.VIENNA_API_KEY}\`
      },
      body: JSON.stringify({
        action,
        source: { platform: "autogen", agent_id: "your-agent" },
        tenant_id: "prod",
        parameters
      })
    });
    
    const result = await response.json();
    
    if (result.data.status === "denied") {
      throw new Error(\`Action denied: \${result.data.reason}\`);
    }
    
    return result.data;
  }
};`,
  },
];

const notificationAdapters = [
  {
    name: "Slack",
    status: "live" as const,
    desc: "T1/T2 approval requests sent to Slack with interactive buttons. Real-time governance notifications.",
    features: ["Interactive approval buttons", "Execution status notifications", "Policy violation alerts", "Color-coded risk tiers"],
    icon: "",
  },
  {
    name: "GitHub",
    status: "live" as const,
    desc: "Governed deployments with warrant metadata. PR status checks and audit trail comments.",
    features: ["Deployment governance", "PR status checks", "Audit trail comments", "Warrant-gated merges"],
    icon: "",
  },
  {
    name: "Email",
    status: "live" as const,
    desc: "Approval request emails, execution notifications, and daily governance digest.",
    features: ["Approval request emails", "Execution notifications", "Daily digest reports", "One-click console links"],
    icon: "",
  },
  {
    name: "Webhooks",
    status: "live" as const,
    desc: "Generic webhook endpoints for custom integrations and external monitoring.",
    features: ["Custom event handlers", "HMAC signature verification", "Retry with backoff", "Event filtering"],
    icon: "",
  },
  {
    name: "Stripe Billing",
    status: "live" as const,
    desc: "Usage-based metered billing for agent executions. Team $49/mo, Business $99/mo pricing tiers.",
    features: ["Metered billing by execution", "Multi-tier pricing", "Invoice automation", "Usage analytics"],
    icon: "",
  },
  {
    name: "Sentry Monitoring",
    status: "live" as const,
    desc: "Error tracking and performance monitoring for the Vienna OS governance pipeline.",
    features: ["Real-time error tracking", "Performance monitoring", "Alert integration", "Debug context"],
    icon: "",
  },
  {
    name: "Google Analytics",
    status: "live" as const,
    desc: "GA4 analytics integration for console usage tracking and governance metrics.",
    features: ["Console usage tracking", "Governance metrics", "Custom events", "User journey analysis"],
    icon: "",
  },
  {
    name: "Docker Self-hosting",
    status: "live" as const,
    desc: "Community tier supports self-hosted Docker deployments with full governance capabilities.",
    features: ["Docker container support", "Self-hosted deployment", "Community tier included", "Air-gapped capable"],
    icon: "",
  },
];

const statusLabels = {
  live: { label: "Live", color: "emerald", bg: "emerald-500/10", border: "emerald-500/30" },
  compatible: { label: "Compatible", color: "blue", bg: "blue-500/10", border: "blue-500/30" },
  coming: { label: "Coming Soon", color: "gold", bg: "gold-400/10", border: "gold-400/30" },
} as const;

/* ============================================================
   CODE BLOCK COMPONENT
   ============================================================ */

function CodeBlock({ children, language, title }: { children: string; language?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="bg-[#0a0e14] border border-zinc-800 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-black/50">
          <span className="text-xs font-mono text-zinc-400">{title}</span>
          <span className="text-xs font-mono text-zinc-500">{language}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-zinc-900 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <pre className="p-4 overflow-x-auto group">
          <code className="font-mono text-sm text-zinc-300 leading-relaxed">{children}</code>
        </pre>
      </div>
    </div>
  );
}

/* ============================================================
   SCROLL REVEAL ANIMATION
   ============================================================ */

function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay * 1000);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Navigation */}
      <nav className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-7 h-7 text-amber-500" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
          </a>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-sm text-zinc-400 hover:text-white transition">Docs</a>
            <a href="/signup" className="text-sm bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 px-4 py-2 transition font-medium">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                Framework Integrations
              </span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Vienna OS connects to your agent frameworks, notification channels, and deployment pipelines.
              <strong className="text-zinc-300"> Any system that makes HTTP requests can integrate.</strong>
            </p>
          </div>
        </ScrollReveal>

        {/* Agent Frameworks */}
        <section className="mb-20">
          <ScrollReveal delay={0.2}>
            <div className="flex items-center gap-3 mb-8">
              <Code className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-white">Agent Frameworks</h2>
            </div>
          </ScrollReveal>
          
          <div className="space-y-6">
            {agentFrameworks.map((intg, i) => {
              const status = statusLabels[intg.status];
              return (
                <ScrollReveal key={intg.name} delay={0.3 + i * 0.1}>
                  <div className="bg-black border border-zinc-800 overflow-hidden hover:border-amber-500/20 transition-colors">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-xl font-bold text-white">{intg.name}</h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold text-${status.color}-400 bg-${status.bg} border border-${status.border}`}>
                            {status.label}
                          </div>
                        </div>
                        <Terminal className={`w-5 h-5 text-${status.color}-400`} />
                      </div>
                      <p className="text-zinc-400 mb-6 leading-relaxed">{intg.desc}</p>
                    </div>
                    <CodeBlock language={intg.language} title={`${intg.name} Integration`}>
                      {intg.example}
                    </CodeBlock>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* Notification & Deployment Adapters */}
        <section className="mb-20">
          <ScrollReveal delay={0.7}>
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Notifications & Deployment</h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {notificationAdapters.map((adapter, i) => {
              const status = statusLabels[adapter.status];
              return (
                <ScrollReveal key={adapter.name} delay={0.8 + i * 0.1}>
                  <div className="bg-black border border-zinc-800 p-6 hover:border-amber-500/20 transition-colors h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{adapter.icon}</span>
                        <h3 className="text-xl font-bold text-white">{adapter.name}</h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold text-${status.color}-400 bg-${status.bg} border border-${status.border}`}>
                        {status.label}
                      </div>
                    </div>
                    <p className="text-zinc-400 mb-4 leading-relaxed">{adapter.desc}</p>
                    <div className="space-y-2">
                      {adapter.features.map((f) => (
                        <div key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        {/* TypeScript SDK */}
        <section className="mb-20">
          <ScrollReveal delay={1.2}>
            <div className="bg-black border border-amber-500/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Github className="w-8 h-8 text-amber-500" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">TypeScript SDK</h3>
                    <p className="text-amber-500 font-mono text-sm">@vienna-os/sdk</p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-full text-sm font-bold text-green-500 bg-emerald-500/10 border border-emerald-500/30">
                  Available
                </div>
              </div>
              <p className="text-zinc-300 mb-6 leading-relaxed">
                Full TypeScript SDK with typed client, intent submission, policy management, 
                fleet monitoring, compliance reporting, and approval workflows.
              </p>
              <CodeBlock language="typescript" title="SDK Usage">
{`import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY!
});

// Submit governed intent
const result = await vienna.intent.submit({
  action: 'deploy_service',
  parameters: { 
    service: 'api-gateway', 
    environment: 'production',
    strategy: 'rolling' 
  }
});

// Wait for approval if required
if (result.status === 'pending_approval') {
  const approval = await vienna.approvals.wait(result.approvalId, {
    timeoutMs: 300_000 // 5 minutes
  });
  console.log(\` Approved by \${approval.approver}\`);
}

// Check execution result
console.log(\` Warrant: \${result.warrant.warrantId}\`);
console.log(\` Result: \${result.executionResult}\`);`}
              </CodeBlock>
            </div>
          </ScrollReveal>
        </section>

        {/* Bottom CTA */}
        <ScrollReveal delay={1.4}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Need a custom integration?
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
              Vienna OS exposes a full REST API. Any system that makes HTTP requests can integrate.
              Check out our interactive API explorer to get started.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a href="/try" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 transition font-semibold shadow-lg hover:shadow-gold-400/25">
                Try API Live <ArrowRight className="w-5 h-5" />
              </a>
              <a href="/docs" className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-3 transition font-semibold border border-amber-500/20 hover:border-amber-500/30">
                <Code className="w-5 h-5" />
                View Docs
              </a>
            </div>
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
}
