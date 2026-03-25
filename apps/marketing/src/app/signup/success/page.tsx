import { Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome to Vienna OS
        </h1>
        <p className="text-slate-400 mb-8">
          Your subscription is active. We&apos;re provisioning your dedicated
          environment. You&apos;ll receive setup instructions at your email
          within the hour.
        </p>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-white font-semibold mb-3">
            While we set things up, explore the sandbox:
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 w-24">URL:</span>
              <a
                href="https://vienna-os.fly.dev"
                className="text-gold-400 hover:text-gold-300 transition"
              >
                vienna-os.fly.dev
              </a>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 w-24">Username:</span>
              <span className="text-white">vienna</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 w-24">Password:</span>
              <span className="text-white">vienna2024</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <a
            href="https://vienna-os.fly.dev"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white px-8 py-3 rounded-xl transition font-medium"
          >
            Open Console
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/docs"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Read the docs →
          </a>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-gold-400" />
          <span className="text-xs text-slate-600">
            Vienna OS — Governed AI Execution Layer
          </span>
        </div>
      </div>
    </div>
  );
}
