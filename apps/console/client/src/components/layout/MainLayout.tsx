/**
 * Main Layout
 * 
 * Top-level layout for Vienna Operator Shell
 */

import React from 'react';
import { TopStatusBar } from './TopStatusBar.js';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <TopStatusBar />
      <main className="container mx-auto" style={{ padding: 'var(--space-8) var(--space-6)' }}>
        {children}
      </main>
    </div>
  );
}
