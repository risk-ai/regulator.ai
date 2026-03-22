/**
 * Status Badge Component
 * Phase 13b - Shared component for investigation status
 */

import React from 'react';
import type { InvestigationStatus } from '../../types/workspace.js';

interface StatusBadgeProps {
  status: InvestigationStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<InvestigationStatus, { label: string; color: string; bg: string }> = {
  open: {
    label: 'Open',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30 border-blue-700/50',
  },
  investigating: {
    label: 'Investigating',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30 border-yellow-700/50',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-400',
    bg: 'bg-green-900/30 border-green-700/50',
  },
  archived: {
    label: 'Archived',
    color: 'text-gray-500',
    bg: 'bg-gray-800/30 border-gray-700/50',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  
  return (
    <span
      className={`inline-flex items-center font-medium border rounded ${config.bg} ${config.color} ${sizeClass}`}
    >
      {config.label}
    </span>
  );
}
