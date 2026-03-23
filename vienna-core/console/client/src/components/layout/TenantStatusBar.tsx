/**
 * Tenant Status Bar
 * Phase 21: Tenant Identity
 * 
 * Displays current tenant context at top of UI
 */

import React from 'react';
import { User } from 'lucide-react';

interface TenantStatusBarProps {
  tenantId?: string;
  tenantName?: string;
}

export const TenantStatusBar: React.FC<TenantStatusBarProps> = ({
  tenantId = 'system',
  tenantName
}) => {
  return (
    <div className="tenant-status-bar">
      <User size={14} className="tenant-icon" />
      <span className="tenant-label">Tenant:</span>
      <span className="tenant-id">{tenantName || tenantId}</span>
    </div>
  );
};
