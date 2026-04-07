import { AlertTriangle, CheckCircle, Shield } from "lucide-react";

export default function BeforeAfter() {
  return (
    <>
{/* BEFORE/AFTER SCENARIO */}
<section className="py-24 bg-zinc-950/50 border-y border-white/5">
  <div className="max-w-7xl mx-auto px-6">
    <div className="mb-16 max-w-2xl scroll-reveal">
      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
        What Happens Without Governance
      </h2>
      <p className="text-zinc-400">
        The difference between a governed agent and an ungoverned one is the difference between confidence and liability.
      </p>
    </div>

    <div className="grid lg:grid-cols-2 gap-8 scroll-reveal">
      {/* Without */}
      <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <span className="text-sm font-mono text-red-400 uppercase tracking-wider">Without Vienna</span>
        </div>
        <div className="space-y-4 text-sm text-zinc-400">
          <div className="flex gap-3">
            <span className="text-red-500 font-mono text-xs mt-1">03:14 AM</span>
            <p>Billing agent processes $200K refund. No approval required.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-red-500 font-mono text-xs mt-1">03:14 AM</span>
            <p>Funds transferred. No audit trail. No rollback.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-red-500 font-mono text-xs mt-1">09:00 AM</span>
            <p className="text-red-400 font-medium">CFO finds out Monday morning.</p>
          </div>
        </div>
      </div>

      {/* With */}
      <div className="p-8 rounded-2xl bg-green-500/5 border border-green-500/20">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-green-500" />
          <span className="text-sm font-mono text-green-400 uppercase tracking-wider">With Vienna</span>
        </div>
        <div className="space-y-4 text-sm text-zinc-400">
          <div className="flex gap-3">
            <span className="text-green-500 font-mono text-xs mt-1">03:14 AM</span>
            <p>Agent submits refund intent. Vienna classifies as <span className="text-amber-400">T2</span>.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-500 font-mono text-xs mt-1">03:14 AM</span>
            <p>Policy requires CFO approval for transactions {'>'}$50K. Warrant held.</p>
          </div>
          <div className="flex gap-3">
            <span className="text-green-500 font-mono text-xs mt-1">09:15 AM</span>
            <p className="text-green-400 font-medium">CFO reviews, approves. Warrant issued. Refund processed with full audit chain.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* QUICKSTART */}
<section className="py-24 px-6">
  <div className="max-w-7xl mx-auto">
    <div className="mb-16 max-w-2xl scroll-reveal">
      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
        Running in 5 Minutes
      </h2>
      <p className="text-zinc-400">
        Three commands. No infrastructure. See governance in action immediately.
      </p>
    </div>

    <div className="grid lg:grid-cols-2 gap-12 items-start">
      <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Terminal</span>
        </div>
        <div className="bg-black/40 p-6 rounded-lg font-mono text-sm text-zinc-300 space-y-2">
          <div><span className="text-zinc-500">$</span> git clone https://github.com/risk-ai/regulator.ai</div>
          <div><span className="text-zinc-500">$</span> cd regulator.ai/examples/quickstart</div>
          <div><span className="text-zinc-500">$</span> VIENNA_API_KEY=vos_pk_live_7f3a2b1c node index.js</div>
          <div className="pt-4 border-t border-white/5 text-green-400 text-xs">
            <div>✓ Policy evaluated: T1 (auto-approved)</div>
            <div>✓ Warrant issued: wrt_7f3a...82b1</div>
            <div>✓ Execution verified, audit logged</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-violet-400 font-bold font-mono">1</span>
          </div>
          <div>
            <h3 className="font-bold mb-1">Sign up for free</h3>
            <p className="text-sm text-zinc-500">Get an API key at console.regulator.ai. No credit card required.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-violet-400 font-bold font-mono">2</span>
          </div>
          <div>
            <h3 className="font-bold mb-1">Define your first policy</h3>
            <p className="text-sm text-zinc-500">Write it in plain English or use the visual builder. Vienna handles the rest.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-violet-400 font-bold font-mono">3</span>
          </div>
          <div>
            <h3 className="font-bold mb-1">Submit your first intent</h3>
            <p className="text-sm text-zinc-500">Watch it flow through the governance pipeline in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

    </>
  );
}
