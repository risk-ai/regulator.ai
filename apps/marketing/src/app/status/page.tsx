"use client";

import { useState, useEffect } from "react";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";

interface HealthData {
  success: boolean;
  data?: {
    runtime: { status: string; uptime_seconds: number };
    providers?: Record<string, unknown>;
  };
  error?: string;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://vienna-os.fly.dev/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ success: false, error: "Unable to reach Vienna OS" });
    }
    setLastCheck(new Date());
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.success && health?.data?.runtime?.status === "healthy";
  const uptime = health?.data?.runtime?.uptime_seconds;

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <nav className="border-b border-navy-700">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <Shield className="w-6 h-6 text-gold-400" />
            <span className="font-bold text-white">Vienna<span className="text-gold-400">OS</span></span>
          </a>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Overall status */}
        <div className={`rounded-2xl p-8 mb-8 text-center ${
          isHealthy
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : health === null
            ? "bg-navy-800 border border-navy-700"
            : "bg-red-500/10 border border-red-500/20"
        }`}>
          <div className={`w-4 h-4 rounded-full mx-auto mb-4 ${
            isHealthy ? "bg-emerald-400 shadow-lg shadow-emerald-400/50" : health === null ? "bg-slate-600" : "bg-red-400 shadow-lg shadow-red-400/50"
          }`} />
          <h1 className="text-3xl font-bold text-white mb-1">
            {loading && !health ? "Checking..." : isHealthy ? "All Systems Operational" : "Service Disruption"}
          </h1>
          {lastCheck && (
            <p className="text-xs text-slate-500 mt-2">
              Last checked: {lastCheck.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* Services */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Services</h2>
        <div className="space-y-2 mb-8">
          {[
            { name: "Vienna OS Console", endpoint: "console.regulator.ai", check: isHealthy },
            { name: "Intent Gateway API", endpoint: "/api/v1/agent/intent", check: isHealthy },
            { name: "Authentication", endpoint: "/api/v1/auth/login", check: isHealthy },
            { name: "Health API", endpoint: "/health", check: isHealthy },
            { name: "Marketing Site", endpoint: "regulator.ai", check: true },
          ].map((svc) => (
            <div key={svc.name} className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm text-white font-medium">{svc.name}</span>
                <span className="text-xs text-slate-600 ml-3 font-mono">{svc.endpoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${svc.check ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className={`text-xs font-medium ${svc.check ? "text-emerald-400" : "text-red-400"}`}>
                  {svc.check ? "Operational" : "Down"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        {uptime && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center mb-8">
            <div className="text-3xl font-bold text-white font-mono mb-1">{formatUptime(uptime)}</div>
            <div className="text-xs text-slate-500">Current uptime</div>
          </div>
        )}

        <p className="text-center text-xs text-slate-600">
          For incidents or outages, contact <a href="mailto:admin@ai.ventures" className="text-gold-400">admin@ai.ventures</a>
        </p>
      </main>
    </div>
  );
}
