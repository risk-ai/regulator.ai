import { ArrowRight, CheckCircle } from "lucide-react";

export default function HowItWorks() {
  return (
    <>
{/* HOW IT WORKS */}
<section className="py-24 px-6 relative overflow-hidden">
  {/* Background accent */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent"></div>
  </div>

  <div className="max-w-7xl mx-auto relative z-10">
    <div className="mb-16 max-w-2xl scroll-reveal">
      <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-4">Governance Pipeline</div>
      <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">
        How It Works
      </h2>
      <p className="text-zinc-400">
        Three steps to govern autonomous AI operations with cryptographic integrity.
      </p>
    </div>

    {/* Pipeline with connectors */}
    <div className="grid md:grid-cols-3 gap-0 scroll-reveal">
      {/* Step 1 */}
      <div className="relative p-8 rounded-l-2xl md:rounded-r-none bg-zinc-900 border border-white/5 border-r-0 card-hover group">
        {/* Connector arrow (hidden on mobile) */}
        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
          <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30">
            <ArrowRight className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-mono font-bold text-sm border border-violet-500/30">01</div>
          <div className="h-px flex-1 bg-gradient-to-r from-violet-500/30 to-transparent"></div>
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Define Policy</h3>
        <p className="text-sm text-zinc-500 mb-4">Write rules in plain English or code. Vienna compiles to formal logic.</p>
        <div className="bg-black/60 p-4 rounded-lg font-mono text-xs border border-violet-500/10 group-hover:border-violet-500/30 transition-colors">
          <div className="text-violet-400 mb-1">// Natural language</div>
          <div className="text-zinc-300">&ldquo;Require 2 approvers for</div>
          <div className="text-zinc-300"> production deployments&rdquo;</div>
          <div className="mt-3 text-zinc-600">// → Compiles to policy</div>
          <div className="text-amber-400">tier: T2, quorum: 2</div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="relative p-8 bg-zinc-900/80 border-y border-white/5 card-hover group">
        <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
            <ArrowRight className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold text-sm border border-amber-500/30">02</div>
          <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent"></div>
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Issue Warrant</h3>
        <p className="text-sm text-zinc-500 mb-4">Approved actions receive time-limited cryptographic authorization.</p>
        <div className="bg-black/60 p-4 rounded-lg font-mono text-xs border border-amber-500/10 group-hover:border-amber-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-amber-400">WARRANT ISSUED</span>
          </div>
          <div className="text-zinc-400">id: wrt_7f3a...82b1</div>
          <div className="text-zinc-400">ttl: 300s</div>
          <div className="text-zinc-400">sig: <span className="text-amber-400/60">0x7f3a2b...</span></div>
          <div className="mt-2 text-zinc-600">scope: deploy:production</div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="relative p-8 rounded-r-2xl md:rounded-l-none bg-zinc-900 border border-white/5 border-l-0 card-hover group">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-mono font-bold text-sm border border-green-500/30">03</div>
          <div className="h-px flex-1 bg-gradient-to-r from-green-500/30 to-transparent"></div>
        </div>
        <h3 className="text-xl font-display font-bold mb-2">Verify Execution</h3>
        <p className="text-sm text-zinc-500 mb-4">Agent executes with warrant proof. Vienna verifies and logs to Merkle chain.</p>
        <div className="bg-black/60 p-4 rounded-lg font-mono text-xs border border-green-500/10 group-hover:border-green-500/30 transition-colors">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-3 h-3" />
            <span>EXECUTION VERIFIED</span>
          </div>
          <div className="space-y-1 text-zinc-400">
            <div>✓ 2/2 signers approved</div>
            <div>✓ Within scope bounds</div>
            <div>✓ Merkle chain: block #4,272</div>
          </div>
          <div className="mt-2 text-green-400/60">→ Audit evidence sealed</div>
        </div>
      </div>
    </div>
  </div>
</section>


    </>
  );
}
