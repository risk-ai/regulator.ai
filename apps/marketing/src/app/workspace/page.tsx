import Link from 'next/link'
import { FileSearch, AlertCircle, FolderOpen } from 'lucide-react'

export default function WorkspacePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Workspace</h1>
      <p className="text-slate-400 mb-8">
        Operator surface for investigations, incidents, and governance oversight
      </p>

      {/* Quick Access Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/workspace/investigations"
          className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:scale-[1.02] transition group"
        >
          <FileSearch className="w-8 h-8 text-blue-400 mb-4" />
          <h2 className="text-white font-semibold mb-2">Investigations</h2>
          <p className="text-sm text-slate-400">
            Systematic incident investigation with artifacts and traces
          </p>
          <div className="mt-4 text-sm text-blue-400 group-hover:text-blue-300">
            View all →
          </div>
        </Link>

        <Link
          href="/workspace/incidents"
          className="bg-navy-800 border border-navy-700 rounded-xl p-6 hover:scale-[1.02] transition group"
        >
          <AlertCircle className="w-8 h-8 text-amber-400 mb-4" />
          <h2 className="text-white font-semibold mb-2">Incidents</h2>
          <p className="text-sm text-slate-400">
            Active and resolved incidents with remediation history
          </p>
          <div className="mt-4 text-sm text-amber-400 group-hover:text-amber-300">
            View all →
          </div>
        </Link>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 opacity-50">
          <FolderOpen className="w-8 h-8 text-slate-500 mb-4" />
          <h2 className="text-white font-semibold mb-2">Artifacts</h2>
          <p className="text-sm text-slate-400">
            Traces, execution graphs, and investigation evidence
          </p>
          <div className="mt-4 text-sm text-slate-500">Coming soon</div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl font-bold text-white mb-1">2</div>
              <div className="text-sm text-slate-400">Active Investigations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">1</div>
              <div className="text-sm text-slate-400">Open Incidents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">0</div>
              <div className="text-sm text-slate-400">Pending Approvals</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                Operational
              </div>
              <div className="text-sm text-slate-400">Vienna Runtime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
