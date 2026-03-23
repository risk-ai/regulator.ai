/**
 * Page Layout Wrapper
 * Phase 2: Information Architecture
 * 
 * Consistent layout pattern for all Vienna OS pages
 */

import React from 'react';

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Standard page layout wrapper
 * 
 * Provides:
 * - Consistent title styling
 * - Optional description
 * - Optional action buttons (top-right)
 * - Consistent spacing and content area
 */
export function PageLayout({ title, description, children, actions }: PageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      
      {/* Page Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
