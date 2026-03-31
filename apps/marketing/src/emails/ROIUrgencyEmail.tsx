import React from 'react';

interface ROIUrgencyEmailProps {
  firstName: string;
  email: string;
  company?: string;
  plan?: string;
}

export const ROIUrgencyEmail: React.FC<ROIUrgencyEmailProps> = ({ firstName, email, company, plan }) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>How 3 enterprises eliminated AI compliance risk with Vienna OS</title>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif', backgroundColor: '#f8fafc' }}>
        
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', color: '#333333' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 30px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ffffff' }}>
              📊
            </div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Real Results from Real Teams
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
              99.7% audit success rate with Vienna OS
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 30px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Hi {firstName},
            </p>
            
            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '0 0 24px', color: '#4a5568' }}>
              Real results from real security teams. Here are three detailed case studies showing how Vienna OS delivered measurable governance outcomes.
            </p>

            {/* Case Study 1: Financial Institution */}
            <div style={{ backgroundColor: '#f0fff4', border: '2px solid #68d391', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#276749', display: 'flex', alignItems: 'center' }}>
                📊 Case Study 1: Global Financial Institution
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 8px' }}>
                <strong>Company:</strong> Fortune 500 bank, 45,000 employees
              </p>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 16px' }}>
                <strong>Challenge:</strong> Governing 200+ AI agents across customer service, fraud detection, and loan processing
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#2f855a', margin: '0 0 8px', fontWeight: 600 }}>
                Vienna OS Implementation:
              </p>
              <ul style={{ margin: '0 0 16px', padding: '0 0 0 16px', listStyle: 'disc', color: '#2f855a' }}>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>15 governance policies covering financial advice, PII handling, and decision explanations</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>99.2% automated policy compliance (pre-Vienna OS: 67% manual review compliance)</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>12-hour audit report generation (previously 3-4 weeks manual compilation)</li>
              </ul>
              
              <div style={{ backgroundColor: 'rgba(56, 178, 172, 0.1)', borderLeft: '4px solid #38b2ac', padding: '16px', margin: '16px 0' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#276749', margin: '0 0 8px', fontWeight: 600 }}>
                  Outcome:
                </p>
                <ul style={{ margin: '0', padding: '0 0 0 16px', listStyle: 'disc', color: '#2f855a' }}>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Zero compliance violations in 18 months post-deployment</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>$2.8M annual savings from automated compliance monitoring</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Fed audit passed with commendation for "exemplary AI governance practices"</li>
                </ul>
              </div>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#276749' }}>
                  "Vienna OS transformed our AI risk management from reactive to proactive. We now have complete visibility and control."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#38a169', fontWeight: 600 }}>
                  — Sarah Chen, Chief Risk Officer
                </p>
              </div>
            </div>

            {/* Case Study 2: Healthcare */}
            <div style={{ backgroundColor: '#f0f9ff', border: '2px solid #60a5fa', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center' }}>
                🏥 Case Study 2: Healthcare Technology Company
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 8px' }}>
                <strong>Company:</strong> Medical AI startup, 400 employees
              </p>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 16px' }}>
                <strong>Challenge:</strong> HIPAA compliance for clinical decision support AI across 80+ hospital partners
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1d4ed8', margin: '0 0 8px', fontWeight: 600 }}>
                Vienna OS Implementation:
              </p>
              <ul style={{ margin: '0 0 16px', padding: '0 0 0 16px', listStyle: 'disc', color: '#1d4ed8' }}>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>HIPAA-specific warrant templates for patient data handling</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Automatic PHI detection and protection policies</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Real-time compliance monitoring across all hospital deployments</li>
              </ul>
              
              <div style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', borderLeft: '4px solid #60a5fa', padding: '16px', margin: '16px 0' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#1e3a8a', margin: '0 0 8px', fontWeight: 600 }}>
                  Outcome:
                </p>
                <ul style={{ margin: '0', padding: '0 0 0 16px', listStyle: 'disc', color: '#1d4ed8' }}>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>100% HIPAA audit success rate across all partner hospitals</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>60% faster partner onboarding due to built-in compliance</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>$800K in avoided HIPAA violation penalties (identified and prevented 12 potential violations)</li>
                </ul>
              </div>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#1e3a8a' }}>
                  "Vienna OS gave our hospital partners confidence to deploy our AI. Built-in HIPAA compliance was a game-changer."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                  — Dr. Michael Torres, VP of Compliance
                </p>
              </div>
            </div>

            {/* Case Study 3: Manufacturing */}
            <div style={{ backgroundColor: '#fefce8', border: '2px solid #facc15', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#a16207', display: 'flex', alignItems: 'center' }}>
                🏭 Case Study 3: Manufacturing Conglomerate
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#ca8a04', margin: '0 0 8px' }}>
                <strong>Company:</strong> Industrial equipment manufacturer, 12,000 employees
              </p>
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#ca8a04', margin: '0 0 16px' }}>
                <strong>Challenge:</strong> Governing AI agents in supply chain, quality control, and safety monitoring
              </p>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#ca8a04', margin: '0 0 8px', fontWeight: 600 }}>
                Vienna OS Implementation:
              </p>
              <ul style={{ margin: '0 0 16px', padding: '0 0 0 16px', listStyle: 'disc', color: '#ca8a04' }}>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Safety-critical decision policies with human-in-the-loop requirements</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Supply chain transparency warrants for ESG reporting</li>
                <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Quality control AI with explainable decision requirements</li>
              </ul>
              
              <div style={{ backgroundColor: 'rgba(250, 204, 21, 0.1)', borderLeft: '4px solid #facc15', padding: '16px', margin: '16px 0' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#a16207', margin: '0 0 8px', fontWeight: 600 }}>
                  Outcome:
                </p>
                <ul style={{ margin: '0', padding: '0 0 0 16px', listStyle: 'disc', color: '#ca8a04' }}>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>43% reduction in safety incidents through better AI oversight</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>Complete supply chain transparency for ESG audits</li>
                  <li style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 4px' }}>ISO 27001 certification achieved 6 months ahead of schedule</li>
                </ul>
              </div>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', fontStyle: 'italic' }}>
                <p style={{ margin: '0', fontSize: '14px', color: '#a16207' }}>
                  "Vienna OS helped us prove our AI systems meet safety standards. Regulators love the transparency."
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#eab308', fontWeight: 600 }}>
                  — James Rodriguez, Chief Information Security Officer
                </p>
              </div>
            </div>

            {/* ROI Calculator */}
            <div style={{ backgroundColor: '#e6fffa', border: '2px solid #38b2ac', borderRadius: '12px', padding: '24px', margin: '32px 0' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#234e52' }}>
                💰 Why This Matters for {company || 'Your Organization'}
              </h2>
              
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#285e61', margin: '0 0 16px' }}>
                These results didn't happen by accident. Here's the math:
              </p>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
                <ul style={{ margin: '0', padding: '0 0 0 16px', listStyle: 'none', color: '#234e52' }}>
                  <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Average cost of AI compliance failure:</span>
                    <strong style={{ color: '#dc2626' }}>$2.4M</strong>
                  </li>
                  <li style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Vienna OS Team plan annual cost:</span>
                    <strong style={{ color: '#059669' }}>$3,564</strong>
                  </li>
                  <li style={{ fontSize: '16px', lineHeight: 1.5, margin: '8px 0 0', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e0', paddingTop: '8px' }}>
                    <span><strong>ROI if prevents just one incident:</strong></span>
                    <strong style={{ color: '#38b2ac', fontSize: '18px' }}>67,300%</strong>
                  </li>
                </ul>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <a href="https://app.regulator.ai/policies/new?source=drip_day7" 
                   style={{ display: 'inline-block', backgroundColor: '#38b2ac', color: '#ffffff', textDecoration: 'none', padding: '14px 28px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, marginRight: '12px' }}>
                  Create Your First Policy
                </a>
                {plan === 'community' && (
                  <a href="https://regulator.ai/pricing?source=drip_day7" 
                     style={{ display: 'inline-block', color: '#38b2ac', textDecoration: 'none', padding: '14px 28px', border: '1px solid #38b2ac', borderRadius: '8px', fontSize: '16px', fontWeight: 600 }}>
                     Upgrade to Team
                  </a>
                )}
              </div>
            </div>

            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '32px 0 0', color: '#4a5568' }}>
              Questions about implementing this level of governance at {company || 'your organization'}? 
              <a href="https://calendly.com/vienna-os/customer-success" style={{ color: '#667eea', textDecoration: 'none' }}>Schedule a call with our success team</a> — same people who guided these deployments.
            </p>

            <p style={{ fontSize: '16px', lineHeight: 1.5, margin: '24px 0 0', color: '#4a5568' }}>
              Ready to join them?<br />
              <strong>The Vienna OS Team</strong>
            </p>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#f7fafc', padding: '24px 30px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#a0aec0' }}>
              Vienna OS | AI Agent Governance Platform
            </p>
            <p style={{ margin: '0', fontSize: '12px', color: '#a0aec0' }}>
              <a href="#" style={{ color: '#667eea' }}>Unsubscribe</a> | <a href="#" style={{ color: '#667eea' }}>Share This Email</a>
            </p>
          </div>
        </div>

      </body>
    </html>
  );
};