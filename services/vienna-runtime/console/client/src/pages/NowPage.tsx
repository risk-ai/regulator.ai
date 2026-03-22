/**
 * Now Page
 * Phase 2: Information Architecture
 * 
 * Landing page showing current system posture and actionable summary
 */

import { PageLayout } from '../components/layout/PageLayout.js';
import { OperatorNowView } from '../components/OperatorNowView.js';

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
  return (
    <PageLayout
      title="Now"
      description="Current system posture and actionable summary"
    >
      <OperatorNowView />
    </PageLayout>
  );
}
