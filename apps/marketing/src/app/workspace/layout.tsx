import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <header className="border-b border-navy-700 bg-navy-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold text-white">
              Regulator<span className="text-purple-400">.ai</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Home
            </Link>
            <Link
              href="/workspace"
              className="text-sm text-purple-400 font-medium"
            >
              Workspace
            </Link>
          </nav>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-2">
            <Link
              href="/workspace"
              className="block px-4 py-2 text-sm text-slate-300 hover:bg-navy-800 rounded-lg transition"
            >
              Overview
            </Link>
            <Link
              href="/workspace/investigations"
              className="block px-4 py-2 text-sm text-slate-300 hover:bg-navy-800 rounded-lg transition"
            >
              Investigations
            </Link>
            <Link
              href="/workspace/incidents"
              className="block px-4 py-2 text-sm text-slate-300 hover:bg-navy-800 rounded-lg transition"
            >
              Incidents
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
