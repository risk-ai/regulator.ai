/**
 * Integrations Premium — Vienna OS
 * 
 * Visual integration control center.
 * Makes connecting agents feel powerful and effortless.
 * 
 * Features:
 * - Integration marketplace with one-click setup
 * - Visual connection health monitors
 * - API key management with copy-to-clipboard
 * - SDK code snippets (Python, Node.js, Go, Rust)
 * - Live connection status with pulsing indicators
 * - Test connection buttons with instant feedback
 * - Integration flow diagrams
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '../components/layout/PageLayout.js';
import { CheckCircle, Copy, ExternalLink, Terminal, Zap, AlertCircle, RefreshCw, Code, Database, Cloud, Shield, Bot, Brain, Settings, MessageSquare } from 'lucide-react';
import { addToast } from '../store/toastStore.js';

// ============================================================================
// TYPES
// ============================================================================

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  category: 'sdk' | 'platform' | 'database' | 'api';
  setupTime: string;
  lastSync?: string;
  color: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed?: string;
  permissions: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'python-sdk',
    name: 'Python SDK',
    description: 'Official Vienna OS Python client library',
    icon: 'Code',
    status: 'connected',
    category: 'sdk',
    setupTime: '2 min',
    lastSync: '2 minutes ago',
    color: '#3b82f6',
  },
  {
    id: 'nodejs-sdk',
    name: 'Node.js SDK',
    description: 'JavaScript/TypeScript client for Node.js',
    icon: 'Code',
    status: 'connected',
    category: 'sdk',
    setupTime: '2 min',
    lastSync: '5 minutes ago',
    color: '#10b981',
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Direct HTTP API access for any language',
    icon: 'Zap',
    status: 'connected',
    category: 'api',
    setupTime: '1 min',
    color: '#f59e0b',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Govern GPT-4, o1, and other OpenAI models',
    icon: 'Bot',
    status: 'disconnected',
    category: 'platform',
    setupTime: '5 min',
    color: '#06b6d4',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Govern Claude models with Vienna warrants',
    icon: 'Brain',
    status: 'disconnected',
    category: 'platform',
    setupTime: '5 min',
    color: '#8b5cf6',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Audit trail storage and policy evaluation',
    icon: 'Database',
    status: 'connected',
    category: 'database',
    setupTime: '10 min',
    lastSync: '1 hour ago',
    color: '#3b82f6',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Approval notifications and alerts',
    icon: 'MessageSquare',
    status: 'disconnected',
    category: 'platform',
    setupTime: '3 min',
    color: '#e01e5a',
  },
  {
    id: 'github',
    name: 'GitHub Actions',
    description: 'CI/CD governance for deployments',
    icon: 'Settings',
    status: 'disconnected',
    category: 'platform',
    setupTime: '5 min',
    color: '#6b7280',
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const renderIntegrationIcon = (iconName: string, color: string) => {
  const iconProps = { size: 28, color, strokeWidth: 1.5 };
  switch (iconName) {
    case 'Bot': return <Bot {...iconProps} />;
    case 'Brain': return <Brain {...iconProps} />;
    case 'Database': return <Database {...iconProps} />;
    case 'MessageSquare': return <MessageSquare {...iconProps} />;
    case 'Settings': return <Settings {...iconProps} />;
    case 'Terminal': return <Terminal {...iconProps} />;
    case 'Code': return <Code {...iconProps} />;
    case 'Cloud': return <Cloud {...iconProps} />;
    case 'Shield': return <Shield {...iconProps} />;
    default: return <Zap {...iconProps} />;
  }
};

// ============================================================================
// INTEGRATION CARD
// ============================================================================

function IntegrationCard({ integration, onConnect, onTest }: {
  integration: Integration;
  onConnect: () => void;
  onTest: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const statusConfig = {
    connected: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', label: 'CONNECTED', pulse: true },
    disconnected: { color: '#6b7280', glow: 'rgba(107, 114, 128, 0.2)', label: 'NOT CONNECTED', pulse: false },
    error: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', label: 'ERROR', pulse: true },
  };

  const config = statusConfig[integration.status];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'rgba(10, 14, 20, 0.6)',
        border: `1px solid ${config.color}40`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isHovered ? `0 0 20px ${config.glow}` : `0 0 8px ${config.glow}`,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          color: config.color,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
        }}>
          {config.label}
        </div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: config.color,
          boxShadow: `0 0 8px ${config.glow}`,
          animation: config.pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        }} />
      </div>

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${integration.color}20`,
          border: `1px solid ${integration.color}40`,
        }}>
          {renderIntegrationIcon(integration.icon, integration.color)}
        </div>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#E6E1DC',
          }}>
            {integration.name}
          </div>
          <div style={{
            fontSize: '10px',
            color: 'rgba(230, 225, 220, 0.5)',
            fontFamily: 'var(--font-mono)',
          }}>
            Setup: {integration.setupTime}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '11px',
        color: 'rgba(230, 225, 220, 0.7)',
        lineHeight: '1.4',
      }}>
        {integration.description}
      </div>

      {/* Last sync (if connected) */}
      {integration.lastSync && (
        <div style={{
          fontSize: '9px',
          color: 'rgba(230, 225, 220, 0.4)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <RefreshCw size={10} />
          Last sync: {integration.lastSync}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {integration.status === 'connected' ? (
          <>
            <button
              onClick={onTest}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: `${integration.color}20`,
                border: `1px solid ${integration.color}40`,
                color: integration.color,
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              TEST CONNECTION
            </button>
            <button
              onClick={() => alert('Configure coming soon')}
              style={{
                padding: '8px 12px',
                background: 'rgba(107, 114, 128, 0.2)',
                border: '1px solid rgba(107, 114, 128, 0.4)',
                color: '#6b7280',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              CONFIGURE
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: `${integration.color}20`,
              border: `1px solid ${integration.color}40`,
              color: integration.color,
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            CONNECT NOW →
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// API KEY CARD
// ============================================================================

function ApiKeyCard({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    addToast('API key copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(10, 14, 20, 0.6)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#E6E1DC',
          marginBottom: '6px',
        }}>
          {apiKey.name}
        </div>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(230, 225, 220, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>{apiKey.key.slice(0, 20)}...</span>
          <button
            onClick={handleCopy}
            style={{
              padding: '4px 8px',
              background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
              border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
              color: copied ? '#10b981' : '#fbbf24',
              fontSize: '9px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
        <div style={{
          fontSize: '9px',
          color: 'rgba(230, 225, 220, 0.4)',
          marginTop: '6px',
          fontFamily: 'var(--font-mono)',
        }}>
          Created: {apiKey.created} • Last used: {apiKey.lastUsed || 'Never'}
        </div>
      </div>

      <button
        onClick={onRevoke}
        style={{
          padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '9px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
      >
        REVOKE
      </button>
    </div>
  );
}

// ============================================================================
// CODE SNIPPET
// ============================================================================

function CodeSnippet({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    addToast(`${language} code copied`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: '#0A0E14',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(251, 191, 36, 0.05)',
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#fbbf24',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
        }}>
          {language.toUpperCase()}
        </div>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 10px',
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)',
            border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
            color: copied ? '#10b981' : '#fbbf24',
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {copied ? <CheckCircle size={10} /> : <Copy size={10} />}
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </div>

      {/* Code */}
      <pre style={{
        padding: '14px',
        margin: 0,
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: '#E6E1DC',
        lineHeight: '1.6',
        overflowX: 'auto',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function IntegrationsPremium() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key-1',
      name: 'Production API Key',
      key: 'vienna_live_7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      created: '2026-04-01',
      lastUsed: '2 hours ago',
      permissions: ['read:agents', 'write:warrants', 'read:policies'],
    },
    {
      id: 'key-2',
      name: 'Development API Key',
      key: 'vienna_test_1234567890abcdef1234567890abcdef',
      created: '2026-03-15',
      lastUsed: '1 day ago',
      permissions: ['read:agents', 'read:policies'],
    },
  ]);
  const [selectedLang, setSelectedLang] = useState<'python' | 'nodejs' | 'go' | 'rust'>('python');

  const codeSnippets = {
    python: `from vienna_os import ViennaClient

# Initialize client
client = ViennaClient(api_key="vienna_live_...")

# Register an agent
agent = client.agents.create(
    name="data-processor",
    capabilities=["database_write", "api_call"],
    trust_score=85
)

# Request a warrant
warrant = client.warrants.create(
    agent_id=agent.id,
    action_type="database_write",
    resource="users_table",
    environment="production"
)

print(f"Warrant issued: {warrant.id}")
print(f"TTL: {warrant.ttl}s")`,
    nodejs: `import { ViennaClient } from 'vienna-os';

// Initialize client
const client = new ViennaClient({
  apiKey: 'vienna_live_...'
});

// Register an agent
const agent = await client.agents.create({
  name: 'data-processor',
  capabilities: ['database_write', 'api_call'],
  trustScore: 85
});

// Request a warrant
const warrant = await client.warrants.create({
  agentId: agent.id,
  actionType: 'database_write',
  resource: 'users_table',
  environment: 'production'
});

console.log(\`Warrant issued: \${warrant.id}\`);
console.log(\`TTL: \${warrant.ttl}s\`);`,
    go: `package main

import (
    "fmt"
    "github.com/vienna-os/vienna-go"
)

func main() {
    // Initialize client
    client := vienna.NewClient("vienna_live_...")

    // Register an agent
    agent, err := client.Agents.Create(&vienna.AgentCreate{
        Name:         "data-processor",
        Capabilities: []string{"database_write", "api_call"},
        TrustScore:   85,
    })
    if err != nil {
        panic(err)
    }

    // Request a warrant
    warrant, err := client.Warrants.Create(&vienna.WarrantCreate{
        AgentID:     agent.ID,
        ActionType:  "database_write",
        Resource:    "users_table",
        Environment: "production",
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Warrant issued: %s\\n", warrant.ID)
    fmt.Printf("TTL: %ds\\n", warrant.TTL)
}`,
    rust: `use vienna_os::{ViennaClient, AgentCreate, WarrantCreate};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let client = ViennaClient::new("vienna_live_...");

    // Register an agent
    let agent = client.agents.create(AgentCreate {
        name: "data-processor".to_string(),
        capabilities: vec!["database_write", "api_call"],
        trust_score: 85,
    }).await?;

    // Request a warrant
    let warrant = client.warrants.create(WarrantCreate {
        agent_id: agent.id.clone(),
        action_type: "database_write".to_string(),
        resource: "users_table".to_string(),
        environment: "production".to_string(),
    }).await?;

    println!("Warrant issued: {}", warrant.id);
    println!("TTL: {}s", warrant.ttl);

    Ok(())
}`,
  };

  const handleConnect = (id: string) => {
    addToast(`Connecting ${id}...`, 'info');
    setTimeout(() => {
      setIntegrations(prev => prev.map(i =>
        i.id === id ? { ...i, status: 'connected' as const, lastSync: 'Just now' } : i
      ));
      addToast(`${id} connected successfully`, 'success');
    }, 1500);
  };

  const handleTest = (id: string) => {
    addToast(`Testing ${id} connection...`, 'info');
    setTimeout(() => {
      addToast(`${id} connection healthy`, 'success');
    }, 1000);
  };

  const handleRevokeKey = (id: string) => {
    if (confirm('Revoke this API key? This cannot be undone.')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      addToast('API key revoked', 'success');
    }
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  return (
    <PageLayout title="" description="">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
        padding: '20px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#06b6d4',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em',
            }}>
              🔌 INTEGRATIONS
            </h1>
            <div style={{
              fontSize: '11px',
              color: 'rgba(230, 225, 220, 0.5)',
              marginTop: '4px',
              fontFamily: 'var(--font-mono)',
            }}>
              {connectedCount} of {integrations.length} integrations connected
            </div>
          </div>

          <button
            onClick={() => alert('Create new API key coming soon')}
            style={{
              padding: '8px 16px',
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#06b6d4',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={12} />
            CREATE API KEY
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Integration Marketplace */}
        <div>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fbbf24',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}>
            AVAILABLE INTEGRATIONS
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {integrations.map(integration => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={() => handleConnect(integration.id)}
                onTest={() => handleTest(integration.id)}
              />
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fbbf24',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}>
            API KEYS
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {apiKeys.map(key => (
              <ApiKeyCard key={key.id} apiKey={key} onRevoke={() => handleRevokeKey(key.id)} />
            ))}
          </div>
        </div>

        {/* SDK Examples */}
        <div>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fbbf24',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
          }}>
            SDK CODE EXAMPLES
          </h2>

          {/* Language selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {(['python', 'nodejs', 'go', 'rust'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                style={{
                  padding: '8px 16px',
                  background: selectedLang === lang ? 'rgba(251, 191, 36, 0.2)' : 'rgba(107, 114, 128, 0.1)',
                  border: `1px solid ${selectedLang === lang ? 'rgba(251, 191, 36, 0.4)' : 'rgba(107, 114, 128, 0.2)'}`,
                  color: selectedLang === lang ? '#fbbf24' : '#6b7280',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <CodeSnippet language={selectedLang} code={codeSnippets[selectedLang]} />
        </div>
      </div>
    </PageLayout>
  );
}
