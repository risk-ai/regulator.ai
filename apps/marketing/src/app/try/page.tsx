"use client";

import { useState } from "react";
import { Shield, ArrowLeft, Play, ArrowRight } from "lucide-react";

const actions = [
  {
    id: "check_health",
    label: "Health Check",
    desc: "Verify system health through the governance pipeline",
    tier: "T0",
    tierColor: "#94a3b8",
  },
  {
    id: "list_objectives",
    label: "List Objectives",
    desc: "Query active governance objectives",
    tier: "T0",
    tierColor: "#94a3b8",
  },
  {
    id: "check_system_status",
    label: "System Status",
    desc: "Full system posture check",
    tier: "T0",
    tierColor: "#94a3b8",
  },
  {
    id: "list_recent_executions",
    label: "Recent Executions",
    desc: "View the execution audit trail",
    tier: "T0",
    tierColor: "#94a3b8",
  },
];

export default function TryPage() {
  const [selected, setSelected] = useState("check_health");
  const [result, setResult] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const runIntent = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setResult(null);
    const start = Date.now();

    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selected }),
      });
      const data = await res.json();
      setLatency(Date.now() - start);
      setResult(data);
    } catch {
      setResult({ error: "Failed to reach Vienna OS", success: false });
      setLatency(Date.now() - start);
    }

    setLoading(false);
    // 5-second cooldown between requests to avoid rate limiting
    setCooldown(5);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-white">
              Vienna<span className="text-purple-400">OS</span>
            </span>
          </a>
          <a
            href="/signup"
            className="text-sm bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition font-medium"
          >
            Get Started
          </a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">
          Try Vienna OS — Live
        </h1>
        <p className="text-slate-400 mb-8">
          Submit agent intents through the real governance pipeline. No signup
          required. Every request flows through policy evaluation, risk tiering,
          warrant issuance, and audit logging.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Intent selector */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Select Intent
            </h3>
            <div className="space-y-2 mb-6">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelected(action.id)}
                  className={`w-full text-left rounded-xl p-4 transition border ${
                    selected === action.id
                      ? "border-purple-500/30 bg-purple-500/10"
                      : "border-navy-700 bg-navy-800 hover:border-navy-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">
                      {action.label}
                    </span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        color: action.tierColor,
                        background: `${action.tierColor}15`,
                      }}
                    >
                      {action.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={runIntent}
              disabled={loading || cooldown > 0}
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white px-6 py-3 rounded-xl transition font-medium"
            >
              {loading ? (
                "Executing..."
              ) : cooldown > 0 ? (
                `Wait ${cooldown}s...`
              ) : (
                <>
                  <Play className="w-4 h-4" /> Execute Intent
                </>
              )}
            </button>

            <p className="text-xs text-slate-600 mt-3 text-center">
              Hitting live production at vienna-os.fly.dev
            </p>
          </div>

          {/* Right: Response */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Governance Response
              </h3>
              {latency !== null && (
                <span className="text-xs font-mono text-slate-600">
                  {latency}ms
                </span>
              )}
            </div>
            <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 min-h-[320px]">
              {result ? (
                <pre className="font-mono text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-slate-500 text-sm">
                    Select an intent and click Execute to see the governance
                    pipeline in action.
                  </p>
                  <p className="text-slate-600 text-xs mt-2">
                    You&apos;ll see the full response: execution status, warrant
                    ID, attestation, and cost tracking.
                  </p>
                </div>
              )}
            </div>

            {result && 'success' in result && (result as Record<string, unknown>).success === true && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm text-emerald-400 font-medium mb-1">
                  ✅ That just went through the full governance pipeline
                </p>
                <p className="text-xs text-slate-400">
                  Intent → Policy Check → Risk Tier (T0) → Auto-Approve →
                  Warrant → Execute → Verify → Audit Trail
                </p>
                <a
                  href="/signup"
                  className="inline-flex items-center gap-1 text-sm text-purple-400 font-medium mt-3 hover:text-purple-300 transition"
                >
                  Get your own console <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            )}

            {result && 'success' in result && (result as Record<string, unknown>).success === false && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-400 font-medium mb-1">
                  ⚠️ Request was rate-limited or rejected
                </p>
                <p className="text-xs text-slate-400">
                  {(result as Record<string, unknown>).code === 'RATE_LIMIT_EXCEEDED'
                    ? 'The sandbox has rate limits to prevent abuse. Wait a moment and try again, or sign up for your own console with higher limits.'
                    : 'The governance pipeline rejected this request. Check the error details above.'}
                </p>
                <a
                  href="/signup"
                  className="inline-flex items-center gap-1 text-sm text-purple-400 font-medium mt-3 hover:text-purple-300 transition"
                >
                  Get unlimited access <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* API snippet */}
        <div className="mt-12">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Or use the API directly
          </h3>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
            <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
{`curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "${selected}",
    "source": "your-agent",
    "tenant_id": "your-tenant"
  }'`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
