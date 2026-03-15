import Link from 'next/link'

// Type matching Vienna Runtime API
type Investigation = {
  id: string
  name: string
  description?: string
  status: 'open' | 'investigating' | 'resolved' | 'archived'
  created_by: string
  created_at: string
  resolved_at?: string
  artifact_count?: number
  trace_count?: number
}

// Server component - fetch directly from Vienna Runtime
async function getInvestigations(): Promise<Investigation[]> {
  const baseUrl = process.env.VIENNA_RUNTIME_BASE_URL || 'http://localhost:4001'
  
  try {
    const res = await fetch(`${baseUrl}/api/investigations`, {
      cache: 'no-store' // Always fetch fresh data
    })
    
    if (!res.ok) {
      console.error('Failed to fetch investigations:', res.status)
      return []
    }
    
    const data = await res.json()
    return data.investigations || []
  } catch (error) {
    console.error('Error fetching investigations:', error)
    return []
  }
}

function StatusBadge({ status }: { status: Investigation['status'] }) {
  const colors = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    investigating: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colors[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function InvestigationsPage() {
  const investigations = await getInvestigations()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Investigations</h1>
          <p className="text-slate-400">
            Systematic incident investigation with artifacts and traces
          </p>
        </div>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition font-medium">
          + New Investigation
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <button className="px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium">
          All
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Open
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Investigating
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Resolved
        </button>
      </div>

      {/* Investigation List */}
      {investigations.length === 0 ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <p className="text-slate-400">No investigations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {investigations.map((investigation) => (
            <Link
              key={investigation.id}
              href={`/workspace/investigations/${investigation.id}`}
              className="block bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-purple-500/30 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-400 transition">
                    {investigation.name}
                  </h3>
                  {investigation.description && (
                    <p className="text-slate-400 text-sm">
                      {investigation.description}
                    </p>
                  )}
                </div>
                <StatusBadge status={investigation.status} />
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div>
                  {investigation.artifact_count || 0} artifacts
                </div>
                <div>
                  {investigation.trace_count || 0} traces
                </div>
                <div>
                  Created {new Date(investigation.created_at).toLocaleDateString()}
                </div>
                <div>
                  by {investigation.created_by}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
