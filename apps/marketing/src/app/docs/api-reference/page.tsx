"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Menu,
  X,
  Code,
  Zap,
  Users,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

/* ─────────────────────── Types ─────────────────────── */

interface NavSection {
  id: string;
  label: string;
  methods?: { id: string; label: string; method: string }[];
}

/* ─────────────────────── Navigation Data ─────────────────────── */

const sections: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "authentication",
    label: "Authentication",
  },
  {
    id: "client",
    label: "ViennaClient",
    methods: [
      { id: "client-constructor", label: "constructor", method: "constructor" },
      { id: "client-config", label: "config", method: "config" },
    ],
  },
  {
    id: "intent",
    label: "Intent Module",
    methods: [
      { id: "intent-submit", label: "submit", method: "submit" },
      { id: "intent-status", label: "status", method: "status" },
      { id: "intent-simulate", label: "simulate", method: "simulate" },
      { id: "intent-list", label: "list", method: "list" },
    ],
  },
  {
    id: "policies",
    label: "Policies Module", 
    methods: [
      { id: "policies-create", label: "create", method: "create" },
      { id: "policies-update", label: "update", method: "update" },
      { id: "policies-delete", label: "delete", method: "delete" },
      { id: "policies-list", label: "list", method: "list" },
      { id: "policies-evaluate", label: "evaluate", method: "evaluate" },
      { id: "policies-templates", label: "templates", method: "templates" },
    ],
  },
  {
    id: "fleet",
    label: "Fleet Module",
    methods: [
      { id: "fleet-register", label: "register", method: "register" },
      { id: "fleet-get", label: "get", method: "get" },
      { id: "fleet-update", label: "update", method: "update" },
      { id: "fleet-metrics", label: "metrics", method: "metrics" },
      { id: "fleet-activity", label: "activity", method: "activity" },
      { id: "fleet-alerts", label: "alerts", method: "alerts" },
    ],
  },
  {
    id: "approvals",
    label: "Approvals Module",
    methods: [
      { id: "approvals-list", label: "list", method: "list" },
      { id: "approvals-approve", label: "approve", method: "approve" },
      { id: "approvals-deny", label: "deny", method: "deny" },
    ],
  },
  {
    id: "integrations",
    label: "Integrations Module", 
    methods: [
      { id: "integrations-create", label: "create", method: "create" },
      { id: "integrations-list", label: "list", method: "list" },
      { id: "integrations-test", label: "test", method: "test" },
      { id: "integrations-delete", label: "delete", method: "delete" },
    ],
  },
  {
    id: "compliance",
    label: "Compliance Module",
    methods: [
      { id: "compliance-generate", label: "generate", method: "generate" },
      { id: "compliance-get", label: "get", method: "get" },
      { id: "compliance-stats", label: "quickStats", method: "quickStats" },
    ],
  },
];

/* ─────────────────────── Code Block Component ─────────────────────── */

function CodeBlock({
  children,
  language = "typescript",
  title,
}: {
  children: string;
  language?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative bg-navy-900 border border-navy-800 rounded-xl overflow-hidden mb-6">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-800 bg-navy-800">
          <span className="text-xs font-mono text-slate-500">{title}</span>
          <span className="text-xs font-mono text-slate-600">{language}</span>
        </div>
      )}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-navy-800 text-slate-500 hover:text-white hover:bg-navy-700 transition opacity-0 group-hover:opacity-100"
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

/* ─────────────────────── Method Component ─────────────────────── */

