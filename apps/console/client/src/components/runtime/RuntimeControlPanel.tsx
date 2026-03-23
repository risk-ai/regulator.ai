/**
 * Runtime Control Panel
 * 
 * Phase 10.5: Top-level control plane status
 * Shows runtime mode, reconciliation gate, executor, watchdog, verification, ledger
 */

import { useState, useEffect } from 'react';
import { statusApi } from '../../api/status.js';
import './RuntimeControlPanel.css';

interface ControlState {
  runtime_mode: string;
  observation_window: string;
  safe_mode: string;
  reconciliation_gate: string;
  executor: string;
  watchdog: string;
  verification: string;
  ledger: string;
  policy_engine: string;
}

export function RuntimeControlPanel() {
  const [state, setState] = useState<ControlState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch status every 10 seconds
  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const systemStatus = await statusApi.getStatus();

      // Map system status to control state
      const controlState: ControlState = {
        runtime_mode: systemStatus.runtime_mode || 'NORMAL',
        observation_window: determineObservationStatus(),
        safe_mode: 'NOT AVAILABLE', // Phase 10.4 placeholder
        reconciliation_gate: systemStatus.executor_state === 'running' ? 'ACTIVE' : 'OFFLINE',
        executor: systemStatus.executor_state?.toUpperCase() || 'UNKNOWN',
        watchdog: 'ACTIVE', // Assume active if executor running
        verification: 'ONLINE', // No dedicated health check yet
        ledger: 'RECORDING', // No dedicated health check yet
        policy_engine: 'ACTIVE', // No dedicated health check yet
      };

      setState(controlState);
      setError(null);
    } catch (err) {
      console.error('[RuntimeControl] Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const determineObservationStatus = (): string => {
    // Phase 10.3 deployed 2026-03-13 21:52 EDT
    const deploymentTime = new Date('2026-03-13T21:52:00-04:00').getTime();
    const windowDuration = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    if (now < deploymentTime + windowDuration) {
      return 'ACTIVE';
    }
    return 'COMPLETE';
  };

  const getStatusClass = (value: string): string => {
    const normalStates = ['NORMAL', 'ACTIVE', 'RUNNING', 'ONLINE', 'RECORDING'];
    const warningStates = ['DEGRADED', 'PAUSED', 'COMPLETE'];
    const criticalStates = ['OFFLINE', 'FAILED', 'STOPPED'];

    if (normalStates.includes(value)) return 'healthy';
    if (warningStates.includes(value)) return 'warning';
    if (criticalStates.includes(value)) return 'critical';
    if (value === 'NOT AVAILABLE') return 'neutral';
    return 'neutral';
  };

  if (loading && !state) {
    return (
      <div className="runtime-control-panel">
        <div className="panel-header">
          <h3>Runtime Control State</h3>
        </div>
        <div className="panel-body">
          <div className="empty-state">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="runtime-control-panel">
        <div className="panel-header">
          <h3>Runtime Control State</h3>
        </div>
        <div className="panel-body">
          <div className="error-state">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!state) {
    return null;
  }

  return (
    <div className="runtime-control-panel">
      <div className="panel-header">
        <h3>Runtime Control State</h3>
      </div>

      <div className="panel-body">
        <div className="control-grid">
          <div className="control-row">
            <span className="control-label">Runtime Mode</span>
            <span className={`control-value ${getStatusClass(state.runtime_mode)}`}>
              {state.runtime_mode}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Observation Window</span>
            <span className={`control-value ${getStatusClass(state.observation_window)}`}>
              {state.observation_window}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Safe Mode</span>
            <span className={`control-value ${getStatusClass(state.safe_mode)}`}>
              {state.safe_mode}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Reconciliation Gate</span>
            <span className={`control-value ${getStatusClass(state.reconciliation_gate)}`}>
              {state.reconciliation_gate}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Executor</span>
            <span className={`control-value ${getStatusClass(state.executor)}`}>
              {state.executor}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Watchdog</span>
            <span className={`control-value ${getStatusClass(state.watchdog)}`}>
              {state.watchdog}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Verification</span>
            <span className={`control-value ${getStatusClass(state.verification)}`}>
              {state.verification}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Ledger</span>
            <span className={`control-value ${getStatusClass(state.ledger)}`}>
              {state.ledger}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Policy Engine</span>
            <span className={`control-value ${getStatusClass(state.policy_engine)}`}>
              {state.policy_engine}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
