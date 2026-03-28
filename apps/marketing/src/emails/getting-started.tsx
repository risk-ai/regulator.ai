import React from 'react';

interface GettingStartedEmailProps {
  name: string;
  email: string;
}

export function GettingStartedEmail({ name, email }: GettingStartedEmailProps) {
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
        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
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
          🎯
        </div>
        <h1 style={{
          margin: '0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '-0.02em'
        }}>
          Ready to Create Your First Policy?
        </h1>
        <p style={{
          margin: '12px 0 0',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: '400'
        }}>
          Let's build some governance together
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
          Yesterday you joined Vienna OS. Today, let's create your first governance policy!
          Don't worry — it's easier than you might think.
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
            📋 Your First Policy: Content Safety
          </h2>
          
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#718096',
            margin: '0 0 20px'
          }}>
            Let's start simple. Here's a basic content safety policy that blocks harmful requests:
          </p>

          <div style={{
            backgroundColor: '#1a202c',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'Monaco,"Cascadia Code","Roboto Mono",Consolas,"Times New Roman",monospace',
            overflow: 'auto',
            marginBottom: '20px'
          }}>
{`{
  "name": "content_safety_basic",
  "description": "Block harmful or inappropriate content",
  "rules": [
    {
      "condition": {
        "input_contains": [
          "violence", "hate", "harassment", 
          "self-harm", "illegal"
        ]
      },
      "action": "block",
      "message": "Request blocked for safety"
    }
  ],
  "risk_tier": 1,
  "enabled": true
}`}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            flexDirection: 'row',
            flexWrap: 'wrap'
          }}>
            <a href="https://vienna-os.fly.dev" style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#667eea',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              📝 Create This Policy
            </a>
            <a href="https://regulator.ai/docs/policies" style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#667eea',
              textDecoration: 'none',
              padding: '12px 20px',
              border: '1px solid #667eea',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              📚 Policy Templates
            </a>
          </div>
        </div>

        <div style={{
          backgroundColor: '#e6fffa',
          border: '2px solid #38b2ac',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#234e52'
          }}>
            🎮 Try the Interactive Demo
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#285e61',
            margin: '0 0 16px'
          }}>
            See governance in action! Our /try demo lets you submit requests and 
            watch Vienna's policy engine work in real-time.
          </p>
          <a href="https://regulator.ai/try" style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#38b2ac',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            🎯 Try Interactive Demo
          </a>
        </div>

        <div style={{
          borderLeft: '4px solid #667eea',
          paddingLeft: '20px',
          margin: '32px 0'
        }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#4a5568'
          }}>
            💡 Next Steps
          </h3>
          <ul style={{
            margin: '0',
            padding: '0',
            listStyle: 'none'
          }}>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0' }}>✓</span>
              Create your first content safety policy
            </li>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0' }}>✓</span>
              Test it with the interactive demo
            </li>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0' }}>⏱</span>
              Tomorrow: Learn about production deployment
            </li>
          </ul>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '32px 0 0',
          color: '#4a5568'
        }}>
          Building AI governance doesn't have to be intimidating. Start small, 
          learn as you go, and always feel free to reach out if you need help.
        </p>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '24px 0 0',
          color: '#4a5568'
        }}>
          Happy governing!<br/>
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