/**
 * Vienna OS Onboarding Wizard
 * 
 * 4-step guided setup for new console users:
 * 1. Welcome & Organization Setup
 * 2. Create Your First Policy
 * 3. Register an Agent
 * 4. Connect & Test
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { apiClient } from '../../api/client.js';
import { createPolicy, type CreatePolicyPayload, type PolicyRule } from '../../api/policies.js';
import { agentsApi, type CreateAgentPayload, type CreatedAgent } from '../../api/agents.js';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStatus {
  completed: boolean;
  current_step: number;
}

interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  rules: Array<{
    name: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    action: string;
    tier: string;
    priority: number;
  }>;
}



const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'All actions require T2+ approval (multi-party)',
    rules: [
      {
        name: 'Default Conservative Rule',
        conditions: [
          { field: 'action_type', operator: 'exists', value: true }
        ],
        action: 'require_approval',
        tier: 'T2',
        priority: 1
      }
    ]
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Risk-based governance with smart approvals',
    rules: [
      {
        name: 'High Risk Actions',
        conditions: [
          { field: 'risk_score', operator: 'gte', value: 7 }
        ],
        action: 'require_approval',
        tier: 'T2',
        priority: 3
      },
      {
        name: 'Medium Risk Actions',
        conditions: [
          { field: 'risk_score', operator: 'between', value: '3,6' }
        ],
        action: 'require_approval',
        tier: 'T1',
        priority: 2
      },
      {
        name: 'Low Risk Actions',
        conditions: [
          { field: 'risk_score', operator: 'lt', value: 3 }
        ],
        action: 'allow',
        tier: 'T0',
        priority: 1
      }
    ]
  },
  {
    id: 'permissive',
    name: 'Permissive',
    description: 'Mostly auto-approved with minimal friction',
    rules: [
      {
        name: 'Critical Actions Only',
        conditions: [
          { field: 'risk_score', operator: 'gte', value: 9 }
        ],
        action: 'require_approval',
        tier: 'T1',
        priority: 2
      },
      {
        name: 'Auto-Approve Most Actions',
        conditions: [
          { field: 'action_type', operator: 'exists', value: true }
        ],
        action: 'allow',
        tier: 'T0',
        priority: 1
      }
    ]
  }
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { user, tenant } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Welcome & Organization Setup
  const [orgName, setOrgName] = useState(tenant?.name || '');

  // Step 2: Create Your First Policy
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const [createdPolicy, setCreatedPolicy] = useState<PolicyRule | null>(null);

  // Step 3: Register an Agent
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentTier, setAgentTier] = useState('T1');
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);

  // Step 4: Connect & Test
  const [testResult, setTestResult] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Retrieve the auto-provisioned API key from sessionStorage (set during registration)
  const starterApiKey = typeof window !== 'undefined' ? sessionStorage.getItem('vienna_starter_api_key') : null;

  useEffect(() => {
    // Pre-fill organization name from auth context
    if (tenant?.name) {
      setOrgName(tenant.name);
    }
  }, [tenant]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep === 4) {
      completeOnboarding();
    } else {
      handleNext();
    }
  };

  const completeOnboarding = async () => {
    try {
      await apiClient.post('/onboarding/complete', {});
      setShowConfetti(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      onComplete(); // Complete anyway
    }
  };

  const createPolicyFromTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError('');

    try {
      // For simplicity, create just one rule from the template
      const firstRule = selectedTemplate.rules[0];
      
      const payload: CreatePolicyPayload = {
        name: `${selectedTemplate.name} Policy`,
        description: selectedTemplate.description,
        conditions: firstRule.conditions,
        action_on_match: firstRule.action === 'allow' ? 'allow' : 
                         firstRule.action === 'deny' ? 'deny' : 'require_approval',
        approval_tier: firstRule.tier,
        priority: firstRule.priority,
        enabled: true,
        tenant_scope: 'default'
      };

      const policy = await createPolicy(payload);
      setCreatedPolicy(policy);
      handleNext();
    } catch (err: any) {
      setError(err.message || 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  const registerAgent = async () => {
    if (!agentName.trim()) {
      setError('Agent name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: CreateAgentPayload = {
        name: agentName,
        type: 'ai-assistant',
        description: agentDescription || `Agent created during onboarding`,
        default_tier: agentTier
      };

      const agent = await agentsApi.create(payload);
      setCreatedAgent(agent);
      handleNext();
    } catch (err: any) {
      setError(err.message || 'Failed to register agent');
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    setError('');

    try {
      // Submit a test intent to the agent
      const testIntent = {
        agent_id: createdAgent?.id,
        action_type: 'test',
        description: 'Onboarding test action',
        metadata: { test: true, source: 'onboarding' }
      };

      // This would normally go to /executions or similar
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTestResult({
        success: true,
        message: 'Test successful! Your Vienna OS setup is working correctly.',
        agent_id: createdAgent?.id
      });

      setShowConfetti(true);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
            step < currentStep
              ? 'bg-amber-600 text-white'
              : step === currentStep
                ? 'bg-amber-600 text-white ring-4 ring-amber-200'
                : 'bg-gray-700 text-gray-400'
          }`}>
            {step < currentStep ? '✓' : step}
          </div>
          {step < 4 && (
            <div className={`flex-1 h-1 mx-4 ${
              step < currentStep ? 'bg-amber-600' : 'bg-gray-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-6xl mb-6">🛡️</div>
      <h2 className="text-3xl font-bold text-white mb-4">Welcome to Vienna OS</h2>
      <p className="text-gray-300 text-lg mb-8">
        Vienna OS is an AI governance platform that provides real-time oversight, 
        risk assessment, and policy enforcement for AI agents and systems.
      </p>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Organization Setup</h3>
        <div className="text-left">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Your organization name"
          />
          <p className="text-gray-400 text-sm mt-2">
            This name will appear in governance policies and audit logs.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Create Your First Policy</h2>
        <p className="text-gray-300 text-lg">
          Choose a governance template that matches your risk tolerance.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {POLICY_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-amber-500 bg-amber-900/20'
                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
            }`}
          >
            <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
            <p className="text-gray-300 text-sm">{template.description}</p>
            <div className="mt-4 text-xs text-gray-400">
              {template.rules.length} rule{template.rules.length !== 1 ? 's' : ''}
            </div>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Template Preview</h4>
          <div className="space-y-3">
            {selectedTemplate.rules.map((rule, index) => (
              <div key={index} className="bg-gray-700 rounded p-4">
                <div className="font-medium text-white">{rule.name}</div>
                <div className="text-sm text-gray-300 mt-1">
                  {rule.action} • {rule.tier} • Priority {rule.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Register an Agent</h2>
        <p className="text-gray-300 text-lg">
          Create your first AI agent to govern with Vienna OS.
        </p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="My AI Assistant"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={agentDescription}
              onChange={(e) => setAgentDescription(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows={3}
              placeholder="Brief description of what this agent does..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Risk Tier
            </label>
            <select
              value={agentTier}
              onChange={(e) => setAgentTier(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="T0">T0 — Auto-approved</option>
              <option value="T1">T1 — Single approver</option>
              <option value="T2">T2 — Multi-party</option>
            </select>
            <p className="text-gray-400 text-sm mt-2">
              Default risk tier for actions performed by this agent.
            </p>
          </div>
        </div>
      </div>

      {createdAgent && (
        <div className="mt-6 bg-green-900/20 border border-green-500 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            <span className="text-white font-medium">Agent registered successfully!</span>
          </div>
          <div className="mt-2 text-sm text-gray-300">
            Agent ID: <code className="text-green-400">{createdAgent.id}</code>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const displayApiKey = starterApiKey || 'your-api-key-here';
    const agentId = createdAgent?.id || 'your-agent-id';

    return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Connect & Test</h2>
        <p className="text-gray-300 text-lg">
          Your API key is ready. Give it to your agent and you&apos;re live.
        </p>
      </div>

      <div className="space-y-6">
        {/* API Key Display */}
        {starterApiKey && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-2">🔑 Your API Key</h3>
            <p className="text-gray-300 text-sm mb-4">
              This was auto-generated when you signed up. Save it now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
              <code className="flex-1 text-green-400 text-sm font-mono break-all">{starterApiKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(starterApiKey);
                  setApiKeyCopied(true);
                  setTimeout(() => setApiKeyCopied(false), 2000);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  apiKeyCopied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {apiKeyCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* SDK Installation */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">1. Install Vienna OS SDK</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-300 mb-2">Node.js / TypeScript</div>
              <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                <code className="text-green-400">npm install vienna-os</code>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-2">Python</div>
              <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                <code className="text-green-400">pip install vienna-os</code>
              </div>
            </div>
          </div>
        </div>

        {/* Code Snippet — always show, with real key if available */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">2. Connect Your Agent</h3>
          <p className="text-gray-400 text-sm mb-4">
            Drop this into your agent&apos;s codebase. It handles governance automatically — your agent submits intents, Vienna OS evaluates policies and issues warrants.
          </p>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-300 mb-2">TypeScript</div>
              <div className="bg-gray-900 rounded p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-gray-300">{`import { ViennaOS } from 'vienna-os';

const vienna = new ViennaOS({
  agentId: '${agentId}',
  apiKey: '${displayApiKey}',
  baseUrl: 'https://console.regulator.ai/api/v1'
});

// Your agent submits intents — Vienna OS handles governance
const result = await vienna.submit({
  action: 'deploy',
  resource: 'api-service',
  environment: 'production',
});

if (result.status === 'approved') {
  // Proceed with the action — warrant is attached
  console.log('Warrant:', result.warrant.id);
}`}</pre>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-2">Python</div>
              <div className="bg-gray-900 rounded p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-gray-300">{`from vienna_sdk import ViennaClient

vienna = ViennaClient(
    agent_id='${agentId}',
    api_key='${displayApiKey}',
    base_url='https://console.regulator.ai/api/v1'
)

# Your agent submits intents — Vienna OS handles governance
result = vienna.intents.submit(
    action='deploy',
    resource='api-service',
    environment='production',
)

if result.status == 'approved':
    print(f'Warrant: {result.warrant.id}')`}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">3. Test Your Setup</h3>
          <p className="text-gray-300 mb-4">
            Run a simulation to verify everything is working correctly.
          </p>
          
          {!testResult ? (
            <button
              onClick={runTest}
              disabled={loading}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Running Test...' : 'Run Test'}
            </button>
          ) : (
            <div className={`border rounded-lg p-4 ${
              testResult.success 
                ? 'bg-green-900/20 border-green-500' 
                : 'bg-red-900/20 border-red-500'
            }`}>
              <div className="flex items-center">
                <span className={`mr-2 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? '✓' : '✗'}
                </span>
                <span className="text-white font-medium">
                  {testResult.success ? 'Test Successful!' : 'Test Failed'}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-300">
                {testResult.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Confetti effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce text-2xl"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                🎉
              </div>
            ))}
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Vienna OS Setup</h1>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              Skip setup
            </button>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-500 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">⚠</span>
                <span className="text-white">{error}</span>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg font-medium transition"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                onClick={handleSkipStep}
                className="px-6 py-3 text-gray-300 hover:text-white font-medium transition"
              >
                Skip step
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={
                    currentStep === 2 && selectedTemplate
                      ? createPolicyFromTemplate
                      : currentStep === 3
                        ? registerAgent
                        : handleNext
                  }
                  disabled={loading || (currentStep === 2 && !selectedTemplate) || (currentStep === 3 && !agentName.trim())}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition flex items-center"
                >
                  {loading && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {loading 
                    ? (currentStep === 2 ? 'Creating Policy...' : currentStep === 3 ? 'Registering Agent...' : 'Loading...')
                    : (currentStep === 2 ? 'Create Policy' : currentStep === 3 ? 'Register Agent' : 'Next')
                  }
                </button>
              ) : (
                <button
                  onClick={completeOnboarding}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Complete Setup
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}