function Method({
  id,
  name,
  signature,
  description,
  parameters,
  returns,
  example,
}: {
  id: string;
  name: string;
  signature: string;
  description: string;
  parameters?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  returns: string;
  example: string;
}) {
  return (
    <div id={id} className="mb-12 scroll-mt-24">
      <div className="flex items-baseline gap-4 mb-4 group">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <a href={`#${id}`} className="text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition text-sm">
          #
        </a>
      </div>
      
      <CodeBlock language="typescript" title="Method Signature">
        {signature}
      </CodeBlock>

      <p className="text-slate-400 mb-6 leading-relaxed">{description}</p>

      {parameters && parameters.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Parameters</h4>
          <div className="space-y-3">
            {parameters.map((param) => (
              <div key={param.name} className="border border-navy-800 rounded-lg p-4 bg-navy-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-amber-500 font-mono text-sm">{param.name}</code>
                  <span className="text-slate-500 text-xs">—</span>
                  <code className="text-emerald-400 font-mono text-xs">{param.type}</code>
                  {!param.required && <span className="text-slate-600 text-xs">(optional)</span>}
                </div>
                <p className="text-slate-400 text-sm">{param.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white mb-2 uppercase tracking-wider">Returns</h4>
        <code className="text-emerald-400 font-mono text-sm">{returns}</code>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Example</h4>
        <CodeBlock language="typescript">{example}</CodeBlock>
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
    info: <Code className="w-4 h-4 shrink-0 mt-0.5" />,
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

/* ─────────────────────── Section Heading ─────────────────────── */

function H2({ id, icon, children }: { id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-6 pt-8 scroll-mt-24 group">
      {icon}
      <h2 className="text-2xl font-bold text-white">{children}</h2>
      <a href={`#${id}`} className="text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition">
        #
      </a>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-400 mb-4 leading-relaxed">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="text-amber-500 bg-navy-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
}

/* ─────────────────────── Main API Reference Page ─────────────────────── */

export default function ApiReferencePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    authentication: false,
    client: false,
    intent: false,
    policies: false,
    fleet: false,
    approvals: false,
    integrations: false,
    compliance: false,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  /* Intersection Observer for active section tracking */
  useEffect(() => {
    const allIds = sections.flatMap((s) => [s.id, ...(s.methods?.map((m) => m.id) || [])]);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveSection(id);
            // Expand parent section
            const parent = sections.find((s) => s.id === id || s.methods?.some((m) => m.id === id));
            if (parent) {
              setExpandedSections((prev) => ({ ...prev, [parent.id]: true }));
            }
            break;
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    const timer = setTimeout(() => {
      allIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (id: string) => activeSection === id;

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ── Top Navigation ── */}
      <nav className="border-b border-navy-800 sticky top-0 bg-navy-900/95 backdrop-blur-xl z-50">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-navy-800 text-slate-400"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="/docs" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Docs</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-white text-sm">Vienna<span className="bg-gradient-to-r from-amber-500 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
            </div>
            <span className="text-slate-700 text-xs font-mono hidden sm:inline">API v1</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/risk-ai/regulator.ai"
              className="text-sm text-slate-500 hover:text-white transition hidden sm:inline-flex items-center gap-1"
            >
              GitHub
            </a>
            <a
              href="https://console.regulator.ai"
              className="text-sm bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 px-4 py-1.5 rounded-lg transition font-medium"
            >
              Console
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-[90rem] mx-auto flex">
        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed lg:sticky top-[53px] left-0 h-[calc(100vh-53px)] w-72 shrink-0
            bg-navy-900 border-r border-navy-800 overflow-y-auto z-40
            transition-transform duration-200
            ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="py-6 px-4">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4 px-3">
              API Reference
            </div>
            <nav className="space-y-0.5">
              {sections.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => toggleSection(s.id)}
                    className={`w-full flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition ${
                      isActive(s.id)
                        ? "bg-amber-500/10 text-amber-500"
                        : "text-slate-400 hover:text-white hover:bg-navy-800"
                    }`}
                  >
                    <span className="flex-1 text-left">{s.label}</span>
                    {s.methods && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-600 transition-transform ${
                          expandedSections[s.id] ? "" : "-rotate-90"
                        }`}
                      />
                    )}
                  </button>
                  {s.methods && expandedSections[s.id] && (
                    <div className="ml-4 pl-3 border-l border-navy-800 mt-1 mb-2 space-y-0.5">
                      {s.methods.map((m) => (
                        <a
                          key={m.id}
                          href={`#${m.id}`}
                          onClick={() => setMobileNavOpen(false)}
                          className={`block text-xs py-1.5 px-3 rounded transition ${
                            isActive(m.id)
                              ? "text-amber-500 bg-amber-500/5"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span className="text-emerald-400 font-mono mr-1">{m.method}</span>
                          {m.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Overlay for mobile nav ── */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* ── Main Content ── */}
        <main ref={mainRef} className="flex-1 min-w-0 px-6 sm:px-8 lg:px-16 py-10 max-w-4xl">
          
          {/* ════════════════════════════════════════════════════════════════
               OVERVIEW
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="overview" icon={<Code className="w-6 h-6 text-blue-400" />}>
            Vienna SDK API Reference
          </H2>
          <P>
            The Vienna OS SDK provides a TypeScript/JavaScript client for integrating with the Vienna governance platform.
            This reference documents all available methods, parameters, and return types.
          </P>

          <Callout type="info">
            <strong>Base URL:</strong> <InlineCode>https://console.regulator.ai</InlineCode><br />
            <strong>API Version:</strong> <InlineCode>v1</InlineCode><br />
            <strong>Authentication:</strong> API key via Bearer token or session cookie
          </Callout>

          <CodeBlock language="bash" title="Installation">
{`# Install the SDK
npm install @vienna/sdk

# Or via yarn
yarn add @vienna/sdk`}
          </CodeBlock>

          <CodeBlock language="typescript" title="Quick Start">
{`import { ViennaClient } from '@vienna/sdk';

const vienna = new ViennaClient({
  apiKey: 'vna_your_api_key_here',
  baseUrl: 'https://console.regulator.ai', // optional
});

// Submit an intent
const result = await vienna.intent.submit({
  action: 'wire_transfer',
  source: 'billing-bot',
  payload: { amount: 75000, currency: 'USD' },
});

console.log('Intent status:', result.status);`}
          </CodeBlock>

          {/* ════════════════════════════════════════════════════════════════
               AUTHENTICATION
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="authentication" icon={<Shield className="w-6 h-6 text-emerald-400" />}>
            Authentication
          </H2>
          <P>
            The Vienna SDK uses API keys for authentication. You can obtain an API key from the Vienna Console
            or via the authentication endpoint.
          </P>

          <CodeBlock language="typescript" title="API Key Authentication">
{`const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
});`}
          </CodeBlock>

          <Callout type="warning">
            Store your API keys securely using environment variables. Never commit API keys to version control.
          </Callout>

          {/* ════════════════════════════════════════════════════════════════
               VIENNA CLIENT
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="client" icon={<Settings className="w-6 h-6 text-amber-500" />}>
            ViennaClient
          </H2>
          <P>
            The main client class that provides access to all Vienna OS modules. Initialize once and reuse across
            your application.
          </P>

          <Method
            id="client-constructor"
            name="constructor"
            signature="new ViennaClient(config: ViennaConfig)"
            description="Creates a new Vienna client instance with the provided configuration."
            parameters={[
              {
                name: "config",
                type: "ViennaConfig",
                description: "Configuration object containing API key and optional settings",
                required: true,
              },
            ]}
            returns="ViennaClient"
            example={`import { ViennaClient } from '@vienna/sdk';

const vienna = new ViennaClient({
  apiKey: 'vna_your_api_key',
  baseUrl: 'https://console.regulator.ai', // optional
  timeout: 30000, // optional, default 30s
  retries: 3, // optional, default 3
  onError: (error) => console.error('Vienna error:', error), // optional
});`}
          />

          <Method
            id="client-config"
            name="ViennaConfig"
            signature="interface ViennaConfig"
            description="Configuration interface for the Vienna client."
            parameters={[
              {
                name: "apiKey",
                type: "string",
                description: "API key for authentication (starts with 'vna_')",
                required: true,
              },
              {
                name: "baseUrl",
                type: "string",
                description: "Base URL of the Vienna OS API",
                required: false,
              },
              {
                name: "timeout",
                type: "number",
                description: "Request timeout in milliseconds",
                required: false,
              },
              {
                name: "retries",
                type: "number",
                description: "Number of automatic retries on 429/5xx errors",
                required: false,
              },
              {
                name: "onError",
                type: "(error: Error) => void",
                description: "Global error handler invoked on every request failure",
                required: false,
              },
            ]}
            returns="ViennaConfig"
            example={`const config: ViennaConfig = {
  apiKey: process.env.VIENNA_API_KEY!,
  baseUrl: 'https://console.regulator.ai',
  timeout: 60000, // 1 minute
  retries: 5,
  onError: (error) => {
    console.error('[Vienna SDK Error]', error.message);
    // Send to error tracking service
    errorTracker.captureException(error);
  },
};`}
          />

          {/* ════════════════════════════════════════════════════════════════
               INTENT MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="intent" icon={<Zap className="w-6 h-6 text-amber-400" />}>
            Intent Module
          </H2>
          <P>
            The Intent module handles agent action submissions, status tracking, and simulation.
            This is the primary interface for governing agent behavior.
          </P>

          <Method
            id="intent-submit"
            name="submit"
            signature="vienna.intent.submit(intent: IntentRequest, options?: RequestOptions): Promise<IntentResult>"
            description="Submit an agent intent for governance evaluation and execution. The action flows through policy evaluation, risk assessment, approval (if required), and execution."
            parameters={[
              {
                name: "intent",
                type: "IntentRequest",
                description: "The intent request describing the action to perform",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration (timeout, abort signal)",
                required: false,
              },
            ]}
            returns="Promise<IntentResult>"
            example={`// Submit a wire transfer intent
const result = await vienna.intent.submit({
  action: 'wire_transfer',
  source: 'billing-bot',
  tenantId: 'acme-corp',
  payload: {
    amount: 75000,
    currency: 'USD',
    recipient: 'vendor-123',
    reason: 'Monthly vendor payment',
  },
  metadata: {
    requestId: 'req-abc123',
    context: 'scheduled_payment',
  },
});

// Handle the result based on status
switch (result.status) {
  case 'executed':
    console.log('Payment processed:', result.executionId);
    break;
  case 'pending_approval':
    console.log('Awaiting approval:', result.approvalId);
    // Set up webhook or polling to wait for approval
    break;
  case 'denied':
    console.log('Payment denied:', result.reason);
    break;
}`}
          />

          <Method
            id="intent-status"
            name="status"
            signature="vienna.intent.status(intentId: string, options?: RequestOptions): Promise<IntentStatusResponse>"
            description="Check the current status of a previously submitted intent. Returns the full intent lifecycle including policy matches, approvals, and execution results."
            parameters={[
              {
                name: "intentId",
                type: "string",
                description: "The intent identifier (e.g., 'int-abc123')",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<IntentStatusResponse>"
            example={`// Check intent status
const status = await vienna.intent.status('int-abc123');

console.log('Status:', status.status);
console.log('Risk tier:', status.riskTier);
console.log('Policy matches:', status.policyMatches);

if (status.status === 'executed') {
  console.log('Execution ID:', status.executionId);
  console.log('Warrant ID:', status.warrantId);
}`}
          />

          <Method
            id="intent-simulate"
            name="simulate"
            signature="vienna.intent.simulate(intent: IntentRequest, options?: RequestOptions): Promise<IntentSimulationResult>"
            description="Simulate an intent without executing it (dry-run). Useful for testing policy configurations and understanding governance outcomes before actual submission."
            parameters={[
              {
                name: "intent",
                type: "IntentRequest",
                description: "The intent to simulate",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<IntentSimulationResult>"
            example={`// Simulate a high-value transfer to test policies
const simulation = await vienna.intent.simulate({
  action: 'wire_transfer',
  source: 'billing-bot',
  payload: {
    amount: 500000, // Half a million
    currency: 'USD',
    recipient: 'external-vendor',
  },
});

console.log('Would execute?', simulation.wouldExecute);
console.log('Final status:', simulation.status);
console.log('Risk tier:', simulation.riskTier);
console.log('Required approvals:', simulation.requiredApprovals);
console.log('Policy matches:', simulation.policyMatches);`}
          />

          <Method
            id="intent-list"
            name="list"
            signature="vienna.intent.list(params?: { status?: string; source?: string; limit?: number }): Promise<IntentStatusResponse[]>"
            description="List recent intents with optional filtering by status or source agent."
            parameters={[
              {
                name: "params",
                type: "object",
                description: "Optional filter parameters",
                required: false,
              },
            ]}
            returns="Promise<IntentStatusResponse[]>"
            example={`// List all pending intents
const pendingIntents = await vienna.intent.list({ 
  status: 'pending_approval',
  limit: 20 
});

// List intents from specific agent
const agentIntents = await vienna.intent.list({ 
  source: 'billing-bot' 
});`}
          />

          {/* ════════════════════════════════════════════════════════════════
               POLICIES MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="policies" icon={<FileText className="w-6 h-6 text-cyan-400" />}>
            Policies Module
          </H2>
          <P>
            The Policies module manages governance rules that evaluate agent intents. Policies determine
            risk tiers, approval requirements, and execution constraints.
          </P>

          <Method
            id="policies-create"
            name="create"
            signature="vienna.policies.create(params: PolicyCreateParams, options?: RequestOptions): Promise<PolicyRule>"
            description="Create a new governance policy rule. The policy will be evaluated against all future intents according to its priority."
            parameters={[
              {
                name: "params",
                type: "PolicyCreateParams",
                description: "Policy configuration including name, conditions, and actions",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PolicyRule>"
            example={`// Create a policy for high-value transaction approval
const policy = await vienna.policies.create({
  name: 'High-Value Transaction Gate',
  description: 'Require T2 approval for transfers over $50,000',
  priority: 100,
  enabled: true,
  conditions: [
    {
      field: 'action',
      operator: 'equals',
      value: 'wire_transfer',
    },
    {
      field: 'payload.amount',
      operator: 'gt',
      value: 50000,
    },
  ],
  actionOnMatch: 'require_approval',
  approvalTier: 'T2',
  tags: ['financial', 'high-risk'],
});

console.log('Created policy:', policy.id);`}
          />

          <Method
            id="policies-update"
            name="update"
            signature="vienna.policies.update(policyId: string, params: PolicyUpdateParams, options?: RequestOptions): Promise<PolicyRule>"
            description="Update an existing policy rule. Changes take effect immediately for new intent evaluations."
            parameters={[
              {
                name: "policyId",
                type: "string",
                description: "The policy identifier to update",
                required: true,
              },
              {
                name: "params",
                type: "PolicyUpdateParams",
                description: "Fields to update (partial)",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PolicyRule>"
            example={`// Update policy priority and enable it
const updated = await vienna.policies.update('pol-123', {
  priority: 150,
  enabled: true,
  description: 'Updated: Require approval for high-value transfers',
});

// Disable a policy temporarily
await vienna.policies.update('pol-456', {
  enabled: false,
});`}
          />

          <Method
            id="policies-delete"
            name="delete"
            signature="vienna.policies.delete(policyId: string, options?: RequestOptions): Promise<void>"
            description="Delete a policy rule. The policy is soft-deleted (retained in audit trail) but immediately removed from the evaluation set."
            parameters={[
              {
                name: "policyId",
                type: "string",
                description: "The policy identifier to delete",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<void>"
            example={`// Delete a policy
await vienna.policies.delete('pol-123');

console.log('Policy deleted');`}
          />

          <Method
            id="policies-list"
            name="list"
            signature="vienna.policies.list(params?: PolicyListParams, options?: RequestOptions): Promise<PolicyRule[]>"
            description="List all policies with optional filtering by status, tenant, or tags."
            parameters={[
              {
                name: "params",
                type: "PolicyListParams",
                description: "Optional filter parameters",
                required: false,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PolicyRule[]>"
            example={`// List all active policies
const activePolicies = await vienna.policies.list({
  enabled: true,
});

// List policies for specific tenant
const tenantPolicies = await vienna.policies.list({
  tenantId: 'acme-corp',
});

// List policies by tag
const financialPolicies = await vienna.policies.list({
  tag: 'financial',
});`}
          />

          <Method
            id="policies-evaluate"
            name="evaluate"
            signature="vienna.policies.evaluate(payload: Record<string, unknown>, options?: RequestOptions): Promise<PolicyEvaluation>"
            description="Evaluate policies against a test payload (dry-run). Returns which policies would match and what action would be taken without executing anything."
            parameters={[
              {
                name: "payload",
                type: "Record<string, unknown>",
                description: "Test payload to evaluate against policies",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PolicyEvaluation>"
            example={`// Test a policy evaluation
const evaluation = await vienna.policies.evaluate({
  action: 'wire_transfer',
  payload: {
    amount: 100000,
    currency: 'USD',
    recipient: 'external-vendor',
  },
  source: 'billing-bot',
  tenantId: 'acme-corp',
});

console.log('Matched policies:', evaluation.matchedPolicies);
console.log('Final action:', evaluation.finalAction);
console.log('Risk tier:', evaluation.riskTier);
console.log('Details:', evaluation.details);`}
          />

          <Method
            id="policies-templates"
            name="templates"
            signature="vienna.policies.templates(options?: RequestOptions): Promise<PolicyTemplate[]>"
            description="List available industry policy templates that can be imported as starting points for common compliance requirements."
            parameters={[
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PolicyTemplate[]>"
            example={`// Get available policy templates
const templates = await vienna.policies.templates();

templates.forEach(template => {
  console.log(\`Template: \${template.name}\`);
  console.log(\`Industry: \${template.industry}\`);
  console.log(\`Description: \${template.description}\`);
});

// Example templates:
// - Financial Services (SOX compliance)
// - Healthcare (HIPAA compliance)
// - DevOps (deployment gates)
// - Legal (filing controls)`}
          />

          {/* ════════════════════════════════════════════════════════════════
               FLEET MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="fleet" icon={<Users className="w-6 h-6 text-green-400" />}>
            Fleet Module
          </H2>
          <P>
            The Fleet module manages agents, their trust scores, activity monitoring, and alerts.
            Use this to register new agents, track performance, and respond to issues.
          </P>

          <Method
            id="fleet-register"
            name="register"
            signature="vienna.fleet.register(params: { name: string; type?: string; capabilities?: string[] }): Promise<FleetAgent>"
            description="Register a new agent with the fleet. This creates an identity and initial trust profile for the agent."
            parameters={[
              {
                name: "params",
                type: "object",
                description: "Agent registration parameters",
                required: true,
              },
            ]}
            returns="Promise<FleetAgent>"
            example={`// Register a new agent
const agent = await vienna.fleet.register({
  name: 'customer-support-bot',
  type: 'autonomous',
  capabilities: ['send_email', 'query_database', 'create_ticket'],
  metadata: {
    framework: 'langchain',
    version: '1.0.0',
    owner: 'support-team',
  },
});

console.log('Agent registered:', agent.id);
console.log('Initial trust score:', agent.trustScore);`}
          />

          <Method
            id="fleet-get"
            name="get"
            signature="vienna.fleet.get(agentId: string, options?: RequestOptions): Promise<FleetAgent>"
            description="Get detailed information about a specific agent including trust history, capabilities, and current status."
            parameters={[
              {
                name: "agentId",
                type: "string",
                description: "The agent identifier",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<FleetAgent>"
            example={`// Get agent details
const agent = await vienna.fleet.get('agt-abc123');

console.log('Agent name:', agent.name);
console.log('Status:', agent.status);
console.log('Trust score:', agent.trustScore);
console.log('Risk tier:', agent.riskTier);
console.log('Total intents:', agent.totalIntents);
console.log('Denied intents:', agent.deniedIntents);
console.log('Last activity:', agent.lastActivityAt);`}
          />

          <Method
            id="fleet-update"
            name="update"
            signature="vienna.fleet.update(agentId: string, params: Partial<FleetAgent>): Promise<FleetAgent>"
            description="Update agent configuration such as capabilities, metadata, or operational status."
            parameters={[
              {
                name: "agentId",
                type: "string",
                description: "The agent identifier to update",
                required: true,
              },
              {
                name: "params",
                type: "Partial<FleetAgent>",
                description: "Fields to update",
                required: true,
              },
            ]}
            returns="Promise<FleetAgent>"
            example={`// Update agent capabilities
const updated = await vienna.fleet.update('agt-abc123', {
  description: 'Enhanced support bot with new capabilities',
  capabilities: ['send_email', 'query_database', 'create_ticket', 'escalate_to_human'],
  tags: ['support', 'production', 'enhanced'],
});

// Suspend an agent
await vienna.fleet.update('agt-abc123', {
  status: 'suspended',
});`}
          />

          <Method
            id="fleet-metrics"
            name="metrics"
            signature="vienna.fleet.metrics(agentId: string, options?: RequestOptions): Promise<AgentMetrics>"
            description="Get performance metrics for a specific agent including intent success rates, response times, and trust score evolution."
            parameters={[
              {
                name: "agentId",
                type: "string",
                description: "The agent identifier",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<AgentMetrics>"
            example={`// Get agent metrics
const metrics = await vienna.fleet.metrics('agt-abc123');

console.log('Total intents:', metrics.totalIntents);
console.log('Approved intents:', metrics.approvedIntents);
console.log('Denied intents:', metrics.deniedIntents);
console.log('Pending intents:', metrics.pendingIntents);
console.log('Average response time:', metrics.avgResponseTimeMs, 'ms');
console.log('Current trust score:', metrics.trustScore);
console.log('Risk tier:', metrics.riskTier);
console.log('Period:', metrics.periodStart, 'to', metrics.periodEnd);`}
          />

          <Method
            id="fleet-activity"
            name="activity"
            signature="vienna.fleet.activity(agentId: string, pagination?: PaginationParams, options?: RequestOptions): Promise<PaginatedList<AgentActivity>>"
            description="Get paginated activity log for an agent showing recent intents, executions, and governance events."
            parameters={[
              {
                name: "agentId",
                type: "string",
                description: "The agent identifier",
                required: true,
              },
              {
                name: "pagination",
                type: "PaginationParams",
                description: "Pagination parameters (limit, offset)",
                required: false,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<PaginatedList<AgentActivity>>"
            example={`// Get recent agent activity
const activity = await vienna.fleet.activity('agt-abc123', {
  limit: 50,
  offset: 0,
});

console.log('Total activities:', activity.total);
activity.items.forEach(item => {
  console.log(\`\${item.timestamp}: \${item.action} - \${item.status}\`);
  if (item.details) {
    console.log('Details:', item.details);
  }
});

// Get next page
const nextPage = await vienna.fleet.activity('agt-abc123', {
  limit: 50,
  offset: 50,
});`}
          />

          <Method
            id="fleet-alerts"
            name="alerts"
            signature="vienna.fleet.alerts(params?: FleetAlertParams, options?: RequestOptions): Promise<FleetAlert[]>"
            description="List fleet-wide alerts with optional filtering by resolution status, severity, or specific agent."
            parameters={[
              {
                name: "params",
                type: "FleetAlertParams",
                description: "Optional filter parameters",
                required: false,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<FleetAlert[]>"
            example={`// Get unresolved alerts
const unresolvedAlerts = await vienna.fleet.alerts({
  resolved: false,
});

// Get critical alerts for specific agent
const criticalAlerts = await vienna.fleet.alerts({
  severity: 'critical',
  agentId: 'agt-abc123',
});

unresolvedAlerts.forEach(alert => {
  console.log(\`Alert \${alert.id}: \${alert.severity}\`);
  console.log('Message:', alert.message);
  console.log('Agent:', alert.agentId);
  console.log('Created:', alert.createdAt);
});`}
          />

          {/* ════════════════════════════════════════════════════════════════
               APPROVALS MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="approvals" icon={<CheckCircle className="w-6 h-6 text-orange-400" />}>
            Approvals Module
          </H2>
          <P>
            The Approvals module handles operator review workflows for T1 and T2 risk tier intents.
            Operators can approve or deny pending actions through this interface.
          </P>

          <Method
            id="approvals-list"
            name="list"
            signature="vienna.approvals.list(params?: ApprovalListParams, options?: RequestOptions): Promise<Approval[]>"
            description="List pending and recent approvals with optional filtering by status, source agent, or risk tier."
            parameters={[
              {
                name: "params",
                type: "ApprovalListParams",
                description: "Optional filter parameters",
                required: false,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<Approval[]>"
            example={`// Get pending approvals
const pending = await vienna.approvals.list({
  status: 'pending',
});

// Get approvals from specific agent
const agentApprovals = await vienna.approvals.list({
  source: 'billing-bot',
});

// Get high-risk approvals
const highRisk = await vienna.approvals.list({
  riskTier: 'T2',
});

pending.forEach(approval => {
  console.log(\`Approval \${approval.id}:\`);
  console.log('Intent:', approval.intentId);
  console.log('Action:', approval.action);
  console.log('Source:', approval.source);
  console.log('Risk tier:', approval.riskTier);
  console.log('Expires at:', approval.expiresAt);
});`}
          />

          <Method
            id="approvals-approve"
            name="approve"
            signature="vienna.approvals.approve(approvalId: string, params: ApproveParams, options?: RequestOptions): Promise<Approval>"
            description="Approve a pending intent. If this satisfies all required approvals, a warrant will be issued and execution will begin."
            parameters={[
              {
                name: "approvalId",
                type: "string",
                description: "The approval identifier",
                required: true,
              },
              {
                name: "params",
                type: "ApproveParams",
                description: "Approval details including operator and optional notes",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<Approval>"
            example={`// Approve a pending intent
const approved = await vienna.approvals.approve('apr-abc123', {
  operator: 'jane.doe',
  notes: 'Approved after verifying vendor details and payment amount',
});

console.log('Approval status:', approved.status);
console.log('Approved by:', approved.operator);
console.log('Notes:', approved.notes);
console.log('Approved at:', approved.updatedAt);

// Check if intent is now executing
const intentStatus = await vienna.intent.status(approved.intentId);
console.log('Intent status:', intentStatus.status);`}
          />

          <Method
            id="approvals-deny"
            name="deny"
            signature="vienna.approvals.deny(approvalId: string, params: DenyParams, options?: RequestOptions): Promise<Approval>"
            description="Deny a pending intent. The intent will be cancelled and the agent will be notified of the denial reason."
            parameters={[
              {
                name: "approvalId",
                type: "string",
                description: "The approval identifier",
                required: true,
              },
              {
                name: "params",
                type: "DenyParams",
                description: "Denial details including operator and reason",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<Approval>"
            example={`// Deny a pending intent
const denied = await vienna.approvals.deny('apr-abc123', {
  operator: 'john.smith',
  reason: 'Payment amount exceeds approved vendor contract limit',
});

console.log('Denial status:', denied.status);
console.log('Denied by:', denied.operator);
console.log('Reason:', denied.reason);
console.log('Denied at:', denied.updatedAt);`}
          />

          {/* ════════════════════════════════════════════════════════════════
               INTEGRATIONS MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="integrations" icon={<Settings className="w-6 h-6 text-pink-400" />}>
            Integrations Module
          </H2>
          <P>
            The Integrations module manages external service connections for notifications and webhooks.
            Configure Slack channels, email alerts, PagerDuty, or custom webhooks to receive governance events.
          </P>

          <Method
            id="integrations-create"
            name="create"
            signature="vienna.integrations.create(params: IntegrationCreateParams, options?: RequestOptions): Promise<Integration>"
            description="Create a new integration for receiving notifications about governance events."
            parameters={[
              {
                name: "params",
                type: "IntegrationCreateParams",
                description: "Integration configuration including type, name, and connection details",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<Integration>"
            example={`// Create a Slack integration
const slackIntegration = await vienna.integrations.create({
  type: 'slack',
  name: 'Engineering Alerts',
  config: {
    webhook_url: 'https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL',
    channel: '#ai-governance',
  },
  eventTypes: [
    'approval_required',
    'execution_failed',
    'policy_violation',
    'agent_suspended',
  ],
});

// Create a webhook integration
const webhookIntegration = await vienna.integrations.create({
  type: 'webhook',
  name: 'Monitoring Dashboard',
  config: {
    url: 'https://monitoring.acme.com/vienna-webhooks',
    secret: 'whsec_your_webhook_secret',
    headers: {
      'Authorization': 'Bearer your_api_key',
    },
  },
  eventTypes: ['execution_complete', 'verification_mismatch'],
});`}
          />

          <Method
            id="integrations-list"
            name="list"
            signature="vienna.integrations.list(options?: RequestOptions): Promise<Integration[]>"
            description="List all configured integrations with their current status and settings."
            parameters={[
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<Integration[]>"
            example={`// List all integrations
const integrations = await vienna.integrations.list();

integrations.forEach(integration => {
  console.log(\`Integration \${integration.id}: \${integration.name}\`);
  console.log('Type:', integration.type);
  console.log('Enabled:', integration.enabled);
  console.log('Event types:', integration.eventTypes);
  console.log('Last tested:', integration.lastTestedAt);
});`}
          />

          <Method
            id="integrations-test"
            name="test"
            signature="vienna.integrations.test(integrationId: string, options?: RequestOptions): Promise<IntegrationTestResult>"
            description="Send a test event to an integration to verify connectivity and configuration."
            parameters={[
              {
                name: "integrationId",
                type: "string",
                description: "The integration identifier to test",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<IntegrationTestResult>"
            example={`// Test an integration
const testResult = await vienna.integrations.test('int-abc123');

if (testResult.success) {
  console.log('Integration test successful!');
  console.log('Latency:', testResult.latencyMs, 'ms');
} else {
  console.log('Integration test failed:', testResult.error);
}

// Test result includes:
// - success: boolean
// - latencyMs: number
// - error?: string`}
          />

          <Method
            id="integrations-delete"
            name="delete"
            signature="vienna.integrations.delete(integrationId: string, options?: RequestOptions): Promise<void>"
            description="Delete an integration. All future events will stop being sent to this endpoint."
            parameters={[
              {
                name: "integrationId",
                type: "string",
                description: "The integration identifier to delete",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<void>"
            example={`// Delete an integration
await vienna.integrations.delete('int-abc123');

console.log('Integration deleted');`}
          />

          {/* ════════════════════════════════════════════════════════════════
               COMPLIANCE MODULE
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="compliance" icon={<FileText className="w-6 h-6 text-indigo-400" />}>
            Compliance Module
          </H2>
          <P>
            The Compliance module generates audit reports and provides compliance statistics for regulatory
            requirements. Generate reports for specific time periods or get quick stats for monitoring.
          </P>

          <Method
            id="compliance-generate"
            name="generate"
            signature="vienna.compliance.generate(params: ComplianceGenerateParams, options?: RequestOptions): Promise<ComplianceReport>"
            description="Generate a new compliance report for a specified time period. Reports include all governance events, policy evaluations, and audit trails."
            parameters={[
              {
                name: "params",
                type: "ComplianceGenerateParams",
                description: "Report parameters including type and time period",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<ComplianceReport>"
            example={`// Generate a quarterly compliance report
const report = await vienna.compliance.generate({
  type: 'quarterly',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  tenantId: 'acme-corp', // optional
});

console.log('Report ID:', report.id);
console.log('Status:', report.status);
console.log('Type:', report.type);
console.log('Period:', report.periodStart, 'to', report.periodEnd);

if (report.status === 'ready') {
  console.log('Download URL:', report.downloadUrl);
  console.log('Summary:', report.summary);
} else {
  console.log('Report is still generating...');
}`}
          />

          <Method
            id="compliance-get"
            name="get"
            signature="vienna.compliance.get(reportId: string, options?: RequestOptions): Promise<ComplianceReport>"
            description="Get a compliance report by ID with current status and summary data if available."
            parameters={[
              {
                name: "reportId",
                type: "string",
                description: "The report identifier",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<ComplianceReport>"
            example={`// Get a compliance report
const report = await vienna.compliance.get('rpt-abc123');

if (report.status === 'ready') {
  console.log('Report ready!');
  console.log('Total intents:', report.summary.totalIntents);
  console.log('Approved intents:', report.summary.approvedIntents);
  console.log('Denied intents:', report.summary.deniedIntents);
  console.log('Policy violations:', report.summary.policyViolations);
  console.log('Compliance score:', report.summary.complianceScore);
  
  // Download the report
  const response = await fetch(report.downloadUrl);
  const pdfBuffer = await response.arrayBuffer();
}`}
          />

          <Method
            id="compliance-stats"
            name="quickStats"
            signature="vienna.compliance.quickStats(params: QuickStatsParams, options?: RequestOptions): Promise<ComplianceSummary>"
            description="Get quick compliance statistics for a rolling window without generating a full report."
            parameters={[
              {
                name: "params",
                type: "QuickStatsParams",
                description: "Stats parameters including number of days",
                required: true,
              },
              {
                name: "options",
                type: "RequestOptions",
                description: "Optional request configuration",
                required: false,
              },
            ]}
            returns="Promise<ComplianceSummary>"
            example={`// Get stats for the last 30 days
const stats = await vienna.compliance.quickStats({
  days: 30,
  tenantId: 'acme-corp', // optional
});

console.log('Last 30 days stats:');
console.log('Total intents:', stats.totalIntents);
console.log('Approved intents:', stats.approvedIntents);
console.log('Denied intents:', stats.deniedIntents);
console.log('Pending approvals:', stats.pendingApprovals);
console.log('Policy violations:', stats.policyViolations);
console.log('Average response time:', stats.avgResponseTimeMs, 'ms');
console.log('Compliance score:', stats.complianceScore, '%');

// Top violating agents
console.log('Top violating agents:');
stats.topViolatingAgents.forEach(agent => {
  console.log(\`- \${agent.agentId}: \${agent.violations} violations\`);
});`}
          />

          {/* End of content */}
          <div className="border-t border-navy-800 my-16" />

          <div className="bg-gradient-to-br from-amber-900/20 to-navy-800/50 border border-amber-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Ready to start building?</h2>
            <p className="text-slate-400 text-sm mb-4">
              Install the SDK and start governing your agents in minutes.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/signup" className="bg-amber-500 hover:bg-amber-400 text-white px-6 py-2.5 rounded-xl transition font-semibold text-sm">
                Get API Key
              </a>
              <a href="/docs" className="bg-navy-800 hover:bg-navy-700 text-white px-6 py-2.5 rounded-xl transition text-sm border border-navy-700">
                Full Documentation
              </a>
            </div>
          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-800 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-500">Vienna OS API Reference</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-xs text-slate-600 hover:text-slate-400 transition">Documentation</a>
            <a href="https://github.com/risk-ai/regulator.ai" className="text-xs text-slate-600 hover:text-slate-400 transition">GitHub</a>
            <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures</span>
          </div>
        </div>
      </footer>
    </div>
  );
}