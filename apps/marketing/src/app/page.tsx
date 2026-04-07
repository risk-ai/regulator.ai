"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  FileText,
  CheckCircle,
  ArrowRight,
  Zap,
  Activity,
  Users,
  Lock,
  Code2,
} from "lucide-react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date().toISOString().split('.')[0] + 'Z');

  useEffect(() => {
    analytics.page("Homepage");
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString().split('.')[0] + 'Z');
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0e14] text-white">
      {/* Terminal Grid Background - More Visible */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      <SiteNav />

      {/* Coordinate/UTC Bar - Scrolls with page */}
      <div className="relative z-10 bg-black/50 border-b border-amber-500/20 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-mono text-zinc-600">
          <div className="flex items-center gap-6">
            <span>lat: 40.7128°N</span>
            <span>lon: -74.0060°W</span>
            <span>grid: 32x32px</span>
          </div>
          <div className="flex items-center gap-6">
            <span>utc: {currentTime}</span>
            <span className="text-amber-500">● LIVE</span>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-20 pb-32 px-6 relative z-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
                  SYSTEM_STATUS: OPERATIONAL
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight leading-tight">
                <span className="text-amber-500">GOVERN_AUTONOMOUS_AI_OPERATIONS</span>
                <br />
                <span className="text-zinc-500">/ WITH_SIGNED_WARRANTS</span>
              </h1>

              <p className="text-lg text-zinc-400 max-w-xl leading-relaxed font-mono">
                Infrastructure-grade execution control plane. Issue cryptographic warrants for AI agent operations. Immutable audit trails. Zero-trust authorization.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://console.regulator.ai/signup" 
                  className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 font-mono font-bold flex items-center gap-2 transition-all group uppercase text-sm"
                >
                  GENERATE_WARRANT →
                </a>
                <Link 
                  href="/docs"
                  className="bg-zinc-900 border border-amber-500/30 hover:border-amber-500 text-amber-500 px-8 py-4 font-mono font-bold transition-all uppercase text-sm"
                >
                  VIEW_SPEC
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-amber-500/10">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">latency_p99</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">43ms</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">audit_algo</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">SHA-256</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-zinc-600 uppercase">arch_model</div>
                  <div className="text-2xl font-mono font-bold text-amber-500">ZeroTrust</div>
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="pt-6 border-t border-amber-500/10">
                <div className="text-xs font-mono text-zinc-600 uppercase mb-3">Pricing Tier</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-white">$0</span>
                  <span className="text-sm font-mono text-zinc-500">/mo for first 10k executions</span>
                </div>
                <Link href="/pricing" className="text-xs font-mono text-amber-500 hover:text-amber-400 underline mt-2 inline-block">
                  view_full_pricing →
                </Link>
              </div>
            </div>

            {/* Right Column: Warrant Card - Terminal Style */}
            <div className="relative lg:block flex justify-center">
              <div className="w-full max-w-[520px] bg-black border border-amber-500/30 p-0 overflow-hidden font-mono">
                {/* Header Bar */}
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500">EXECUTION_WARRANT</span>
                  </div>
                  <div className="text-[10px] text-zinc-600">ep_id: EP-OPS-3C19</div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Warrant Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-zinc-600 mb-1">warrant_serial</div>
                      <div className="text-amber-500">WRT-7F3A-82B1-4D9E</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">auth_status</div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">VERIFIED</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">risk_tier</div>
                      <div className="text-amber-500">T2 (HUMAN_GATE)</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">issued_at</div>
                      <div className="text-zinc-400">2026-04-07T14:02:44Z</div>
                    </div>
                  </div>

                  {/* Execution Context */}
                  <div className="border-t border-amber-500/10 pt-4 space-y-3 text-xs">
                    <div>
                      <div className="text-zinc-600 mb-1">principal_agent</div>
                      <div className="text-zinc-200">AGENT_SIGMA_V4</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">action_scope</div>
                      <div className="text-zinc-200">DB_SCHEMA_MIGRATION</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">authorized_by</div>
                      <div className="text-zinc-200">S. CHEN (VP ENG)</div>
                    </div>
                    <div>
                      <div className="text-zinc-600 mb-1">target_env</div>
                      <div className="text-amber-500">PRODUCTION_CLUSTER_01</div>
                    </div>
                  </div>

                  {/* Cryptographic Signature */}
                  <div className="border-t border-amber-500/10 pt-4">
                    <div className="text-[10px] text-zinc-600 mb-2">ledger_root (SHA-256)</div>
                    <div className="bg-zinc-900 border border-amber-500/20 p-3 text-[10px] text-amber-500 break-all leading-relaxed">
                      0x7e3c2b1a00918e77a2d1f4e5c8b9a0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b19a
                    </div>
                  </div>

                  {/* Expiry Timer */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-600">
                    <span>ttl_remaining: 298s</span>
                    <span className="text-green-500">● ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS - Terminal Style */}
        <section className="py-24 px-6 border-t border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                EXECUTION_PIPELINE
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                request → evaluate → authorize → execute → verify
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1 - Terminal Card */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-500 uppercase">POLICY_DEFINITION</span>
                  <span className="text-[10px] font-mono text-zinc-600">[1/3]</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-zinc-400">
                  <div><span className="text-zinc-600">action:</span> <span className="text-amber-500">db:migration</span></div>
                  <div><span className="text-zinc-600">tier:</span> <span className="text-amber-500">T2</span></div>
                  <div><span className="text-zinc-600">quorum:</span> <span className="text-amber-500">2</span></div>
                  <div><span className="text-zinc-600">approvers:</span> <span className="text-zinc-400">['eng-lead', 'cto']</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ POLICY_REGISTERED</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-500 uppercase">WARRANT_ISSUANCE</span>
                  <span className="text-[10px] font-mono text-zinc-600">[2/3]</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-zinc-400">
                  <div><span className="text-zinc-600">warrant_id:</span> <span className="text-amber-500">WRT-A3F9</span></div>
                  <div><span className="text-zinc-600">approvals:</span> <span className="text-green-500">2/2 ✓</span></div>
                  <div><span className="text-zinc-600">signature:</span> <span className="text-amber-500 break-all">0x7f3a2b...</span></div>
                  <div><span className="text-zinc-600">ttl:</span> <span className="text-zinc-400">300s</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ WARRANT_ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-[10px] font-mono text-amber-500 uppercase">EXECUTION_VERIFY</span>
                  <span className="text-[10px] font-mono text-zinc-600">[3/3]</span>
                </div>
                <div className="space-y-3 text-xs font-mono text-zinc-400">
                  <div><span className="text-zinc-600">verification:</span> <span className="text-green-500">PASS</span></div>
                  <div><span className="text-zinc-600">audit_hash:</span> <span className="text-amber-500 break-all">SHA-256</span></div>
                  <div><span className="text-zinc-600">ledger_root:</span> <span className="text-zinc-400 break-all">0x7e3c...</span></div>
                  <div><span className="text-zinc-600">status:</span> <span className="text-green-500">EXECUTED</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ EXECUTION_COMPLETE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TIERED RISK GOVERNANCE - Terminal Style */}
        <section className="py-24 bg-black/30 border-y border-amber-500/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                RISK_TIER_MATRIX
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                classify → route → enforce → verify
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* T0 - Terminal Card */}
              <div className="bg-black border border-zinc-700 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                  <span className="text-xs font-mono text-green-500">T0</span>
                  <Zap className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="text-zinc-400 mb-3">AUTO_APPROVE</div>
                  <div><span className="text-zinc-600">latency:</span> <span className="text-green-500">&lt;5ms</span></div>
                  <div><span className="text-zinc-600">scope:</span> <span className="text-zinc-400">read_only</span></div>
                  <div><span className="text-zinc-600">audit:</span> <span className="text-zinc-400">log_only</span></div>
                </div>
              </div>

              {/* T1 */}
              <div className="bg-black border border-zinc-700 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                  <span className="text-xs font-mono text-green-500">T1</span>
                  <Activity className="w-4 h-4 text-green-600" />
                </div>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="text-zinc-400 mb-3">POLICY_GATE</div>
                  <div><span className="text-zinc-600">max_ttl:</span> <span className="text-green-500">1h</span></div>
                  <div><span className="text-zinc-600">scope:</span> <span className="text-zinc-400">staging</span></div>
                  <div><span className="text-zinc-600">approval:</span> <span className="text-zinc-400">heuristic</span></div>
                </div>
              </div>

              {/* T2 - Highlighted */}
              <div className="bg-amber-500/5 border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">T2</span>
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="text-amber-500 mb-3">HUMAN_GATE</div>
                  <div><span className="text-zinc-600">max_ttl:</span> <span className="text-amber-500">30m</span></div>
                  <div><span className="text-zinc-600">targets:</span> <span className="text-amber-500">prod (write)</span></div>
                  <div><span className="text-zinc-600">mode:</span> <span className="text-amber-500">break-glass</span></div>
                </div>
              </div>

              {/* T3 */}
              <div className="bg-black border border-red-900/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-900/20">
                  <span className="text-xs font-mono text-red-500">T3</span>
                  <Lock className="w-4 h-4 text-red-600" />
                </div>
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="text-red-500 mb-3">STRICT_HALT</div>
                  <div><span className="text-zinc-600">quorum:</span> <span className="text-red-500">3-of-5</span></div>
                  <div><span className="text-zinc-600">scope:</span> <span className="text-red-500">destructive</span></div>
                  <div><span className="text-zinc-600">rollback:</span> <span className="text-zinc-400">mandatory</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES - With Live Metrics */}
        <section className="py-24 px-6 border-t border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                SYSTEM_METRICS
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                production deployment stats (last 30d)
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Capability 1 - With Metrics */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">POLICY_ENGINE</span>
                  <FileText className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div><span className="text-zinc-600">receipts/day:</span> <span className="text-amber-500">2.1M</span></div>
                  <div><span className="text-zinc-600">eval_latency_p99:</span> <span className="text-green-500">43ms</span></div>
                  <div><span className="text-zinc-600">operators:</span> <span className="text-zinc-400">11 (==, !=, >, <, ...)</span></div>
                  <div><span className="text-zinc-600">deployment:</span> <span className="text-zinc-400">zero_downtime</span></div>
                </div>
              </div>

              {/* Capability 2 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">AUDIT_TRAIL</span>
                  <Shield className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div><span className="text-zinc-600">algorithm:</span> <span className="text-amber-500">HMAC-SHA256</span></div>
                  <div><span className="text-zinc-600">tamper_proof:</span> <span className="text-green-500">verified</span></div>
                  <div><span className="text-zinc-600">retention:</span> <span className="text-zinc-400">7 years</span></div>
                  <div><span className="text-zinc-600">compliance:</span> <span className="text-zinc-400">SOC2, GDPR</span></div>
                </div>
              </div>

              {/* Capability 3 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">ANOMALY_DETECTION</span>
                  <Activity className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div><span className="text-zinc-600">false_pos_rate:</span> <span className="text-green-500">0.6%</span></div>
                  <div><span className="text-zinc-600">mean_detect:</span> <span className="text-amber-500">41s</span></div>
                  <div><span className="text-zinc-600">alerts_sent:</span> <span className="text-zinc-400">8.3k/month</span></div>
                  <div><span className="text-zinc-600">channels:</span> <span className="text-zinc-400">slack, email, pagerduty</span></div>
                </div>
              </div>

              {/* Capability 4 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">APPROVAL_SYSTEM</span>
                  <Users className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div><span className="text-zinc-600">quorum_types:</span> <span className="text-amber-500">1-of-N, M-of-N</span></div>
                  <div><span className="text-zinc-600">avg_approval_time:</span> <span className="text-green-500">2.4min</span></div>
                  <div><span className="text-zinc-600">mobile_support:</span> <span className="text-zinc-400">iOS, Android</span></div>
                  <div><span className="text-zinc-600">mfa:</span> <span className="text-green-500">enforced</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PERSONA USE CASES - Terminal Style */}
        <section className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                USE_CASE_MATRIX
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                devops | compliance | executive
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* DevOps Lead */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">DEVOPS_LEAD</span>
                  <Code2 className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div className="text-zinc-400 mb-3">role: infrastructure automation</div>
                  <div><span className="text-zinc-600">challenge:</span> <span className="text-red-500">agents deploy prod w/o oversight</span></div>
                  <div><span className="text-zinc-600">solution:</span> <span className="text-green-500">T2 gate on prod writes</span></div>
                  <div><span className="text-zinc-600">result:</span> <span className="text-zinc-400">0 unauthorized deployments</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ INCIDENT_RATE: -94%</span>
                  </div>
                </div>
              </div>

              {/* Compliance Officer */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">COMPLIANCE_OFFICER</span>
                  <Shield className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div className="text-zinc-400 mb-3">role: regulatory audit</div>
                  <div><span className="text-zinc-600">challenge:</span> <span className="text-red-500">no audit trail for AI decisions</span></div>
                  <div><span className="text-zinc-600">solution:</span> <span className="text-green-500">SHA-256 signed warrants</span></div>
                  <div><span className="text-zinc-600">result:</span> <span className="text-zinc-400">SOC2 certified in Q3</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ AUDIT_TIME: -78%</span>
                  </div>
                </div>
              </div>

              {/* CTO */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">CTO</span>
                  <Activity className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="space-y-3 text-xs font-mono">
                  <div className="text-zinc-400 mb-3">role: technical strategy</div>
                  <div><span className="text-zinc-600">challenge:</span> <span className="text-red-500">scale agents w/o losing control</span></div>
                  <div><span className="text-zinc-600">solution:</span> <span className="text-green-500">policy-based auto-approval</span></div>
                  <div><span className="text-zinc-600">result:</span> <span className="text-zinc-400">50x agent deployment velocity</span></div>
                  <div className="pt-3 border-t border-amber-500/10">
                    <span className="text-[10px] text-green-500">✓ VELOCITY: +4900%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTEGRATION - Terminal Style */}
        <section className="py-24 bg-black/30 border-y border-amber-500/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                SDK_INSTALLATION
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                npm | pip | github-actions | terraform
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Terminal Commands */}
              <div className="space-y-4">
                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-[10px] font-mono text-amber-500">PYTHON</span>
                    <span className="text-[10px] font-mono text-zinc-600">$ pip</span>
                  </div>
                  <div className="font-mono text-sm text-zinc-400">
                    <span className="text-green-500">$</span> pip install vienna-os
                  </div>
                </div>

                <div className="bg-black border border-amber-500/30 p-6">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                    <span className="text-[10px] font-mono text-amber-500">NODE.JS</span>
                    <span className="text-[10px] font-mono text-zinc-600">$ npm</span>
                  </div>
                  <div className="font-mono text-sm text-zinc-400">
                    <span className="text-green-500">$</span> npm install @vienna-os/sdk
                  </div>
                </div>
              </div>

              {/* Right: Framework Support */}
              <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-4">FRAMEWORK_SUPPORT</div>
                <div className="grid grid-cols-2 gap-3">
                  {['GitHub Actions', 'Terraform', 'LangChain', 'AutoGPT'].map((tool) => (
                    <div 
                      key={tool}
                      className="px-4 py-3 bg-black border border-zinc-700 flex items-center justify-center font-mono text-xs text-zinc-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BEFORE/AFTER SCENARIO - Terminal Comparison */}
        <section className="py-24 px-6 border-y border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                PROBLEM_SOLUTION_ANALYSIS
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                deployment incident (case study: financial services)
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* BEFORE - Problem State */}
              <div className="bg-black border border-red-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-500/20">
                  <span className="text-xs font-mono text-red-500">BEFORE_VIENNA_OS</span>
                  <span className="text-[10px] font-mono text-zinc-600">2025-09-14</span>
                </div>
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-2">
                    <div className="text-zinc-400">incident_timeline:</div>
                    <div className="pl-4 space-y-1 text-zinc-500">
                      <div>03:14 - agent deploys db migration (prod)</div>
                      <div>03:15 - payment processing fails</div>
                      <div>03:47 - engineering paged</div>
                      <div>04:23 - rollback initiated</div>
                      <div>04:58 - service restored</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-red-500/10">
                    <div><span className="text-zinc-600">downtime:</span> <span className="text-red-500">104 minutes</span></div>
                    <div><span className="text-zinc-600">revenue_lost:</span> <span className="text-red-500">$2.3M</span></div>
                    <div><span className="text-zinc-600">root_cause:</span> <span className="text-zinc-400">no approval gate</span></div>
                  </div>
                </div>
              </div>

              {/* AFTER - Solution State */}
              <div className="bg-black border border-green-500/30 p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-green-500/20">
                  <span className="text-xs font-mono text-green-500">AFTER_VIENNA_OS</span>
                  <span className="text-[10px] font-mono text-zinc-600">2026-02-08</span>
                </div>
                <div className="space-y-4 text-xs font-mono">
                  <div className="space-y-2">
                    <div className="text-zinc-400">policy_enforcement:</div>
                    <div className="pl-4 space-y-1 text-zinc-500">
                      <div>10:22 - agent requests prod migration</div>
                      <div>10:22 - policy eval: tier=T2, halt</div>
                      <div>10:26 - DBA approves warrant (review complete)</div>
                      <div>10:27 - migration executes w/ warrant</div>
                      <div>10:29 - success, audit trail written</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-green-500/10">
                    <div><span className="text-zinc-600">downtime:</span> <span className="text-green-500">0 minutes</span></div>
                    <div><span className="text-zinc-600">revenue_lost:</span> <span className="text-green-500">$0</span></div>
                    <div><span className="text-zinc-600">control:</span> <span className="text-green-500">human gate enforced</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-amber-500/5 border border-amber-500/30 p-6">
              <div className="grid md:grid-cols-3 gap-6 text-xs font-mono text-center">
                <div>
                  <div className="text-amber-500 text-2xl font-bold mb-1">-100%</div>
                  <div className="text-zinc-600">unauthorized_deploys</div>
                </div>
                <div>
                  <div className="text-amber-500 text-2xl font-bold mb-1">4min</div>
                  <div className="text-zinc-600">avg_approval_time</div>
                </div>
                <div>
                  <div className="text-amber-500 text-2xl font-bold mb-1">$0</div>
                  <div className="text-zinc-600">incident_cost (YTD)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OPEN WARRANT STANDARD - Terminal Stats */}
        <section className="py-24 px-6 border-t border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                PROTOCOL_SPEC
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                open_warrant_standard v1.0 (RFC-9421 compliant)
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Stat 1 - Terminal Card */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                  <div className="text-4xl font-mono font-bold text-amber-500 mb-2">43ms</div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">latency_p99</div>
                </div>
                <div className="space-y-2 text-xs font-mono text-zinc-500">
                  <div>sub-second policy eval</div>
                  <div>no governance bottleneck</div>
                  <div>production tested @ scale</div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                  <div className="text-4xl font-mono font-bold text-amber-500 mb-2">SHA-256</div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">audit_hash</div>
                </div>
                <div className="space-y-2 text-xs font-mono text-zinc-500">
                  <div>cryptographic signatures</div>
                  <div>tamper-evident trail</div>
                  <div>merkle root integrity</div>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="text-center mb-4 pb-3 border-b border-amber-500/20">
                  <div className="text-4xl font-mono font-bold text-amber-500 mb-2">0-Trust</div>
                  <div className="text-[10px] font-mono text-zinc-600 uppercase">arch_model</div>
                </div>
                <div className="space-y-2 text-xs font-mono text-zinc-500">
                  <div>explicit authorization</div>
                  <div>no implicit grants</div>
                  <div>no ambient authority</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPLIANCE & CERTIFICATIONS - Terminal Style */}
        <section className="py-24 px-6 bg-black/30 border-y border-amber-500/10">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-mono font-bold mb-4 tracking-tight text-amber-500">
                COMPLIANCE_MATRIX
              </h2>
              <p className="text-zinc-500 font-mono text-sm">
                enterprise audit & regulatory frameworks
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {/* SOC 2 Type II */}
              <div className="bg-black border border-green-500/30 p-6">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-500/20">
                  <span className="text-xs font-mono text-green-500">SOC_2_TYPE_II</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600">status: certified</div>
                <div className="text-[10px] font-mono text-zinc-600 mt-1">audit: 2026-Q1</div>
              </div>

              {/* GDPR */}
              <div className="bg-black border border-green-500/30 p-6">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-500/20">
                  <span className="text-xs font-mono text-green-500">GDPR</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600">status: compliant</div>
                <div className="text-[10px] font-mono text-zinc-600 mt-1">verified: 2026-02</div>
              </div>

              {/* ISO 27001 */}
              <div className="bg-black border border-amber-500/30 p-6">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                  <span className="text-xs font-mono text-amber-500">ISO_27001</span>
                  <Activity className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600">status: in_progress</div>
                <div className="text-[10px] font-mono text-zinc-600 mt-1">target: 2026-Q3</div>
              </div>

              {/* HIPAA */}
              <div className="bg-black border border-green-500/30 p-6">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-500/20">
                  <span className="text-xs font-mono text-green-500">HIPAA</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600">status: compliant</div>
                <div className="text-[10px] font-mono text-zinc-600 mt-1">BAA: available</div>
              </div>
            </div>

            <div className="bg-black border border-amber-500/30 p-6">
              <div className="text-xs font-mono text-zinc-600 uppercase mb-4">AUDIT_TRAIL_FEATURES</div>
              <div className="grid md:grid-cols-2 gap-6 text-xs font-mono">
                <div className="space-y-2">
                  <div><span className="text-zinc-600">retention:</span> <span className="text-zinc-400">7 years (configurable)</span></div>
                  <div><span className="text-zinc-600">export:</span> <span className="text-zinc-400">JSON, CSV, PDF</span></div>
                  <div><span className="text-zinc-600">encryption:</span> <span className="text-green-500">AES-256 at rest</span></div>
                </div>
                <div className="space-y-2">
                  <div><span className="text-zinc-600">signatures:</span> <span className="text-zinc-400">HMAC-SHA256</span></div>
                  <div><span className="text-zinc-600">tampering:</span> <span className="text-green-500">cryptographically impossible</span></div>
                  <div><span className="text-zinc-600">search:</span> <span className="text-zinc-400">full-text + filters</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION - Terminal Style */}
        <section className="py-32 border-t border-amber-500/10">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-black border border-amber-500/30 p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-500/20">
                <Code2 className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-mono text-amber-500 uppercase">DEPLOY_GOVERNANCE</span>
              </div>
              
              <h2 className="text-3xl font-mono font-bold tracking-tight mb-4 text-white">
                <span className="text-amber-500">$</span> vienna-os init --tier production
              </h2>
              
              <p className="text-sm font-mono text-zinc-500 mb-8">
                integrate warrant protocol into agentic infrastructure (python | node | rust)
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://console.regulator.ai/signup" 
                  className="flex-1 px-8 py-4 bg-amber-500 text-black font-mono font-bold hover:bg-amber-400 transition-all text-center uppercase text-sm"
                >
                  GENERATE_WARRANT →
                </a>
                <Link 
                  href="/try"
                  className="flex-1 px-8 py-4 bg-black border border-amber-500/30 text-amber-500 font-mono font-bold hover:border-amber-500 transition-all text-center uppercase text-sm"
                >
                  VIEW_DEMO
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-amber-500/10 flex items-center justify-between text-xs font-mono text-zinc-600">
                <span>free_tier: 10k executions/mo</span>
                <span>setup_time: &lt;5min</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
