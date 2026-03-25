import {
  Shield,
  ArrowLeft,
  Terminal,
  BookOpen,
  Zap,
  Lock,
  Server,
} from "lucide-react";

const sections = [
  { id: "quickstart", label: "Quick Start" },
  { id: "architecture", label: "Architecture" },
  { id: "api-reference", label: "API Reference" },
  { id: "integration", label: "Integration Guide" },
  { id: "risk-tiers", label: "Risk Tiers" },
  { id: "warrants", label: "Warrants" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Nav */}
      <nav className="border-b border-navy-700 sticky top-0 bg-navy-900/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-4 h-4" />
              <Shield className="w-6 h-6 text-gold-400" />
              <span className="font-bold text-white">Vienna<span className="text-gold-400">OS</span></span>
            </a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm font-medium">Documentation</span>
          </div>
          <a
            href="https://vienna-os.fly.dev"
            className="text-sm bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 px-4 py-2 rounded-lg transition font-medium"
          >
            Console
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-slate-400 hover:text-white py-1.5 px-3 rounded-lg hover:bg-navy-800 transition"
              >
                {s.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl">
          {/* Quick Start */}
          <section id="quickstart" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Quick Start</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Get Vienna OS running in under 5 minutes. The fastest path is hitting the
              production API directly.
            </p>

            <h3 className="text-white font-semibold mb-3">1. Health Check</h3>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`curl https://vienna-os.fly.dev/health
# {"status":"ok"}`}
              </pre>
            </div>

            <h3 className="text-white font-semibold mb-3">2. Authenticate</h3>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`curl -X POST https://vienna-os.fly.dev/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"vienna","password":"vienna2024"}'

# Response:
# {
#   "success": true,
#   "data": {
#     "operator": "vienna",
#     "sessionId": "sess-...",
#     "expiresAt": "2026-03-26T..."
#   }
# }`}
              </pre>
            </div>

            <h3 className="text-white font-semibold mb-3">3. Submit an Agent Intent</h3>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "check_health",
    "source": "openclaw",
    "tenant_id": "test"
  }'

