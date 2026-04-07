import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-12 bg-[#09090b]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/try" className="hover:text-white transition-colors">Try</Link></li>
              <li><Link href="/sdk" className="hover:text-white transition-colors">SDK</Link></li>
              <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><a href="https://console.regulator.ai" className="hover:text-white transition-colors">Console</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Compare</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/compare/guardrails-ai" className="hover:text-white transition-colors">vs Guardrails AI</Link></li>
              <li><Link href="/compare/arthur-ai" className="hover:text-white transition-colors">vs Arthur AI</Link></li>
              <li><Link href="/compare/credo-ai" className="hover:text-white transition-colors">vs Credo AI</Link></li>
              <li><Link href="/compare/calypso-ai" className="hover:text-white transition-colors">vs Calypso AI</Link></li>
              <li><Link href="/compare/holistic-ai" className="hover:text-white transition-colors">vs Holistic AI</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              <li><a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <span>© 2026 Vienna OS. BSL 1.1 License.</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="https://github.com/risk-ai/vienna-os" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">GitHub</a>
            <a href="https://twitter.com/Vienna_OS" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
