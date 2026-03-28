import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, agentCount, useCase, plan } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email required" },
        { status: 400 }
      );
    }

    // Store signup in Neon database
    const neonUrl = process.env.POSTGRES_URL;
    let signupStored = false;

    if (neonUrl) {
      try {
        // Dynamic import to avoid module issues
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(neonUrl);
        
        // Create signups table if it doesn't exist
        await sql`
          CREATE TABLE IF NOT EXISTS signups (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT,
            company TEXT,
            plan TEXT DEFAULT 'community',
            source TEXT,
            agent_count TEXT,
            use_case TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `;

        // Insert signup record
        await sql`
          INSERT INTO signups (email, name, company, plan, agent_count, use_case, source)
          VALUES (${email}, ${name}, ${company || null}, ${plan}, ${agentCount || null}, ${useCase || null}, 'website')
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            company = EXCLUDED.company,
            plan = EXCLUDED.plan,
            agent_count = EXCLUDED.agent_count,
            use_case = EXCLUDED.use_case
        `;

        signupStored = true;
        console.log(`[Signup] Stored signup for ${email} in database`);
      } catch (dbError) {
        console.error(`[Signup] Database error:`, dbError);
        // Continue with email sending even if DB fails
      }
    }

    // Send notification email to admin
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vienna OS <noreply@regulator.ai>",
          to: ["admin@ai.ventures"],
          subject: `[Vienna OS] New signup: ${name} (${plan})`,
          html: `
            <h2>New Vienna OS Signup</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Name:</strong></td><td>${name}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Company:</strong></td><td>${company || "—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Plan:</strong></td><td>${plan}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Agents:</strong></td><td>${agentCount || "—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Use Case:</strong></td><td>${useCase || "—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Stored in DB:</strong></td><td>${signupStored ? "✓ Yes" : "✗ No"}</td></tr>
            </table>
          `,
        }),
      });
    }

    // Send welcome email to the user using our new enhanced template
    if (resendKey && email) {
      try {
        const firstName = name.split(' ')[0];
        const welcomeHtml = generateWelcomeEmailHtml({
          name,
          firstName,
          email,
          plan: plan || 'community',
          company
        });

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Vienna OS <hello@regulator.ai>",
            to: [email],
            subject: "Welcome to Vienna OS — Your AI Governance Journey Starts Here",
            html: welcomeHtml,
          }),
        });

        console.log(`[Signup] Sent welcome email to ${email}`);

        // Schedule follow-up emails (this would typically be done with a job queue)
        // For now, we'll log when they should be sent
        console.log(`[Signup] Schedule getting-started email for ${email} in 1 day`);
        console.log(`[Signup] Schedule week-one email for ${email} in 7 days`);
        
        if (plan === 'community') {
          console.log(`[Signup] Schedule pilot-offer email for ${email} in 14 days`);
        }

      } catch (emailError) {
        console.error(`[Signup] Welcome email error:`, emailError);
        // Don't fail the signup if email fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Signup completed successfully",
      data: {
        stored: signupStored,
        emailSent: !!resendKey
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generate welcome email HTML inline to avoid React DOM Server issues
function generateWelcomeEmailHtml({ name, firstName, email, plan, company }: {
  name: string;
  firstName: string; 
  email: string;
  plan: string;
  company?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Vienna OS</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f8fafc;">

<div style="max-width:600px;margin:0 auto;background-color:#ffffff;color:#333333;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
    <div style="width:60px;height:60px;background-color:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#ffffff;">
      🛡️
    </div>
    <h1 style="margin:0;font-size:28px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
      Welcome to Vienna OS
    </h1>
    <p style="margin:12px 0 0;font-size:18px;color:rgba(255,255,255,0.9);font-weight:400;">
      Governed AI Execution Layer
    </p>
  </div>

  <!-- Content -->
  <div style="padding:40px 30px;">
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">
      Hi ${firstName},
    </p>
    
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#4a5568;">
      Welcome to Vienna OS! You're now part of a platform that makes AI governance
      practical, not bureaucratic. Whether you're protecting against AI risks or
      ensuring compliance, Vienna OS has you covered.
    </p>

    <!-- Get Started Section -->
    <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:32px 0;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2d3748;">
        🚀 Get Started in 3 Steps
      </h2>
      
      <!-- Step 1 -->
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          1. Explore the Live Console
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          See Vienna OS in action with our shared sandbox environment.
        </p>
        <a href="https://console.regulator.ai" style="display:inline-flex;align-items:center;background-color:#667eea;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:14px;font-weight:500;">
          Open Console →
        </a>
      </div>

      <!-- Step 2 -->
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          2. Test the API
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          Try a simple governance request to see how Vienna works.
        </p>
        <div style="background-color:#1a202c;color:#e2e8f0;padding:12px;border-radius:6px;font-size:12px;font-family:Monaco,'Cascadia Code','Roboto Mono',Consolas,'Times New Roman',monospace;overflow:auto;">
curl -X POST https://console.regulator.ai/api/v1/agent/intent \\<br/>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br/>
&nbsp;&nbsp;-d '{"action":"check_health","source":"test"}'
        </div>
      </div>

      <!-- Step 3 -->
      <div>
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#4a5568;">
          3. Read the Quickstart
        </h3>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#718096;">
          Learn how to integrate Vienna into your AI stack in under 10 minutes.
        </p>
        <a href="https://regulator.ai/docs" style="display:inline-flex;align-items:center;color:#667eea;text-decoration:none;font-size:14px;font-weight:500;">
          View Documentation →
        </a>
      </div>
    </div>

    ${plan === 'enterprise' ? `
    <!-- Enterprise Section -->
    <div style="background-color:#fef5e7;border:2px solid #f6ad55;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#c05621;">
        🤝 Enterprise Setup
      </h3>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#9c4221;">
        Our team will reach out within 24 hours to discuss your enterprise deployment,
        compliance requirements, and custom governance policies.
      </p>
    </div>
    ` : `
    <!-- Pro Tip Section -->
    <div style="background-color:#e6fffa;border:2px solid #38b2ac;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#234e52;">
        💡 Pro Tip
      </h3>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#285e61;">
        Start with simple health checks and governance policies. As you get comfortable,
        explore advanced features like warrant systems and multi-tier risk management.
      </p>
    </div>
    `}

    <p style="font-size:16px;line-height:1.5;margin:32px 0 0;color:#4a5568;">
      Questions? Just reply to this email — our team reads every message.
    </p>

    <p style="font-size:16px;line-height:1.5;margin:24px 0 0;color:#4a5568;">
      Welcome aboard!<br/>
      <strong>— The Vienna OS Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="background-color:#f7fafc;padding:24px 30px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0 0 12px;font-size:12px;color:#a0aec0;">
      Vienna OS by AI.Ventures
    </p>
    <p style="margin:0;font-size:12px;color:#a0aec0;">
      Sent to ${email} • <a href="#" style="color:#667eea;">Unsubscribe</a>
    </p>
  </div>
</div>

</body>
</html>
  `.trim();
}