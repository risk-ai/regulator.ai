import React from 'react';

interface WelcomeEmailProps {
  firstName: string;
  email: string;
  company?: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ firstName, email, company }) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Vienna OS — Your AI governance starts here</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif', backgroundColor: '#f8fafc' }}>
        
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', color: '#333333' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ffffff' }}>
              🛡️
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Welcome to Vienna OS
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
              Your AI governance starts here
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 30px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Hi {firstName},
            </p>
            
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Welcome to Vienna OS. Your account is active and ready for AI agent governance.
            </p>

            {/* What You Get Section */}
            <div style={{ backgroundColor: '#f7fafc', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#2d3748' }}>
                What You Get
              </h2>
              
              <ul style={{ margin: '0 0 20px', padding: '0 0 0 16px', listStyle: 'none' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.5, color: '#4a5568', margin: '0 0 8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-16px', color: '#38a169' }}>✓</span>
                  <strong>Policy Engine</strong> — Define rules for AI agent behavior
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, color: '#4a5568', margin: '0 0 8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-16px', color: '#38a169' }}>✓</span>
                  <strong>Warrant System</strong> — Cryptographic audit trails for all agent actions
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, color: '#4a5568', margin: '0 0 8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-16px', color: '#38a169' }}>✓</span>
                  <strong>Compliance Dashboard</strong> — Real-time monitoring and reporting
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, color: '#4a5568', margin: '0 0 8px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-16px', color: '#38a169' }}>✓</span>
                  <strong>Team Collaboration</strong> — Shared governance across your organization
                </li>
              </ul>
            </div>

            {/* Quick Start Section */}
            <div style={{ backgroundColor: '#e6fffa', border: '2px solid #38b2ac', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#234e52' }}>
                🚀 Quick Start (5 minutes)
              </h2>
              
              <ol style={{ margin: '0 0 20px', padding: '0 0 0 20px', color: '#285e61' }}>
                <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px' }}>
                  <strong>Log in</strong> to your dashboard
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px' }}>
                  <strong>Create your first policy</strong> using our guided setup
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px' }}>
                  <strong>Connect an AI agent</strong> for immediate governance
                </li>
                <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px' }}>
                  <strong>Review the audit trail</strong> to see warrant generation in action
                </li>
              </ol>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <a href="https://app.regulator.ai/login?source=welcome_email" 
                   style={{ display: 'inline-block', backgroundColor: '#38b2ac', color: '#ffffff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Access Vienna OS
                </a>
              </div>
            </div>

            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '32px 0 0', color: '#4a5568' }}>
              Need help? Reply to this email or check our <a href="https://docs.regulator.ai" style={{ color: '#667eea' }}>documentation</a>.
            </p>

            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '24px 0 0', color: '#4a5568' }}>
              Best regards,<br />
              <strong>The Vienna OS Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#f7fafc', padding: '24px 30px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#a0aec0' }}>
              Vienna OS | AI Agent Governance Platform
            </p>
            <p style={{ margin: '0', fontSize: '12px', color: '#a0aec0' }}>
              This email was sent to {email} because you signed up for Vienna OS.<br />
              <a href="#" style={{ color: '#667eea' }}>Unsubscribe</a> | <a href="#" style={{ color: '#667eea' }}>Update Preferences</a>
            </p>
          </div>
        </div>

      </body>
    </html>
  );
};