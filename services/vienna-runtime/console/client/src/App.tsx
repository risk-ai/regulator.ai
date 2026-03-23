/**
 * Vienna Operator Shell
 * Updated for production architecture and capabilities
 * 
 * Main application entry point with auth gate and navigation
 */

import React, { useEffect, useState } from 'react';
import { MainNav, type NavSection } from './components/layout/MainNav.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { NowPage } from './pages/NowPage.js';
import { RuntimePage } from './pages/RuntimePage.js';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { ExecutionsPage } from './pages/ExecutionsPage.js';
import { ServicesPage } from './pages/ServicesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ApprovalsPage } from './pages/ApprovalsPage.js';
import { LoginScreen } from './components/auth/LoginScreen.js';
import { useAuthStore } from './store/authStore.js';

export function App() {
  const { authenticated, loading, checkSession } = useAuthStore();
  const [currentSection, setCurrentSection] = useState<NavSection>('overview');
  
  // Check session on mount (only once)
  useEffect(() => {
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as NavSection;
      
      // Valid sections
      const validSections: NavSection[] = ['overview', 'now', 'approvals', 'executions', 'runtime', 'workspace', 'services', 'settings'];
      
      if (validSections.includes(hash)) {
        setCurrentSection(hash);
      } else {
        // Default to Overview
        setCurrentSection('overview');
        window.history.replaceState(null, '', '#overview');
      }
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Navigation handler
  const handleNavigate = (section: NavSection) => {
    window.location.hash = section;
  };
  
  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-6 animate-pulse">
            <span className="text-3xl font-bold text-white">V</span>
          </div>
          <div className="mb-6">
            <div className="text-xl font-semibold text-white mb-2">Vienna OS</div>
            <div className="text-sm text-gray-400">Operator Console</div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-400 text-sm">Loading console...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show login screen if not authenticated
  if (!authenticated) {
    return <LoginScreen />;
  }
  
  // Render appropriate page based on current section
  const renderPage = () => {
    switch (currentSection) {
      case 'overview':
        return <OverviewPage />;
      
      case 'now':
        return <NowPage />;
      
      case 'approvals':
        return <ApprovalsPage />;
      
      case 'executions':
        return <ExecutionsPage />;
      
      case 'runtime':
        return <RuntimePage />;
      
      case 'workspace':
        return <WorkspacePage />;
      
      case 'services':
        return <ServicesPage />;
      
      case 'settings':
        return <SettingsPage />;
      
      default:
        return <OverviewPage />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Navigation */}
      <MainNav currentSection={currentSection} onNavigate={handleNavigate} />
      
      {/* Page Content */}
      <main className="container mx-auto px-6 py-6">
        {renderPage()}
      </main>
    </div>
  );
}
