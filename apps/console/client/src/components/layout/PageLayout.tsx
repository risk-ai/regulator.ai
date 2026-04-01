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
      padding: '20px 28px', // Tightened from 28px for more density
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      // Subtle grid background pattern
      backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(124, 58, 237, 0.08) 1px, transparent 0)
      `,
      backgroundSize: '24px 24px',
    }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px', // Reduced from 24px for density
        position: 'relative',
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
      
      {/* Subtle purple gradient line under title */}
      <div style={{
        width: '100%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, #7c3aed, #a78bfa, transparent)',
        marginBottom: '20px', // Reduced from implicit 24px
        opacity: 0.6,
      }} />
      
      {/* Page Content */}
      <div>
        {children}
      </div>
    </div>
  );
}
