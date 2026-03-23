import Link from 'next/link'

type Incident = {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved'
  service_id: string
  detected_at: string
  resolved_at?: string
  resolution_summary?: string
}

type FetchResult = {
  incidents: Incident[]
  error?: string
}

async function getIncidents(): Promise<FetchResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/workspace/incidents`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    })
    
    if (!res.ok) {
      console.error('Failed to fetch incidents:', res.status)
      return { 
        incidents: [], 
        error: `Shell proxy returned ${res.status}. Check runtime service.` 
      }
    }
    
    const data = await res.json()
    return { incidents: data.incidents || [] }
  } catch (error) {
    console.error('Error fetching incidents:', error)
    return { 
      incidents: [], 
      error: 'Vienna Runtime unavailable. The runtime service may be offline or unreachable.' 
    }
  }
}

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  const colors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const icons = {
    low: '○',
    medium: '◐',
    high: '◍',
    critical: '●',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${colors[severity]}`}
    >
      <span>{icons[severity]}</span>
      {severity.toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }: { status: Incident['status'] }) {
  const colors = {
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    investigating: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${colors[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function IncidentsPage() {
  const { incidents, error } = await getIncidents()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Incidents</h1>
          <p className="text-slate-400">
            Active and resolved incidents with remediation history
          </p>
        </div>
      </div>

      {/* Runtime unavailable warning */}
      {error && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-400 text-xl">⚠️</div>
            <div>
              <p className="text-amber-400 font-semibold mb-1">Vienna Runtime Unavailable</p>
              <p className="text-amber-300/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <button className="px-3 py-1.5 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium">
          All
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Open
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Critical
        </button>
        <button className="px-3 py-1.5 text-slate-400 hover:text-white transition text-sm">
          Resolved
        </button>
      </div>

      {/* Incident List */}
      {incidents.length === 0 && !error ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <p className="text-slate-400">No incidents found</p>
        </div>
      ) : incidents.length === 0 && error ? (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-12 text-center">
          <p className="text-slate-400">Unable to load incidents. Check runtime status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/workspace/incidents/${incident.id}`}
              className="block bg-navy-800 border border-navy-700 rounded-xl p-6 hover:border-purple-500/30 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <SeverityBadge severity={incident.severity} />
                    <h3 className="text-white font-semibold text-lg group-hover:text-purple-400 transition">
                      {incident.title}
                    </h3>
                  </div>
                  {incident.resolution_summary && (
                    <p className="text-slate-400 text-sm">
                      {incident.resolution_summary}
                    </p>
                  )}
                </div>
                <StatusBadge status={incident.status} />
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div>Service: {incident.service_id}</div>
                <div>
                  Detected {new Date(incident.detected_at).toLocaleDateString()}
                </div>
                {incident.resolved_at && (
                  <div>
                    Resolved{' '}
                    {new Date(incident.resolved_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
