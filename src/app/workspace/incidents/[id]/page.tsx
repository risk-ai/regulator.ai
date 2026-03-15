type Incident = {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved'
  service_id: string
  detected_by: string
  detected_at: string
  resolved_at?: string
  resolution_summary?: string
}

async function getIncident(id: string): Promise<Incident | null> {
  const baseUrl = process.env.VIENNA_RUNTIME_BASE_URL || 'http://localhost:4001'
  
  try {
    const res = await fetch(`${baseUrl}/api/incidents/${id}`, {
      cache: 'no-store'
    })
    
    if (!res.ok) {
      return null
    }
    
    return res.json()
  } catch (error) {
    console.error('Error fetching incident:', error)
    return null
  }
}

export default async function IncidentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const incident = await getIncident(params.id)

  if (!incident) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Incident Not Found
        </h1>
        <p className="text-slate-400">
          Incident {params.id} could not be found.
        </p>
      </div>
    )
  }

  const severityColors = {
    low: 'text-blue-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-2xl font-bold ${severityColors[incident.severity]}`}
              >
                {incident.severity.toUpperCase()}
              </span>
              <h1 className="text-3xl font-bold text-white">
                {incident.title}
              </h1>
            </div>
            <p className="text-slate-400">Service: {incident.service_id}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-lg ${
              incident.status === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400'
                : incident.status === 'investigating'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {incident.status.charAt(0).toUpperCase() +
              incident.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-500">
          <div>
            Detected {new Date(incident.detected_at).toLocaleDateString()} by{' '}
            {incident.detected_by}
          </div>
          {incident.resolved_at && (
            <div>
              Resolved {new Date(incident.resolved_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Resolution Summary */}
      {incident.resolution_summary && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Resolution Summary
          </h2>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <p className="text-slate-300">{incident.resolution_summary}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Timeline</h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="text-white font-medium">Incident detected</div>
                <div className="text-slate-400 text-sm">
                  {new Date(incident.detected_at).toLocaleString()}
                </div>
                <div className="text-slate-500 text-sm mt-1">
                  Detected by: {incident.detected_by}
                </div>
              </div>
            </div>

            {incident.resolved_at && (
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="text-white font-medium">
                    Incident resolved
                  </div>
                  <div className="text-slate-400 text-sm">
                    {new Date(incident.resolved_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Investigations */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Related Investigations
        </h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-center">
            No related investigations
          </p>
        </div>
      </div>
    </div>
  )
}
