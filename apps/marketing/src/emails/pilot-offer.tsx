import React from 'react';

interface PilotOfferEmailProps {
  name: string;
  email: string;
  company?: string;
}

export function PilotOfferEmail({ name, email, company }: PilotOfferEmailProps) {
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
          🤝
        </div>
        <h1 style={{
          margin: '0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff',
          letterSpacing: '-0.02em'
        }}>
          Exclusive Pilot Program
        </h1>
        <p style={{
          margin: '12px 0 0',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.9)',
          fontWeight: '400'
        }}>
          Let's build AI governance together
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
          It's been two weeks since you joined Vienna OS. We hope you've been exploring 
          the platform and getting a feel for AI governance.
        </p>

        <div style={{
          backgroundColor: '#e6fffa',
          border: '3px solid #38b2ac',
          borderRadius: '16px',
          padding: '32px',
          margin: '32px 0',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '30px',
            backgroundColor: '#38b2ac',
            color: '#ffffff',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Exclusive Offer
          </div>
          
          <h2 style={{
            margin: '0 0 20px',
            fontSize: '24px',
            fontWeight: '700',
            color: '#234e52'
          }}>
            🚀 Vienna OS Pilot Program
          </h2>
          
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#285e61',
            margin: '0 0 24px'
          }}>
            We're inviting select{company ? ` companies like ${company}` : ' organizations'} to 
            participate in our guided pilot program. Get:
          </p>

          <div style={{
            display: 'grid',
            gap: '16px',
            margin: '24px 0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#38b2ac',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '600',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#234e52'
                }}>
                  Dedicated Engineering Support
                </h4>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#285e61'
                }}>
                  Direct access to our team for custom policy development and integration help
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#38b2ac',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '600',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#234e52'
                }}>
                  Custom Governance Frameworks
                </h4>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#285e61'
                }}>
                  We'll work with you to design policies tailored to your industry and use cases
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#38b2ac',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '600',
                flexShrink: 0
              }}>
                ✓
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#234e52'
                }}>
                  Priority Feature Development
                </h4>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#285e61'
                }}>
                  Shape Vienna OS roadmap by requesting features you need
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#38b2ac',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '600',
                flexShrink: 0
              }}>
              ✓
              </div>
              <div>
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#234e52'
                }}>
                  Production Deployment Assistance
                </h4>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#285e61'
                }}>
                  Hands-on help deploying Vienna OS in your infrastructure
                </p>
              </div>
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '32px'
          }}>
            <a 
              href="https://cal.com/risk-ai/regulatorai-pilot?utm_source=email&utm_campaign=pilot_offer" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#38b2ac',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(56, 178, 172, 0.3)'
              }}
            >
              📅 Schedule 30-Min Call
            </a>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f7fafc',
          border: '2px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h3 style={{
            margin: '0 0 16px',
            fontSize: '18px',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            🏆 Why Companies Choose Vienna OS
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#667eea',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                🔬
              </div>
              <div>
                <strong style={{ color: '#4a5568' }}>Cornell Law School:</strong>{' '}
                <span style={{ color: '#718096', fontSize: '14px' }}>
                  "Essential for legal AI applications requiring audit trails"
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#667eea',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                🏢
              </div>
              <div>
                <strong style={{ color: '#4a5568' }}>Financial Services:</strong>{' '}
                <span style={{ color: '#718096', fontSize: '14px' }}>
                  "First governance layer that actually works in production"
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#667eea',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                🩺
              </div>
              <div>
                <strong style={{ color: '#4a5568' }}>Healthcare AI:</strong>{' '}
                <span style={{ color: '#718096', fontSize: '14px' }}>
                  "HIPAA-compliant governance without slowing down innovation"
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fffaf0',
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
            📜 US Patent Pending
          </h3>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#9c4221',
            margin: '0'
          }}>
            Vienna OS is backed by patent-pending innovations in AI governance and 
            cryptographic warrant systems. You're not just adopting software — 
            you're implementing cutting-edge research.
          </p>
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
            🎯 Perfect If You're...
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
              <span style={{ position: 'absolute', left: '0', color: '#667eea' }}>•</span>
              Building AI applications that handle sensitive data
            </li>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0', color: '#667eea' }}>•</span>
              Working in regulated industries (finance, healthcare, legal)
            </li>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0', color: '#667eea' }}>•</span>
              Need compliance and audit trails for AI decisions
            </li>
            <li style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#718096',
              margin: '0 0 8px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ position: 'absolute', left: '0', color: '#667eea' }}>•</span>
              Want governance without sacrificing development velocity
            </li>
          </ul>
        </div>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '32px 0 0',
          color: '#4a5568'
        }}>
          Interested? The pilot program is limited to 20 companies, and we're 
          already halfway there. Schedule a call this week to secure your spot.
        </p>

        <p style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '24px 0 0',
          color: '#4a5568'
        }}>
          Looking forward to working together!<br/>
          <strong>— Whitney Anderson, CEO</strong><br/>
          <span style={{ fontSize: '14px', color: '#718096' }}>AI.Ventures</span>
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