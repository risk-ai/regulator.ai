# Vienna OS Onboarding Wizard

This directory contains the guided onboarding wizard for new Vienna OS console users.

## Components

- `OnboardingWizard.tsx` - Main wizard component with 4 setup steps

## Features

### 4-Step Wizard
1. **Welcome & Organization Setup** - Welcome message and organization name confirmation
2. **Create Your First Policy** - Guided policy creation with templates (Conservative, Balanced, Permissive)
3. **Register an Agent** - Create first AI agent with name, description, and risk tier
4. **Connect & Test** - SDK integration guide with test capability

### Design
- Dark theme matching console (bg-gray-900, text-white, purple accents)
- Step indicator with progress visualization
- Previous/Next navigation with validation
- Skip option on each step
- Responsive design for mobile/tablet
- Success animations and confetti effects

### State Management
- Onboarding completion tracked in both localStorage and database
- API endpoints for server-side status persistence
- Graceful fallback to localStorage-only if database unavailable

## API Endpoints

The wizard integrates with these backend endpoints:

- `GET /api/v1/onboarding/status` - Check completion status
- `POST /api/v1/onboarding/complete` - Mark onboarding as completed
- `POST /api/v1/onboarding/step` - Update current step (optional)
- `DELETE /api/v1/onboarding` - Reset status (testing only)

It also creates resources via:
- `POST /api/v1/policies` - Create governance policy
- `POST /api/v1/agents` - Register AI agent

## Database Schema

The onboarding system requires an `onboarding_status` table:

```sql
CREATE TABLE public.onboarding_status (
  tenant_id UUID PRIMARY KEY,
  completed BOOLEAN DEFAULT FALSE,
  current_step INTEGER DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Run `node scripts/setup-onboarding-table.js` to create the table.

## Integration

The wizard is automatically shown to authenticated users who haven't completed onboarding:

```tsx
// In App.tsx
{showOnboarding && (
  <OnboardingWizard
    onComplete={handleOnboardingComplete}
    onSkip={handleOnboardingSkip}
  />
)}
```

## Templates

Policy templates are built-in and don't require backend data:

- **Conservative**: All actions require T2+ approval (multi-party)
- **Balanced**: Risk-based governance with smart approvals  
- **Permissive**: Mostly auto-approved with minimal friction

## SDK Integration

Step 4 provides code snippets for both Node.js/TypeScript and Python:

```typescript
import { ViennaOS } from 'vienna-os';

const vienna = new ViennaOS({
  agentId: 'agent-id',
  apiKey: 'your-api-key',
  baseUrl: '/api/v1'
});
```

```python
import vienna_os

vienna = vienna_os.Client(
    agent_id='agent-id',
    api_key='your-api-key',
    base_url='/api/v1'
)
```

The test functionality simulates a successful governance check to verify the setup is working.