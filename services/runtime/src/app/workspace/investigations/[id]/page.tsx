type Investigation = {
  id: string
  name: string
  description?: string
  status: 'open' | 'investigating' | 'resolved' | 'archived'
  created_by: string
  created_at: string
  resolved_at?: string
  workspace_path: string
}

async function getInvestigation(id: string): Promise<Investigation | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/workspace/investigations/${id}`, {
      cache: 'no-store'
    })
    
    if (!res.ok) {
      return null
    }
    
    return res.json()
  } catch (error) {
    console.error('Error fetching investigation:', error)
    return null
  }
}

export default async function InvestigationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const investigation = await getInvestigation(params.id)

  if (!investigation) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Investigation Not Found
        </h1>
        <p className="text-slate-400">
          Investigation {params.id} could not be found.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {investigation.name}
            </h1>
            {investigation.description && (
              <p className="text-slate-400">{investigation.description}</p>
            )}
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded-lg ${
              investigation.status === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400'
                : investigation.status === 'investigating'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {investigation.status.charAt(0).toUpperCase() +
              investigation.status.slice(1)}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-500">
          <div>
            Created {new Date(investigation.created_at).toLocaleDateString()}
          </div>
          <div>by {investigation.created_by}</div>
          {investigation.resolved_at && (
            <div>
              Resolved{' '}
              {new Date(investigation.resolved_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Artifacts Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Artifacts</h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-center">
            No artifacts available yet
          </p>
          <p className="text-slate-500 text-sm text-center mt-2">
            Artifact browser will be implemented in next phase
          </p>
        </div>
      </div>

      {/* Related Objectives */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">
          Related Objectives
        </h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <p className="text-slate-400 text-center">No related objectives</p>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Timeline</h2>
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="text-white font-medium">
                  Investigation opened
                </div>
                <div className="text-slate-400 text-sm">
                  {new Date(investigation.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
