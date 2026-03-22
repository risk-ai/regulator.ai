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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <TopStatusBar />
      <main className="container mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