# Response:
# {
#   "success": true,
#   "status": "executed",
#   "execution_id": "exec-...",
#   "result": {"ok": true, "status_code": 200}
# }`}
              </pre>
            </div>

            <h3 className="text-white font-semibold mb-3">4. Bootstrap Dashboard Data</h3>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`# Use session cookie from login
curl https://vienna-os.fly.dev/api/v1/dashboard/bootstrap \\
  -b "session=<sessionId>"

# Response:
# {
#   "success": true,
#   "data": {
#     "services": {"available": true},
#     "objectives": {"available": true},
#     "chat": {"available": true}
#   }
# }`}
              </pre>
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Server className="w-6 h-6 text-gold-400" />
              <h2 className="text-2xl font-bold text-white">Architecture</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Vienna OS is a monolithic deployment on Fly.io combining frontend
              (React SPA) and backend (Express/Node 22) in a single container.
            </p>

            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
              <div className="font-mono text-sm space-y-1 text-slate-300">
                <div className="text-gold-400 font-semibold">vienna-os.fly.dev</div>
                <div className="text-slate-500">│</div>
                <div>├─ <span className="text-blue-400">Static Files</span> (React SPA)</div>
                <div>├─ <span className="text-emerald-400">API Routes</span> (/api/v1/*)</div>
                <div>│  ├─ auth/login</div>
                <div>│  ├─ dashboard/bootstrap</div>
                <div>│  ├─ agent/intent</div>
                <div>│  ├─ approvals/*</div>
                <div>│  ├─ audit/*</div>
                <div>│  └─ services/*</div>
                <div>├─ <span className="text-amber-400">Vienna Core</span></div>
                <div>│  ├─ Intent Gateway</div>
                <div>│  ├─ Policy Engine</div>
                <div>│  ├─ Governance Pipeline</div>
                <div>│  ├─ Warrant Authority</div>
                <div>│  ├─ Verification Engine</div>
                <div>│  └─ Agent Intent Bridge</div>
                <div>├─ <span className="text-gold-400">State Graph</span> (SQLite)</div>
                <div>└─ <span className="text-slate-400">Health Check</span> (/health)</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">Deployment</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Platform: Fly.io (iad region)</li>
                  <li>• Machine: 2 vCPU, 2GB RAM</li>
                  <li>• Image: ~163 MB</li>
                  <li>• Build: ~90 seconds</li>
                  <li>• Runtime: Node 22</li>
                </ul>
              </div>
              <div className="bg-navy-800 border border-navy-700 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-2">Core Pipeline</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Intent → Policy → Plan → Warrant</li>
                  <li>• Warrant → Execute → Verify → Learn</li>
                  <li>• 300+ governance engine files</li>
                  <li>• Distributed execution support</li>
                  <li>• Learning feedback loop</li>
                </ul>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section id="api-reference" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">API Reference</h2>
            </div>
            <p className="text-slate-400 mb-6">
              All endpoints are prefixed with <code className="text-gold-400 bg-navy-800 px-1.5 py-0.5 rounded">/api/v1</code>.
              Authentication is session-based via login cookie.
            </p>

            {/* Auth */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-2 py-1 rounded">POST</span>
                <code className="text-white font-mono text-sm">/api/v1/auth/login</code>
              </div>
              <p className="text-sm text-slate-400 mb-3">Authenticate an operator. Returns a session token.</p>
              <div className="text-xs font-mono text-slate-500">
                <div>Body: {`{"username": string, "password": string}`}</div>
                <div>Returns: {`{"success": true, "data": {"operator", "sessionId", "expiresAt"}}`}</div>
              </div>
            </div>

            {/* Bootstrap */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs font-mono font-bold px-2 py-1 rounded">GET</span>
                <code className="text-white font-mono text-sm">/api/v1/dashboard/bootstrap</code>
              </div>
              <p className="text-sm text-slate-400 mb-3">Bootstrap console dashboard. Returns service availability.</p>
              <div className="text-xs font-mono text-slate-500">
                <div>Auth: Session cookie required</div>
                <div>Returns: {`{"success": true, "data": {"services", "objectives", "chat"}}`}</div>
              </div>
            </div>

            {/* Agent Intent */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-2 py-1 rounded">POST</span>
                <code className="text-white font-mono text-sm">/api/v1/agent/intent</code>
              </div>
              <p className="text-sm text-slate-400 mb-3">Submit an agent action through the governance pipeline.</p>
              <div className="text-xs font-mono text-slate-500 space-y-1">
                <div>Body: {`{"action": string, "source": string | object, "tenant_id": string}`}</div>
                <div>Actions: check_health, list_objectives, query_state_graph, check_system_status,</div>
                <div className="pl-16">list_recent_executions, restart_service, check_service_logs,</div>
                <div className="pl-16">trigger_backup, run_diagnostic, update_configuration, check_execution_status</div>
                <div>Returns: {`{"success": true, "status": "executed", "execution_id", "result"}`}</div>
              </div>
            </div>

            {/* Health */}
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs font-mono font-bold px-2 py-1 rounded">GET</span>
                <code className="text-white font-mono text-sm">/health</code>
              </div>
              <p className="text-sm text-slate-400 mb-3">Health check endpoint. No authentication required.</p>
              <div className="text-xs font-mono text-slate-500">
                <div>Returns: {`{"status": "ok"}`}</div>
              </div>
            </div>
          </section>

          {/* Integration Guide */}
          <section id="integration" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Integration Guide</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Vienna OS is runtime-agnostic. Here&apos;s how to integrate with OpenClaw
              (first supported runtime).
            </p>

            <h3 className="text-white font-semibold mb-3">OpenClaw Integration</h3>
            <p className="text-slate-400 mb-4 text-sm">
              Agent actions flow through the Intent Gateway via HTTP POST. The source field
              identifies the calling runtime.
            </p>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`// From your OpenClaw agent:
const response = await fetch('https://vienna-os.fly.dev/api/v1/agent/intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'restart_service',
    source: 'openclaw',         // or { platform: 'openclaw' }
    tenant_id: 'your-tenant',
    context: {                  // optional metadata
      agent_id: 'your-agent',
      reason: 'Memory threshold exceeded'
    }
  })
});

const result = await response.json();
// { success: true, status: 'executed', execution_id: '...', result: {...} }`}
              </pre>
            </div>

            <h3 className="text-white font-semibold mb-3">Other Runtimes</h3>
            <p className="text-slate-400 text-sm">
              LangChain, CrewAI, AutoGen, and custom frameworks can integrate via the
              same HTTP API. Set <code className="text-gold-400 bg-navy-800 px-1.5 py-0.5 rounded">source</code> to
              your framework identifier. Vienna OS validates the request, evaluates policy,
              and routes execution regardless of the calling runtime.
            </p>
          </section>

          {/* Risk Tiers */}
          <section id="risk-tiers" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Risk Tiers</h2>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-500/10 border border-navy-700 rounded-xl p-5">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-slate-400 font-mono w-10">T0</span>
                  <h3 className="text-white font-semibold">Reversible / Low-Stakes</h3>
                </div>
                <p className="text-sm text-slate-400 ml-14">
                  Auto-approved. Log reads, status checks, internal queries, health checks.
                  No operator intervention needed.
                </p>
              </div>
              <div className="bg-amber-500/10 border border-navy-700 rounded-xl p-5">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-amber-400 font-mono w-10">T1</span>
                  <h3 className="text-white font-semibold">Moderate Stakes — Approval Required</h3>
                </div>
                <p className="text-sm text-slate-400 ml-14">
                  Config updates, service restarts, data writes. Operator must approve
                  before execution. Warrant issued on approval.
                </p>
              </div>
              <div className="bg-red-500/10 border border-navy-700 rounded-xl p-5">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-lg font-bold text-red-400 font-mono w-10">T2</span>
                  <h3 className="text-white font-semibold">Irreversible / High-Impact — Multi-Party Approval</h3>
                </div>
                <p className="text-sm text-slate-400 ml-14">
                  Production deployments, wire transfers, data deletion, legal filings.
                  Requires multi-party approval. Time-limited warrants with strict scope constraints.
                </p>
              </div>
            </div>
          </section>

          {/* Warrants */}
          <section id="warrants" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Execution Warrants</h2>
            </div>
            <p className="text-slate-400 mb-6">
              Every approved action receives a cryptographically signed warrant. The warrant
              is the only mechanism that authorizes execution.
            </p>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 mb-6">
              <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`// Warrant structure
{
  "warrant_id": "wrt-7f3a2b1c-...",
  "scope": {
    "action": "restart_service",
    "target": "api-gateway",
    "parameters": { "graceful": true }
  },
  "ttl": 300,                    // 5 minutes
  "issued_at": "2026-03-25T...",
  "expires_at": "2026-03-25T...",
  "issuer": {
    "type": "operator",
    "id": "vienna"
  },
  "constraints": {
    "max_retries": 1,
    "rollback_on_failure": true
  },
  "signature": "0x7f3a...b2c1"  // tamper-evident
}`}
              </pre>
            </div>
            <p className="text-slate-400 text-sm">
              Post-execution, the Verification Engine confirms the action matched the warrant
              scope. Any mismatch triggers alerts and automatic revocation. All warrants and
              their verification results are stored in the append-only audit trail.
            </p>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold-400" />
            <span className="text-sm text-slate-500">
              Vienna OS — Governed AI Execution Layer
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/" className="text-xs text-slate-600 hover:text-slate-400 transition">Home</a>
            <a
              href="https://github.com/risk-ai/regulator.ai"
              className="text-xs text-slate-600 hover:text-slate-400 transition"
            >
              GitHub
            </a>
            <span className="text-xs text-slate-600">
              © 2026 ai.ventures. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
