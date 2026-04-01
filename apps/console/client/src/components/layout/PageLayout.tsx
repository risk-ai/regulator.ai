/**
 * Page Layout — Vienna OS
 * 
 * Premier page wrapper with consistent spacing, typography, and structure.
 * Includes subtle grid background and purple gradient divider.
 */

import React from 'react';

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageLayout({ title, description, children, actions }: PageLayoutProps) {
  return (
    <div style={{
      padding: 'var(--space-6) var(--space-8)',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
    }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-6)',
        position: 'relative',
      }}>
        <div>
          <h1 className="text-title" style={{ margin: 0 }}>
            {title}
          </h1>
          {description && (
            <p className="text-body" style={{ margin: 'var(--space-2) 0 0 0' }}>
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {actions}
          </div>
        )}
      </div>
      
      {/* Page Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
