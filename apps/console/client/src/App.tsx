/**
 * Vienna Operator Shell
 * Phase 2: Information Architecture
 * 
 * Main application entry point with auth gate and navigation
 */

import React, { useEffect, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout.js';
import { MainNav, type NavSection } from './components/layout/MainNav.js';
import { NowPage } from './pages/NowPage.js';
import { RuntimePage } from './pages/RuntimePage.js';
import { WorkspacePage } from './pages/WorkspacePage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { ServicesPage } from './pages/ServicesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ApprovalsPage } from './pages/ApprovalsPage.js';
import { IntentPage } from './pages/IntentPage.js';
import { LoginScreen } from './components/auth/LoginScreen.js';
import { OnboardingModal } from './components/OnboardingModal.js';
import { useAuthStore } from './store/authStore.js';

const ONBOARDING_STORAGE_KEY = 'vienna_onboarding_completed';

export function App() {
  const { authenticated, loading, checkSession } = useAuthStore();
  const [currentSection, setCurrentSection] = useState<NavSection>('now');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Check session on mount (only once)
  useEffect(() => {
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check if onboarding should be shown (first-time user)
  useEffect(() => {
    if (authenticated) {
      const onboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!onboardingCompleted) {
        setShowOnboarding(true);
      }
    }
  }, [authenticated]);
  
  // Hash-based routing (Phase 2: 6-section navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as NavSection;
      
      // Valid sections
      const validSections: NavSection[] = ['now', 'runtime', 'workspace', 'approvals', 'intent', 'history', 'services', 'settings'];
      
      if (validSections.includes(hash)) {
        setCurrentSection(hash);
      } else {
        // Default to Now (operator landing page)
        setCurrentSection('now');
        window.history.replaceState(null, '', '#now');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading Vienna Console...</p>
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
      case 'now':
        return <NowPage />;
      
      case 'runtime':
        return <RuntimePage />;
      
      case 'workspace':
        return <WorkspacePage />;
      
      case 'approvals':
        return <ApprovalsPage />;
      
      case 'intent':
        return <IntentPage />;
      
      case 'history':
        return <HistoryPage />;
      
      case 'services':
        return <ServicesPage />;
      
      case 'settings':
        return <SettingsPage />;
      
      default:
        return <NowPage />;
    }
  };
  
  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };
  
  const handleOnboardingSkip = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Navigation */}
      <MainNav currentSection={currentSection} onNavigate={handleNavigate} />
      
      {/* Page Content */}
      <main className="container mx-auto px-6 py-6">
        {renderPage()}
      </main>
      
      {/* First-Run Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  );
}
