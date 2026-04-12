/**
 * Vienna Operator Shell
 * A+ Revision: React Router + consolidated navigation
 */

import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MainNav } from './components/layout/MainNav.js';
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
import { GuidedTour } from './components/demo/GuidedTour.js';
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
const PolicyBuilderPremium = React.lazy(() => import('./pages/PolicyBuilderPremium.js').then(m => ({ default: m.PolicyBuilderPremium })));
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
const GovernanceChainPage = React.lazy(() => import('./pages/GovernanceChainPage.js').then(m => ({ default: m.GovernanceChainPage })));
const GovernanceLivePage = React.lazy(() => import('./pages/GovernanceLivePage.js').then(m => ({ default: m.GovernanceLivePage })));
const DashboardPremium = React.lazy(() => import('./pages/DashboardPremium.js'));
const DashboardControl = React.lazy(() => import('./pages/DashboardControl.js').then(m => ({ default: m.DashboardControl })));
const FleetPremium = React.lazy(() => import('./pages/FleetPremium.js'));
const ApprovalsPremium = React.lazy(() => import('./pages/ApprovalsPremium.js'));
const AnalyticsPremium = React.lazy(() => import('./pages/AnalyticsPremium.js').then(m => ({ default: m.AnalyticsPremium })));
const RiskHeatmapPage = React.lazy(() => import('./pages/RiskHeatmapPage.js').then(m => ({ default: m.RiskHeatmapPage })));
const CompliancePremium = React.lazy(() => import('./pages/CompliancePremium.js').then(m => ({ default: m.CompliancePremium })));
const IntegrationsPremium = React.lazy(() => import('./pages/IntegrationsPremium.js').then(m => ({ default: m.IntegrationsPremium })));
const AgentDetailPage = React.lazy(() => import('./pages/AgentDetailPage.js'));
const DemoModePage = React.lazy(() => import('./pages/DemoModePage.js'));
const EmbedWidgetPage = React.lazy(() => import('./pages/EmbedWidgetPage.js'));

function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12" style={{ color: 'var(--text-tertiary)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--text-primary)' }} />
    </div>
  );
}

const ONBOARDING_STORAGE_KEY = 'vienna_onboarding_completed';
const GUIDED_TOUR_STORAGE_KEY = 'vienna_guided_tour_completed';

