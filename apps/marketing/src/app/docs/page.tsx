"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { analytics } from "@/lib/analytics";
import {
  Shield,
  ArrowLeft,
  Terminal,
  BookOpen,
  Zap,
  Lock,
  Server,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  AlertTriangle,
  FileText,
  Code,
  Database,
  Key,
  Globe,
  Settings,
  Users,
  Activity,
  CheckCircle,
  Search,
} from "lucide-react";

/* ─────────────────────── Types ─────────────────────── */

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
}

/* ─────────────────────── Navigation Data ─────────────────────── */

const sections: NavSection[] = [
  {
    id: "quickstart",
    label: "Quickstart (5 min)",
    icon: <Terminal className="w-4 h-4" />,
    children: [
      { id: "qs-get-api-key", label: "Get API Key" },
      { id: "qs-register-agent", label: "Register Agent" },
      { id: "qs-submit-intent", label: "Submit Intent" },
      { id: "qs-audit-trail", label: "View Audit Trail" },
    ],
  },
  {
    id: "concepts",
    label: "Core Concepts",
    icon: <BookOpen className="w-4 h-4" />,
    children: [
      { id: "concept-intent-gateway", label: "Intent Gateway" },
      { id: "concept-policy-engine", label: "Policy Engine" },
      { id: "concept-risk-tiers", label: "Risk Tiers" },
      { id: "concept-approval-workflows", label: "Approval Workflows" },
      { id: "concept-warrants", label: "Execution Warrants" },
      { id: "concept-verification", label: "Verification Engine" },
      { id: "concept-audit-trail", label: "Audit Trail" },
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    icon: <Server className="w-4 h-4" />,
    children: [
      { id: "arch-system-diagram", label: "System Diagram" },
      { id: "arch-data-flow", label: "Data Flow" },
      { id: "arch-state-graph", label: "State Graph" },
      { id: "arch-services", label: "Service Breakdown" },
      { id: "arch-deployment", label: "Deployment Topology" },
    ],
  },
  {
    id: "api-reference",
    label: "API Reference",
    icon: <Zap className="w-4 h-4" />,
    children: [
      { id: "api-auth", label: "Authentication" },
      { id: "api-intent", label: "Agent Intent" },
      { id: "api-policies", label: "Policies" },
      { id: "api-action-types", label: "Action Types" },
      { id: "api-fleet", label: "Fleet Management" },
      { id: "api-integrations", label: "Integrations" },
      { id: "api-compliance", label: "Compliance" },
      { id: "api-approvals", label: "Approvals" },
    ],
  },
  {
    id: "integration-guides",
    label: "Integration Guides",
    icon: <Code className="w-4 h-4" />,
    children: [
      { id: "int-openclaw", label: "OpenClaw" },
      { id: "int-langchain", label: "LangChain" },
      { id: "int-crewai", label: "CrewAI" },
      { id: "int-http", label: "Generic HTTP" },
      { id: "int-webhooks", label: "Webhooks" },
    ],
  },
  {
    id: "policy-guide",
    label: "Policy-as-Code",
    icon: <FileText className="w-4 h-4" />,
    children: [
      { id: "pol-creating", label: "Creating Rules" },
      { id: "pol-operators", label: "Condition Operators" },
      { id: "pol-examples", label: "Complex Examples" },
      { id: "pol-dry-run", label: "Dry-Run Testing" },
      { id: "pol-templates", label: "Industry Templates" },
    ],
  },
  {
    id: "warrant-deep-dive",
    label: "Warrant Deep Dive",
    icon: <Lock className="w-4 h-4" />,
    children: [
      { id: "wdd-problem", label: "Problem Statement" },
      { id: "wdd-model", label: "The Warrant Model" },
      { id: "wdd-comparison", label: "Auth Comparison" },
      { id: "wdd-lifecycle", label: "Warrant Lifecycle" },
      { id: "wdd-security", label: "Security Properties" },
      { id: "wdd-implementation", label: "Implementation" },
      { id: "wdd-industry", label: "Industry Use Cases" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <Key className="w-4 h-4" />,
    children: [
      { id: "sec-authn", label: "Authentication" },
      { id: "sec-authz", label: "Authorization" },
      { id: "sec-encryption", label: "Encryption" },
      { id: "sec-audit-integrity", label: "Audit Integrity" },
      { id: "sec-incident", label: "Incident Response" },
      { id: "sec-compliance", label: "Compliance" },
    ],
  },
  {
    id: "self-hosting",
    label: "Self-Hosting",
    icon: <Settings className="w-4 h-4" />,
    children: [
      { id: "sh-docker", label: "Docker" },
      { id: "sh-env-vars", label: "Environment Variables" },
      { id: "sh-database", label: "Database Setup" },
      { id: "sh-flyio", label: "Fly.io" },
      { id: "sh-kubernetes", label: "Kubernetes" },
      { id: "sh-config-ref", label: "Configuration" },
    ],
  },
];

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

/* ─────────────────────── Endpoint Component ─────────────────────── */

function Endpoint({
  method,
  path,
  description,
  auth = "Session cookie or API key",
  body,
  response,
  curl,
  responseJson,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth?: string;
  body?: string;
  response?: string;
  curl?: string;
  responseJson?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400",
    POST: "bg-emerald-500/20 text-emerald-400",
    PUT: "bg-amber-500/20 text-amber-400",
    DELETE: "bg-red-500/20 text-red-400",
    PATCH: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="border border-[#1C222E] rounded-xl mb-3 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#141820] transition text-left"
      >
        <span className={`text-xs font-mono font-bold px-2 py-1 rounded shrink-0 ${colors[method]}`}>
          {method}
        </span>
        <code className="text-white font-mono text-sm flex-1">{path}</code>
        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-[#1C222E] p-4 bg-[#0D0F14]">
          <p className="text-sm text-slate-400 mb-4">{description}</p>
          <div className="text-xs font-mono text-slate-500 mb-4">
            <span className="text-slate-600">Auth:</span> {auth}
          </div>
          {body && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Body</div>
              <CodeBlock language="json" title="request.json">{body}</CodeBlock>
            </div>
          )}
          {curl && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example</div>
              <CodeBlock language="bash" title="curl">{curl}</CodeBlock>
            </div>
          )}
          {responseJson && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</div>
              <CodeBlock language="json" title="response.json">{responseJson}</CodeBlock>
            </div>
          )}
          {response && !responseJson && (
            <div className="text-xs font-mono text-slate-500">
              <span className="text-slate-600">Returns:</span> {response}
            </div>
          )}
        </div>
      )}
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

/* ─────────────────────── Section Heading ─────────────────────── */

function H2({ id, icon, children }: { id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-6 pt-8 scroll-mt-24 group">
      {icon}
      <h2 className="text-2xl font-bold text-white">{children}</h2>
      <a href={`#${id}`} className="text-slate-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition">
        #
      </a>
    </div>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-lg font-semibold text-white mb-3 mt-8 scroll-mt-24 group">
      {children}
      <a href={`#${id}`} className="text-slate-600 hover:text-purple-400 ml-2 opacity-0 group-hover:opacity-100 transition text-sm">
        #
      </a>
    </h3>
  );
}

function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-semibold text-white mb-2 mt-6">{children}</h4>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-400 mb-4 leading-relaxed">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="text-purple-400 bg-[#141820] px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
}

