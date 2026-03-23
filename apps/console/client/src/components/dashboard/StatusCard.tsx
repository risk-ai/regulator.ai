/**
 * Status Card
 * 
 * Reusable card component for displaying status information
 */

import React from 'react';

interface StatusCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function StatusCard({ title, children, className = '' }: StatusCardProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

interface StatusRowProps {
  label: string;
  value: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
}

export function StatusRow({ label, value, status = 'neutral' }: StatusRowProps) {
  const statusColor = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
    neutral: 'text-gray-300',
  }[status];
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}:</span>
      <span className={`text-sm font-medium ${statusColor}`}>{value}</span>
    </div>
  );
}
