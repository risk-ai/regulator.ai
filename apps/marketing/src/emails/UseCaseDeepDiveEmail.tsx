import React from 'react';

interface UseCaseDeepDiveEmailProps {
  firstName: string;
  email: string;
  industry?: string;
}

export const UseCaseDeepDiveEmail: React.FC<UseCaseDeepDiveEmailProps> = ({ firstName, email, industry }) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>How {industry || 'teams'} use Vienna OS for AI governance</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif', backgroundColor: '#f8fafc' }}>
        
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', color: '#333333' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ffffff' }}>
              🎯
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Use Case Deep Dive
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
              How security teams govern AI agents
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 30px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Hi {firstName},
            </p>
            
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Vienna OS serves security teams across industries. Here's how three different sectors use our platform to govern AI agents safely.
            </p>

            {/* Financial Services Use Case */}
            <div style={{ backgroundColor: '#f0fff4', border: '2px solid #68d391', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#276749', display: 'flex', alignItems: 'center' }}>
                🏦 Financial Services
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 12px' }}>
                <strong>Challenge:</strong> AI agents handling customer inquiries about investments and account information
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 12px' }}>
                <strong>Vienna OS Solution:</strong> Policies that require human approval for financial advice, automatic escalation of account access requests, and full audit trails for regulatory compliance.
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 16px' }}>
                <strong>Result:</strong> 47% faster customer service with zero compliance incidents.
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#276749' }}>
                  "Vienna OS lets us deploy AI confidently while staying SEC-compliant."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#38a169', fontWeight: 600 }}>
                  — CISO, Regional Bank (1,200 employees)
                </p>
              </div>
            </div>

            {/* Healthcare Use Case */}
            <div style={{ backgroundColor: '#f0f9ff', border: '2px solid #60a5fa', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center' }}>
                🏥 Healthcare Systems
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 12px' }}>
                <strong>Challenge:</strong> AI assistants processing patient data and clinical decision support
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 12px' }}>
                <strong>Vienna OS Solution:</strong> HIPAA-compliant warrant generation, automatic PHI detection and protection, role-based agent authorization.
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 16px' }}>
                <strong>Result:</strong> Clinical AI deployment with built-in HIPAA compliance and complete audit capability.
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#1e3a8a' }}>
                  "We can show auditors exactly how our AI handled every patient interaction."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                  — Chief Compliance Officer, Health System (15,000 employees)
                </p>
              </div>
            </div>

            {/* Government Use Case */}
            <div style={{ backgroundColor: '#f8fafc', border: '2px solid #94a3b8', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center' }}>
                🏛️ Government Agencies
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#475569', margin: '0 0 12px' }}>
                <strong>Challenge:</strong> AI agents for citizen services and internal operations
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#475569', margin: '0 0 12px' }}>
                <strong>Vienna OS Solution:</strong> Transparent decision-making with public warrant verification, bias detection monitoring, appeals process integration.
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#475569', margin: '0 0 16px' }}>
                <strong>Result:</strong> Responsible AI deployment with public accountability and citizen trust.
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#334155' }}>
                  "Vienna OS provides the oversight framework we need for AI in government."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  — Deputy CIO, State Agency (8,000 employees)
                </p>
              </div>
            </div>

            {/* Your Industry Section */}
            <div style={{ backgroundColor: '#e6fffa', border: '2px solid #38b2ac', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#234e52' }}>
                Your {industry || 'Industry'}
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#285e61', margin: '0 0 16px' }}>
                What challenges does your security team face with AI agent governance? 
                <a href="mailto:admin@regulator.ai?subject=Industry%20Use%20Case" style={{ color: '#38b2ac', textDecoration: 'none', fontWeight: 500 }}>
                  Reply and tell us
                </a> — we'd love to discuss your specific requirements.
              </p>
              
              <div style={{ textAlign: 'center' }}>
                <a href="https://app.regulator.ai/policies/new?source=drip_day3" 
                   style={{ display: 'inline-block', backgroundColor: '#38b2ac', color: '#ffffff', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Create Your First Policy
                </a>
              </div>
            </div>

            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '32px 0 0', color: '#4a5568' }}>
              Questions about implementation for your industry? Just reply to this email — we read every message.
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
              <a href="#" style={{ color: '#667eea' }}>Unsubscribe</a> | <a href="#" style={{ color: '#667eea' }}>Forward to Colleague</a>
            </p>
          </div>
        </div>

      </body>
    </html>
  );
};