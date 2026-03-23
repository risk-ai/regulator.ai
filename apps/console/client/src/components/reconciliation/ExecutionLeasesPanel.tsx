/**
 * Execution Leases Panel
 * 
 * Phase 10.5: Live execution lease monitor with countdown timers
 * Shows active execution attempts with remaining deadline time
 */

import { useState, useEffect } from 'react';
import { reconciliationApi, type ExecutionLease } from '../../api/reconciliation.js';
import './ExecutionLeasesPanel.css';

export function ExecutionLeasesPanel() {
  const [leases, setLeases] = useState<ExecutionLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch leases every 5 seconds
  useEffect(() => {
    fetchLeases();

    const interval = setInterval(fetchLeases, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeases = async () => {
    try {
      const result = await reconciliationApi.getExecutionLeases();
      setLeases(result.active_leases);
      setError(null);
    } catch (err) {
      console.error('[ExecutionLeases] Error fetching leases:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const calculateRemaining = (deadlineAt: string): number => {
    const deadlineMs = new Date(deadlineAt).getTime();
    const remainingMs = Math.max(0, deadlineMs - currentTime);
    return Math.floor(remainingMs / 1000);
  };

  const formatRemaining = (seconds: number): string => {
    if (seconds === 0) return '0s';

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  const getRemainingClass = (seconds: number): string => {
    if (seconds === 0) return 'expired';
    if (seconds < 30) return 'critical';
    if (seconds < 60) return 'warning';
    return 'healthy';
  };

  const renderProgressBar = (seconds: number, maxSeconds: number = 120): JSX.Element => {
    if (seconds === 0) {
      return (
        <div className="progress-bar">
          <div className="progress-fill expired" style={{ width: '100%' }}>
            EXPIRED
          </div>
        </div>
      );
    }

    const percentage = Math.min(100, (seconds / maxSeconds) * 100);
    const barClass = getRemainingClass(seconds);

    return (
      <div className="progress-bar">
        <div className={`progress-fill ${barClass}`} style={{ width: `${percentage}%` }} />
      </div>
    );
  };

  if (loading && leases.length === 0) {
    return (
      <div className="execution-leases-panel">
        <div className="panel-header">
          <h3>Execution Leases</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="execution-leases-panel">
        <div className="panel-header">
          <h3>Execution Leases</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (leases.length === 0) {
    return (
      <div className="execution-leases-panel">
        <div className="panel-header">
          <h3>Execution Leases</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            No active executions.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="execution-leases-panel">
      <div className="panel-header">
        <h3>Execution Leases</h3>
        <span className="lease-count">{leases.length} active</span>
      </div>

      <div className="panel-body">
        <table className="leases-table">
          <thead>
            <tr>
              <th>Objective</th>
              <th>Attempt</th>
              <th>Gen</th>
              <th>Deadline</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {leases.map((lease) => {
              const remainingSeconds = calculateRemaining(lease.deadline_at);
              const remainingClass = getRemainingClass(remainingSeconds);

              return (
                <tr key={`${lease.objective_id}-${lease.attempt_id}`} className={`lease-row ${remainingClass}`}>
                  <td className="objective-cell">
                    <div className="objective-name">{lease.objective_id}</div>
                  </td>
                  <td className="attempt-cell">
                    {lease.attempt_id}
                  </td>
                  <td className="gen-cell">
                    {lease.generation}
                  </td>
                  <td className="deadline-cell">
                    {new Date(lease.deadline_at).toLocaleTimeString()}
                  </td>
                  <td className="remaining-cell">
                    <div className="remaining-container">
                      <span className={`remaining-text ${remainingClass}`}>
                        {formatRemaining(remainingSeconds)}
                      </span>
                      {renderProgressBar(remainingSeconds)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
