import React from 'react';

interface WeekOneEmailProps {
  name: string;
  email: string;
}

export function WeekOneEmail({ name, email }: WeekOneEmailProps) {
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
          🚀
        </div>
        <h1 style={{
          margin: '0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '-0.02em'
        }}>
          Ready for Production?
        </h1>
        <p style={{
          margin: '12px 0 0',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: '400'
        }}>
          Week 1 check-in: Tips for going live
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
          It's been a week since you joined Vienna OS! Whether you've been exploring the sandbox
          or building policies, it's time to think about production deployment.
        </p>

        <div style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #68d391',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h2 style={{
            margin: '0 0 16px',
            fontSize: '20px',
            fontWeight: '600',
            color: '#276749'
          }}>
            🎯 Production Deployment Checklist
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2f855a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Infrastructure
            </h4>
            <ul style={{
              margin: '0',
              padding: '0 0 0 16px',
              listStyle: 'none'
            }}>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Deploy Vienna OS to your infrastructure (Docker/K8s)
              </li>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Configure environment variables and secrets
              </li>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Set up PostgreSQL database for audit logging
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2f855a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Governance
            </h4>
            <ul style={{
              margin: '0',
              padding: '0 0 0 16px',
              listStyle: 'none'
            }}>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Create production-grade policies for your use cases
              </li>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Test policy effectiveness with your actual prompts
              </li>
              <li style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2f855a',
                margin: '0 0 4px',
                position: 'relative'
              }}>
                <span style={{ position: 'absolute', left: '-16px' }}>✓</span>
                Configure risk tiers and warrant requirements
              </li>
            </ul>
          </div>

          <a href="https://regulator.ai/docs/deployment" style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#68d391',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📖 Deployment Guide
          </a>
        </div>

        <div style={{
          backgroundColor: '#fef5e7',
          border: '2px solid #f6ad55',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#c05621'
          }}>
            🔍 Features You Might Have Missed
          </h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#9c4221'
            }}>
              Multi-Tier Risk Management
            </h4>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#9c4221',
              margin: '0 0 12px'
            }}>
              Classify requests by risk level (T0-T3) and apply different governance 
              rules automatically. High-risk actions require human approval.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#9c4221'
            }}>
              Warrant System
            </h4>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#9c4221',
              margin: '0 0 12px'
            }}>
              Generate cryptographic warrants for sensitive operations. Perfect for 
              compliance and audit trails in regulated industries.
            </p>
          </div>

          <div>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#9c4221'
            }}>
              Framework Integrations
            </h4>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#9c4221',
              margin: '0 0 12px'
            }}>
              Works with LangChain, LlamaIndex, Crew AI, and more. Drop-in governance 
              for your existing AI applications.
            </p>
            <a href="https://regulator.ai/integrations" style={{
              color: '#c05621',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'underline'
            }}>
              View All Integrations →
            </a>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f7fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0',
          textAlign: 'center'
        }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            🏢 Ready to Scale? Upgrade to Team
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#4a5568',
            margin: '0 0 20px'
          }}>
            Get dedicated support, advanced features, and production SLAs. 
            Perfect for teams serious about AI governance.
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a href="https://regulator.ai/pricing" style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#667eea',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              💳 View Pricing
            </a>
            <a href="mailto:hello@ai.ventures?subject=Vienna OS Team Plan" style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#667eea',
              textDecoration: 'none',
              padding: '12px 24px',
              border: '1px solid #667eea',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              💬 Talk to Sales
            </a>
          </div>
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
            🌐 Join the Community
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#718096',
            margin: '0 0 16px'
          }}>
            Connect with other Vienna OS users, share governance patterns, and 
            get help from our team.
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <a href="https://github.com/ai-ventures/vienna-os" style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              📧 GitHub →
            </a>
            <span style={{
              fontSize: '14px',
              color: '#718096'
            }}>
              Discord (Coming Soon)
            </span>
          </div>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '32px 0 0',
          color: '#4a5568'
        }}>
          Questions about production deployment? Just reply — we're here to help 
          you succeed with Vienna OS.
        </p>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '24px 0 0',
          color: '#4a5568'
        }}>
          Happy scaling!<br/>
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