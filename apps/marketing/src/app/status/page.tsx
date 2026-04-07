"use client";

import { useState, useEffect } from "react";
import { Shield, ArrowLeft, RefreshCw } from "lucide-react";

interface HealthData {
  success: boolean;
  status?: string;
  data?: {
    runtime: { status: string; uptime_seconds: number };
    providers?: Record<string, unknown>;
  };
  uptime_seconds?: number;
  error?: string;
}

interface ServiceStatus {
  name: string;
  endpoint: string;
  url: string;
  operational: boolean;
  latencyMs: number | null;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    try {
      // Use same-origin API route to avoid CORS issues
      const res = await fetch("/api/status");
      const data = await res.json();

      setServices(
        (data.services || []).map((s: any) => ({
          name: s.name,
          endpoint: s.endpoint,
          url: s.url,
          operational: s.operational,
          latencyMs: s.latencyMs,
        }))
      );

      if (data.healthDetails) {
        setHealth(data.healthDetails);
      } else {
        setHealth({
          success: data.status === "operational",
          error: data.status !== "operational" ? "Some services degraded" : undefined,
        });
      }
    } catch {
      setHealth({ success: false, error: "Unable to check service status" });
      setServices([]);
    }

    setLastCheck(new Date());
    setLoading(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const allServicesUp = services.length > 0 && services.every(s => s.operational);
  const someServicesDown = services.length > 0 && services.some(s => !s.operational);
  const isHealthy = allServicesUp || (health?.success === true) || (health as any)?.status === "healthy";
  const uptime = health?.data?.runtime?.uptime_seconds || (health as any)?.uptime_seconds;

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
            <Shield className="w-7 h-7 text-gold-400" />
            <span className="font-bold text-white">Vienna<span className="bg-gradient-to-r from-gold-400 to-cyan-400 bg-clip-text text-transparent">OS</span></span>
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
          {services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-lg px-4 py-3">
              <div>
                <span className="text-sm text-white font-medium">{svc.name}</span>
                <span className="text-xs text-slate-600 ml-3 font-mono">{svc.endpoint}</span>
              </div>
              <div className="flex items-center gap-2">
                {svc.latencyMs !== null && (
                  <span className="text-xs text-slate-600 font-mono">{svc.latencyMs}ms</span>
                )}
                <div className={`w-2 h-2 rounded-full ${svc.operational ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className={`text-xs font-medium ${svc.operational ? "text-emerald-400" : "text-red-400"}`}>
                  {svc.operational ? "Operational" : "Down"}
                </span>
              </div>
            </div>
          ))}
          {services.length === 0 && !loading && (
            <div className="text-center text-sm text-slate-500 py-4">No service data yet. Refreshing...</div>
          )}
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