/* ─────────────────────── Main Docs Page ─────────────────────── */

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quickstart: true,
    concepts: false,
    architecture: false,
    "api-reference": false,
    "integration-guides": false,
    "policy-guide": false,
    "warrant-deep-dive": false,
    security: false,
    "self-hosting": false,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Track docs page view
  useEffect(() => {
    analytics.docsView('overview');
  }, []);

  /* Intersection Observer for active section tracking */
  useEffect(() => {
    const allIds = sections.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) || [])]);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveSection(id);
            // Track docs section view
            analytics.docsView(id);
            // Expand parent section
            const parent = sections.find((s) => s.id === id || s.children?.some((c) => c.id === id));
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
    <div className="min-h-screen bg-[#0D0F14]">
      {/* ── Top Navigation ── */}
      <nav className="border-b border-[#1C222E] sticky top-0 bg-[#0D0F14]/95 backdrop-blur-xl z-50">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[#141820] text-slate-400"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <Shield className="w-6 h-6 text-violet-400" />
              <span className="font-bold text-white text-sm">Vienna<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-500 text-sm font-medium hidden sm:inline">Documentation</span>
            <span className="text-slate-700 text-xs font-mono hidden sm:inline">v1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#141820] border border-[#1C222E] rounded-lg px-3 py-1.5 text-sm text-slate-500 cursor-pointer hover:border-[#252B3B] transition">
              <Search className="w-3.5 h-3.5" />
              <span>Search docs</span>
              <kbd className="ml-4 text-xs bg-[#1C222E] px-1.5 py-0.5 rounded text-slate-600">⌘K</kbd>
            </div>
            <a
              href="https://github.com/risk-ai/regulator.ai"
              className="text-sm text-slate-500 hover:text-white transition hidden sm:inline-flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://console.regulator.ai"
              className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-1.5 rounded-lg transition font-medium"
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
            bg-[#0D0F14] border-r border-[#1C222E] overflow-y-auto z-40
            transition-transform duration-200
            ${mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="py-6 px-4">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4 px-3">
              On this page
            </div>
            <nav className="space-y-0.5">
              {sections.map((s) => (
                <div key={s.id}>
                  <button
                    onClick={() => toggleSection(s.id)}
                    className={`w-full flex items-center gap-2.5 text-sm py-2 px-3 rounded-lg transition ${
                      isActive(s.id)
                        ? "bg-purple-500/10 text-purple-400"
                        : "text-slate-400 hover:text-white hover:bg-[#141820]"
                    }`}
                  >
                    {s.icon}
                    <span className="flex-1 text-left">{s.label}</span>
                    {s.children && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-600 transition-transform ${
                          expandedSections[s.id] ? "" : "-rotate-90"
                        }`}
                      />
                    )}
                  </button>
                  {s.children && expandedSections[s.id] && (
                    <div className="ml-4 pl-3 border-l border-[#1C222E] mt-1 mb-2 space-y-0.5">
                      {s.children.map((c) => (
                        <a
                          key={c.id}
                          href={`#${c.id}`}
                          onClick={() => setMobileNavOpen(false)}
                          className={`block text-xs py-1.5 px-3 rounded transition ${
                            isActive(c.id)
                              ? "text-purple-400 bg-purple-500/5"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {c.label}
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

          {/* ══════════════════════════════════════════════════════════════════
               QUICK LINKS SECTION
             ══════════════════════════════════════════════════════════════════ */}
          
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white mb-4">Vienna OS Documentation</h1>
            <p className="text-slate-400 mb-8">
              Enterprise-grade governance for AI agents. Start here for quick setup or dive deep into concepts and APIs.
            </p>
            
            {/* Quick Start Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <a 
                href="/docs/quickstart" 
                className="bg-[#141820] border border-[#1C222E] rounded-xl p-6 hover:border-purple-500/30 transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition">Quickstart (5 min)</h3>
                </div>
                <p className="text-sm text-slate-400">Get from zero to your first governed agent in minutes</p>
              </a>

              <a 
                href="/docs/github-action" 
                className="bg-[#141820] border border-[#1C222E] rounded-xl p-6 hover:border-purple-500/30 transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Code className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition">GitHub Action</h3>
                </div>
                <p className="text-sm text-slate-400">Add governance to your CI/CD pipeline</p>
              </a>

              <a 
                href="/docs/api-reference" 
                className="bg-[#141820] border border-[#1C222E] rounded-xl p-6 hover:border-purple-500/30 transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition">API Reference</h3>
                </div>
                <p className="text-sm text-slate-400">Complete API documentation and examples</p>
              </a>

              <a 
                href="/docs/integration-guide" 
                className="bg-[#141820] border border-[#1C222E] rounded-xl p-6 hover:border-purple-500/30 transition group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition">Integration Guide</h3>
                </div>
                <p className="text-sm text-slate-400">Framework integrations (LangChain, CrewAI, OpenAI)</p>
              </a>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
               SECTION 1: QUICK START
             ════════════════════════════════════════════════════════════════ */}

          <H2 id="quickstart" icon={<Terminal className="w-6 h-6 text-blue-400" />}>Quick Start</H2>
          <P>
            Get from zero to a governed agent intent in under five minutes.
            This guide walks you through authentication, agent registration,
            your first intent submission, and reading the audit trail.
          </P>

          <Callout type="info">
            The production API is live at <InlineCode>https://console.regulator.ai</InlineCode>.
            All endpoints use the <InlineCode>/api/v1</InlineCode> prefix. For self-hosted
            deployments, replace the base URL with your own.
          </Callout>

          {/* Step 1 */}
          <H3 id="qs-get-api-key">Step 1: Authenticate &amp; Get Your API Key</H3>
          <P>
            Vienna OS supports session-based authentication for the operator console and
            API key authentication for programmatic access. Start by logging in to get a
            session token.
          </P>

          <CodeBlock language="bash" title="curl — Login">{`curl -X POST https://console.regulator.ai/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "your-email@company.com",
    "password": "your-password"
  }'`}</CodeBlock>

          <CodeBlock language="json" title="Response">{`{
  "success": true,
  "data": {
    "operator": {
      "id": "op-7f3a2b1c",
      "email": "your-email@company.com",
      "role": "admin",
      "organization": "your-org"
    },
    "sessionId": "sess-a8b3c2d1-4e5f-6789-abcd-ef0123456789",
    "apiKey": "vos_live_k1_7f3a2b1c9d4e5f6789abcdef01234567",
    "expiresAt": "2026-03-26T21:35:00.000Z"
  }
}`}</CodeBlock>

          <P>
            Store the <InlineCode>apiKey</InlineCode> securely. For all subsequent requests, include
            it as a Bearer token or pass the session cookie.
          </P>

          <CodeBlock language="typescript" title="TypeScript">{`const VIENNA_API_KEY = process.env.VIENNA_API_KEY;
const BASE_URL = "https://console.regulator.ai";

const headers = {
  "Content-Type": "application/json",
  Authorization: \`Bearer \${VIENNA_API_KEY}\`,
};`}</CodeBlock>

          <CodeBlock language="python" title="Python">{`import os
import requests

VIENNA_API_KEY = os.environ["VIENNA_API_KEY"]
BASE_URL = "https://console.regulator.ai"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {VIENNA_API_KEY}",
}`}</CodeBlock>

          {/* Step 2 */}
          <H3 id="qs-register-agent">Step 2: Register Your First Agent</H3>
          <P>
            Before an agent can submit intents, it must be registered with a trust
            profile. This creates an identity in the fleet and assigns default
            permissions.
          </P>

          <CodeBlock language="bash" title="curl — Register Agent">{`curl -X POST https://console.regulator.ai/api/v1/fleet \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "name": "support-agent-01",
    "description": "Customer support automation agent",
    "type": "autonomous",
    "trust_score": 50,
    "allowed_actions": ["send_email", "query_database", "create_ticket"],
    "metadata": {
      "framework": "langchain",
      "version": "0.1.0",
      "owner": "platform-team"
    }
  }'`}</CodeBlock>

          <CodeBlock language="json" title="Response">{`{
  "success": true,
  "data": {
    "agent_id": "agt-9c8b7a6f-5e4d-3c2b-1a09-876543210fed",
    "name": "support-agent-01",
    "status": "active",
    "trust_score": 50,
    "api_key": "vos_agent_k1_9c8b7a6f5e4d3c2b1a09876543210fed",
    "created_at": "2026-03-25T21:35:00.000Z"
  }
}`}</CodeBlock>

          <Callout type="tip">
            The <InlineCode>trust_score</InlineCode> (0–100) determines baseline risk assessment.
            New agents start at 50. Vienna adjusts this score based on the agent&apos;s behavior
            over time. Higher trust scores may qualify for automatic approval on lower-risk actions.
          </Callout>

          {/* Step 3 */}
          <H3 id="qs-submit-intent">Step 3: Submit an Intent</H3>
          <P>
            Every action an agent wants to perform is submitted as an intent. The intent
            flows through the governance pipeline: validation → policy evaluation → risk
            tier assignment → approval (if required) → warrant issuance → execution →
            verification.
          </P>

          <CodeBlock language="bash" title="curl — Submit Intent">{`curl -X POST https://console.regulator.ai/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_AGENT_KEY" \\
  -d '{
    "action": "send_email",
    "source": {
      "platform": "langchain",
      "agent_id": "agt-9c8b7a6f"
    },
    "tenant_id": "your-org",
    "parameters": {
      "to": "customer@example.com",
      "subject": "Your support ticket #1234",
      "body": "Hi, your ticket has been resolved."
    },
    "context": {
      "ticket_id": "TKT-1234",
      "conversation_id": "conv-5678",
      "reason": "Ticket resolution notification"
    }
  }'`}</CodeBlock>

          <CodeBlock language="json" title="Response — T0 (Auto-Approved)">{`{
  "success": true,
  "data": {
    "intent_id": "int-2d4f6a8b-1c3e-5d7f-9a0b-c2d4e6f8a0b2",
    "status": "executed",
    "risk_tier": "T0",
    "execution_id": "exec-3e5f7a9b-2d4f-6a8c-0b1c-d3e5f7a9b1c3",
    "warrant": {
      "warrant_id": "wrt-4f6a8c0b-3e5f-7a9b-1c2d-e4f6a8c0b2d4",
      "scope": "send_email",
      "ttl": 300,
      "issued_at": "2026-03-25T21:35:01.000Z",
      "expires_at": "2026-03-25T21:40:01.000Z"
    },
    "verification": {
      "status": "passed",
      "scope_match": true,
      "verified_at": "2026-03-25T21:35:02.000Z"
    },
    "result": {
      "email_sent": true,
      "message_id": "msg-abc123"
    }
  }
}`}</CodeBlock>

          <CodeBlock language="json" title="Response — T1 (Approval Required)">{`{
  "success": true,
  "data": {
    "intent_id": "int-5a7b9c0d-4e6f-8a1b-2c3d-f5a7b9c0d1e2",
    "status": "pending_approval",
    "risk_tier": "T1",
    "approval": {
      "approval_id": "apr-6b8c0d1e-5a7b-9c2d-3e4f-a6b8c0d1e2f3",
      "required_approvers": 1,
      "current_approvals": 0,
      "expires_at": "2026-03-25T22:35:00.000Z"
    }
  }
}`}</CodeBlock>

          <CodeBlock language="typescript" title="TypeScript — Full Example">{`async function submitIntent(action: string, parameters: Record<string, unknown>) {
  const response = await fetch(\`\${BASE_URL}/api/v1/agent/intent\`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action,
      source: { platform: "custom", agent_id: "agt-9c8b7a6f" },
      tenant_id: "your-org",
      parameters,
    }),
  });

  const data = await response.json();

  if (data.data.status === "pending_approval") {
    console.log(\`⏳ Waiting for approval: \${data.data.approval.approval_id}\`);
    // Poll or use webhooks to wait for approval
    return data.data;
  }

  if (data.data.status === "executed") {
    console.log(\` Executed: \${data.data.execution_id}\`);
    console.log(\` Warrant: \${data.data.warrant.warrant_id}\`);
    return data.data;
  }

  if (data.data.status === "denied") {
    console.log(\` Denied by policy: \${data.data.reason}\`);
    throw new Error(data.data.reason);
  }
}

// Usage
await submitIntent("send_email", {
  to: "customer@example.com",
  subject: "Ticket resolved",
  body: "Your issue has been fixed.",
});`}</CodeBlock>

          <CodeBlock language="python" title="Python — Full Example">{`import requests

def submit_intent(action: str, parameters: dict) -> dict:
    response = requests.post(
        f"{BASE_URL}/api/v1/agent/intent",
        headers=headers,
        json={
            "action": action,
            "source": {"platform": "custom", "agent_id": "agt-9c8b7a6f"},
            "tenant_id": "your-org",
            "parameters": parameters,
        },
    )
    data = response.json()

    match data["data"]["status"]:
        case "executed":
            print(f" Executed: {data['data']['execution_id']}")
            print(f" Warrant: {data['data']['warrant']['warrant_id']}")
        case "pending_approval":
            print(f"⏳ Awaiting approval: {data['data']['approval']['approval_id']}")
        case "denied":
            raise RuntimeError(f" Denied: {data['data']['reason']}")

    return data["data"]

# Usage
submit_intent("send_email", {
    "to": "customer@example.com",
    "subject": "Ticket resolved",
    "body": "Your issue has been fixed.",
})`}</CodeBlock>

          {/* Step 4 */}
          <H3 id="qs-audit-trail">Step 4: View the Audit Trail</H3>
          <P>
            Every intent, policy evaluation, warrant, execution, and verification is
            recorded in the append-only audit trail. Query it to see exactly what
            happened.
          </P>

          <CodeBlock language="bash" title="curl — Query Audit Trail">{`curl https://console.regulator.ai/api/v1/audit \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G \\
  -d "limit=10" \\
  -d "agent_id=agt-9c8b7a6f"`}</CodeBlock>

          <CodeBlock language="json" title="Response">{`{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "aud-7c9d0e1f",
        "timestamp": "2026-03-25T21:35:02.000Z",
        "type": "verification_complete",
        "intent_id": "int-2d4f6a8b",
        "execution_id": "exec-3e5f7a9b",
        "warrant_id": "wrt-4f6a8c0b",
        "agent_id": "agt-9c8b7a6f",
        "action": "send_email",
        "risk_tier": "T0",
        "result": "passed",
        "scope_compliance": true,
        "duration_ms": 847
      },
      {
        "id": "aud-6b8c0d1e",
        "timestamp": "2026-03-25T21:35:01.000Z",
        "type": "warrant_issued",
        "warrant_id": "wrt-4f6a8c0b",
        "scope": "send_email",
        "ttl": 300,
        "issuer": "system:auto-approve"
      }
    ],
    "total": 2,
    "has_more": false
  }
}`}</CodeBlock>

          <Callout type="tip">
            That&apos;s it. In four steps you&apos;ve authenticated, registered an agent,
            submitted a governed intent through the full pipeline, and inspected the
            cryptographic audit trail. Every action your agents take is now governed,
            warranted, and verifiable.
          </Callout>


          {/* ════════════════════════════════════════════════════════════════
               SECTION 2: CORE CONCEPTS
             ════════════════════════════════════════════════════════════════ */}

          <div className="border-t border-[#1C222E] my-16" />

          <H2 id="concepts" icon={<BookOpen className="w-6 h-6 text-emerald-400" />}>Core Concepts</H2>
          <P>
            Vienna OS is built on seven foundational concepts. Understanding these
            is essential for integrating effectively and designing governance policies
            that match your organization&apos;s risk tolerance.
          </P>

          {/* Intent Gateway */}
          <H3 id="concept-intent-gateway">Intent Gateway</H3>
          <P>
            The Intent Gateway is the single entry point for all agent actions. No agent
            communicates directly with external systems. Instead, every action is expressed
            as a declarative intent and submitted to the gateway.
          </P>
          <P>
            This design is deliberate. By funneling all agent behavior through one
            point, Vienna can normalize, validate, and govern every action before it
            reaches execution. There are no side channels.
          </P>

          <CodeBlock language="text" title="Intent Flow">{`┌─────────────────────────────────────────────────┐
│                 Intent Gateway                   │
│                                                  │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Normalize │→ │  Validate  │→ │ Deduplicate │  │
│  └──────────┘  └────────────┘  └─────────────┘  │
│                                       │          │
│                                       ↓          │
│                              ┌─────────────┐     │
│                              │ Enrich with  │     │
│                              │   context    │     │
│                              └─────────────┘     │
│                                       │          │
│                                       ↓          │
│                              Policy Engine       │
└─────────────────────────────────────────────────┘`}</CodeBlock>

          <P><strong className="text-white">Normalization.</strong> The gateway accepts intents from any framework — LangChain, CrewAI, AutoGen, or raw HTTP. It normalizes the payload into a canonical format regardless of source, so the policy engine evaluates a consistent schema.</P>
          <P><strong className="text-white">Validation.</strong> Intents are validated against registered action types. If an agent submits an action not in its allowed set, the intent is rejected before reaching the policy engine. Parameters are type-checked against the action type schema.</P>
          <P><strong className="text-white">Deduplication.</strong> The gateway detects and collapses duplicate intents within a configurable time window (default: 5s). This prevents runaway agents from flooding the pipeline.</P>
          <P><strong className="text-white">Context enrichment.</strong> The gateway attaches metadata: agent trust score, historical behavior patterns, time-of-day, and organizational context. This enriched payload feeds into policy evaluation.</P>

          {/* Policy Engine */}
          <H3 id="concept-policy-engine">Policy Engine</H3>
          <P>
            The Policy Engine is where governance rules live. Policies are defined as
            structured rules — not natural language, not LLM prompts, but deterministic
            code that evaluates in microseconds. Every intent is evaluated against the
            full policy set before any action is taken.
          </P>

          <H4>Rule Structure</H4>
          <P>
            A policy rule consists of conditions, an action, and a priority. Rules are
            evaluated in priority order (highest first). The first matching rule wins.
          </P>

          <CodeBlock language="json" title="Policy Rule Schema">{`{
  "id": "pol-rule-001",
  "name": "Block high-value transactions after hours",
  "description": "Prevent financial actions over $10K outside business hours",
  "priority": 100,
  "enabled": true,
  "conditions": [
    {
      "field": "action",
      "operator": "equals",
      "value": "transfer_funds"
    },
    {
      "field": "parameters.amount",
      "operator": "gt",
      "value": 10000
    },
    {
      "field": "context.timestamp",
      "operator": "time_between",
      "value": ["18:00", "08:00"]
    }
  ],
  "action": {
    "type": "deny",
    "reason": "High-value transfers blocked outside business hours (8AM-6PM ET)"
  },
  "risk_tier_override": null
}`}</CodeBlock>

          <H4>Evaluation Order</H4>
          <P>
            Rules are sorted by <InlineCode>priority</InlineCode> (descending). The first rule
            whose conditions all match determines the outcome. If no rule matches, the
            default policy applies (configurable: deny-by-default or allow-by-default).
          </P>

          <H4>Condition Operators</H4>
          <P>Vienna supports 14 condition operators for precise policy expression:</P>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-[#1C222E] rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-[#141820]">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-[#1C222E]">Operator</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-[#1C222E]">Description</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium border-b border-[#1C222E]">Example Value</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">equals</td><td className="px-4 py-2 text-slate-400">Exact match</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`"transfer_funds"`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">not_equals</td><td className="px-4 py-2 text-slate-400">Negated exact match</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`"read_only"`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">contains</td><td className="px-4 py-2 text-slate-400">Substring / array inclusion</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`"admin"`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">gt</td><td className="px-4 py-2 text-slate-400">Greater than (numeric)</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`10000`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">lt</td><td className="px-4 py-2 text-slate-400">Less than (numeric)</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`100`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">gte</td><td className="px-4 py-2 text-slate-400">Greater than or equal</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`80`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">lte</td><td className="px-4 py-2 text-slate-400">Less than or equal</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`5`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">in</td><td className="px-4 py-2 text-slate-400">Value in set</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`["us","eu","uk"]`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">not_in</td><td className="px-4 py-2 text-slate-400">Value not in set</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`["sandbox","test"]`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">matches</td><td className="px-4 py-2 text-slate-400">Regex match</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`"^prod-.*"`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">between</td><td className="px-4 py-2 text-slate-400">Numeric range (inclusive)</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`[100, 5000]`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">time_between</td><td className="px-4 py-2 text-slate-400">Time-of-day range</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`["09:00","17:00"]`}</td></tr>
                <tr className="border-b border-[#1C222E]"><td className="px-4 py-2 font-mono text-purple-400">exists</td><td className="px-4 py-2 text-slate-400">Field is present and non-null</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`true`}</td></tr>
                <tr><td className="px-4 py-2 font-mono text-purple-400">not_exists</td><td className="px-4 py-2 text-slate-400">Field is absent or null</td><td className="px-4 py-2 font-mono text-sm text-slate-500">{`true`}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Risk Tiers */}
          <H3 id="concept-risk-tiers">Risk Tiers</H3>
          <P>
            Every intent is assigned a risk tier that determines the approval workflow.
            Tiers are assigned by the policy engine based on the action type, parameters,
            agent trust score, and contextual factors.
          </P>

          <div className="space-y-3 mb-6">
            <div className="bg-slate-500/10 border border-[#1C222E] rounded-xl p-5">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-lg font-bold text-slate-400 font-mono w-10">T0</span>
                <h4 className="text-white font-semibold">Auto-Approved — Reversible / Low-Stakes</h4>
              </div>
              <p className="text-sm text-slate-400 ml-14 mb-3">
                No human intervention. Warrant is issued automatically, action executes immediately.
              </p>
              <div className="ml-14 text-xs text-slate-500 space-y-1">
                <div>• Read operations: log queries, status checks, health probes</div>
                <div>• Internal queries: state graph reads, configuration lookups</div>
                <div>• Non-destructive analytics: report generation, metric aggregation</div>
                <div>• Low-value notifications: sending slack messages, logging events</div>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-[#1C222E] rounded-xl p-5">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-lg font-bold text-amber-400 font-mono w-10">T1</span>
                <h4 className="text-white font-semibold">Single Approval — Moderate Stakes</h4>
              </div>
              <p className="text-sm text-slate-400 ml-14 mb-3">
                One operator must approve before execution. Approval timeout is configurable
                (default: 1 hour). Escalation triggers if no response.
              </p>
              <div className="ml-14 text-xs text-slate-500 space-y-1">
                <div>• Configuration changes: environment variables, feature flags</div>
                <div>• Service operations: restarts, scaling, deployments to staging</div>
                <div>• Data writes: customer record updates, ticket modifications</div>
                <div>• External communications: emails to customers, API calls to partners</div>
              </div>
            </div>
            <div className="bg-red-500/10 border border-[#1C222E] rounded-xl p-5">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-lg font-bold text-red-400 font-mono w-10">T2</span>
                <h4 className="text-white font-semibold">Multi-Party Approval — Irreversible / High-Impact</h4>
              </div>
              <p className="text-sm text-slate-400 ml-14 mb-3">
                Requires approval from multiple operators (configurable: 2–5 approvers).
                Warrants carry strict scope constraints and short TTLs (default: 5 min).
              </p>
              <div className="ml-14 text-xs text-slate-500 space-y-1">
                <div>• Production deployments: code releases, infrastructure changes</div>
                <div>• Financial operations: wire transfers, payment processing over threshold</div>
                <div>• Data destruction: database migrations, record deletion, PII purges</div>
                <div>• Legal actions: contract execution, regulatory filings, compliance reports</div>
              </div>
            </div>
          </div>

          <P>
            Tier assignment is dynamic. The same action can be T0 in one context and T1
            in another. For example, <InlineCode>send_email</InlineCode> might be T0 for
            internal notifications but T1 for customer-facing messages. Policy rules
            control this.
          </P>

          {/* Approval Workflows */}
          <H3 id="concept-approval-workflows">Approval Workflows</H3>
          <P>
            When an intent is classified as T1 or T2, it enters the approval queue.
            Operators are notified via the console, webhooks, or integrated channels
            (Slack, email).
          </P>

          <CodeBlock language="text" title="Approval Flow">{`T1 — Single Operator Approval
─────────────────────────────
Intent → Policy Engine → T1 → Approval Queue
                                    │
                              ┌─────┴─────┐
                              │  Operator  │
                              │  Reviews   │
                              └─────┬─────┘
                                    │
                         ┌──────────┼──────────┐
                         │          │          │
                      Approve     Deny     Timeout
                         │          │          │
                      Warrant    Denied    Escalate
                      Issued     + Log    to T2 or
                         │                 Manager
                      Execute

T2 — Multi-Party Approval
─────────────────────────
Intent → Policy Engine → T2 → Approval Queue
                                    │
                   ┌────────────────┼────────────────┐
                   │                │                │
              Approver 1       Approver 2       Approver N
              (required)       (required)       (optional)
                   │                │                │
                   └────────────────┼────────────────┘
                                    │
                            All approved? ───No──→ Wait/Escalate
                                    │
                                   Yes
                                    │
                         Warrant Issued (strict TTL)
                                    │
                                 Execute`}</CodeBlock>

          <P>
            <strong className="text-white">Timeout handling.</strong> If an approval is not
            acted on within the configured window, the system either escalates to a
            higher authority, notifies the organization admin, or auto-denies (configurable
            per policy). Default timeout: 1 hour for T1, 4 hours for T2.
          </P>

          {/* Execution Warrants */}
          <H3 id="concept-warrants">Execution Warrants</H3>
          <P>
            Execution warrants are the central innovation in Vienna OS. A warrant is a
            cryptographically signed, scope-constrained, time-limited authorization
            token. It is the <em>only</em> mechanism that authorizes execution. Without
            a valid warrant, no action executes. Period.
          </P>

          <Callout type="warning">
            <strong>Warrants ≠ API keys.</strong> An API key authenticates an identity.
            A warrant authorizes a <em>specific action</em> with <em>specific parameters</em>{" "}
            within a <em>specific time window</em>. API keys are long-lived and broadly scoped.
            Warrants are ephemeral and surgically precise.
          </Callout>

          <CodeBlock language="json" title="Warrant Structure">{`{
  "warrant_id": "wrt-4f6a8c0b-3e5f-7a9b-1c2d-e4f6a8c0b2d4",
  "intent_id": "int-2d4f6a8b-1c3e-5d7f-9a0b-c2d4e6f8a0b2",
  "scope": {
    "action": "send_email",
    "target": "smtp-gateway",
    "parameters": {
      "to": "customer@example.com",
      "subject": "Your support ticket #1234"
    }
  },
  "constraints": {
    "max_retries": 1,
    "max_recipients": 1,
    "allowed_domains": ["example.com"],
    "rollback_on_failure": true
  },
  "ttl": 300,
  "issued_at": "2026-03-25T21:35:01.000Z",
  "expires_at": "2026-03-25T21:40:01.000Z",
  "issuer": {
    "type": "operator",
    "id": "op-7f3a2b1c",
    "approval_id": "apr-6b8c0d1e"
  },
  "chain": {
    "parent_warrant": null,
    "depth": 0
  },
  "signature": "hmac-sha256:a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
}`}</CodeBlock>

          <P><strong className="text-white">Scope enforcement.</strong> The warrant specifies exactly what action is permitted, against what target, with what parameters. The execution router checks the warrant scope before running any action. Parameter drift (e.g., changing the email recipient) invalidates the warrant.</P>
          <P><strong className="text-white">Time-limited by design.</strong> Every warrant has a TTL measured in seconds. Once expired, the warrant is inert. There are no permanent warrants. Default TTL is 300 seconds (5 minutes) for T0, 600 seconds for T1, and 300 seconds for T2 (shorter because higher-risk actions should execute promptly or not at all).</P>
          <P><strong className="text-white">Post-execution verification.</strong> After execution, the Verification Engine checks whether the actual operation matched the warrant scope. Did the email go to the authorized recipient? Did the database query touch only the permitted tables? Any mismatch generates an alert and is recorded in the audit trail.</P>

          {/* Verification Engine */}
          <H3 id="concept-verification">Verification Engine</H3>
          <P>
            The Verification Engine runs after every execution. It compares what was
            authorized (the warrant) with what actually happened (the execution result).
            This is the &quot;trust but verify&quot; layer.
          </P>

          <CodeBlock language="text" title="Verification Flow">{`Execution Complete
       │
       ↓
┌─────────────────┐
│ Load Warrant    │ ← Original warrant scope and constraints
│ Load Result     │ ← Actual execution result and side effects
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Scope Check     │ ← Did the action match the warrant scope?
│ Parameter Check │ ← Were parameters within constraints?
│ Target Check    │ ← Was the correct target affected?
│ Side Effect     │ ← Any unauthorized side effects?
│ Detection       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  Pass      Fail
    │         │
  Log to    Generate Alert
  Audit     Flag Agent
  Trail     Log to Audit Trail
            Revoke future warrants (optional)`}</CodeBlock>

          <P>
            <strong className="text-white">Mismatch handling.</strong> When verification fails,
            the system can: (1) generate an alert to operators, (2) reduce the agent&apos;s
            trust score, (3) suspend the agent pending review, or (4) quarantine the
            execution result. The response is configurable per action type and severity.
          </P>

          {/* Audit Trail */}
          <H3 id="concept-audit-trail">Audit Trail</H3>
          <P>
            The audit trail is an append-only, immutable log of every event in the
            governance pipeline. It is tamper-evident: each entry includes a hash chain
            linking it to the previous entry, making retroactive modification detectable.
          </P>

          <P><strong className="text-white">What gets logged:</strong></P>
          <ul className="text-sm text-slate-400 space-y-2 mb-6 list-none">
            <li className="flex gap-2"><span className="text-purple-400">•</span> Intent submission (raw payload, source agent, timestamp)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Policy evaluation result (matched rule, tier assignment, deny reason)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Approval events (who approved/denied, when, with what context)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Warrant issuance (full warrant including scope, TTL, signature)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Execution start and completion (duration, result, errors)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Verification result (pass/fail, scope compliance details)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> Agent trust score changes (before/after, reason)</li>
            <li className="flex gap-2"><span className="text-purple-400">•</span> System events (policy changes, agent registration, configuration updates)</li>
          </ul>

          <P>
            <strong className="text-white">Retention.</strong> Default retention is 90 days for
            standard entries, 7 years for compliance-flagged events (financial, legal,
            healthcare). Configurable per organization and action type.
          </P>


          {/* ════════════════════════════════════════════════════════════════
               SECTION 3: ARCHITECTURE
             ════════════════════════════════════════════════════════════════ */}

          <div className="border-t border-[#1C222E] my-16" />

          <H2 id="architecture" icon={<Server className="w-6 h-6 text-purple-400" />}>Architecture</H2>
          <P>
            Vienna OS is a monolithic governance engine deployed as a single binary.
            Internally, it is composed of nine distinct services communicating via
            in-process function calls (no inter-service network hops in default deployment).
          </P>

          <H3 id="arch-system-diagram">System Diagram</H3>

          <CodeBlock language="text" title="Vienna OS — System Architecture">{`                        ┌──────────────────┐
                        │   Agent / Client  │
                        └────────┬─────────┘
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │     Intent Gateway       │
                   │  normalize · validate    │
                   │  deduplicate · enrich    │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │     Policy Engine        │
                   │  evaluate rules          │
                   │  assign risk tier        │
                   │  check rate limits       │
                   └────────────┬────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │  T0: Auto  │   │ T1: Single │   │ T2: Multi  │
       │  Approve   │   │  Approval  │   │  Approval  │
       └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
              │                │                 │
              └─────────────────┼─────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │    Warrant Authority     │
                   │  scope · ttl · sign      │
                   │  constraints · chain     │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │    Execution Router      │
                   │  warrant check · route   │
                   │  execute · capture       │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   Verification Engine    │
                   │  scope compliance        │
                   │  parameter check         │
                   │  side effect detection   │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │      Audit Trail         │
                   │  append-only · hashed    │
                   │  tamper-evident · query  │
                   └─────────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │      State Graph         │
                   │  SQLite / Postgres       │
                   │  persistent storage      │
                   └─────────────────────────┘`}</CodeBlock>

          {/* Data Flow */}
          <H3 id="arch-data-flow">Data Flow</H3>
          <P>
            A single intent traverses the full pipeline in milliseconds for T0 actions.
            Here is the data flow for each stage:
          </P>

          <div className="space-y-3 mb-6">
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">1</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Ingress.</strong> Agent sends HTTP POST to <InlineCode>/api/v1/agent/intent</InlineCode>. Gateway parses, validates auth token, normalizes payload.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">2</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Enrichment.</strong> Gateway loads agent profile (trust score, history), attaches organizational context, timestamps.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">3</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Policy evaluation.</strong> Engine loads active rules sorted by priority. Evaluates conditions sequentially. First match determines outcome (allow + tier, deny, or escalate).</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">4</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Approval routing.</strong> T0 bypasses queue. T1/T2 enters approval workflow with configured timeout and escalation.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">5</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Warrant issuance.</strong> Authority constructs warrant with scope, constraints, and TTL. Signs with HMAC-SHA256. Stores in state graph.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">6</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Execution.</strong> Router validates warrant (not expired, not revoked), routes to appropriate handler, captures result.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">7</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Verification.</strong> Engine compares execution result against warrant scope. Records compliance status.</div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-1 rounded shrink-0">8</span>
              <div className="text-sm text-slate-400"><strong className="text-white">Audit.</strong> Full pipeline trace written to append-only log with hash chain. Response returned to agent.</div>
            </div>
          </div>

          {/* State Graph */}
          <H3 id="arch-state-graph">State Graph</H3>
          <P>
            The State Graph is Vienna&apos;s persistence layer. It stores all entities and
            their relationships: agents, policies, warrants, executions, and audit entries.
            Default storage is SQLite (embedded, zero-config). Production deployments can
            use Postgres for horizontal scaling.
          </P>

          <CodeBlock language="text" title="State Graph Schema (Simplified)">{`┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Agents    │────→│   Intents    │────→│   Warrants    │
│             │     │              │     │               │
│ id          │     │ id           │     │ id            │
│ name        │     │ agent_id     │     │ intent_id     │
│ trust_score │     │ action       │     │ scope         │
│ status      │     │ parameters   │     │ ttl           │
│ allowed_    │     │ risk_tier    │     │ constraints   │
│   actions   │     │ status       │     │ signature     │
└─────────────┘     └──────┬───────┘     └───────┬───────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌───────────────┐
                    │  Executions  │     │  Audit Trail  │
                    │              │     │               │
                    │ id           │     │ id            │
                    │ intent_id    │     │ type          │
                    │ warrant_id   │     │ entity_id     │
                    │ result       │     │ data          │
                    │ duration_ms  │     │ hash          │
                    │ verified     │     │ prev_hash     │
                    └──────────────┘     └───────────────┘

┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│   Policies   │     │ Action Types │     │  Approvals    │
│              │     │              │     │               │
│ id           │     │ id           │     │ id            │
│ name         │     │ name         │     │ intent_id     │
│ priority     │     │ schema       │     │ approver_id   │
│ conditions   │     │ risk_tier    │     │ status        │
│ action       │     │ description  │     │ expires_at    │
└──────────────┘     └──────────────┘     └───────────────┘`}</CodeBlock>

          {/* Service Breakdown */}
          <H3 id="arch-services">Service Breakdown</H3>
          <P>
            Vienna OS comprises nine internal services. In the default monolithic deployment,
            these are in-process modules. In a distributed deployment, they can be separated
            into independent services communicating over gRPC.
          </P>

          <div className="space-y-3 mb-6">
            {[
              { name: "Intent Gateway", desc: "Request ingress, normalization, validation, deduplication, and context enrichment. Rate limiting and circuit breaking." },
              { name: "Policy Engine", desc: "Rule evaluation engine. Loads policies from state graph, evaluates conditions, assigns risk tiers, returns decisions." },
              { name: "Approval Manager", desc: "Manages approval queues, operator notifications, timeout handling, and escalation workflows." },
              { name: "Warrant Authority", desc: "Constructs, signs, and manages warrants. Handles scope definition, TTL computation, constraint encoding, and revocation." },
              { name: "Execution Router", desc: "Validates warrants, routes to action handlers, captures results, manages retries and rollbacks." },
              { name: "Verification Engine", desc: "Post-execution compliance check. Compares warrant scope to actual results. Generates alerts on mismatch." },
              { name: "Audit Service", desc: "Append-only log management. Hash chain computation, entry storage, query interface, retention enforcement." },
              { name: "Fleet Manager", desc: "Agent lifecycle management. Registration, trust scoring, suspension, activity tracking, and capability management." },
              { name: "State Graph", desc: "Persistence layer. SQLite (default) or Postgres. Manages all entity storage, relationships, and query optimization." },
            ].map((s) => (
              <div key={s.name} className="bg-[#141820] border border-[#1C222E] rounded-xl p-4">
                <div className="text-white font-semibold text-sm mb-1">{s.name}</div>
                <div className="text-xs text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Deployment Topology */}
          <H3 id="arch-deployment">Deployment Topology</H3>
          <P>
            Vienna OS supports three deployment models. All produce the same governance
            guarantees — the deployment model only affects scaling and operational complexity.
          </P>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#141820] border border-[#1C222E] rounded-xl p-4">
              <div className="text-white font-semibold text-sm mb-2">Single Binary</div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>• All 9 services in one process</div>
                <div>• SQLite embedded storage</div>
                <div>• Zero external dependencies</div>
                <div>• Ideal for: startups, dev, PoC</div>
                <div>• Deploy: Docker, Fly.io, bare metal</div>
              </div>
            </div>
            <div className="bg-[#141820] border border-[#1C222E] rounded-xl p-4">
              <div className="text-white font-semibold text-sm mb-2">Fly.io (Managed)</div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>• Single machine, auto-restart</div>
                <div>• Managed Postgres (Neon, Supabase, etc.)</div>
                <div>• TLS termination included</div>
                <div>• Ideal for: teams, production</div>
                <div>• Deploy: <InlineCode>docker compose up -d</InlineCode></div>
              </div>
            </div>
            <div className="bg-[#141820] border border-[#1C222E] rounded-xl p-4">
              <div className="text-white font-semibold text-sm mb-2">On-Premises</div>
              <div className="text-xs text-slate-500 space-y-1">
                <div>• Docker Compose or Kubernetes</div>
                <div>• External Postgres required</div>
                <div>• Full network isolation</div>
                <div>• Ideal for: enterprise, regulated</div>
                <div>• Deploy: Helm chart, Docker Compose</div>
              </div>
            </div>
          </div>


          {/* ════════════════════════════════════════════════════════════════
               SECTION 4: API REFERENCE
             ════════════════════════════════════════════════════════════════ */}

          <div className="border-t border-[#1C222E] my-16" />

          <H2 id="api-reference" icon={<Zap className="w-6 h-6 text-amber-400" />}>API Reference</H2>
          <P>
            All endpoints are prefixed with <InlineCode>/api/v1</InlineCode>. Authentication
            is required for all endpoints except <InlineCode>/health</InlineCode> and{" "}
            <InlineCode>/api/v1/auth/login</InlineCode>. Pass credentials as a Bearer token
            or session cookie.
          </P>

          <Callout type="info">
            All responses follow a consistent envelope:{" "}
            <InlineCode>{`{"success": boolean, "data": ..., "error": ...}`}</InlineCode>.
            Error responses include a machine-readable <InlineCode>code</InlineCode> and
            human-readable <InlineCode>message</InlineCode>.
          </Callout>

          {/* Auth */}
          <H3 id="api-auth">Authentication</H3>

          <Endpoint
            method="POST"
            path="/api/v1/auth/login"
            description="Authenticate an operator or service account. Returns a session token and API key."
            auth="None (public endpoint)"
            body={`{
  "username": "string — Email or username",
  "password": "string — Account password"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin@company.com","password":"s3cureP@ss"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "operator": {
      "id": "op-7f3a2b1c",
      "email": "admin@company.com",
      "role": "admin",
      "organization": "acme-corp"
    },
    "sessionId": "sess-a8b3c2d1-4e5f-6789-abcd-ef0123456789",
    "apiKey": "vos_live_k1_7f3a2b1c9d4e5f6789abcdef01234567",
    "expiresAt": "2026-03-26T21:35:00.000Z"
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/auth/logout"
            description="Invalidate the current session. The session token and any associated cookies are revoked immediately."
            curl={`curl -X POST https://console.regulator.ai/api/v1/auth/logout \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "message": "Session invalidated"
  }
}`}
          />

          {/* Agent Intent */}
          <H3 id="api-intent">Agent Intent</H3>
          <P>
            The intent endpoints are the primary API surface for agent governance.
            Every agent action flows through these endpoints.
          </P>

          <Endpoint
            method="POST"
            path="/api/v1/agent/intent"
            description="Submit an agent action intent through the full governance pipeline. The action is validated, policy-evaluated, risk-tiered, potentially queued for approval, warranted, executed, and verified. This is the main API."
            body={`{
  "action": "string — Action type identifier (e.g., 'send_email', 'query_database')",
  "source": "string | object — Agent framework identifier",
  "tenant_id": "string — Organization/tenant identifier",
  "parameters": "object — Action-specific parameters (validated against action type schema)",
  "context": "object (optional) — Additional metadata for policy evaluation",
  "idempotency_key": "string (optional) — Prevents duplicate processing"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_AGENT_KEY" \\
  -d '{
    "action": "send_email",
    "source": {"platform": "langchain", "agent_id": "agt-9c8b7a6f"},
    "tenant_id": "acme-corp",
    "parameters": {
      "to": "customer@example.com",
      "subject": "Ticket update",
      "body": "Your ticket has been resolved."
    }
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "intent_id": "int-2d4f6a8b-1c3e-5d7f-9a0b-c2d4e6f8a0b2",
    "status": "executed",
    "risk_tier": "T0",
    "execution_id": "exec-3e5f7a9b-2d4f-6a8c-0b1c-d3e5f7a9b1c3",
    "warrant": {
      "warrant_id": "wrt-4f6a8c0b",
      "scope": "send_email",
      "ttl": 300
    },
    "verification": {
      "status": "passed",
      "scope_match": true
    },
    "result": {
      "email_sent": true,
      "message_id": "msg-abc123"
    }
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/intent"
            description="Submit an intent as an operator (not an agent). Used by the console UI or operator tools for manual actions. Same governance pipeline applies, but the source is marked as 'operator' and trust is implicitly higher."
            body={`{
  "action": "string — Action type identifier",
  "parameters": "object — Action-specific parameters",
  "reason": "string — Operator's stated reason for the action",
  "override_tier": "string (optional) — 'T0' | 'T1' | 'T2' (admin only)"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/intent \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "action": "restart_service",
    "parameters": {"service": "api-gateway", "graceful": true},
    "reason": "Deploying hotfix for auth bug"
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "intent_id": "int-8a0b1c2d",
    "status": "executed",
    "risk_tier": "T1",
    "source": "operator:op-7f3a2b1c",
    "execution_id": "exec-9b0c1d2e",
    "warrant": {
      "warrant_id": "wrt-0c1d2e3f",
      "scope": "restart_service",
      "ttl": 600
    }
  }
}`}
          />

          {/* Policies */}
          <H3 id="api-policies">Policies</H3>

          <Endpoint
            method="GET"
            path="/api/v1/policies"
            description="List all active policies. Supports pagination and filtering by action type, risk tier, or status."
            curl={`curl https://console.regulator.ai/api/v1/policies \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G -d "limit=20" -d "offset=0" -d "enabled=true"`}
            responseJson={`{
  "success": true,
  "data": {
    "policies": [
      {
        "id": "pol-001",
        "name": "Block high-value transfers after hours",
        "priority": 100,
        "enabled": true,
        "conditions": [...],
        "action": {"type": "deny", "reason": "..."},
        "created_at": "2026-03-20T10:00:00.000Z"
      }
    ],
    "total": 12,
    "offset": 0,
    "limit": 20
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/policies"
            description="Create a new policy rule. The policy is validated and added to the evaluation set. Active immediately unless enabled is set to false."
            body={`{
  "name": "string — Human-readable policy name",
  "description": "string — What this policy does and why",
  "priority": "number — Evaluation priority (higher = evaluated first)",
  "enabled": "boolean — Whether the policy is active (default: true)",
  "conditions": [
    {
      "field": "string — Dot-notation path (e.g., 'parameters.amount')",
      "operator": "string — One of 14 operators",
      "value": "any — Comparison value"
    }
  ],
  "action": {
    "type": "string — 'allow' | 'deny' | 'escalate'",
    "risk_tier_override": "string (optional) — Force a specific tier",
    "reason": "string (optional) — Explanation for deny/escalate"
  }
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/policies \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "name": "Require approval for production deploys",
    "priority": 90,
    "conditions": [
      {"field": "action", "operator": "equals", "value": "deploy"},
      {"field": "parameters.environment", "operator": "equals", "value": "production"}
    ],
    "action": {"type": "allow", "risk_tier_override": "T2"}
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "pol-013",
    "name": "Require approval for production deploys",
    "priority": 90,
    "enabled": true,
    "created_at": "2026-03-25T21:35:00.000Z"
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/policies/:id"
            description="Get a single policy by ID. Returns the full policy definition including conditions, action, and metadata."
            curl={`curl https://console.regulator.ai/api/v1/policies/pol-001 \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "pol-001",
    "name": "Block high-value transfers after hours",
    "description": "Prevent financial actions over $10K outside business hours",
    "priority": 100,
    "enabled": true,
    "conditions": [
      {"field": "action", "operator": "equals", "value": "transfer_funds"},
      {"field": "parameters.amount", "operator": "gt", "value": 10000},
      {"field": "context.timestamp", "operator": "time_between", "value": ["18:00", "08:00"]}
    ],
    "action": {"type": "deny", "reason": "High-value transfers blocked outside business hours"},
    "created_at": "2026-03-20T10:00:00.000Z",
    "updated_at": "2026-03-22T14:30:00.000Z",
    "created_by": "op-7f3a2b1c"
  }
}`}
          />

          <Endpoint
            method="PUT"
            path="/api/v1/policies/:id"
            description="Update an existing policy. Partial updates supported — only include fields you want to change. Priority and condition changes take effect immediately."
            body={`{
  "name": "string (optional)",
  "priority": "number (optional)",
  "enabled": "boolean (optional)",
  "conditions": "array (optional) — Full replacement",
  "action": "object (optional)"
}`}
            curl={`curl -X PUT https://console.regulator.ai/api/v1/policies/pol-001 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"priority": 110, "enabled": true}'`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "pol-001",
    "priority": 110,
    "updated_at": "2026-03-25T21:40:00.000Z"
  }
}`}
          />

          <Endpoint
            method="DELETE"
            path="/api/v1/policies/:id"
            description="Delete a policy. The policy is soft-deleted (retained in audit trail) but immediately removed from the evaluation set."
            curl={`curl -X DELETE https://console.regulator.ai/api/v1/policies/pol-001 \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "pol-001",
    "deleted": true,
    "deleted_at": "2026-03-25T21:45:00.000Z"
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/policies/evaluate"
            description="Dry-run a policy evaluation without executing anything. Useful for testing policies before deploying them. Returns the matched rule, risk tier, and decision."
            body={`{
  "action": "string — Action to evaluate",
  "source": "string | object — Simulated source",
  "parameters": "object — Simulated parameters",
  "context": "object (optional) — Simulated context"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/policies/evaluate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "action": "transfer_funds",
    "source": "test-agent",
    "parameters": {"amount": 75000, "currency": "USD"},
    "context": {"timestamp": "2026-03-25T23:00:00.000Z"}
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "decision": "deny",
    "matched_rule": {
      "id": "pol-001",
      "name": "Block high-value transfers after hours",
      "priority": 100
    },
    "risk_tier": null,
    "reason": "High-value transfers blocked outside business hours",
    "evaluation_ms": 0.4,
    "rules_evaluated": 12
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/policies/templates"
            description="List available industry policy templates. Templates provide pre-configured rule sets for common compliance requirements."
            curl={`curl https://console.regulator.ai/api/v1/policies/templates \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "tpl-financial",
        "name": "Financial Services",
        "description": "SOX-compliant controls for financial operations",
        "rules_count": 24,
        "industries": ["banking", "fintech", "insurance"]
      },
      {
        "id": "tpl-healthcare",
        "name": "Healthcare / HIPAA",
        "description": "HIPAA-aligned access controls and audit requirements",
        "rules_count": 18,
        "industries": ["healthcare", "pharma", "biotech"]
      },
      {
        "id": "tpl-saas",
        "name": "SaaS Platform",
        "description": "Standard governance for SaaS customer-facing operations",
        "rules_count": 15,
        "industries": ["technology", "saas"]
      }
    ]
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/policies/evaluations"
            description="Audit trail of policy evaluations. Shows historical evaluation results including which rules matched and why."
            curl={`curl https://console.regulator.ai/api/v1/policies/evaluations \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G -d "limit=10" -d "decision=deny"`}
            responseJson={`{
  "success": true,
  "data": {
    "evaluations": [
      {
        "id": "eval-001",
        "intent_id": "int-2d4f6a8b",
        "action": "transfer_funds",
        "decision": "deny",
        "matched_rule": "pol-001",
        "risk_tier": null,
        "timestamp": "2026-03-25T23:01:00.000Z"
      }
    ],
    "total": 47,
    "has_more": true
  }
}`}
          />

          {/* Action Types */}
          <H3 id="api-action-types">Action Types</H3>

          <Endpoint
            method="GET"
            path="/api/v1/action-types"
            description="List all registered action types. Action types define the schema for intent parameters and the default risk tier."
            curl={`curl https://console.regulator.ai/api/v1/action-types \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "action_types": [
      {
        "id": "act-001",
        "name": "send_email",
        "description": "Send an email to a specified recipient",
        "default_risk_tier": "T0",
        "schema": {
          "to": {"type": "string", "format": "email", "required": true},
          "subject": {"type": "string", "required": true},
          "body": {"type": "string", "required": true},
          "cc": {"type": "array", "items": "string", "required": false}
        }
      }
    ],
    "total": 23
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/action-types"
            description="Register a new action type with parameter schema and default risk tier."
            body={`{
  "name": "string — Unique action type identifier",
  "description": "string — What this action does",
  "default_risk_tier": "string — 'T0' | 'T1' | 'T2'",
  "schema": "object — Parameter validation schema (JSON Schema subset)"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/action-types \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "name": "deploy_service",
    "description": "Deploy a service to a specified environment",
    "default_risk_tier": "T1",
    "schema": {
      "service": {"type": "string", "required": true},
      "environment": {"type": "string", "enum": ["staging", "production"], "required": true},
      "version": {"type": "string", "pattern": "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$", "required": true}
    }
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "act-024",
    "name": "deploy_service",
    "default_risk_tier": "T1",
    "created_at": "2026-03-25T21:35:00.000Z"
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/action-types/:id"
            description="Get a single action type by ID with full schema definition."
            curl={`curl https://console.regulator.ai/api/v1/action-types/act-001 \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "act-001",
    "name": "send_email",
    "description": "Send an email to a specified recipient",
    "default_risk_tier": "T0",
    "schema": {
      "to": {"type": "string", "format": "email", "required": true},
      "subject": {"type": "string", "required": true},
      "body": {"type": "string", "required": true}
    },
    "created_at": "2026-03-20T10:00:00.000Z",
    "usage_count": 1247
  }
}`}
          />

          <Endpoint
            method="PUT"
            path="/api/v1/action-types/:id"
            description="Update an existing action type. Schema changes apply to new intents only; in-flight intents use the schema at submission time."
            body={`{
  "description": "string (optional)",
  "default_risk_tier": "string (optional)",
  "schema": "object (optional) — Full replacement"
}`}
            curl={`curl -X PUT https://console.regulator.ai/api/v1/action-types/act-024 \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"default_risk_tier": "T2"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "act-024",
    "default_risk_tier": "T2",
    "updated_at": "2026-03-25T22:00:00.000Z"
  }
}`}
          />

          <Endpoint
            method="DELETE"
            path="/api/v1/action-types/:id"
            description="Remove an action type. Agents submitting intents for this action type will receive a validation error."
            curl={`curl -X DELETE https://console.regulator.ai/api/v1/action-types/act-024 \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "act-024",
    "deleted": true
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/action-types/validate"
            description="Validate parameters against an action type schema without submitting an intent. Useful for pre-flight checks."
            body={`{
  "action_type": "string — Action type name",
  "parameters": "object — Parameters to validate"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/action-types/validate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "action_type": "send_email",
    "parameters": {"to": "not-an-email", "subject": "Test"}
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "valid": false,
    "errors": [
      {"field": "to", "message": "Invalid email format", "expected": "email"},
      {"field": "body", "message": "Required field missing"}
    ]
  }
}`}
          />

          {/* Fleet Management */}
          <H3 id="api-fleet">Fleet Management</H3>

          <Endpoint
            method="GET"
            path="/api/v1/fleet"
            description="Get fleet overview with all registered agents, their status, trust scores, and recent activity summary."
            curl={`curl https://console.regulator.ai/api/v1/fleet \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G -d "status=active" -d "limit=50"`}
            responseJson={`{
  "success": true,
  "data": {
    "agents": [
      {
        "agent_id": "agt-9c8b7a6f",
        "name": "support-agent-01",
        "type": "autonomous",
        "status": "active",
        "trust_score": 72,
        "allowed_actions": ["send_email", "query_database", "create_ticket"],
        "last_active": "2026-03-25T21:30:00.000Z",
        "intents_24h": 47,
        "denials_24h": 2
      }
    ],
    "total": 8,
    "summary": {
      "active": 6,
      "suspended": 1,
      "inactive": 1,
      "total_intents_24h": 312
    }
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/fleet/:agentId"
            description="Get detailed information about a specific agent including trust history, capabilities, and configuration."
            curl={`curl https://console.regulator.ai/api/v1/fleet/agt-9c8b7a6f \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "agent_id": "agt-9c8b7a6f",
    "name": "support-agent-01",
    "description": "Customer support automation agent",
    "type": "autonomous",
    "status": "active",
    "trust_score": 72,
    "trust_history": [
      {"score": 50, "reason": "initial_registration", "timestamp": "2026-03-20T10:00:00Z"},
      {"score": 65, "reason": "100_successful_executions", "timestamp": "2026-03-22T14:00:00Z"},
      {"score": 72, "reason": "500_successful_executions", "timestamp": "2026-03-25T10:00:00Z"}
    ],
    "allowed_actions": ["send_email", "query_database", "create_ticket"],
    "metadata": {"framework": "langchain", "version": "0.1.0"},
    "stats": {
      "total_intents": 1247,
      "total_executions": 1198,
      "total_denials": 49,
      "verification_pass_rate": 0.997
    },
    "created_at": "2026-03-20T10:00:00.000Z"
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/fleet/:agentId/activity"
            description="Get activity log for a specific agent. Shows recent intents, executions, and governance events."
            curl={`curl https://console.regulator.ai/api/v1/fleet/agt-9c8b7a6f/activity \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G -d "limit=20"`}
            responseJson={`{
  "success": true,
  "data": {
    "activities": [
      {
        "type": "intent_executed",
        "intent_id": "int-2d4f6a8b",
        "action": "send_email",
        "risk_tier": "T0",
        "status": "executed",
        "duration_ms": 847,
        "timestamp": "2026-03-25T21:35:02.000Z"
      },
      {
        "type": "intent_denied",
        "intent_id": "int-3e5f7a9b",
        "action": "transfer_funds",
        "risk_tier": null,
        "status": "denied",
        "reason": "Action not in allowed set",
        "timestamp": "2026-03-25T21:30:00.000Z"
      }
    ],
    "total": 1247
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/fleet/:agentId/suspend"
            description="Suspend an agent. All pending intents are cancelled. The agent cannot submit new intents until reactivated. Requires admin role."
            body={`{
  "reason": "string — Why the agent is being suspended",
  "duration": "string (optional) — 'indefinite' | ISO 8601 duration (e.g., 'PT24H')"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/fleet/agt-9c8b7a6f/suspend \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"reason": "Anomalous behavior detected", "duration": "PT24H"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "agent_id": "agt-9c8b7a6f",
    "status": "suspended",
    "suspended_at": "2026-03-25T21:40:00.000Z",
    "resume_at": "2026-03-26T21:40:00.000Z",
    "pending_intents_cancelled": 3
  }
}`}
          />

          <Endpoint
            method="PUT"
            path="/api/v1/fleet/:agentId/trust"
            description="Manually adjust an agent's trust score. The system also adjusts trust automatically based on behavior, but this endpoint allows manual overrides."
            body={`{
  "trust_score": "number — New trust score (0-100)",
  "reason": "string — Explanation for the adjustment"
}`}
            curl={`curl -X PUT https://console.regulator.ai/api/v1/fleet/agt-9c8b7a6f/trust \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"trust_score": 85, "reason": "Promoted to production-ready after review"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "agent_id": "agt-9c8b7a6f",
    "previous_trust_score": 72,
    "new_trust_score": 85,
    "adjusted_by": "op-7f3a2b1c",
    "timestamp": "2026-03-25T21:45:00.000Z"
  }
}`}
          />

          {/* Integrations */}
          <H3 id="api-integrations">Integrations</H3>

          <Endpoint
            method="GET"
            path="/api/v1/integrations"
            description="List configured integrations (Slack, email, webhooks, etc.). Integrations receive notifications for approvals, alerts, and audit events."
            curl={`curl https://console.regulator.ai/api/v1/integrations \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "integrations": [
      {
        "id": "intg-001",
        "type": "slack",
        "name": "Engineering Slack",
        "status": "active",
        "config": {"channel": "#ai-governance", "webhook_url": "https://hooks.slack.com/..."},
        "events": ["approval_required", "execution_failed", "verification_mismatch"]
      },
      {
        "id": "intg-002",
        "type": "webhook",
        "name": "PagerDuty Alerts",
        "status": "active",
        "config": {"url": "https://events.pagerduty.com/..."},
        "events": ["verification_mismatch", "agent_suspended"]
      }
    ],
    "total": 2
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/integrations"
            description="Create a new integration. Supported types: slack, webhook, email, pagerduty."
            body={`{
  "type": "string — 'slack' | 'webhook' | 'email' | 'pagerduty'",
  "name": "string — Human-readable name",
  "config": "object — Type-specific configuration",
  "events": "string[] — Events to subscribe to"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/integrations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "type": "webhook",
    "name": "Custom Webhook",
    "config": {"url": "https://your-app.com/vienna-webhook", "secret": "whsec_..."},
    "events": ["approval_required", "execution_complete"]
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "id": "intg-003",
    "type": "webhook",
    "name": "Custom Webhook",
    "status": "active",
    "created_at": "2026-03-25T21:35:00.000Z"
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/integrations/:id/test"
            description="Send a test event to an integration to verify connectivity. Returns success/failure with diagnostics."
            curl={`curl -X POST https://console.regulator.ai/api/v1/integrations/intg-003/test \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "integration_id": "intg-003",
    "test_event_sent": true,
    "response_code": 200,
    "latency_ms": 145
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/integrations/types"
            description="List available integration types with their configuration schemas."
            curl={`curl https://console.regulator.ai/api/v1/integrations/types \\
  -H "Authorization: Bearer $VIENNA_API_KEY"`}
            responseJson={`{
  "success": true,
  "data": {
    "types": [
      {"type": "slack", "config_schema": {"webhook_url": "string", "channel": "string"}},
      {"type": "webhook", "config_schema": {"url": "string", "secret": "string", "headers": "object"}},
      {"type": "email", "config_schema": {"smtp_host": "string", "from": "string"}},
      {"type": "pagerduty", "config_schema": {"routing_key": "string", "severity": "string"}}
    ]
  }
}`}
          />

          {/* Compliance */}
          <H3 id="api-compliance">Compliance</H3>

          <Endpoint
            method="POST"
            path="/api/v1/compliance/reports/generate"
            description="Generate a compliance report for a specified time period. Reports include all governance events, policy evaluations, warrant usage, and verification results."
            body={`{
  "type": "string — 'summary' | 'detailed' | 'audit'",
  "start_date": "string — ISO 8601 date",
  "end_date": "string — ISO 8601 date",
  "format": "string — 'json' | 'pdf'",
  "filters": {
    "agent_ids": "string[] (optional)",
    "action_types": "string[] (optional)",
    "risk_tiers": "string[] (optional)"
  }
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/compliance/reports/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "type": "summary",
    "start_date": "2026-03-01",
    "end_date": "2026-03-25",
    "format": "pdf"
  }'`}
            responseJson={`{
  "success": true,
  "data": {
    "report_id": "rpt-001",
    "status": "generating",
    "estimated_completion": "2026-03-25T21:36:00.000Z",
    "download_url": null
  }
}`}
          />

          <Endpoint
            method="GET"
            path="/api/v1/compliance/reports/:id/pdf"
            description="Download a generated compliance report as PDF. Returns 202 if the report is still generating."
            curl={`curl https://console.regulator.ai/api/v1/compliance/reports/rpt-001/pdf \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -o compliance-report.pdf`}
            response="Binary PDF file (application/pdf) or 202 Accepted if still generating"
          />

          {/* Approvals */}
          <H3 id="api-approvals">Approvals</H3>

          <Endpoint
            method="GET"
            path="/api/v1/approvals"
            description="List pending and recent approvals. Filterable by status, agent, and risk tier."
            curl={`curl https://console.regulator.ai/api/v1/approvals \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -G -d "status=pending" -d "limit=20"`}
            responseJson={`{
  "success": true,
  "data": {
    "approvals": [
      {
        "id": "apr-6b8c0d1e",
        "intent_id": "int-5a7b9c0d",
        "agent_id": "agt-9c8b7a6f",
        "agent_name": "support-agent-01",
        "action": "restart_service",
        "parameters": {"service": "api-gateway", "graceful": true},
        "risk_tier": "T1",
        "status": "pending",
        "required_approvers": 1,
        "current_approvals": 0,
        "expires_at": "2026-03-25T22:35:00.000Z",
        "created_at": "2026-03-25T21:35:00.000Z"
      }
    ],
    "total": 3
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/approvals/:id/approve"
            description="Approve a pending intent. If all required approvals are met, a warrant is issued and execution begins."
            body={`{
  "comment": "string (optional) — Approval notes for audit trail"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/approvals/apr-6b8c0d1e/approve \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"comment": "Approved — hotfix deploy is urgent"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "approval_id": "apr-6b8c0d1e",
    "status": "approved",
    "approver": "op-7f3a2b1c",
    "intent_status": "executing",
    "warrant_id": "wrt-7c9d0e1f",
    "timestamp": "2026-03-25T21:36:00.000Z"
  }
}`}
          />

          <Endpoint
            method="POST"
            path="/api/v1/approvals/:id/deny"
            description="Deny a pending intent. The intent is cancelled and the agent is notified."
            body={`{
  "reason": "string — Why the intent was denied (logged in audit trail)"
}`}
            curl={`curl -X POST https://console.regulator.ai/api/v1/approvals/apr-6b8c0d1e/deny \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{"reason": "Service restart not approved during peak traffic"}'`}
            responseJson={`{
  "success": true,
  "data": {
    "approval_id": "apr-6b8c0d1e",
    "status": "denied",
    "denier": "op-7f3a2b1c",
    "intent_status": "denied",
    "reason": "Service restart not approved during peak traffic",
    "timestamp": "2026-03-25T21:36:00.000Z"
  }
}`}
          />


          {/* ════════════════════════════════════════════════════════════════
               SECTION 5: INTEGRATION GUIDES
             ════════════════════════════════════════════════════════════════ */}

          <div className="border-t border-[#1C222E] my-16" />

          <H2 id="integration-guides" icon={<Code className="w-6 h-6 text-cyan-400" />}>Integration Guides</H2>
          <P>
            Vienna OS is runtime-agnostic. Any system that can make HTTP requests can
            integrate. These guides show how to wire governance into popular AI agent
            frameworks.
          </P>

          {/* OpenClaw */}
          <H3 id="int-openclaw">OpenClaw</H3>
          <P>
            OpenClaw agents can integrate with Vienna OS by wrapping action execution in
            intent submissions. Every tool call routes through the governance pipeline.
          </P>

          <CodeBlock language="typescript" title="openclaw-vienna-plugin.ts">{`import { ViennaClient } from "./vienna-client";

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_URL || "https://console.regulator.ai",
  apiKey: process.env.VIENNA_AGENT_KEY!,
  agentId: process.env.VIENNA_AGENT_ID!,
  tenantId: process.env.VIENNA_TENANT_ID!,
});

/**
 * Wrap any action in Vienna governance.
 * The action only executes if Vienna issues a warrant.
 */
async function governedAction(
  action: string,
  parameters: Record<string, unknown>,
  context?: Record<string, unknown>
) {
  // Submit intent to Vienna
  const intent = await vienna.submitIntent({
    action,
    parameters,
    context: {
      ...context,
      source_framework: "openclaw",
      timestamp: new Date().toISOString(),
    },
  });

  switch (intent.status) {
    case "executed":
      console.log(\` \${action} executed (warrant: \${intent.warrant.warrant_id})\`);
      return intent.result;

    case "pending_approval":
      console.log(\`⏳ \${action} awaiting approval (\${intent.approval.approval_id})\`);
      // Optionally wait for approval via webhook or polling
      return await vienna.waitForApproval(intent.approval.approval_id, {
        timeoutMs: 3600_000, // 1 hour
        pollIntervalMs: 5_000,
      });

    case "denied":
      throw new Error(\` \${action} denied: \${intent.reason}\`);

    default:
      throw new Error(\`Unexpected status: \${intent.status}\`);
  }
}

// Usage in an OpenClaw agent
const result = await governedAction("send_email", {
  to: "customer@example.com",
  subject: "Your order has shipped",
  body: "Track your package at ...",
});`}</CodeBlock>

          {/* LangChain */}
          <H3 id="int-langchain">LangChain</H3>
          <P>
            Wrap LangChain tools with a Vienna governance layer. The tool checks with
            Vienna before executing any action.
          </P>

          <CodeBlock language="python" title="langchain_vienna.py">{`from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field
import requests
import os

VIENNA_URL = os.environ.get("VIENNA_URL", "https://console.regulator.ai")
VIENNA_KEY = os.environ["VIENNA_AGENT_KEY"]
AGENT_ID = os.environ["VIENNA_AGENT_ID"]
TENANT_ID = os.environ["VIENNA_TENANT_ID"]


class GovernedTool(BaseTool):
    """Base class for Vienna-governed LangChain tools.

    Subclass this instead of BaseTool. Your tool's _run method
    will only execute if Vienna issues a warrant.
    """

    vienna_action: str = ""  # Override in subclass

    def _call_vienna(self, parameters: dict) -> dict:
        """Submit intent to Vienna and handle the response."""
        response = requests.post(
            f"{VIENNA_URL}/api/v1/agent/intent",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {VIENNA_KEY}",
            },
            json={
                "action": self.vienna_action,
                "source": {"platform": "langchain", "agent_id": AGENT_ID},
                "tenant_id": TENANT_ID,
                "parameters": parameters,
            },
        )
        return response.json()["data"]

    def _run(self, **kwargs) -> str:
        # Check with Vienna first
        result = self._call_vienna(kwargs)

        if result["status"] == "denied":
            return f"Action denied by governance policy: {result['reason']}"

        if result["status"] == "pending_approval":
            return (
                f"Action requires approval (ID: {result['approval']['approval_id']}). "
                f"An operator must approve before execution."
            )

        # Warrant issued — proceed with actual execution
        return self._execute_with_warrant(result["warrant"], **kwargs)

    def _execute_with_warrant(self, warrant: dict, **kwargs) -> str:
        raise NotImplementedError("Override in subclass")


# Example: Governed email sender
class GovernedEmailTool(GovernedTool):
    name = "send_email"
    description = "Send an email (governed by Vienna OS)"
    vienna_action = "send_email"

    def _execute_with_warrant(self, warrant, **kwargs):
        # Your actual email sending logic here
        return f"Email sent (warrant: {warrant['warrant_id']})"


# Usage with LangChain agent
from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI

tools = [GovernedEmailTool()]
llm = OpenAI(temperature=0)
agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)`}</CodeBlock>

          {/* CrewAI */}
          <H3 id="int-crewai">CrewAI</H3>
          <P>
            CrewAI tasks can be wrapped with Vienna governance using a callback
            pattern. The crew&apos;s task outputs are submitted as intents before
            being acted upon.
          </P>

          <CodeBlock language="python" title="crewai_vienna.py">{`from crewai import Agent, Task, Crew
import requests, os

VIENNA_URL = os.environ.get("VIENNA_URL", "https://console.regulator.ai")
VIENNA_KEY = os.environ["VIENNA_AGENT_KEY"]

def governed_callback(output):
    """Submit task output to Vienna for governance before execution."""
    response = requests.post(
        f"{VIENNA_URL}/api/v1/agent/intent",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {VIENNA_KEY}",
        },
        json={
            "action": output.get("action", "task_execution"),
            "source": {"platform": "crewai", "agent_id": output.get("agent", "unknown")},
            "tenant_id": os.environ["VIENNA_TENANT_ID"],
            "parameters": output,
        },
    )
    result = response.json()
    if not result.get("success") or result["data"]["status"] == "denied":
        raise Exception(f"Governance denied: {result.get('error', 'Policy violation')}")
    return result["data"]

# Define agents and tasks
researcher = Agent(role="Researcher", goal="Find market data", backstory="...")
analyst = Agent(role="Analyst", goal="Analyze trends", backstory="...")

research_task = Task(
    description="Research Q1 market trends",
    agent=researcher,
    callback=governed_callback,  # Vienna checks before execution
)

crew = Crew(agents=[researcher, analyst], tasks=[research_task])
result = crew.kickoff()`}</CodeBlock>

          {/* Generic HTTP */}
          <H3 id="int-http">Generic HTTP</H3>
          <P>
            Any system that can make HTTP requests can integrate with Vienna OS.
            Here&apos;s the universal pattern.
          </P>

          <CodeBlock language="bash" title="curl">{`# Submit any agent action through governance
curl -X POST https://console.regulator.ai/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_AGENT_KEY" \\
  -d '{
    "action": "your_custom_action",
    "source": {
      "platform": "your-framework",
      "agent_id": "your-agent-id"
    },
    "tenant_id": "your-tenant",
    "parameters": {
      "key": "value"
    }
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "intent_id": "int-abc123",
#     "status": "executed",
#     "execution_id": "exec-def456",
#     "warrant": { "warrant_id": "wrt-...", "scope": {...}, "ttl": 300 },
#     "audit_id": "aud-ghi789"
#   }
# }`}</CodeBlock>

          {/* Webhooks */}
          <H3 id="int-webhooks">Receiving Webhooks</H3>
          <P>
            Vienna OS can send webhooks when governance events occur (approvals needed,
            actions executed, policy violations). Configure integrations via the console
            or API.
          </P>

          <CodeBlock language="typescript" title="webhook-handler.ts">{`import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.VIENNA_WEBHOOK_SECRET!;

// Verify HMAC-SHA256 signature
function verifySignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post("/webhooks/vienna", (req, res) => {
  const signature = req.headers["x-vienna-signature"] as string;
  const rawBody = JSON.stringify(req.body);

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;

  switch (event.type) {
    case "approval_required":
      console.log("Approval needed:", event.data.action_type);
      // Notify your team via Slack, email, etc.
      break;
    case "action_executed":
      console.log("Action completed:", event.data.execution_id);
      break;
    case "policy_violation":
      console.log("ALERT:", event.data.agent_id, event.data.message);
      break;
  }

  res.json({ received: true });
});

app.listen(3001);`}</CodeBlock>

          {/* ================================================
              POLICY-AS-CODE GUIDE
              ================================================ */}
          <div className="h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent my-16" />

          <H2 id="policy-guide" icon={<FileText className="w-6 h-6 text-purple-400" />}>Policy-as-Code Guide</H2>
          <P>
            Vienna OS policies are rules that automatically evaluate every agent intent.
            Rules are evaluated top-down by priority (highest first). First matching rule wins,
            like firewall rules.
          </P>

          <H3 id="pol-creating">Creating Rules</H3>
          <P>
            Create policies via the API or the visual Policy Builder in the console.
          </P>

          <CodeBlock language="bash" title="Create a policy rule">{`curl -X POST https://console.regulator.ai/api/v1/policies \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "name": "High-Value Transaction Gate",
    "description": "Require T2 multi-party approval for transactions over $10,000",
    "conditions": [
      { "field": "action_type", "operator": "equals", "value": "financial_transaction" },
      { "field": "amount", "operator": "gt", "value": 10000 }
    ],
    "action_on_match": "require_approval",
    "approval_tier": "T2",
    "priority": 100,
    "enabled": true
  }'`}</CodeBlock>

          <H3 id="pol-operators">Condition Operators</H3>
          <P>
            Vienna supports 14 condition operators. The available operators depend on the
            field type being evaluated.
          </P>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Operator</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Description</th>
                  <th className="text-left py-2 text-slate-400 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 font-mono text-xs">
                {[
                  ["equals", "Exact match", '{ field: "action_type", operator: "equals", value: "deploy" }'],
                  ["not_equals", "Not equal", '{ field: "environment", operator: "not_equals", value: "production" }'],
                  ["contains", "String contains", '{ field: "action_type", operator: "contains", value: "delete" }'],
                  ["gt", "Greater than (numeric)", '{ field: "amount", operator: "gt", value: 10000 }'],
                  ["gte", "Greater than or equal", '{ field: "risk_score", operator: "gte", value: 80 }'],
                  ["lt", "Less than", '{ field: "trust_score", operator: "lt", value: 50 }'],
                  ["lte", "Less than or equal", '{ field: "retry_count", operator: "lte", value: 3 }'],
                  ["in", "Value in array", '{ field: "agent_id", operator: "in", value: ["bot-a", "bot-b"] }'],
                  ["not_in", "Value not in array", '{ field: "environment", operator: "not_in", value: ["prod", "staging"] }'],
                  ["matches", "Regex match", '{ field: "action_type", operator: "matches", value: "^deploy_.*" }'],
                  ["between", "Numeric range", '{ field: "amount", operator: "between", value: [1000, 50000] }'],
                  ["time_between", "Time-of-day range (HH:MM)", '{ field: "time_of_day", operator: "time_between", value: ["18:00", "06:00"] }'],
                  ["exists", "Field is present", '{ field: "parameters.override", operator: "exists", value: true }'],
                  ["not_exists", "Field is absent", '{ field: "parameters.approval_bypass", operator: "not_exists", value: true }'],
                ].map(([op, desc, ex], i) => (
                  <tr key={op} className={i % 2 === 0 ? "" : "bg-navy-800/30"}>
                    <td className="py-2 pr-4 text-purple-400">{op}</td>
                    <td className="py-2 pr-4 text-slate-400 font-sans">{desc}</td>
                    <td className="py-2 text-slate-500 text-[11px]">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <H3 id="pol-examples">Complex Examples</H3>

          <CodeBlock language="json" title="Block after-hours financial transactions over $50K">{`{
  "name": "After-Hours High-Value Block",
  "conditions": [
    { "field": "action_type", "operator": "equals", "value": "financial_transaction" },
    { "field": "amount", "operator": "gt", "value": 50000 },
    { "field": "time_of_day", "operator": "time_between", "value": ["18:00", "06:00"] }
  ],
  "action_on_match": "deny",
  "priority": 200
}`}</CodeBlock>

          <CodeBlock language="json" title="CTO approval for production database migrations">{`{
  "name": "Prod DB Migration Gate",
  "conditions": [
    { "field": "action_type", "operator": "equals", "value": "database_migration" },
    { "field": "environment", "operator": "equals", "value": "production" }
  ],
  "action_on_match": "require_approval",
  "approval_tier": "T2",
  "required_approvers": ["operator-cto"],
  "priority": 150
}`}</CodeBlock>

          <CodeBlock language="json" title="Auto-approve reads from high-trust agents">{`{
  "name": "Trusted Agent Auto-Approve",
  "conditions": [
    { "field": "action_type", "operator": "contains", "value": "read" },
    { "field": "trust_score", "operator": "gt", "value": 80 }
  ],
  "action_on_match": "allow",
  "priority": 50
}`}</CodeBlock>

          <CodeBlock language="json" title="Rate limit any single agent">{`{
  "name": "Agent Rate Limiter",
  "conditions": [
    { "field": "rate", "operator": "gt", "value": 100 }
  ],
  "action_on_match": "rate_limit",
  "priority": 300
}`}</CodeBlock>

          <H3 id="pol-dry-run">Dry-Run Testing</H3>
          <P>
            Test any intent against all active policies without executing it. The evaluate
            endpoint returns which rules matched and what action would be taken.
          </P>

          <CodeBlock language="bash" title="Test a hypothetical intent">{`curl -X POST https://console.regulator.ai/api/v1/policies/evaluate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $VIENNA_API_KEY" \\
  -d '{
    "action_type": "financial_transaction",
    "amount": 75000,
    "agent_id": "billing-bot",
    "environment": "production",
    "time_of_day": "22:30"
  }'

# Response:
# {
#   "results": [
#     {
#       "rule_id": "...",
#       "rule_name": "After-Hours High-Value Block",
#       "matched": true,
#       "action": "deny",
#       "conditions_detail": [
#         { "field": "action_type", "passed": true },
#         { "field": "amount", "passed": true, "actual": 75000, "expected": "> 50000" },
#         { "field": "time_of_day", "passed": true, "actual": "22:30", "expected": "18:00-06:00" }
#       ]
#     }
#   ],
#   "final_action": "deny",
#   "matching_rule": "After-Hours High-Value Block"
# }`}</CodeBlock>

          <H3 id="pol-templates">Industry Templates</H3>
          <P>
            Vienna ships with pre-built policy templates for regulated industries.
            Import them via the API or the Policy Builder UI.
          </P>

          <CodeBlock language="bash" title="List available templates">{`curl https://console.regulator.ai/api/v1/policies/templates \\
  -H "Authorization: Bearer $VIENNA_API_KEY"

# Returns: financial_services, healthcare, devops, legal, general
# Each template contains 5-8 rules configured for that industry`}</CodeBlock>

          {/* ================================================
              WARRANT DEEP DIVE
              ================================================ */}
          <div className="h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent my-16" />

          <H2 id="warrant-deep-dive" icon={<Lock className="w-6 h-6 text-amber-400" />}>Warrant Deep Dive</H2>
          <P>
            The execution warrant is Vienna OS&apos;s core innovation. This section explains
            why warrants exist, how they work, and why they&apos;re necessary for governing
            autonomous AI agents.
          </P>

          <H3 id="wdd-problem">Problem Statement</H3>
          <P>
            Traditional authorization (API keys, OAuth tokens, IAM roles) answers one question:
            <strong className="text-white"> &ldquo;Who are you?&rdquo;</strong> But for AI agents taking
            real-world actions, we need to answer a different question:
            <strong className="text-white"> &ldquo;What exactly are you authorized to do, right now,
            this one time?&rdquo;</strong>
          </P>
          <P>
            An API key that authorizes &ldquo;billing-bot&rdquo; to &ldquo;make payments&rdquo; is dangerously
            broad. It doesn&apos;t constrain amount, recipient, timing, or frequency. If the
            agent is compromised or hallucinates, it can drain an account. Traditional auth
            is identity-based. Agent governance needs to be <em>action-based</em>.
          </P>

          <H3 id="wdd-model">The Warrant Model</H3>
          <P>
            A Vienna execution warrant is a cryptographically signed, time-limited,
            scope-constrained authorization token. It authorizes exactly one action with
            specific parameters, issued only after policy evaluation and (optionally)
            operator approval.
          </P>

          <CodeBlock language="json" title="Warrant structure">{`{
  "warrant_id": "wrt-7f3a2b1c-e8d4-4a9f-b2c1-9d8e7f6a5b4c",
  "scope": {
    "action": "wire_transfer",
    "target": "payments-service",
    "parameters": {
      "amount": 75000,
      "currency": "USD",
      "recipient": "vendor-456"
    }
  },
  "constraints": {
    "max_amount": 75000,
    "allowed_recipients": ["vendor-456"],
    "max_retries": 0,
    "rollback_on_failure": true
  },
  "ttl_seconds": 300,
  "issued_at": "2026-03-25T21:30:00Z",
  "expires_at": "2026-03-25T21:35:00Z",
  "issuer": {
    "type": "multi_party",
    "operators": ["operator-jane", "operator-mike"],
    "approval_id": "appr-abc123"
  },
  "chain_of_custody": {
    "intent_id": "int-xyz789",
    "policy_match": "high-value-transfer-gate",
    "risk_tier": "T2",
    "approval_time_ms": 45200
  },
  "signature": "hmac-sha256:a1b2c3d4e5f67890..."
}`}</CodeBlock>

          <H3 id="wdd-comparison">Comparison with Traditional Auth</H3>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Property</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">API Key / OAuth</th>
                  <th className="text-left py-2 text-emerald-400 font-semibold">Vienna Warrant</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 text-xs">
                {[
                  ["Authorizes", "Identity (who you are)", "Specific action (what you can do)"],
                  ["Scope", "Broad (all permitted actions)", "Narrow (one action, one time)"],
                  ["Time limit", "Long-lived (months/years)", "Seconds to minutes (TTL)"],
                  ["Parameters", "None", "Amount, recipient, target constrained"],
                  ["Post-execution check", "None", "Verification Engine confirms compliance"],
                  ["Compromise impact", "Full access until revoked", "One action, already expired"],
                  ["Audit chain", "Who authenticated", "Full intent → policy → approval → execution chain"],
                  ["Tamper evidence", "None", "HMAC-SHA256 signature"],
                ].map(([prop, trad, warrant], i) => (
                  <tr key={prop} className={i % 2 === 0 ? "" : "bg-navy-800/30"}>
                    <td className="py-2 pr-4 text-white font-medium">{prop}</td>
                    <td className="py-2 pr-4 text-slate-500">{trad}</td>
                    <td className="py-2 text-emerald-400">{warrant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <H3 id="wdd-lifecycle">Warrant Lifecycle</H3>
          <CodeBlock language="text" title="Warrant lifecycle">{`1. INTENT    → Agent submits action request
2. EVALUATE  → Policy Engine checks against rules
3. TIER      → Risk tier assigned (T0/T1/T2)
4. APPROVE   → Operator(s) approve (if T1/T2)
5. ISSUE     → Warrant Authority creates signed warrant
                - Scope locked to exact parameters
                - TTL set (300s default, configurable)
                - Constraints attached (max amount, allowed targets)
                - HMAC-SHA256 signature computed
6. EXECUTE   → Execution Router validates warrant, runs action
7. VERIFY    → Verification Engine checks:
                - Did action match warrant scope?
                - Was amount within constraints?
                - Was target in allowed list?
                - Was execution within TTL?
8. ARCHIVE   → Warrant + verification result → immutable audit trail`}</CodeBlock>

          <H3 id="wdd-security">Security Properties</H3>
          <P>Vienna warrants provide five security guarantees:</P>
          <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm mb-8 ml-2">
            <li><strong className="text-white">Non-repudiation</strong> — Every warrant records who approved it and why. The chain of custody is immutable.</li>
            <li><strong className="text-white">Scope enforcement</strong> — A warrant for $75,000 to vendor-456 cannot be used to send $750,000 to vendor-789.</li>
            <li><strong className="text-white">Temporal constraint</strong> — Warrants expire. A 300-second TTL means the window for execution is minutes, not months.</li>
            <li><strong className="text-white">Tamper evidence</strong> — HMAC-SHA256 signature means any modification to the warrant payload invalidates it.</li>
            <li><strong className="text-white">Post-execution verification</strong> — Even if execution occurs, the Verification Engine confirms the action matched the warrant. Mismatches trigger alerts.</li>
          </ul>

          <H3 id="wdd-implementation">Implementation</H3>
          <P>
            Warrants use HMAC-SHA256 with a server-side signing key. The signature covers
            the entire warrant payload (minus the signature field itself).
          </P>

          <CodeBlock language="typescript" title="Warrant signing (server-side)">{`import crypto from "crypto";

function signWarrant(warrant: Omit<Warrant, "signature">, signingKey: string): string {
  const payload = JSON.stringify(warrant, Object.keys(warrant).sort());
  return "hmac-sha256:" + crypto
    .createHmac("sha256", signingKey)
    .update(payload)
    .digest("hex");
}

function verifyWarrant(warrant: Warrant, signingKey: string): boolean {
  const { signature, ...payload } = warrant;
  const expected = signWarrant(payload, signingKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</CodeBlock>

          <H3 id="wdd-industry">Industry Use Cases</H3>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { icon: "", title: "Financial Services", desc: "Wire transfer warrants constrain amount, recipient, currency. Multi-party T2 approval for high-value. 60-second TTL on execution. Post-verification confirms exact amount transferred." },
              { icon: "", title: "Healthcare", desc: "PHI access warrants scope to specific patient ID and data fields. HIPAA-compliant audit trail. 30-second TTL. Verification confirms only authorized fields were accessed." },
              { icon: "", title: "Legal", desc: "Court filing warrants constrain to specific case number, document type, and filing deadline. Dual attorney-supervisor approval. Verification confirms correct court and case." },
              { icon: "", title: "DevOps", desc: "Deploy warrants scope to specific service, environment, and version. Rollback constraints enabled. After-hours escalation. Verification confirms deployment target matched." },
            ].map((uc) => (
              <div key={uc.title} className="bg-navy-800 border border-navy-700 rounded-xl p-5">
                <div className="text-2xl mb-2">{uc.icon}</div>
                <h4 className="text-white font-semibold text-sm mb-1">{uc.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>

          {/* ================================================
              SECURITY
              ================================================ */}
          <div className="h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent my-16" />

          <H2 id="security" icon={<Key className="w-6 h-6 text-red-400" />}>Security</H2>

          <H3 id="sec-authn">Authentication</H3>
          <P>Vienna OS supports three authentication mechanisms:</P>
          <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm mb-8 ml-2">
            <li><strong className="text-white">Session-based (operators)</strong> — Login with username/password, receive session cookie. Used by console UI.</li>
            <li><strong className="text-white">API key (agents)</strong> — Bearer token in Authorization header. Scoped per agent with configurable permissions.</li>
            <li><strong className="text-white">mTLS (enterprise)</strong> — Mutual TLS for agent identity verification. Certificate-based, no shared secrets.</li>
          </ul>

          <H3 id="sec-authz">Authorization</H3>
          <P>
            Authorization in Vienna is two-layered: <em>identity authorization</em> (who can
            access the API) and <em>action authorization</em> (what they can do, enforced by
            warrants). Even an authenticated agent with valid API keys cannot execute an
            action without a warrant.
          </P>

          <H3 id="sec-encryption">Encryption</H3>
          <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm mb-8 ml-2">
            <li><strong className="text-white">In transit</strong> — TLS 1.3 enforced on all connections</li>
            <li><strong className="text-white">At rest</strong> — Database encryption via provider (Neon/RDS). Sensitive config fields encrypted with AES-256-GCM.</li>
            <li><strong className="text-white">Warrant signatures</strong> — HMAC-SHA256 with rotating server-side keys</li>
          </ul>

          <H3 id="sec-audit-integrity">Audit Trail Integrity</H3>
          <P>
            The audit trail is append-only. Entries cannot be modified or deleted. Each entry
            includes a hash of the previous entry, creating a tamper-evident chain (similar to
            blockchain but without consensus overhead). Any gap or modification in the chain
            is detectable.
          </P>

          <H3 id="sec-incident">Incident Response</H3>
          <P>
            When Vienna detects a security event (signature mismatch, scope violation,
            unauthorized access attempt):
          </P>
          <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm mb-8 ml-2">
            <li>Alert generated with severity level (info/warning/critical)</li>
            <li>Agent automatically suspended if critical</li>
            <li>Integration adapters notified (Slack, email, webhook)</li>
            <li>Full context captured in audit trail</li>
            <li>Operator review required to reactivate suspended agents</li>
          </ol>

          <H3 id="sec-compliance">Compliance</H3>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { label: "SOC 2 Type II", status: "In progress", color: "text-amber-400" },
              { label: "HIPAA BAA", status: "Available on Enterprise", color: "text-emerald-400" },
              { label: "GDPR", status: "Compliant (EU deployment option)", color: "text-emerald-400" },
              { label: "EU AI Act", status: "Designed for compliance", color: "text-emerald-400" },
              { label: "NIST AI RMF", status: "Aligned", color: "text-emerald-400" },
              { label: "FedRAMP", status: "Planned (2026 Q4)", color: "text-slate-400" },
            ].map((c) => (
              <div key={c.label} className="bg-navy-800 border border-navy-700 rounded-lg p-3 flex items-center justify-between">
                <span className="text-white text-sm font-medium">{c.label}</span>
                <span className={`text-xs font-medium ${c.color}`}>{c.status}</span>
              </div>
            ))}
          </div>

          {/* ================================================
              SELF-HOSTING
              ================================================ */}
          <div className="h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent my-16" />

          <H2 id="self-hosting" icon={<Settings className="w-6 h-6 text-slate-400" />}>Self-Hosting</H2>
          <P>
            Vienna OS can be self-hosted for teams that need on-premise deployment,
            air-gapped environments, or custom infrastructure.
          </P>

          <H3 id="sh-docker">Docker</H3>
          <CodeBlock language="bash" title="Docker deployment">{`# Pull the image
docker pull ghcr.io/risk-ai/vienna-os:latest

# Run with environment variables
docker run -d \\
  --name vienna-os \\
  -p 8080:8080 \\
  -e VIENNA_ENV=prod \\
  -e VIENNA_SECRET_KEY=your-secret-key \\
  -e POSTGRES_URL=postgresql://user:pass@host:5432/vienna \\
  -e VIENNA_SIMULATION=false \\
  ghcr.io/risk-ai/vienna-os:latest

# Verify
curl http://localhost:8080/health
# {"status":"ok"}`}</CodeBlock>

          <H3 id="sh-env-vars">Environment Variables</H3>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Variable</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Required</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Default</th>
                  <th className="text-left py-2 text-slate-400 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 font-mono text-xs">
                {[
                  ["VIENNA_SECRET_KEY", "Yes", "—", "Server signing key for warrants and sessions"],
                  ["POSTGRES_URL", "Yes", "—", "PostgreSQL connection string"],
                  ["VIENNA_ENV", "No", "prod", "Environment: prod, staging, test"],
                  ["PORT", "No", "8080", "Server listen port"],
                  ["VIENNA_SIMULATION", "No", "true", "Enable simulation engine"],
                  ["VIENNA_LOG_LEVEL", "No", "info", "Logging level: debug, info, warn, error"],
                  ["VIENNA_CORS_ORIGIN", "No", "*", "Allowed CORS origins"],
                  ["VIENNA_SESSION_TTL", "No", "86400", "Session TTL in seconds (24h)"],
                  ["VIENNA_WARRANT_TTL", "No", "300", "Default warrant TTL in seconds (5min)"],
                  ["VIENNA_MAX_AGENTS", "No", "100", "Maximum registered agents"],
                ].map(([name, req, def, desc], i) => (
                  <tr key={name} className={i % 2 === 0 ? "" : "bg-navy-800/30"}>
                    <td className="py-2 pr-4 text-purple-400">{name}</td>
                    <td className="py-2 pr-4">{req}</td>
                    <td className="py-2 pr-4 text-slate-500">{def}</td>
                    <td className="py-2 text-slate-400 font-sans">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <H3 id="sh-postgres">PostgreSQL Setup</H3>
          <CodeBlock language="bash" title="Database setup">{`# Create database
createdb vienna

# Run migrations (auto-runs on first boot, or manually)
cd apps/console/server
for f in src/db/migrations/*.sql; do
  psql vienna < "$f"
done`}</CodeBlock>

          <H3 id="sh-docker-compose">Docker Compose (Recommended)</H3>
          <CodeBlock language="bash" title="Docker Compose deployment">{`# Clone the repository
git clone https://github.com/risk-ai/vienna-os.git
cd vienna-os

# Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets:
#   POSTGRES_URL=your-connection-string
#   JWT_SECRET=$(openssl rand -hex 32)

# Start services
docker compose up -d

# Check health
curl http://localhost:3000/health`}</CodeBlock>

          <H3 id="sh-kubernetes">Kubernetes</H3>
          <CodeBlock language="yaml" title="kubernetes/deployment.yaml">{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: vienna-os
  labels:
    app: vienna-os
spec:
  replicas: 2
  selector:
    matchLabels:
      app: vienna-os
  template:
    metadata:
      labels:
        app: vienna-os
    spec:
      containers:
      - name: vienna-os
        image: ghcr.io/risk-ai/vienna-os:latest
        ports:
        - containerPort: 8080
        env:
        - name: VIENNA_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: vienna-secrets
              key: secret-key
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: vienna-secrets
              key: postgres-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: vienna-os
spec:
  selector:
    app: vienna-os
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer`}</CodeBlock>

          {/* End of docs content */}
          <div className="h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent my-16" />

          <div className="bg-gradient-to-br from-purple-900/20 to-navy-800/50 border border-purple-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Ready to govern your agents?</h2>
            <p className="text-slate-400 text-sm mb-4">
              Start with the free tier. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="/signup" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl transition font-semibold text-sm">
                Get Started
              </a>
              <a href="/try" className="bg-navy-800 hover:bg-navy-700 text-white px-6 py-2.5 rounded-xl transition text-sm border border-navy-700">
                Try Live API
              </a>
            </div>
          </div>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-slate-500">Vienna OS Documentation</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="text-xs text-slate-600 hover:text-slate-400 transition">Home</a>
            <a href="https://github.com/risk-ai/regulator.ai" className="text-xs text-slate-600 hover:text-slate-400 transition">GitHub</a>
            <span className="text-xs text-slate-600">© 2026 Technetwork 2 LLC dba ai.ventures</span>
          </div>
        </div>
      </footer>
    </div>
  );
}