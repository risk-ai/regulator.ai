/**
 * Quota Status Widget
 * Phase 22: Quota Enforcement
 * 
 * Displays quota usage, limit, and utilization percentage
 */

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface QuotaState {
  used: number;
  limit: number;
  available: number;
  utilization: number;
  blocked?: boolean;
}

interface QuotaStatusWidgetProps {
  quotaState: QuotaState | null;
}

export const QuotaStatusWidget: React.FC<QuotaStatusWidgetProps> = ({ quotaState }) => {
  if (!quotaState) {
    return null;
  }

  const { used, limit, available, utilization, blocked } = quotaState;
  const percentage = Math.round(utilization * 100);

  // Color coding based on utilization
  let statusColor = 'green';
  let StatusIcon = CheckCircle;

  if (blocked || utilization >= 1.0) {
    statusColor = 'red';
    StatusIcon = AlertCircle;
  } else if (utilization >= 0.8) {
    statusColor = 'yellow';
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`quota-status-widget quota-${statusColor}`}>
      <div className="quota-header">
        <StatusIcon size={16} className="quota-icon" />
        <span className="quota-label">Quota</span>
      </div>

      <div className="quota-metrics">
        <span className="quota-usage">{used} / {limit} units</span>
        <span className="quota-percentage">{percentage}%</span>
      </div>

      <div className="quota-bar">
        <div
          className={`quota-fill quota-fill-${statusColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {blocked && (
        <div className="quota-warning">
          ⚠️ Quota exceeded - executions blocked
        </div>
      )}

      {!blocked && utilization >= 0.8 && (
        <div className="quota-warning">
          ⚠️ Approaching quota limit ({available} units remaining)
        </div>
      )}
    </div>
  );
};
