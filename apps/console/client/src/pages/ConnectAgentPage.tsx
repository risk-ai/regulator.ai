/**
 * Connect Your Agent — Vienna OS
 * 
 * 4-step wizard to onboard new agents
 */

import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

type IntegrationMethod = 'api-proxy' | 'sdk' | 'webhook';
type Provider = 'openai' | 'anthropic' | 'google' | 'custom';

interface PolicyPack {
  id: string;
  name: string;
  description: string;
  templates: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export function ConnectAgentPage() {
  const tenant = useAuthStore((state) => state.tenant);
  const tenantId = tenant?.id || 'unknown';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [method, setMethod] = useState<IntegrationMethod | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [selectedPolicyPack, setSelectedPolicyPack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyPacks, setPolicyPacks] = useState<PolicyPack[]>([]);

  useEffect(() => {
    // Load policy packs for step 3
    loadPolicyPacks();
  }, []);

  const loadPolicyPacks = async () => {
    try {
      const response: any = await apiClient.get('/policy-templates/packs');
      setPolicyPacks(response.packs || [
        {
          id: 'soc2',
          name: 'SOC 2',
          description: 'Security controls for data handling and system availability',
          templates: [
            { id: 'access-control', name: 'Access Control', description: 'User authentication and authorization' },
            { id: 'data-protection', name: 'Data Protection', description: 'Encryption and data handling policies' }
          ]
        },
        {
          id: 'financial',
          name: 'Financial',
          description: 'Controls for financial operations and transactions',
          templates: [
            { id: 'transaction-limits', name: 'Transaction Limits', description: 'Spending and transfer limits' },
            { id: 'dual-approval', name: 'Dual Approval', description: 'Multi-person approval for high-value actions' }
          ]
        },
        {
          id: 'hipaa',
          name: 'HIPAA',
          description: 'Healthcare data privacy and security compliance',
          templates: [
            { id: 'phi-protection', name: 'PHI Protection', description: 'Protected health information handling' },
            { id: 'access-audit', name: 'Access Auditing', description: 'Healthcare data access logging' }
          ]
        },
        {
          id: 'dev-safety',
          name: 'Development Safety',
          description: 'Safe deployment and development practices',
          templates: [
            { id: 'deployment-gates', name: 'Deployment Gates', description: 'Production deployment controls' },
            { id: 'code-review', name: 'Code Review', description: 'Automated code review requirements' }
          ]
        }
      ]);
    } catch (err) {

      // Use default fallback above
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.post('/connect/test', {
        method,
        provider,
        apiKey: method === 'api-proxy' ? apiKey : undefined
      });
      
      // On success, move to next step
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const activatePolicyPack = async () => {
    if (!selectedPolicyPack) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await apiClient.post('/connect/activate-pack', {
        policy_pack_id: selectedPolicyPack,
        tenant_id: tenantId
      });
      
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate policy pack');
    } finally {
      setLoading(false);
    }
  };

  const sendTestAction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post('/intent', {
        agent_id: 'connect-wizard-test',
        action_type: 'test_action',
        description: 'Test action from Connect Your Agent wizard',
        context: {
          integration_method: method,
          provider: method === 'api-proxy' ? provider : undefined
        },
        risk_tier: 1
      });
      
      // Success!

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test action');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderStep1 = () => (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Choose Integration Method
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          How would you like to connect your agent to Vienna?
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
        {[
          {
            id: 'api-proxy' as IntegrationMethod,
            icon: '🔑',
            title: 'API Key Proxy',
            description: 'Paste your LLM API key. Vienna wraps it and governs every call.',
            recommended: true
          },
          {
            id: 'sdk' as IntegrationMethod,
            icon: '📦',
            title: 'SDK Integration',
            description: 'Add 5 lines to your agent code.',
            recommended: false
          },
          {
            id: 'webhook' as IntegrationMethod,
            icon: '🔌',
            title: 'Webhook',
            description: 'Point your agent\'s webhook to Vienna.',
            recommended: false
          }
        ].map((option) => (
          <div
            key={option.id}
            onClick={() => {
              setMethod(option.id);
              setCurrentStep(2);
            }}
            style={{
              padding: 20,
              border: `1px solid var(--border-subtle)`,
              borderRadius: 8,
              cursor: 'pointer',
              background: 'var(--bg-primary)',
              transition: 'all 150ms',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.background = 'var(--bg-primary)';
            }}
          >
            {option.recommended && (
              <div style={{
                position: 'absolute',
                top: -8,
                right: 16,
                background: '#f59e0b',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Recommended
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 24, marginTop: 2 }}>{option.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {option.title}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {option.description}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Configure {method === 'api-proxy' ? 'API Proxy' : method === 'sdk' ? 'SDK' : 'Webhook'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          {method === 'api-proxy' && 'Provide your LLM API key to enable proxied governance'}
          {method === 'sdk' && 'Copy the integration code to your agent'}
          {method === 'webhook' && 'Configure your webhook endpoint'}
        </p>
      </div>

      {method === 'api-proxy' && (
        <div style={{ maxWidth: 500 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 14
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              API Key
            </label>
            <input
              type="password"
              placeholder={`Enter your ${provider} API key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          <div style={{
            padding: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            marginBottom: 20
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Vienna Proxy URL
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
              background: 'var(--bg-primary)',
              padding: 8,
              borderRadius: 4,
              border: '1px solid var(--border-subtle)'
            }}>
              https://console.regulator.ai/api/v1/proxy/{tenantId}/v1/chat/completions
            </div>
          </div>

          <button
            onClick={testConnection}
            disabled={!apiKey || loading}
            style={{
              padding: '10px 20px',
              background: apiKey ? '#f59e0b' : 'var(--bg-tertiary)',
              color: apiKey ? 'white' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: apiKey ? 'pointer' : 'not-allowed',
              transition: 'background 150ms'
            }}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      )}

      {method === 'sdk' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Install Command
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '8px 12px'
            }}>
              <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                npm install vienna-os
              </code>
              <button
                onClick={() => copyToClipboard('npm install vienna-os')}
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Integration Code
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: 12,
              position: 'relative'
            }}>
              <button
                onClick={() => copyToClipboard(`import { Vienna } from 'vienna-os';
const vienna = new Vienna({ 
  apiKey: 'vos_YOUR_KEY',
  endpoint: 'https://console.regulator.ai'
});
// Wrap your agent's actions
const result = await vienna.govern('deploy_to_prod', { env: 'production' });`)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  padding: '4px 8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Copy
              </button>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-primary)',
                margin: 0,
                whiteSpace: 'pre-wrap',
                paddingRight: 60
              }}>{`import { Vienna } from 'vienna-os';
const vienna = new Vienna({ 
  apiKey: 'vos_YOUR_KEY',
  endpoint: 'https://console.regulator.ai'
});
// Wrap your agent's actions
const result = await vienna.govern('deploy_to_prod', { env: 'production' });`}</pre>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(3)}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        </div>
      )}

      {method === 'webhook' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Webhook URL
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-primary)'
            }}>
              https://console.regulator.ai/api/v1/webhooks/agent/{tenantId}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
              Expected Payload
            </div>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              padding: 12
            }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-primary)',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>{`{
  "agent_id": "your-agent-id",
  "action_type": "deploy_to_prod",
  "description": "Deploy version 1.2.3 to production",
  "context": { "version": "1.2.3" },
  "risk_tier": 2
}`}</pre>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(3)}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Continue
          </button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 16,
          padding: '10px 12px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6,
          color: '#ef4444',
          fontSize: 14
        }}>
          {error}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Select Policy Pack
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Choose a pre-configured policy pack or skip to configure policies later.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16, maxWidth: 700, marginBottom: 32 }}>
        {policyPacks.map((pack) => (
          <div
            key={pack.id}
            onClick={() => setSelectedPolicyPack(pack.id)}
            style={{
              padding: 20,
              border: `2px solid ${selectedPolicyPack === pack.id ? '#f59e0b' : 'var(--border-subtle)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              background: selectedPolicyPack === pack.id ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-primary)',
              transition: 'all 150ms'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {pack.name}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {pack.description}
                </div>
              </div>
              {selectedPolicyPack === pack.id && (
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12
                }}>
                  ✓
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pack.templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    background: 'var(--bg-secondary)',
                    padding: '2px 6px',
                    borderRadius: 3
                  }}
                >
                  {template.name}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Skip option */}
        <div
          onClick={() => setSelectedPolicyPack(null)}
          style={{
            padding: 20,
            border: `1px dashed ${selectedPolicyPack === null ? '#f59e0b' : 'var(--border-subtle)'}`,
            borderRadius: 8,
            cursor: 'pointer',
            background: selectedPolicyPack === null ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
            textAlign: 'center',
            transition: 'all 150ms'
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Skip — I'll configure policies later
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Proceed without applying a policy pack
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => setCurrentStep(2)}
          style={{
            padding: '10px 16px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        
        <button
          onClick={selectedPolicyPack ? activatePolicyPack : () => setCurrentStep(4)}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Activating...' : selectedPolicyPack ? 'Activate Policy Pack' : 'Continue'}
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          padding: '10px 12px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6,
          color: '#ef4444',
          fontSize: 14
        }}>
          {error}
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      
      <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
        Your Agent is Connected!
      </h2>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32, lineHeight: 1.5 }}>
        Vienna is now protecting your agent. Try sending a test action through the governance pipeline.
      </p>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 16 }}>
          Test Your Integration
        </div>
        
        <button
          onClick={sendTestAction}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 16,
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Sending...' : 'Send Test Action'}
        </button>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 6,
            color: '#ef4444',
            fontSize: 12
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={() => window.location.href = '/fleet'}
          style={{
            padding: '10px 16px',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          View Fleet
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: step <= currentStep ? '#f59e0b' : 'var(--bg-tertiary)',
            color: step <= currentStep ? 'white' : 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600
          }}>
            {step < currentStep ? '✓' : step}
          </div>
          {step < 4 && (
            <div style={{
              width: 40,
              height: 2,
              background: step < currentStep ? '#f59e0b' : 'var(--border-subtle)'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-3">
          <Bot className="text-emerald-400" size={20} /> Connect Your Agent
        </h1>
        <p className="text-[12px] text-white/40 mt-1 font-mono">Set up governance for your first agent</p>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {renderStepIndicator()}
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
}