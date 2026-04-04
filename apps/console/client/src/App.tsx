/**
 * Vienna Operator Shell
 * Phase 2: Information Architecture
 * 
 * Main application entry point with auth gate and navigation
 */

import React, { useEffect, useState, Suspense } from 'react';
import { MainLayout } from './components/layout/MainLayout.js';
import { MainNav, type NavSection } from './components/layout/MainNav.js';
import { NetworkStatus } from './components/common/NetworkStatus.js';
import { ErrorToast } from './components/common/ErrorToast.js';
import { DemoBanner } from './components/common/DemoBanner.js';
import { useDemoMode } from './hooks/useDemoMode.js';
import { LoginScreen } from './components/auth/LoginScreen.js';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard.js';
import { CommandPalette } from './components/search/CommandPalette.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { useAuthStore } from './store/authStore.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { ErrorBoundary } from './components/ui/ErrorBoundary.js';
import { FeedbackWidget } from './components/feedback/FeedbackWidget.js';
import { apiClient } from './api/client.js';

// Lazy-loaded pages
const NowPage = React.lazy(() => import('./pages/NowPage.js').then(m => ({ default: m.NowPage })));
const RuntimePage = React.lazy(() => import('./pages/RuntimePage.js').then(m => ({ default: m.RuntimePage })));
const WorkspacePage = React.lazy(() => import('./pages/WorkspacePage.js').then(m => ({ default: m.WorkspacePage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage.js').then(m => ({ default: m.HistoryPage })));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage.js').then(m => ({ default: m.ServicesPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage.js').then(m => ({ default: m.SettingsPage })));
const ApprovalsPage = React.lazy(() => import('./pages/ApprovalsPage.js').then(m => ({ default: m.ApprovalsPage })));
const IntentPage = React.lazy(() => import('./pages/IntentPage.js').then(m => ({ default: m.IntentPage })));
const PolicyBuilderPage = React.lazy(() => import('./pages/PolicyBuilderPage.js').then(m => ({ default: m.PolicyBuilderPage })));
const ActionTypesPage = React.lazy(() => import('./pages/ActionTypesPage.js').then(m => ({ default: m.ActionTypesPage })));
const FleetDashboardPage = React.lazy(() => import('./pages/FleetDashboardPage.js').then(m => ({ default: m.FleetDashboardPage })));
const IntegrationsPage = React.lazy(() => import('./pages/IntegrationsPage.js').then(m => ({ default: m.IntegrationsPage })));
const CompliancePage = React.lazy(() => import('./pages/CompliancePage.js').then(m => ({ default: m.CompliancePage })));
const ExecutionPage = React.lazy(() => import('./pages/ExecutionPage.js').then(m => ({ default: m.ExecutionPage })));
const PolicyTemplatesPage = React.lazy(() => import('./pages/PolicyTemplatesPage.js'));
const AgentTemplatesPage = React.lazy(() => import('./pages/AgentTemplatesPage.js'));
const ActivityFeedPage = React.lazy(() => import('./pages/ActivityFeedPage.js'));
const ApiKeysPage = React.lazy(() => import('./pages/ApiKeysPage.js').then(m => ({ default: m.ApiKeysPage })));
const ExecutionsPage = React.lazy(() => import('./pages/ExecutionsPage.js').then(m => ({ default: m.ExecutionsPage })));
const ConnectAgentPage = React.lazy(() => import('./pages/ConnectAgentPage.js').then(m => ({ default: m.ConnectAgentPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage.js').then(m => ({ default: m.AnalyticsPage })));

// Page loading spinner component
function PageLoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      color: 'var(--text-tertiary)'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '2px solid var(--border-subtle)',
        borderTop: '2px solid var(--text-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const ONBOARDING_STORAGE_KEY = 'vienna_onboarding_completed';

export function App() {
  const { authenticated, loading, error, checkSession, loginWithOAuth } = useAuthStore();
  const demoMode = useDemoMode();
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
      const validSections: NavSection[] = ['now', 'runtime', 'fleet', 'workspace', 'approvals', 'policies', 'policy-templates', 'agent-templates', 'activity', 'intent', 'action-types', 'integrations', 'compliance', 'history', 'services', 'api-keys', 'settings', 'execution', 'executions', 'connect', 'analytics'];
      
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
      
      case 'execution':
        return <ExecutionPage />;
      
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
      
      case 'executions':
        return <ExecutionsPage />;
      
      case 'settings':
        return <SettingsPage />;

      case 'connect':
        return <ConnectAgentPage />;

      case 'analytics':
        return <AnalyticsPage />;
      
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
          
          {/* Demo Mode Banner */}
          {authenticated && (
            <DemoBanner
              isDemoMode={demoMode.isDemoMode}
              bannerDismissed={demoMode.bannerDismissed}
              hasRealAgents={demoMode.hasRealAgents}
              agentCount={demoMode.agentCount}
              onDismiss={demoMode.dismissBanner}
              onNavigate={handleNavigate}
            />
          )}
          
          {/* Page Content */}
          <main className="container mx-auto px-6 py-6">
            <ErrorBoundary key={currentSection}>
              <Suspense fallback={<PageLoadingSpinner />}>
                {renderPage()}
              </Suspense>
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
          
          {/* Feedback Widget */}
          <FeedbackWidget />
          
          {/* Network Status Banner */}
          <NetworkStatus />
          
          {/* Error Toast System */}
          <ErrorToast />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
