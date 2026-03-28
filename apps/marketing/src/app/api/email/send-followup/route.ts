import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, template, company } = body;

    if (!email || !name || !template) {
      return NextResponse.json(
        { error: "Email, name, and template are required" },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    let subject = "";
    let html = "";

    switch (template) {
      case 'getting-started':
        subject = "Ready to Create Your First AI Policy?";
        html = generateGettingStartedEmailHtml({ name, email });
        break;
      
      case 'week-one':
        subject = "Ready for Production? Vienna OS Week 1 Tips";
        html = generateWeekOneEmailHtml({ name, email });
        break;
      
      case 'pilot-offer':
        subject = "Exclusive: Vienna OS Pilot Program Invitation";
        html = generatePilotOfferEmailHtml({ name, email, company });
        break;
      
      default:
        return NextResponse.json(
          { error: "Invalid template" },
          { status: 400 }
        );
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vienna OS <hello@regulator.ai>",
        to: [email],
        subject,
        html,
      }),
    });

    console.log(`[EmailFollowup] Sent ${template} email to ${email}`);

    return NextResponse.json({ 
      success: true,
      message: `${template} email sent successfully`,
      template,
      recipient: email
    });

  } catch (error) {
    console.error("Follow-up email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate Getting Started Email HTML
function generateGettingStartedEmailHtml({ name, email }: { name: string; email: string }) {
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ready to Create Your First AI Policy?</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #764ba2 0%, #667eea 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">🎯</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Ready to Create Your First Policy?</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">Let's build some governance together</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Yesterday you joined Vienna OS. Today, let's create your first governance policy! Don't worry — it's easier than you might think.</p>

    <!-- Policy Section -->
    <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2d3748;">📋 Your First Policy: Content Safety</h2>
      
      <p style="font-size:14px;line-height:1.5;color:#718096;margin:0 0 20px;">Let's start simple. Here's a basic content safety policy that blocks harmful requests:</p>

      <div style="background-color:#1a202c;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;font-family:Monaco,'Cascadia Code','Roboto Mono',Consolas,'Times New Roman',monospace;overflow:auto;margin-bottom:20px;">
{<br/>
&nbsp;&nbsp;"name": "content_safety_basic",<br/>
&nbsp;&nbsp;"description": "Block harmful or inappropriate content",<br/>
&nbsp;&nbsp;"rules": [<br/>
&nbsp;&nbsp;&nbsp;&nbsp;{<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"condition": {<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"input_contains": [<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"violence", "hate", "harassment",<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"self-harm", "illegal"<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;},<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"action": "block",<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"message": "Request blocked for safety"<br/>
&nbsp;&nbsp;&nbsp;&nbsp;}<br/>
&nbsp;&nbsp;],<br/>
&nbsp;&nbsp;"risk_tier": 1,<br/>
&nbsp;&nbsp;"enabled": true<br/>
}
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <a href="https://vienna-os.fly.dev" style="display:inline-flex;align-items:center;background-color:#667eea;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;">📝 Create This Policy</a>
        <a href="https://regulator.ai/docs/policies" style="display:inline-flex;align-items:center;color:#667eea;text-decoration:none;padding:12px 20px;border:1px solid #667eea;border-radius:8px;font-size:14px;font-weight:500;">📚 Policy Templates</a>
      </div>
    </div>

    <!-- Interactive Demo -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:24px;margin:32px 0;">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#234e52;">🎮 Try the Interactive Demo</h3>
      <p style="font-size:14px;line-height:1.5;color:#285e61;margin:0 0 16px;">See governance in action! Our /try demo lets you submit requests and watch Vienna's policy engine work in real-time.</p>
      <a href="https://regulator.ai/try" style="display:inline-flex;align-items:center;background-color:#38b2ac;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;">🎯 Try Interactive Demo</a>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Building AI governance doesn't have to be intimidating. Start small, learn as you go, and always feel free to reach out if you need help.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Happy governing!<br/><strong>— The Vienna OS Team</strong></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS by AI.Ventures</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">Sent to ${email} • <a href="#" style="color:#667eea;">Unsubscribe</a></p>
  </div>
</div>

</body>
</html>
  `.trim();
}

// Generate Week One Email HTML
function generateWeekOneEmailHtml({ name, email }: { name: string; email: string }) {
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ready for Production? Vienna OS Week 1 Tips</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">🚀</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Ready for Production?</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">Week 1 check-in: Tips for going live</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">It's been a week since you joined Vienna OS! Whether you've been exploring the sandbox or building policies, it's time to think about production deployment.</p>

    <!-- Production Checklist -->
    <div style="background-color:#f0fff4;border:2px solid #68d391;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#276749;">🎯 Production Deployment Checklist</h2>
      
      <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#2f855a;text-transform:uppercase;letter-spacing:0.05em;">Infrastructure</h4>
      <ul style="margin:0 0 20px;padding:0 0 0 16px;list-style:none;">
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Deploy Vienna OS to your infrastructure (Docker/K8s)
        </li>
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Configure environment variables and secrets
        </li>
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Set up PostgreSQL database for audit logging
        </li>
      </ul>

      <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#2f855a;text-transform:uppercase;letter-spacing:0.05em;">Governance</h4>
      <ul style="margin:0 0 20px;padding:0 0 0 16px;list-style:none;">
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Create production-grade policies for your use cases
        </li>
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Test policy effectiveness with your actual prompts
        </li>
        <li style="font-size:14px;line-height:1.5;color:#2f855a;margin:0 0 4px;position:relative;">
          <span style="position:absolute;left:-16px;">✓</span>Configure risk tiers and warrant requirements
        </li>
      </ul>

      <a href="https://regulator.ai/docs/deployment" style="display:inline-flex;align-items:center;background-color:#68d391;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;">📖 Deployment Guide</a>
    </div>

    <!-- Upgrade CTA -->
    <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0;text-align:center;">
      <h3 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#2d3748;">🏢 Ready to Scale? Upgrade to Team</h3>
      <p style="font-size:14px;line-height:1.5;color:#4a5568;margin:0 0 20px;">Get dedicated support, advanced features, and production SLAs. Perfect for teams serious about AI governance.</p>
      <a href="https://regulator.ai/pricing" style="display:inline-flex;align-items:center;background-color:#667eea;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">💳 View Pricing</a>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Questions about production deployment? Just reply — we're here to help you succeed with Vienna OS.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Happy scaling!<br/><strong>— The Vienna OS Team</strong></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS by AI.Ventures</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">Sent to ${email} • <a href="#" style="color:#667eea;">Unsubscribe</a></p>
  </div>
</div>

</body>
</html>
  `.trim();
}

// Generate Pilot Offer Email HTML
function generatePilotOfferEmailHtml({ name, email, company }: { name: string; email: string; company?: string }) {
  const firstName = name.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exclusive: Vienna OS Pilot Program Invitation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #764ba2 0%, #667eea 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">🤝</div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Exclusive Pilot Program</h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">Let's build AI governance together</p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">Hi ${firstName},</p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">It's been two weeks since you joined Vienna OS. We hope you've been exploring the platform and getting a feel for AI governance.</p>

    <!-- Pilot Program Offer -->
    <div style="background-color:#e6fffa;border:3px solid #38b2ac;border-radius:16px;padding:32px;margin:32px 0;position:relative;">
      <div style="position:absolute;top:-12px;left:30px;background-color:#38b2ac;color:#ffffff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Exclusive Offer</div>
      
      <h2 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#234e52;">🚀 Vienna OS Pilot Program</h2>
      
      <p style="font-size:16px;line-height:1.6;color:#285e61;margin:0 0 24px;">We're inviting select${company ? ` companies like ${company}` : ' organizations'} to participate in our guided pilot program. Get:</p>

      <ul style="margin:24px 0;padding:0;list-style:none;">
        <li style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div style="width:24px;height:24px;background-color:#38b2ac;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ffffff;font-weight:600;flex-shrink:0;">✓</div>
          <div>
            <h4 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#234e52;">Dedicated Engineering Support</h4>
            <p style="margin:0;font-size:14px;line-height:1.5;color:#285e61;">Direct access to our team for custom policy development and integration help</p>
          </div>
        </li>
        <li style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div style="width:24px;height:24px;background-color:#38b2ac;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ffffff;font-weight:600;flex-shrink:0;">✓</div>
          <div>
            <h4 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#234e52;">Custom Governance Frameworks</h4>
            <p style="margin:0;font-size:14px;line-height:1.5;color:#285e61;">We'll work with you to design policies tailored to your industry and use cases</p>
          </div>
        </li>
        <li style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
          <div style="width:24px;height:24px;background-color:#38b2ac;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ffffff;font-weight:600;flex-shrink:0;">✓</div>
          <div>
            <h4 style="margin:0 0 4px;font-size:16px;font-weight:600;color:#234e52;">Priority Feature Development</h4>
            <p style="margin:0;font-size:14px;line-height:1.5;color:#285e61;">Shape Vienna OS roadmap by requesting features you need</p>
          </div>
        </li>
      </ul>

      <div style="text-align:center;margin-top:32px;">
        <a href="https://cal.com/ai-ventures/vienna-os-pilot?utm_source=email&utm_campaign=pilot_offer" style="display:inline-flex;align-items:center;background-color:#38b2ac;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(56, 178, 172, 0.3);">📅 Schedule 30-Min Call</a>
      </div>
    </div>

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">Interested? The pilot program is limited to 20 companies, and we're already halfway there. Schedule a call this week to secure your spot.</p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">Looking forward to working together!<br/><strong>— Whitney Anderson, CEO</strong><br/><span style="font-size:14px;color:#718096;">AI.Ventures</span></p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">Vienna OS by AI.Ventures</p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">Sent to ${email} • <a href="#" style="color:#667eea;">Unsubscribe</a></p>
  </div>
</div>

</body>
</html>
  `.trim();
}