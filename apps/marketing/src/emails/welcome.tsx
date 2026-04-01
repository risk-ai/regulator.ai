import React from 'react';

interface WelcomeEmailProps {
  name: string;
  plan: string;
  email: string;
}

export function WelcomeEmail({ name, plan, email }: WelcomeEmailProps) {
  const firstName = name.split(' ')[0];
  
  return (
    <div style={{
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      color: '#333333'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 30px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          color: '#ffffff'
        }}>
          🛡️
        </div>
        <h1 style={{
          margin: '0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '-0.02em'
        }}>
          Welcome to Vienna OS
        </h1>
        <p style={{
          margin: '12px 0 0',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: '400'
        }}>
          Governed AI Authorization Layer
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '40px 30px' }}>
        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '0 0 24px',
          color: '#4a5568'
        }}>
          Hi {firstName},
        </p>
        
        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '0 0 24px',
          color: '#4a5568'
        }}>
          Welcome to Vienna OS! You're now part of a platform that makes AI governance
          practical, not bureaucratic. Whether you're protecting against AI risks or
          ensuring compliance, Vienna OS has you covered.
        </p>

        <div style={{
          backgroundColor: '#f7fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h2 style={{
            margin: '0 0 16px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            🚀 Get Started in 3 Steps
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#4a5568'
            }}>
              1. Explore the Live Console
            </h3>
            <p style={{
              margin: '0 0 12px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096'
            }}>
              See Vienna OS in action with our shared sandbox environment.
            </p>
            <a href="https://console.regulator.ai" style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#667eea',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Open Console →
            </a>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#4a5568'
            }}>
              2. Test the API
            </h3>
            <p style={{
              margin: '0 0 12px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096'
            }}>
              Try a simple governance request to see how Vienna works.
            </p>
            <div style={{
              backgroundColor: '#1a202c',
              color: '#e2e8f0',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'Monaco,"Cascadia Code","Roboto Mono",Consolas,"Times New Roman",monospace',
              overflow: 'auto'
            }}>
              curl -X POST https://console.regulator.ai/api/v1/agent/intent \<br/>
              {"  "}-H "Content-Type: application/json" \<br/>
              {"  "}-d '{`{"action":"check_health","source":"test"}`}'
            </div>
          </div>

          <div>
            <h3 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#4a5568'
            }}>
              3. Read the Quickstart
            </h3>
            <p style={{
              margin: '0 0 12px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096'
            }}>
              Learn how to integrate Vienna into your AI stack in under 10 minutes.
            </p>
            <a href="https://regulator.ai/docs" style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              View Documentation →
            </a>
          </div>
        </div>

        {plan === 'enterprise' ? (
          <div style={{
            backgroundColor: '#fef5e7',
            border: '2px solid #f6ad55',
            borderRadius: '12px',
            padding: '20px',
            margin: '24px 0'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#c05621'
            }}>
              🤝 Enterprise Setup
            </h3>
            <p style={{
              margin: '0 0 16px',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#9c4221'
            }}>
              Our team will reach out within 24 hours to discuss your enterprise deployment,
              compliance requirements, and custom governance policies.
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#e6fffa',
            border: '2px solid #38b2ac',
            borderRadius: '12px',
            padding: '20px',
            margin: '24px 0'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#234e52'
            }}>
              💡 Pro Tip
            </h3>
            <p style={{
              margin: '0',
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#285e61'
            }}>
              Start with simple health checks and governance policies. As you get comfortable,
              explore advanced features like warrant systems and multi-tier risk management.
            </p>
          </div>
        )}

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '32px 0 0',
          color: '#4a5568'
        }}>
          Questions? Just reply to this email — our team reads every message.
        </p>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '24px 0 0',
          color: '#4a5568'
        }}>
          Welcome aboard!<br/>
          <strong>— The Vienna OS Team</strong>
        </p>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f7fafc',
        padding: '24px 30px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <p style={{
          margin: '0 0 12px',
          fontSize: '12px',
          color: '#a0aec0'
        }}>
          Vienna OS by AI.Ventures
        </p>
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#a0aec0'
        }}>
          Sent to {email} • <a href="#" style={{ color: '#667eea' }}>Unsubscribe</a>
        </p>
      </div>
    </div>
  );
}