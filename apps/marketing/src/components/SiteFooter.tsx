import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-amber-500/10 py-12 bg-black font-mono">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li><Link href="/docs" className="hover:text-amber-500 transition-colors">Documentation</Link></li>
              <li><Link href="/pricing" className="hover:text-amber-500 transition-colors">Pricing</Link></li>
              <li><Link href="/try" className="hover:text-amber-500 transition-colors">Try</Link></li>
              <li><Link href="/sdk" className="hover:text-amber-500 transition-colors">SDK</Link></li>
              <li><Link href="/integrations" className="hover:text-amber-500 transition-colors">Integrations</Link></li>
              <li><a href="https://console.regulator.ai" className="hover:text-amber-500 transition-colors">Console</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li><Link href="/about" className="hover:text-amber-500 transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-amber-500 transition-colors">Blog</Link></li>
              <li><Link href="/enterprise" className="hover:text-amber-500 transition-colors">Enterprise</Link></li>
              <li><Link href="/contact" className="hover:text-amber-500 transition-colors">Contact</Link></li>
              <li><Link href="/changelog" className="hover:text-amber-500 transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider mb-4">Compare</h3>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li><Link href="/compare/guardrails-ai" className="hover:text-amber-500 transition-colors">vs Guardrails AI</Link></li>
              <li><Link href="/compare/arthur-ai" className="hover:text-amber-500 transition-colors">vs Arthur AI</Link></li>
              <li><Link href="/compare/credo-ai" className="hover:text-amber-500 transition-colors">vs Credo AI</Link></li>
              <li><Link href="/compare/calypso-ai" className="hover:text-amber-500 transition-colors">vs Calypso AI</Link></li>
              <li><Link href="/compare/holistic-ai" className="hover:text-amber-500 transition-colors">vs Holistic AI</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li><Link href="/privacy" className="hover:text-amber-500 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-amber-500 transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-amber-500 transition-colors">Security</Link></li>
              <li><a href="https://github.com/risk-ai/regulatorai" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-amber-500/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>© 2026 Vienna OS — BSL 1.1 License</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="https://github.com/risk-ai/regulatorai" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-amber-500 transition-colors">GitHub</a>
            <a href="https://twitter.com/Vienna_OS" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-amber-500 transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
