import type { Metadata } from 'next';
import { 
  Shield, 
  Lock, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  Code, 
  Eye,
  BookOpen,
  Fingerprint,
  Users,
  Zap,
  Server
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Execution Model | Vienna OS - Governance for AI Agents',
  description: 'Learn how Vienna OS enables both direct execution and agent passback modes for AI agent governance. Cryptographic warrants, risk-based routing, and complete audit trails.',
  openGraph: {
    title: 'Execution Model | Vienna OS',
    description: 'Learn how Vienna OS enables both direct execution and agent passback modes for AI agent governance.',
    type: 'website',
  },
};

export default function ExecutionPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* ============================================
          HERO SECTION
          ============================================ */}
      <header className="relative overflow-hidden bg-gradient-to-br from-gold-900/20 via-gray-900 to-blue-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.1),transparent)]" />
        
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-gold-400" />
              <span className="text-lg font-bold text-white">
                Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="/" className="text-sm text-gray-400 hover:text-white transition">Home</a>
              <a href="/docs" className="text-sm text-gray-400 hover:text-white transition">Docs</a>
              <a href="/pricing" className="text-sm text-gray-400 hover:text-white transition">Pricing</a>
              <a href="/signup" className="text-sm bg-gold-400 hover:bg-gold-300 text-white px-5 py-2.5 rounded-lg transition font-semibold">
                Get Started
              </a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gold-400/15 border border-gold-400/30 rounded-full px-5 py-2.5 mb-8">
              <span className="text-sm text-gold-300 font-bold uppercase tracking-wider">Execution Model</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8">
              Two Paths to
              <span className="block bg-gradient-to-r from-gold-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Execution
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed mb-12 max-w-3xl mx-auto">
              Vienna OS supports both direct execution and agent passback modes, giving you 
              operational flexibility while maintaining complete governance and audit trails.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="/try"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-400 hover:from-gold-400 hover:to-gold-400 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-gold-400/25"
              >
                Try Interactive Demo <ArrowRight className="w-4 h-4" />
              </a>
              <a 
                href="/docs#execution"
                className="inline-flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/80 text-white px-8 py-4 rounded-xl transition-all duration-300 font-medium border border-gray-600/50"
              >
                <Code className="w-4 h-4" />
                View Code Examples
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          EXECUTION MODES COMPARISON
          ============================================ */}
      <section className="py-24 bg-gradient-to-b from-gray-800/50 to-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Choose Your <span className="text-gold-400">Execution Mode</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Vienna OS automatically routes actions based on risk tier, 
              or you can explicitly choose your execution mode.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Vienna Direct */}
            <div className="bg-gradient-to-br from-gold-400/10 to-gold-400/5 border border-gold-400/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-400" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gold-400/20 flex items-center justify-center">
                  <Server className="w-8 h-8 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Vienna Direct</h3>
                  <p className="text-gold-400 font-medium">Vienna executes the action</p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-8">
                Vienna OS executes actions directly through its built-in handlers. 
                Perfect for low-risk operations that need immediate execution with 
                minimal latency. Full audit trails and constraint enforcement included.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-8">
                {[
                  { icon: Zap, text: "Built-in execution handlers", desc: "Shell commands, HTTP calls, database queries" },
                  { icon: ArrowRight, text: "Immediate execution", desc: "No agent round-trip latency" },
                  { icon: BookOpen, text: "Complete audit trail", desc: "Every action logged and verifiable" },
                  { icon: Lock, text: "Constraint enforcement", desc: "Scope and time limits enforced automatically" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-900/30 rounded-lg p-4">
                    <feature.icon className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">{feature.text}</div>
                      <div className="text-xs text-gray-400">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 border border-gold-400/20">
                <div className="text-xs text-gold-400 font-bold mb-3 uppercase tracking-wider">Risk Tiers</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">T0</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-mono font-semibold">T1</span>
                  <span className="text-xs text-gray-500">Auto-approved execution</span>
                </div>
              </div>
            </div>

            {/* Agent Passback */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Agent Passback</h3>
                  <p className="text-blue-400 font-medium">Agent executes with warrant</p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed mb-8">
                Vienna issues a cryptographic execution warrant that the agent uses 
                to execute actions through its own infrastructure. Ideal for high-risk 
                operations or when using specialized agent integrations.
              </p>

              <div className="grid grid-cols-1 gap-4 mb-8">
                {[
                  { icon: Fingerprint, text: "Cryptographic warrants", desc: "HMAC-signed, tamper-evident authorization" },
                  { icon: Users, text: "Multi-party approval", desc: "T2/T3 actions require operator approval" },
                  { icon: Code, text: "Agent infrastructure", desc: "Use existing tools and integrations" },
                  { icon: Eye, text: "Post-execution verification", desc: "Vienna verifies warrant compliance" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-900/30 rounded-lg p-4">
                    <feature.icon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-white">{feature.text}</div>
                      <div className="text-xs text-gray-400">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/20">
                <div className="text-xs text-blue-400 font-bold mb-3 uppercase tracking-wider">Risk Tiers</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-gold-400/15 text-gold-300 border border-gold-400/20 font-mono font-semibold">T2</span>
                  <span className="text-xs px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-mono font-semibold">T3</span>
                  <span className="text-xs text-gray-500">Multi-party approval required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          EXECUTION PIPELINE DIAGRAM
          ============================================ */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Execution <span className="text-gold-300">Pipeline</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Every agent action flows through the same governance pipeline, 
              regardless of execution mode.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800/50 to-slate-800/50 border border-gray-700/60 rounded-2xl p-8 lg:p-12">
            {/* Pipeline Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-12">
              {[
                { icon: "", label: "Intent", desc: "Agent submits action request" },
                { icon: "", label: "Policy", desc: "Rules engine evaluates" },
                { icon: "", label: "Risk Tier", desc: "T0/T1/T2/T3 classification" },
                { icon: "", label: "Approval", desc: "Multi-party if T2/T3" },
                { icon: "", label: "Warrant", desc: "Cryptographic authorization" },
                { icon: "", label: "Execute", desc: "Vienna or Agent" },
                { icon: "", label: "Verify", desc: "Post-execution audit" }
              ].map((step, i) => (
                <div key={step.label} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-xl flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{step.label}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                  
                  {i < 6 && (
                    <div className="hidden md:block absolute top-8 -right-3 text-gray-600">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Execution Fork */}
            <div className="border-t border-gray-700/60 pt-8">
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Execution Decision Point
                </h3>
                <p className="text-sm text-gray-400">
                  Vienna automatically routes based on risk tier
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gold-400/5 border border-gold-400/20 rounded-xl p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gold-400/20 rounded-lg flex items-center justify-center">
                      <Server className="w-6 h-6 text-gold-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">Vienna Direct</h4>
                    <p className="text-sm text-gray-400 mb-4">T0/T1 → Immediate execution</p>
                    <div className="bg-gray-900/50 rounded-lg p-3 text-xs font-mono text-gray-300">
                      Vienna executes via built-in handlers
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="text-white font-semibold mb-2">Agent Passback</h4>
                    <p className="text-sm text-gray-400 mb-4">T2/T3 → Warrant + Agent execution</p>
                    <div className="bg-gray-900/50 rounded-lg p-3 text-xs font-mono text-gray-300">
                      Agent executes with warrant proof
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CODE EXAMPLES
          ============================================ */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              SDK <span className="text-emerald-400">Integration</span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Simple API integration works with any agent framework. 
              5 lines of code to add governance to your agents.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Vienna Direct Example */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Vienna Direct Mode</h3>
                <p className="text-sm text-gray-400 mt-1">Low-risk actions execute immediately</p>
              </div>
              <div className="p-6">
                <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Submit intent for direct execution
const response = await vienna.submit({
  action: "restart_service",
  target: "api-gateway", 
  agent_id: "production-agent"
});

if (response.mode === "direct") {
  // Vienna executed immediately
  console.log("Execution:", response.execution_id);
  console.log("Status:", response.status);
}`}
                </pre>
              </div>
            </div>

            {/* Agent Passback Example */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">Agent Passback Mode</h3>
                <p className="text-sm text-gray-400 mt-1">High-risk actions return warrants</p>
              </div>
              <div className="p-6">
                <pre className="text-sm text-gray-300 overflow-x-auto">
{`// Submit intent, receive warrant
const response = await vienna.submit({
  action: "deploy_production",
  version: "v2.3.1",
  agent_id: "deploy-agent"
});

if (response.mode === "passback") {
  // Execute with warrant authorization
  await agent.execute(response.instruction, {
    warrant: response.warrant_id,
    constraints: response.constraints
  });
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* SDK Installation */}
          <div className="mt-12 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Installation & Setup</h3>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Install SDK</h4>
                  <pre className="text-sm text-gray-300 bg-gray-900 rounded p-3">
{`npm install @vienna/sdk

# or
pip install vienna-sdk
# or  
go get github.com/vienna/sdk-go`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Configure Client</h4>
                  <pre className="text-sm text-gray-300 bg-gray-900 rounded p-3">
{`import { Vienna } from '@vienna/sdk';

const vienna = new Vienna({
  apiKey: process.env.VIENNA_API_KEY,
  endpoint: 'https://api.regulator.ai'
});`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          BENEFITS
          ============================================ */}
      <section className="py-24 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why Dual <span className="text-gold-400">Execution</span> Matters
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Get the best of both worlds: operational flexibility with complete governance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Lock,
                color: "text-gold-400",
                title: "Zero Trust Architecture",
                desc: "Every action requires cryptographic authorization, regardless of execution mode. No exceptions, no backdoors."
              },
              {
                icon: Zap,
                color: "text-emerald-400", 
                title: "Operational Flexibility",
                desc: "Use Vienna's handlers for speed or agent infrastructure for complex integrations. Choose what works best."
              },
              {
                icon: BookOpen,
                color: "text-blue-400",
                title: "Complete Audit Trail", 
                desc: "Immutable record of every intent, approval, warrant, and execution result. Regulator-ready from day one."
              },
              {
                icon: Shield,
                color: "text-gold-300",
                title: "Risk-Based Routing",
                desc: "Automatic classification and routing based on action risk. T0 auto-approves, T3 requires justification."
              },
              {
                icon: Eye,
                color: "text-red-400",
                title: "Constraint Enforcement", 
                desc: "Scope, timing, and parameter constraints enforced cryptographically. Violations are impossible."
              },
              {
                icon: Users,
                color: "text-indigo-400",
                title: "Multi-Party Approvals",
                desc: "High-risk actions require multiple operator signatures. Compliance-ready approval workflows."
              }
            ].map((benefit, i) => (
              <div key={benefit.title} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 text-center hover:bg-gray-800/70 transition-all duration-300">
                <div className="w-16 h-16 mx-auto mb-6 bg-gray-700/50 rounded-xl flex items-center justify-center">
                  <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{benefit.title}</h3>
                <p className="text-gray-400 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-24 bg-gradient-to-br from-gold-900/20 via-gray-900 to-blue-900/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to govern your AI agents?
          </h2>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Start with our free tier. No credit card required. 
            Add execution governance to your agents in under 5 minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-400 hover:from-gold-400 hover:to-gold-400 text-white px-8 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-gold-400/25"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </a>
            <a 
              href="/try"
              className="inline-flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/80 text-white px-8 py-4 rounded-xl transition-all duration-300 font-medium border border-gray-600/50"
            >
              <Play className="w-4 h-4" />
              Try Interactive Demo
            </a>
            <a 
              href="/contact"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              Contact Sales →
            </a>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-gold-400" />
                <span className="font-bold text-white">
                  Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span>
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                The governance and authorization layer for AI systems.
              </p>
            </div>
            
            {[
              { 
                title: "Product", 
                links: [
                  ["Platform", "/"], 
                  ["Execution Model", "/execution"], 
                  ["Pricing", "/pricing"], 
                  ["Documentation", "/docs"]
                ] 
              },
              { 
                title: "Company", 
                links: [
                  ["About", "/about"], 
                  ["Blog", "/blog"], 
                  ["Contact", "/contact"], 
                  ["Security", "/security"]
                ] 
              },
              { 
                title: "Legal", 
                links: [
                  ["Terms", "/terms"], 
                  ["Privacy", "/privacy"], 
                  ["FAQ", "/faq"]
                ] 
              }
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
                <div className="space-y-3">
                  {col.links.map(([label, href]) => (
                    <a key={label} href={href} className="block text-sm text-gray-400 hover:text-white transition">
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2026 Technetwork 2 LLC dba ai.ventures. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}