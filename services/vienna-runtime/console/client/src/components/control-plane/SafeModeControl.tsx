import { useState, useEffect } from 'react';

interface SafeModeStatus {
  active: boolean;
  reason: string | null;
  entered_at: string | null;
  entered_by: string | null;
}

export function SafeModeControl() {
  const [status, setStatus] = useState<SafeModeStatus | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/v1/reconciliation/safe-mode');
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch safe mode status');
      }
    } catch (err) {
      setError('Network error fetching safe mode status');
    }
  }

  async function toggleSafeMode() {
    setLoading(true);
    setError(null);

    try {
      if (status?.active) {
        // Disable (use Intent Gateway)
        const res = await fetch('/api/v1/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent_type: 'set_safe_mode',
            payload: { enabled: false },
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to disable safe mode');
        }
      } else {
        // Enable (use Intent Gateway)
        if (!reason.trim()) {
          setError('Reason is required to enable safe mode');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/v1/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent_type: 'set_safe_mode',
            payload: { enabled: true, reason: reason.trim() },
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to enable safe mode');
        } else {
          setReason(''); // Clear reason on success
        }
      }

      await fetchStatus();
    } catch (err) {
      setError('Network error toggling safe mode');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div className="safe-mode-control">
        <h3 className="text-lg font-semibold mb-4 text-white">Safe Mode</h3>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleString();
  };

  return (
    <div className="safe-mode-control">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Safe Mode</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.active 
            ? 'bg-red-900 text-red-200' 
            : 'bg-green-900 text-green-200'
        }`}>
          {status.active ? 'ACTIVE' : 'OFF'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-200 rounded border border-red-700">
          {error}
        </div>
      )}

      {status.active ? (
        <div className="space-y-4">
          <div className="bg-red-950 border border-red-800 rounded p-4">
            <div className="text-sm text-gray-300 mb-2">
              <strong>Reason:</strong> {status.reason || 'No reason provided'}
            </div>
            <div className="text-sm text-gray-300 mb-2">
              <strong>Entered:</strong> {formatTimestamp(status.entered_at)}
            </div>
            <div className="text-sm text-gray-300">
              <strong>By:</strong> {status.entered_by || 'Unknown'}
            </div>
          </div>
          
          <div className="text-sm text-yellow-200 bg-yellow-950 border border-yellow-800 rounded p-3">
            ⚠️ Autonomous reconciliation is suspended. No new reconciliations will be admitted until safe mode is released.
          </div>

          <button
            onClick={toggleSafeMode}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Releasing...' : 'Release Safe Mode'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-green-200 bg-green-950 border border-green-800 rounded p-3">
            ✓ Autonomous reconciliation is active. The gate is admitting reconciliations normally.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for enabling safe mode
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Investigating incident, Manual maintenance, System behaving unexpectedly"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <button
            onClick={toggleSafeMode}
            disabled={!reason.trim() || loading}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enabling...' : 'Enable Safe Mode'}
          </button>

          <div className="text-xs text-gray-400 mt-2">
            Safe mode suspends autonomous reconciliation admission. Active reconciliations will continue, but no new reconciliations will be admitted until safe mode is released.
          </div>
        </div>
      )}
    </div>
  );
}
