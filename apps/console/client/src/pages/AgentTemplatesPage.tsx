/**
 * Agent Templates Page — Vienna OS
 * 
 * Framework-specific governance templates with ready-to-use integration code.
 * Terminal gold theme, consistent with console design language.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive.js';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  framework: string;
  icon: string;
  config: Record<string, unknown>;
  code_snippet: string;
  tags: string[];
  use_count: number;
  created_at: string;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  langchain: '#10b981',
  openai: '#6366f1',
  crewai: '#f59e0b',
  autogen: '#3b82f6',
  anthropic: '#ec4899',
  custom: '#64748b',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  langchain: 'LangChain',
  openai: 'OpenAI',
  crewai: 'CrewAI',
  autogen: 'AutoGen',
  anthropic: 'Anthropic',
  custom: 'Custom',
};

export default function AgentTemplatesPage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeFramework, setActiveFramework] = useState<string>('all');
  const { isMobile } = useResponsive();

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = activeFramework !== 'all' ? `?framework=${activeFramework}` : '';
      const response = await fetch(`/api/v1/agent-templates${params}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vienna_access_token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load templates');
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [activeFramework]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const frameworks = ['all', ...Object.keys(FRAMEWORK_LABELS)];
  const filteredTemplates = activeFramework === 'all'
    ? templates
    : templates.filter(t => t.framework === activeFramework);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
          Agent Templates
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Framework-specific governance templates with ready-to-use integration code
        </p>
      </div>

      {/* Framework Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {frameworks.map(fw => (
          <button
            key={fw}
            onClick={() => setActiveFramework(fw)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              background: activeFramework === fw ? 'rgba(212,175,55,0.15)' : 'transparent',
              color: activeFramework === fw ? '#d4af37' : 'var(--text-secondary)',
              border: `1px solid ${activeFramework === fw ? 'rgba(212,175,55,0.3)' : 'var(--border-subtle)'}`,
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 150ms',
              textTransform: 'capitalize',
            }}
          >
            {fw === 'all' ? 'All' : FRAMEWORK_LABELS[fw] || fw}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>No templates found</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
            {activeFramework !== 'all' ? 'Try selecting a different framework' : 'Templates will appear here once configured'}
          </div>
        </div>
      ) : (
        /* Template Grid */
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filteredTemplates.map(template => {
            const fwColor = FRAMEWORK_COLORS[template.framework] || '#64748b';
            const riskTier = (template.config as any)?.risk_tier || 'T0';

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  position: 'relative',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              >
                {/* Top row: icon + framework badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{template.icon || '🤖'}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)',
                      background: `${fwColor}15`, color: fwColor,
                      border: `1px solid ${fwColor}30`,
                    }}>
                      {FRAMEWORK_LABELS[template.framework] || template.framework}
                    </span>
                    <span style={{
                      padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)',
                      background: riskTier === 'T0' ? 'rgba(16,185,129,0.1)' : riskTier === 'T1' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: riskTier === 'T0' ? '#10b981' : riskTier === 'T1' ? '#f59e0b' : '#ef4444',
                      border: `1px solid ${riskTier === 'T0' ? 'rgba(16,185,129,0.2)' : riskTier === 'T1' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                      {riskTier}
                    </span>
                  </div>
                </div>

                {/* Name + Description */}
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: 'var(--font-mono)' }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 12px', lineHeight: '1.5' }}>
                  {template.description}
                </p>

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {template.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '2px 6px', fontSize: '10px', fontFamily: 'var(--font-mono)',
                        background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {template.use_count} team{template.use_count !== 1 ? 's' : ''} using
                  </span>
                  <span style={{ fontSize: '11px', color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
                    View Code →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Code Modal */}
      {selectedTemplate && (
        <div
          onClick={() => setSelectedTemplate(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border-subtle)',
              maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              padding: '24px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '40px' }}>{selectedTemplate.icon || '🤖'}</span>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {selectedTemplate.name}
                  </h2>
                  <span style={{
                    padding: '2px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)',
                    background: `${FRAMEWORK_COLORS[selectedTemplate.framework] || '#64748b'}15`,
                    color: FRAMEWORK_COLORS[selectedTemplate.framework] || '#64748b',
                    border: `1px solid ${FRAMEWORK_COLORS[selectedTemplate.framework] || '#64748b'}30`,
                  }}>
                    {FRAMEWORK_LABELS[selectedTemplate.framework] || selectedTemplate.framework}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
              {selectedTemplate.description}
            </p>

            {/* Code Snippet */}
            {selectedTemplate.code_snippet && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Integration Code
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedTemplate.code_snippet)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                      background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(212,175,55,0.1)',
                      color: copied ? '#10b981' : '#d4af37',
                      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(212,175,55,0.2)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                  padding: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)',
                  color: '#10b981', overflowX: 'auto', lineHeight: '1.6',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {selectedTemplate.code_snippet}
                </pre>
              </div>
            )}

            {/* Config */}
            {selectedTemplate.config && Object.keys(selectedTemplate.config).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Default Configuration
                </span>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)', padding: '12px' }}>
                  {Object.entries(selectedTemplate.config).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { window.location.hash = '#/connect'; setSelectedTemplate(null); }}
                style={{
                  flex: 1, padding: '10px', fontSize: '13px', fontFamily: 'var(--font-mono)',
                  background: 'rgba(212,175,55,0.15)', color: '#d4af37',
                  border: '1px solid rgba(212,175,55,0.3)', cursor: 'pointer',
                }}
              >
                Connect Agent →
              </button>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: '10px 20px', fontSize: '13px', fontFamily: 'var(--font-mono)',
                  background: 'transparent', color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
