/**
 * Page Layout — Vienna OS
 * 
 * Premier page wrapper with consistent spacing, typography, and structure.
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
      padding: '28px 32px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            {title}
          </h1>
          {description && (
            <p style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
              margin: '4px 0 0 0',
            }}>
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
