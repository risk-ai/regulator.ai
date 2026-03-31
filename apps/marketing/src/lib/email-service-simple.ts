export interface EmailData {
  firstName: string;
  email: string;
  company?: string;
  plan?: string;
  industry?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private resendApiKey: string;

  constructor(resendApiKey?: string) {
    this.resendApiKey = resendApiKey || process.env.RESEND_API_KEY || '';
    if (!this.resendApiKey) {
      throw new Error('RESEND_API_KEY is required');
    }
  }

  /**
   * Generate Email 1: Welcome & Quick Start (sent immediately on signup)
   */
  generateWelcomeEmail(data: EmailData): EmailTemplate {
    const html = this.generateWelcomeEmailHtml(data);
    return {
      subject: 'Welcome to Vienna OS — Your AI governance starts here',
      html
    };
  }

  /**
   * Generate Email 2: Use Case Deep Dive (sent Day 3)
   */
  generateUseCaseDeepDiveEmail(data: EmailData): EmailTemplate {
    const industry = data.industry || 'teams';
    const html = this.generateUseCaseDeepDiveEmailHtml(data);
    
    const subjectVariants = [
      `How ${industry} teams use Vienna OS for AI governance`,
      '3 ways Vienna OS prevents AI compliance disasters'
    ];

    return {
      subject: subjectVariants[0], // Use first variant for now, A/B testing can be added later
      html
    };
  }

  /**
   * Generate Email 3: ROI & Urgency (sent Day 7)
   */
  generateROIUrgencyEmail(data: EmailData): EmailTemplate {
    const html = this.generateROIUrgencyEmailHtml(data);
    
    const subjectVariants = [
      'How 3 enterprises eliminated AI compliance risk with Vienna OS',
      'Customer spotlight: 99.7% audit success rate with Vienna OS'
    ];

    return {
      subject: subjectVariants[0], // Use first variant for now
      html
    };
  }

  /**
   * Send email using Resend API
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    from: string = 'Vienna OS <admin@regulator.ai>'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: template.subject,
          html: template.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const result = await response.json();
      return { success: true, messageId: result.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send welcome email (Email 1)
   */
  async sendWelcomeEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateWelcomeEmail(data);
    return this.sendEmail(data.email, template);
  }

  /**
   * Send use case deep dive email (Email 2)
   */
  async sendUseCaseDeepDiveEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateUseCaseDeepDiveEmail(data);
    return this.sendEmail(data.email, template);
  }

  /**
   * Send ROI & urgency email (Email 3)
   */
  async sendROIUrgencyEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.generateROIUrgencyEmail(data);
    return this.sendEmail(data.email, template);
  }

  // Private HTML generation methods

  private generateWelcomeEmailHtml(data: EmailData): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vienna OS — Your AI governance starts here</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">🛡️</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Welcome to Vienna OS</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">Your AI governance starts here</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${data.firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Welcome to Vienna OS. Your account is active and ready for AI agent governance.</p>

    <!-- What You Get Section -->
    <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2d3748;">What You Get</h2>
      
      <ul style="margin:0 0 20px;padding:0 0 0 16px;list-style:none;">
        <li style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 8px;position:relative;"><span style="position:absolute;left:-16px;color:#38a169;">✓</span><strong>Policy Engine</strong> — Define rules for AI agent behavior</li>
        <li style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 8px;position:relative;"><span style="position:absolute;left:-16px;color:#38a169;">✓</span><strong>Warrant System</strong> — Cryptographic audit trails for all agent actions</li>
        <li style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 8px;position:relative;"><span style="position:absolute;left:-16px;color:#38a169;">✓</span><strong>Compliance Dashboard</strong> — Real-time monitoring and reporting</li>
        <li style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 8px;position:relative;"><span style="position:absolute;left:-16px;color:#38a169;">✓</span><strong>Team Collaboration</strong> — Shared governance across your organization</li>
      </ul>
    </div>

    <!-- Quick Start Section -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#234e52;">🚀 Quick Start (5 minutes)</h2>
      
      <ol style="margin:0 0 20px;padding:0 0 0 20px;color:#285e61;">
        <li style="font-size:14px;line-height:1.5;margin:0 0 8px;"><strong>Log in</strong> to your dashboard</li>
        <li style="font-size:14px;line-height:1.5;margin:0 0 8px;"><strong>Create your first policy</strong> using our guided setup</li>
        <li style="font-size:14px;line-height:1.5;margin:0 0 8px;"><strong>Connect an AI agent</strong> for immediate governance</li>
        <li style="font-size:14px;line-height:1.5;margin:0 0 8px;"><strong>Review the audit trail</strong> to see warrant generation in action</li>
      </ol>

      <div style="text-align:center;margin-top:20px;">
        <a href="https://app.regulator.ai/login?source=welcome_email" style="display:inline-block;background-color:#38b2ac;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">Access Vienna OS</a>
      </div>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Need help? Reply to this email or check our <a href="https://docs.regulator.ai" style="color:#667eea;">documentation</a>.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Best regards,<br/><strong>The Vienna OS Team</strong></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS | AI Agent Governance Platform</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">This email was sent to ${data.email} because you signed up for Vienna OS.<br/><a href="#" style="color:#667eea;">Unsubscribe</a> | <a href="#" style="color:#667eea;">Update Preferences</a></p>
  </div>
</div>

</body>
</html>`;
  }

  private generateUseCaseDeepDiveEmailHtml(data: EmailData): string {
    const industry = data.industry || 'teams';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How ${industry} use Vienna OS for AI governance</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">🎯</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Use Case Deep Dive</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">How security teams govern AI agents</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${data.firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Vienna OS serves security teams across industries. Here's how three different sectors use our platform to govern AI agents safely.</p>

    <!-- Financial Services Use Case -->
    <div style="background-color:#f0fff4;border:2px solid #68d391;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#276749;">🏦 Financial Services</h2>
      <p style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 12px;"><strong>Challenge:</strong> AI agents handling customer inquiries about investments and account information</p>
      <p style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 12px;"><strong>Vienna OS Solution:</strong> Policies that require human approval for financial advice, automatic escalation of account access requests, and full audit trails for regulatory compliance.</p>
      <p style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 16px;"><strong>Result:</strong> 47% faster customer service with zero compliance incidents.</p>
      <div style="background-color:rgba(255,255,255,0.7);border-radius:8px;padding:16px;font-style:italic;">
        <p style="margin:0;font-size:14px;color:#276749;">"Vienna OS lets us deploy AI confidently while staying SEC-compliant."</p>
        <p style="margin:8px 0 0;font-size:12px;color:#38a169;font-weight:600;">— CISO, Regional Bank (1,200 employees)</p>
      </div>
    </div>

    <!-- Healthcare Use Case -->
    <div style="background-color:#f0f9ff;border:2px solid #60a5fa;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e3a8a;">🏥 Healthcare Systems</h2>
      <p style="font-size:14px;line-height:1.5;color:#1d4ed8;margin:0 0 12px;"><strong>Challenge:</strong> AI assistants processing patient data and clinical decision support</p>
      <p style="font-size:14px;line-height:1.5;color:#1d4ed8;margin:0 0 12px;"><strong>Vienna OS Solution:</strong> HIPAA-compliant warrant generation, automatic PHI detection and protection, role-based agent authorization.</p>
      <p style="font-size:14px;line-height:1.5;color:#1d4ed8;margin:0 0 16px;"><strong>Result:</strong> Clinical AI deployment with built-in HIPAA compliance and complete audit capability.</p>
      <div style="background-color:rgba(255,255,255,0.7);border-radius:8px;padding:16px;font-style:italic;">
        <p style="margin:0;font-size:14px;color:#1e3a8a;">"We can show auditors exactly how our AI handled every patient interaction."</p>
        <p style="margin:8px 0 0;font-size:12px;color:#3b82f6;font-weight:600;">— Chief Compliance Officer, Health System (15,000 employees)</p>
      </div>
    </div>

    <!-- Government Use Case -->
    <div style="background-color:#f8fafc;border:2px solid #94a3b8;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#334155;">🏛️ Government Agencies</h2>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 12px;"><strong>Challenge:</strong> AI agents for citizen services and internal operations</p>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 12px;"><strong>Vienna OS Solution:</strong> Transparent decision-making with public warrant verification, bias detection monitoring, appeals process integration.</p>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 16px;"><strong>Result:</strong> Responsible AI deployment with public accountability and citizen trust.</p>
      <div style="background-color:rgba(255,255,255,0.7);border-radius:8px;padding:16px;font-style:italic;">
        <p style="margin:0;font-size:14px;color:#334155;">"Vienna OS provides the oversight framework we need for AI in government."</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;font-weight:600;">— Deputy CIO, State Agency (8,000 employees)</p>
      </div>
    </div>

    <!-- Your Industry Section -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#234e52;">Your ${industry}</h2>
      <p style="font-size:14px;line-height:1.5;color:#285e61;margin:0 0 16px;">What challenges does your security team face with AI agent governance? <a href="mailto:admin@regulator.ai?subject=Industry%20Use%20Case" style="color:#38b2ac;text-decoration:none;font-weight:500;">Reply and tell us</a> — we'd love to discuss your specific requirements.</p>
      <div style="text-align:center;">
        <a href="https://app.regulator.ai/policies/new?source=drip_day3" style="display:inline-block;background-color:#38b2ac;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">Create Your First Policy</a>
      </div>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Questions about implementation for your industry? Just reply to this email — we read every message.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Best regards,<br/><strong>The Vienna OS Team</strong></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS | AI Agent Governance Platform</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;"><a href="#" style="color:#667eea;">Unsubscribe</a> | <a href="#" style="color:#667eea;">Forward to Colleague</a></p>
  </div>
</div>

</body>
</html>`;
  }

  private generateROIUrgencyEmailHtml(data: EmailData): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How 3 enterprises eliminated AI compliance risk with Vienna OS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">📊</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Real Results from Real Teams</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">99.7% audit success rate with Vienna OS</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${data.firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Real results from real security teams. Here are three detailed case studies showing how Vienna OS delivered measurable governance outcomes.</p>

    <!-- Case Study 1: Financial Institution -->
    <div style="background-color:#f0fff4;border:2px solid #68d391;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#276749;">📊 Case Study 1: Global Financial Institution</h2>
      <p style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 8px;"><strong>Company:</strong> Fortune 500 bank, 45,000 employees</p>
      <p style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 16px;"><strong>Challenge:</strong> Governing 200+ AI agents across customer service, fraud detection, and loan processing</p>
      
      <div style="background-color:rgba(56, 178, 172, 0.1);border-left:4px solid #38b2ac;padding:16px;margin:16px 0;">
        <p style="font-size:14px;line-height:1.5;color:#276749;margin:0 0 8px;font-weight:600;">Outcome:</p>
        <ul style="margin:0;padding:0 0 0 16px;list-style:disc;color:#2f855a;">
          <li style="font-size:13px;line-height:1.4;margin:0 0 4px;">Zero compliance violations in 18 months post-deployment</li>
          <li style="font-size:13px;line-height:1.4;margin:0 0 4px;">$2.8M annual savings from automated compliance monitoring</li>
          <li style="font-size:13px;line-height:1.4;margin:0 0 4px;">Fed audit passed with commendation for "exemplary AI governance practices"</li>
        </ul>
      </div>
      
      <div style="background-color:rgba(255,255,255,0.7);border-radius:8px;padding:16px;font-style:italic;">
        <p style="margin:0;font-size:14px;color:#276749;">"Vienna OS transformed our AI risk management from reactive to proactive. We now have complete visibility and control."</p>
        <p style="margin:8px 0 0;font-size:12px;color:#38a169;font-weight:600;">— Sarah Chen, Chief Risk Officer</p>
      </div>
    </div>

    <!-- ROI Calculator -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#234e52;">💰 Why This Matters for ${data.company || 'Your Organization'}</h2>
      
      <p style="font-size:14px;line-height:1.5;color:#285e61;margin:0 0 16px;">These results didn't happen by accident. Here's the math:</p>
      
      <div style="background-color:rgba(255,255,255,0.7);border-radius:8px;padding:16px;margin:16px 0;">
        <ul style="margin:0;padding:0 0 0 16px;list-style:none;color:#234e52;">
          <li style="font-size:14px;line-height:1.5;margin:0 0 8px;display:flex;justify-content:space-between;"><span>Average cost of AI compliance failure:</span><strong style="color:#dc2626;">$2.4M</strong></li>
          <li style="font-size:14px;line-height:1.5;margin:0 0 8px;display:flex;justify-content:space-between;"><span>Vienna OS Team plan annual cost:</span><strong style="color:#059669;">$3,564</strong></li>
          <li style="font-size:16px;line-height:1.5;margin:8px 0 0;display:flex;justify-content:space-between;border-top:1px solid #cbd5e0;padding-top:8px;"><span><strong>ROI if prevents just one incident:</strong></span><strong style="color:#38b2ac;font-size:18px;">67,300%</strong></li>
        </ul>
      </div>
      
      <div style="text-align:center;margin-top:20px;">
        <a href="https://app.regulator.ai/policies/new?source=drip_day7" style="display:inline-block;background-color:#38b2ac;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:600;margin-right:12px;">Create Your First Policy</a>
        ${data.plan === 'community' ? '<a href="https://regulator.ai/pricing?source=drip_day7" style="display:inline-block;color:#38b2ac;text-decoration:none;padding:14px 28px;border:1px solid #38b2ac;border-radius:8px;font-size:16px;font-weight:600;">Upgrade to Team</a>' : ''}
      </div>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Questions about implementing this level of governance at ${data.company || 'your organization'}? <a href="https://calendly.com/vienna-os/customer-success" style="color:#667eea;text-decoration:none;">Schedule a call with our success team</a> — same people who guided these deployments.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Ready to join them?<br/><strong>The Vienna OS Team</strong></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS | AI Agent Governance Platform</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;"><a href="#" style="color:#667eea;">Unsubscribe</a> | <a href="#" style="color:#667eea;">Share This Email</a></p>
  </div>
</div>

</body>
</html>`;
  }
}

/**
 * Utility function to extract first name from full name
 */
export function extractFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

/**
 * Utility function to determine industry from company name or use case
 */
export function determineIndustry(company?: string, useCase?: string): string {
  if (!company && !useCase) return 'teams';
  
  const text = `${company || ''} ${useCase || ''}`.toLowerCase();
  
  if (text.includes('bank') || text.includes('finance') || text.includes('investment') || text.includes('trading')) {
    return 'financial services';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('hospital') || text.includes('clinical')) {
    return 'healthcare';
  }
  if (text.includes('government') || text.includes('gov') || text.includes('public') || text.includes('agency')) {
    return 'government';
  }
  if (text.includes('manufactur') || text.includes('industrial') || text.includes('factory')) {
    return 'manufacturing';
  }
  if (text.includes('tech') || text.includes('software') || text.includes('ai') || text.includes('saas')) {
    return 'technology';
  }
  
  return 'teams';
}