export function App() {
  const { authenticated, loading, error, checkSession, loginWithOAuth } = useAuthStore();
  const demoMode = useDemoMode();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [backendDown, setBackendDown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setShowCommandPalette(true)
  });

  // Expose tour trigger globally for button access
  useEffect(() => {
    (window as any).startGuidedTour = () => setShowGuidedTour(true);
    return () => {
      delete (window as any).startGuidedTour;
    };
  }, []);

  // Handle OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      loginWithOAuth(token).then((success) => {
        if (success) {
          navigate(location.pathname, { replace: true });
        }
      });
      return;
    }
    
    let cancelled = false;
    
    (async () => {
      try {
        const healthRes = await fetch('/api/v1/health', { signal: AbortSignal.timeout(8000) });
        if (!healthRes.ok) throw new Error('Health check failed');
      } catch {
        if (!cancelled) setBackendDown(true);
        return;
      }
      
      try {
        await checkSession();
      } catch {
        // Session check failure is NOT a backend-down event
      }
    })();
    
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check onboarding status
  useEffect(() => {
    if (authenticated) {
      const localOnboardingCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      
      if (!localOnboardingCompleted) {
        apiClient.get('/onboarding/status').then((status: any) => {
          if (!status.completed) {
            setShowOnboarding(true);
          } else {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
          }
        }).catch(() => {
          setShowOnboarding(true);
        });
      }
    }
  }, [authenticated]);

  // Migrate hash-based URLs to path-based (backward compat)
  useEffect(() => {
    if (window.location.hash && window.location.hash.length > 1) {
      const section = window.location.hash.slice(1);
      navigate(`/${section}`, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  if (loading && !backendDown) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-body)' }}>Loading Vienna Console…</p>
        </div>
      </div>
    );
  }

  if (backendDown) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Vienna Console</h1>
          <p className="mb-6" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-base)' }}>
            Cannot connect to the Vienna OS backend. The server may be starting up or temporarily unavailable.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setBackendDown(false);
                checkSession().catch(() => setBackendDown(true));
              }}
              className="w-full px-4 py-2.5 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Retry Connection
            </button>
            <a
              href="https://regulator.ai"
              className="block w-full px-4 py-2.5 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              Visit regulator.ai
            </a>
          </div>
          <p className="mt-6" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Backend: {window.location.origin}/api/v1/health
          </p>
        </div>
      </div>
    );
  }
  
  if (!authenticated) {
    return <LoginScreen />;
  }
  
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
        <div className="min-h-screen" style={{ 
          background: 'var(--bg-app)', 
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)'
        }}>
          {/* Top Navigation */}
          <MainNav />
          
          {/* Demo Mode Banner */}
          {authenticated && (
            <DemoBanner
              isDemoMode={demoMode.isDemoMode}
              bannerDismissed={demoMode.bannerDismissed}
              hasRealAgents={demoMode.hasRealAgents}
              agentCount={demoMode.agentCount}
              onDismiss={demoMode.dismissBanner}
              onNavigate={(section) => navigate(`/${section}`)}
            />
          )}
          
          {/* Page Content */}
          <main className="container mx-auto px-6 py-6">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<DashboardControl />} />
                  <Route path="/dashboard-premium" element={<DashboardPremium />} />
                  <Route path="/now" element={<NowPage />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />

                  <Route path="/fleet" element={<FleetPremium />} />
                  <Route path="/fleet/:agentId" element={<AgentDetailPage />} />

                  <Route path="/agents" element={<Navigate to="/fleet" replace />} />
                  <Route path="/agents/:agentId" element={<AgentDetailPage />} />
                  <Route path="/connect" element={<ConnectAgentPage />} />
                  <Route path="/intent" element={<IntentPage />} />
                  <Route path="/execution" element={<ExecutionPage />} />
                  <Route path="/executions" element={<ExecutionsPage />} />
                  <Route path="/approvals" element={<ApprovalsPremium />} />

                  <Route path="/policies" element={<PolicyBuilderPremium />} />
                  <Route path="/policies-legacy" element={<PolicyBuilderPage />} />
                  <Route path="/policy-templates" element={<PolicyTemplatesPage />} />
                  <Route path="/agent-templates" element={<AgentTemplatesPage />} />
                  <Route path="/compliance" element={<CompliancePremium />} />
                  <Route path="/compliance-legacy" element={<CompliancePage />} />
                  <Route path="/governance-chain" element={<GovernanceChainPage />} />
                  <Route path="/governance-live" element={<GovernanceLivePage />} />
                  <Route path="/activity" element={<ActivityFeedPage />} />
                  <Route path="/analytics" element={<AnalyticsPremium />} />
                  <Route path="/risk-heatmap" element={<RiskHeatmapPage />} />
                  <Route path="/demo" element={<DemoModePage />} />
                  <Route path="/embed-widget" element={<EmbedWidgetPage />} />
                  <Route path="/analytics-legacy" element={<AnalyticsPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/runtime" element={<RuntimePage />} />
                  <Route path="/action-types" element={<ActionTypesPage />} />
                  <Route path="/integrations" element={<IntegrationsPremium />} />
                  <Route path="/integrations-legacy" element={<IntegrationsPage />} />
                  <Route path="/workspace" element={<WorkspacePage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/api-keys" element={<ApiKeysPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
          
          {/* Command Palette */}
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onNavigate={(section) => {
              navigate(`/${section}`);
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
          
          {/* Guided Tour */}
          <GuidedTour
            isActive={showGuidedTour}
            onComplete={() => {
              localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, 'true');
              setShowGuidedTour(false);
            }}
            onDismiss={() => setShowGuidedTour(false)}
          />
          
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
