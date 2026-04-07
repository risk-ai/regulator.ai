import { Activity, Lock, Users, Zap } from "lucide-react";

export default function TieredRisk() {
  return (
    <>
{/* TIERED RISK GOVERNANCE */}
<section className="py-24 bg-zinc-950/50 border-y border-white/5">
  <div className="max-w-7xl mx-auto px-6">
    <div className="mb-16 max-w-2xl scroll-reveal">
      <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-4">Risk Classification</div>
      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
        Tiered Risk Governance
      </h2>
      <p className="text-zinc-400">
        A unified framework for human-in-the-loop and autonomous workflows. Move from manual oversight to policy-based automation.
      </p>
    </div>

    {/* Visual risk escalation */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal">
      {/* T0 */}
      <div className="group relative p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-700"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Zap className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
          </div>
          <span className="px-2 py-1 text-[10px] font-mono bg-zinc-800 text-zinc-500 rounded">~0ms</span>
        </div>
        <div className="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-wider">Tier Zero</div>
        <h3 className="text-xl font-bold mb-3">Auto-Pass</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Non-destructive read operations and low-latency API polling. Zero friction.
        </p>
        <div className="text-xs font-mono text-zinc-600 bg-black/30 p-2 rounded">
          <span className="text-zinc-500">example:</span> list_users, get_status
        </div>
      </div>

      {/* T1 */}
      <div className="group relative p-8 rounded-2xl bg-zinc-900 border border-green-900/30 hover:border-green-700/50 transition-all overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/50 to-green-500/20"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <span className="px-2 py-1 text-[10px] font-mono bg-green-500/10 text-green-500 rounded">auto</span>
        </div>
        <div className="text-[10px] font-mono text-green-500/60 mb-2 uppercase tracking-wider">Tier One</div>
        <h3 className="text-xl font-bold mb-3">Heuristic Log</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Routine state changes. Automated approval with high-resolution audit trails.
        </p>
        <div className="text-xs font-mono text-zinc-600 bg-black/30 p-2 rounded">
          <span className="text-green-500/60">example:</span> update_config, send_email
        </div>
      </div>

      {/* T2 */}
      <div className="group relative p-8 rounded-2xl bg-zinc-900 border border-amber-700/30 hover:border-amber-500/50 transition-all overflow-hidden ring-1 ring-amber-500/5">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/80 to-amber-500/30"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <span className="px-2 py-1 text-[10px] font-mono bg-amber-500/10 text-amber-500 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            human
          </span>
        </div>
        <div className="text-[10px] font-mono text-amber-500 mb-2 uppercase tracking-wider">Tier Two</div>
        <h3 className="text-xl font-bold mb-3">Human Gate</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Critical infrastructure or financial access. Requires signed human quorum.
        </p>
        <div className="text-xs font-mono text-zinc-600 bg-black/30 p-2 rounded">
          <span className="text-amber-500/60">example:</span> deploy_prod, wire_transfer
        </div>
      </div>

      {/* T3 */}
      <div className="group relative p-8 rounded-2xl bg-zinc-900 border border-red-900/30 hover:border-red-700/50 transition-all overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/80 to-red-500/40"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <span className="px-2 py-1 text-[10px] font-mono bg-red-500/10 text-red-400 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            multi-sig
          </span>
        </div>
        <div className="text-[10px] font-mono text-red-400/60 mb-2 uppercase tracking-wider">Tier Three</div>
        <h3 className="text-xl font-bold mb-3">Strict Halt</h3>
        <p className="text-sm text-zinc-500 leading-relaxed mb-4">
          Irreversible destructive actions. Multi-sig root approval mandatory.
        </p>
        <div className="text-xs font-mono text-zinc-600 bg-black/30 p-2 rounded">
          <span className="text-red-400/60">example:</span> drop_database, delete_account
        </div>
      </div>
    </div>
  </div>
</section>


    </>
  );
}
