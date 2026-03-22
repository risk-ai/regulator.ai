/**
 * Circuit Breakers Panel
 * 
 * Phase 10.5: Circuit breaker status monitor
 * Shows objectives with failures, retry limits, and cooldown timers
 */

import { useState, useEffect } from 'react';
import { reconciliationApi, type CircuitBreaker } from '../../api/reconciliation.js';
import './CircuitBreakersPanel.css';

export function CircuitBreakersPanel() {
  const [breakers, setBreakers] = useState<CircuitBreaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update every second for cooldown countdown refresh
  useEffect(() => {
    const timer = setInterval(() => {
      // Trigger re-render for cooldown countdown
      setBreakers((prev) => [...prev]);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch breakers every 5 seconds
  useEffect(() => {
    fetchBreakers();

    const interval = setInterval(fetchBreakers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBreakers = async () => {
    try {
      const result = await reconciliationApi.getCircuitBreakers();
      setBreakers(result.breakers);
      setError(null);
    } catch (err) {
      console.error('[CircuitBreakers] Error fetching breakers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCooldown = (cooldownRemainingSeconds: number | null): string => {
    if (cooldownRemainingSeconds === null || cooldownRemainingSeconds === 0) {
      return '-';
    }

    const minutes = Math.floor(cooldownRemainingSeconds / 60);
    const seconds = cooldownRemainingSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getStateDisplay = (breaker: CircuitBreaker): string => {
    if (breaker.reconciliation_status === 'degraded') {
      return 'DEGRADED';
    }
    if (breaker.reconciliation_status === 'cooldown' && breaker.cooldown_remaining_seconds !== null) {
      return formatCooldown(breaker.cooldown_remaining_seconds);
    }
    return breaker.reconciliation_status;
  };

  const getStateClass = (breaker: CircuitBreaker): string => {
    if (breaker.reconciliation_status === 'degraded') {
      return 'degraded';
    }
    if (breaker.reconciliation_status === 'cooldown') {
      return 'cooldown';
    }
    return 'active';
  };

  if (loading && breakers.length === 0) {
    return (
      <div className="circuit-breakers-panel">
        <div className="panel-header">
          <h3>Circuit Breakers</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="circuit-breakers-panel">
        <div className="panel-header">
          <h3>Circuit Breakers</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (breakers.length === 0) {
    return (
      <div className="circuit-breakers-panel">
        <div className="panel-header">
          <h3>Circuit Breakers</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            No circuit breakers engaged.<br />
            <span className="text-muted">All objectives healthy or idle.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="circuit-breakers-panel">
      <div className="panel-header">
        <h3>Circuit Breakers</h3>
        <span className="breaker-count">{breakers.length} engaged</span>
      </div>

      <div className="panel-body">
        <table className="breakers-table">
          <thead>
            <tr>
              <th>Objective</th>
              <th>Failures</th>
              <th>Limit</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {breakers.map((breaker) => {
              const stateClass = getStateClass(breaker);
              const attemptsRemaining = breaker.policy_limit - breaker.consecutive_failures;

              return (
                <tr key={breaker.objective_id} className={`breaker-row ${stateClass}`}>
                  <td className="objective-cell">
                    <div className="objective-name">{breaker.objective_id}</div>
                    {breaker.last_failure_reason && (
                      <div className="failure-reason">{breaker.last_failure_reason}</div>
                    )}
                  </td>
                  <td className="failures-cell">
                    <span className={`failure-count ${stateClass}`}>
                      {breaker.consecutive_failures}/{breaker.policy_limit}
                    </span>
                  </td>
                  <td className="limit-cell">
                    {attemptsRemaining > 0 ? (
                      <span className="attempts-remaining">
                        {attemptsRemaining} remaining
                      </span>
                    ) : (
                      <span className="attempts-exhausted">exhausted</span>
                    )}
                  </td>
                  <td className="state-cell">
                    <span className={`state-badge ${stateClass}`}>
                      {getStateDisplay(breaker)}
                    </span>
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
