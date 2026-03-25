/**
 * Services Page — Vienna OS
 * 
 * Premier infrastructure health dashboard with governance engine status,
 * state graph metrics, and service health.
 */

import { PageLayout } from '../components/layout/PageLayout.js';
import { ServicePanel } from '../components/services/ServicePanel.js';

const governanceEngines = [
  { name: 'Policy Engine', icon: '📋', desc: 'Rule evaluation & enforcement' },
  { name: 'Verification Engine', icon: '🔍', desc: 'Post-execution warrant matching' },
  { name: 'Execution Watchdog', icon: '👁️', desc: 'Anomaly detection & containment' },
  { name: 'Reconciliation Gate', icon: '⚖️', desc: 'State consistency resolution' },
  { name: 'Circuit Breaker Manager', icon: '🔌', desc: 'Failure isolation & recovery' },
];

export function ServicesPage() {
  return (
    <PageLayout
      title="Services"
      description="Infrastructure health & governance engine status"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Governance Engines */}
        <section>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            Governance Engines
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {governanceEngines.map((engine) => (
              <div
                key={engine.name}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>{engine.icon}</span>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      {engine.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-tertiary)',
                      marginTop: '2px',
                    }}>
                      {engine.desc}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  background: 'rgba(74, 222, 128, 0.08)',
                  border: '1px solid rgba(74, 222, 128, 0.15)',
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 6px rgba(74, 222, 128, 0.4)',
                  }} />
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#4ade80',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    Operational
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* State Graph */}
        <section>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            State Graph
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}>
            {[
              { label: 'Database Size', value: '~15 MB', icon: '💾' },
              { label: 'Tables', value: '15', icon: '📊' },
              { label: 'Integrity', value: 'Healthy', icon: '✅', isHealthy: true },
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{metric.icon}</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: metric.isHealthy ? '#4ade80' : 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '4px',
                }}>
                  {metric.value}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: 500,
                }}>
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Gateway Services */}
        <section>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '12px',
          }}>
            Gateway Services
          </h2>
          <ServicePanel />
        </section>
      </div>
    </PageLayout>
  );
}
