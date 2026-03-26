/**
 * Now Page
 * Phase 2: Information Architecture
 * 
 * Landing page showing current system posture and actionable summary
 */

import { PageLayout } from '../components/layout/PageLayout.js';
import { OperatorNowView } from '../components/OperatorNowView.js';
import { EmptyDashboard } from '../components/dashboard/EmptyDashboard.js';
import { useDashboardStore } from '../store/dashboardStore.js';

/**
 * Now Page - Primary operator landing surface
 * 
 * Answers:
 * - What is Vienna doing right now?
 * - What needs my attention right now?
 * - Is the runtime healthy right now?
 * - Is the assistant available right now?
 * - What should I inspect next?
 */
export function NowPage() {
  const { systemStatus, loading } = useDashboardStore();
  
  // Show empty state for new users or when no data is available
  const shouldShowEmpty = !loading && (!systemStatus || systemStatus.is_empty_state);
  
  const handleSeedDemo = async () => {
    // TODO: Implement demo data seeding
    console.log('Seeding demo data...');
    // This would make API calls to populate the system with sample data
  };
  
  const handleNavigate = (section: string) => {
    window.location.hash = section;
  };

  if (shouldShowEmpty) {
    return (
      <PageLayout
        title="Vienna OS Dashboard"
        description="Your AI governance and execution platform"
      >
        <EmptyDashboard 
          onSeedDemo={handleSeedDemo}
          onNavigate={handleNavigate}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Now"
      description="Current system posture and actionable summary"
    >
      <OperatorNowView />
    </PageLayout>
  );
}
