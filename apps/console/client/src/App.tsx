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
import { PolicyBuilderPage } from './pages/PolicyBuilderPage.js';
import { ActionTypesPage } from './pages/ActionTypesPage.js';
import { FleetDashboardPage } from './pages/FleetDashboardPage.js';
import { IntegrationsPage } from './pages/IntegrationsPage.js';
import { CompliancePage } from './pages/CompliancePage.js';
import PolicyTemplatesPage from './pages/PolicyTemplatesPage.js';
import AgentTemplatesPage from './pages/AgentTemplatesPage.js';
import ActivityFeedPage from './pages/ActivityFeedPage.js';
import { ApiKeysPage } from './pages/ApiKeysPage.js';
import { LoginScreen } from './components/auth/LoginScreen.js';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard.js';
import { CommandPalette } from './components/search/CommandPalette.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { useAuthStore } from './store/authStore.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { apiClient } from './api/client.js';

const ONBOARDING_STORAGE_KEY = 'vienna_onboarding_completed';

export function App() {
  const { authenticated, loading, error, checkSession, loginWithOAuth } = useAuthStore();
  const [currentSection, setCurrentSection] = useState<NavSection>('now');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  
  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true)
  });

  // Handle OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // OAuth callback with token
      loginWithOAuth(token).then((success) => {
        if (success) {
          // Clear token from URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
      });
      return; // Don't check session if handling OAuth
    }
    
    // Regular session check — only flag backend as down if a real
    // network request fails (not just "no stored tokens").
    // First do a lightweight health check, then check session.
    let cancelled = false;
    
    (async () => {
      try {
        // Quick health probe to verify backend is reachable
        const healthRes = await fetch('/api/v1/health', { signal: AbortSignal.timeout(8000) });
        if (!healthRes.ok) throw new Error('Health check failed');
      } catch {
        if (!cancelled) setBackendDown(true);
        return;
      }
      
      // Backend is up — check session (may resolve immediately if no tokens)
      try {
        await checkSession();
      } catch {
        // Session check failure is NOT a backend-down event
        // (e.g. expired tokens, 401s). AuthStore handles these.
      }
    })();
    
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check if onboarding should be shown (first-time user)
  useEffect(() => {
    if (authenticated) {
      // First check localStorage for quick response
      const localOnboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      
      if (!localOnboardingCompleted) {
        // Check server-side status
        apiClient.get('/onboarding/status').then((status: any) => {
          if (!status.completed) {
            setShowOnboarding(true);
          } else {
            // Server says completed, update localStorage
            localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
          }
        }).catch((error) => {
          console.warn('Failed to check onboarding status, showing wizard:', error);
          // On error, show onboarding to be safe
          setShowOnboarding(true);
        });
      }
    }
  }, [authenticated]);
  
  // Hash-based routing (Phase 2: 6-section navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as NavSection;
      
      // Valid sections
      const validSections: NavSection[] = ['now', 'runtime', 'fleet', 'workspace', 'approvals', 'policies', 'policy-templates', 'agent-templates', 'activity', 'intent', 'action-types', 'integrations', 'compliance', 'history', 'services', 'api-keys', 'settings'];
      
      if (validSections.includes(hash)) {
        setCurrentSection(hash);
      } else {
        // Default to Now (user?.email || "User" landing page)
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
  if (loading && !backendDown) {
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

  // Show error state if backend is unreachable (NOT for auth failures)
  if (backendDown) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Vienna Console</h1>
          <p className="text-gray-400 mb-6">
            Cannot connect to the Vienna OS backend. The server may be starting up or temporarily unavailable.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setBackendDown(false);
                checkSession().catch(() => setBackendDown(true));
              }}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              Retry Connection
            </button>
            <a
              href="https://regulator.ai"
              className="block w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition"
            >
              Visit regulator.ai
            </a>
          </div>
          <p className="text-gray-600 text-xs mt-6">
            Backend: {window.location.origin}/api/v1/health
          </p>
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
      
      case 'fleet':
        return <FleetDashboardPage />;
      
      case 'workspace':
        return <WorkspacePage />;
      
      case 'approvals':
        return <ApprovalsPage />;
      
      case 'policies':
        return <PolicyBuilderPage />;
      
      case 'policy-templates':
        return <PolicyTemplatesPage />;
      
      case 'agent-templates':
        return <AgentTemplatesPage />;
      
      case 'activity':
        return <ActivityFeedPage />;
      
      case 'intent':
        return <IntentPage />;
      
      case 'action-types':
        return <ActionTypesPage />;
      
      case 'integrations':
        return <IntegrationsPage />;
      
      case 'compliance':
        return <CompliancePage />;
      
      case 'history':
        return <HistoryPage />;
      
      case 'services':
        return <ServicesPage />;
      
      case 'api-keys':
        return <ApiKeysPage />;
      
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
    <ThemeProvider>
      <ErrorBoundary>
        <div style={{ 
          minHeight: '100vh', 
          background: 'var(--bg-app)', 
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)'
        }}>
          {/* Top Navigation */}
          <MainNav currentSection={currentSection} onNavigate={handleNavigate} />
          
          {/* Page Content */}
          <main className="container mx-auto px-6 py-6">
            <ErrorBoundary>
              {renderPage()}
            </ErrorBoundary>
          </main>
          
          {/* Command Palette */}
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onNavigate={(section) => {
              handleNavigate(section as NavSection);
              setShowCommandPalette(false);
            }}
          />
          
          {/* Enhanced Onboarding Wizard */}
          {showOnboarding && (
            <OnboardingWizard
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          )}
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
