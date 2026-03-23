/**
 * Reconciliation Activity Panel
 * 
 * Phase 10.5: Primary operator view of reconciliation state
 * Shows all objectives with state, generation, failures, cooldown timers
 */

import { useState, useEffect } from 'react';
import { managedObjectivesApi, type ManagedObjective } from '../../api/managedObjectives.js';
import './ReconciliationActivityPanel.css';

type FilterType = 'all' | 'active' | 'issues' | 'idle';

export function ReconciliationActivityPanel() {
  const [objectives, setObjectives] = useState<ManagedObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second (for cooldown countdown)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch objectives every 5 seconds
  useEffect(() => {
    fetchObjectives();

    const interval = setInterval(fetchObjectives, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchObjectives = async () => {
    try {
      const result = await managedObjectivesApi.getManagedObjectives({
        enabled: true,
        pageSize: 50,
      });

      setObjectives(result.objectives);
      setError(null);
    } catch (err) {
      console.error('[ReconciliationActivity] Error fetching objectives:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredObjectives = objectives.filter((obj) => {
    if (filter === 'all') return true;
    if (filter === 'active') return obj.reconciliation_status === 'reconciling';
    if (filter === 'issues') return obj.reconciliation_status === 'cooldown' || obj.reconciliation_status === 'degraded';
    if (filter === 'idle') return obj.reconciliation_status === 'idle';
    return true;
  });

  const getStateColor = (status: string): string => {
    switch (status) {
      case 'idle': return 'neutral';
      case 'reconciling': return 'blue';
      case 'cooldown': return 'yellow';
      case 'degraded': return 'red';
      case 'safe_mode': return 'purple';
      default: return 'neutral';
    }
  };

  const formatCooldown = (cooldownUntil: string | null): string => {
    if (!cooldownUntil) return '-';

    const cooldownTime = new Date(cooldownUntil).getTime();
    const remainingMs = Math.max(0, cooldownTime - currentTime);
    const remainingSeconds = Math.floor(remainingMs / 1000);

    if (remainingSeconds === 0) return '0s';

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = currentTime;
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  if (loading && objectives.length === 0) {
    return (
      <div className="reconciliation-activity-panel">
        <div className="panel-header">
          <h3>Reconciliation Activity</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reconciliation-activity-panel">
        <div className="panel-header">
          <h3>Reconciliation Activity</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (objectives.length === 0) {
    return (
      <div className="reconciliation-activity-panel">
        <div className="panel-header">
          <h3>Reconciliation Activity</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <p>No objectives defined yet.</p>
            <p className="text-muted">Vienna will reconcile objectives once they are declared.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reconciliation-activity-panel">
      <div className="panel-header">
        <h3>Reconciliation Activity</h3>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'issues' ? 'active' : ''}`}
            onClick={() => setFilter('issues')}
          >
            Issues
          </button>
          <button
            className={`filter-btn ${filter === 'idle' ? 'active' : ''}`}
            onClick={() => setFilter('idle')}
          >
            Idle
          </button>
        </div>
      </div>

      <div className="panel-body">
        <table className="objectives-table">
          <thead>
            <tr>
              <th>Objective</th>
              <th>State</th>
              <th>Gen</th>
              <th>Attempts</th>
              <th>Cooldown</th>
              <th>Last Transition</th>
            </tr>
          </thead>
          <tbody>
            {filteredObjectives.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">
                  No objectives match filter: {filter}
                </td>
              </tr>
            ) : (
              filteredObjectives.map((obj) => (
                <tr key={obj.objective_id}>
                  <td className="objective-cell">
                    <div className="objective-name">{obj.objective_id}</div>
                  </td>
                  <td>
                    <span className={`state-badge state-${getStateColor(obj.reconciliation_status)}`}>
                      {obj.reconciliation_status}
                    </span>
                  </td>
                  <td className="gen-cell">{obj.reconciliation_generation || 0}</td>
                  <td className="attempts-cell">
                    {obj.consecutive_failures}/3
                  </td>
                  <td className="cooldown-cell">
                    {obj.reconciliation_status === 'cooldown'
                      ? formatCooldown(obj.cooldown_until)
                      : obj.reconciliation_status === 'degraded'
                      ? 'DEGRADED'
                      : '-'}
                  </td>
                  <td className="time-cell">
                    {obj.last_transition_at ? formatRelativeTime(obj.last_transition_at) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
