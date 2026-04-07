import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center px-6">
        <Shield className="w-12 h-12 text-gold-400/30 mx-auto mb-6" />
        <h1 className="text-6xl font-bold text-white mb-2 font-mono">404</h1>
        <p className="text-slate-400 mb-8">
          This page doesn&apos;t exist. The warrant was never issued.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="/"
            className="bg-gold-400 hover:bg-gold-300 text-white px-6 py-2.5 rounded-xl transition font-medium text-sm"
          >
            Back to Home
          </a>
          <a
            href="/docs"
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Read the Docs →
          </a>
        </div>
      </div>
    </div>
  );
}
