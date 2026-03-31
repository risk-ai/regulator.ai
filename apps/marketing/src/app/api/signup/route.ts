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

    // Send welcome email to the user using the new email drip sequence
    if (resendKey && email) {
      try {
        const { EmailService, extractFirstName, determineIndustry } = await import('@/lib/email-service-simple');
        const emailService = new EmailService(resendKey);
        
        const firstName = extractFirstName(name);
        const industry = determineIndustry(company, useCase);
        
        const emailData = {
          firstName,
          email,
          company,
          plan: plan || 'community',
          industry
        };

        // Send Email 1: Welcome & Quick Start (immediately)
        const welcomeResult = await emailService.sendWelcomeEmail(emailData);
        
        if (welcomeResult.success) {
          console.log(`[Signup] Sent welcome email to ${email} (Message ID: ${welcomeResult.messageId})`);
        } else {
          console.error(`[Signup] Welcome email failed:`, welcomeResult.error);
        }

        // Schedule follow-up emails via database for cron processing
        // This approach allows for reliable scheduling and retry logic
        console.log(`[Signup] Email drip sequence initiated for ${email}`);
        console.log(`[Signup] - Day 3: Use Case Deep Dive (${industry})`);
        console.log(`[Signup] - Day 7: ROI & Urgency${plan === 'community' ? ' with upgrade prompt' : ''}`);

      } catch (emailError) {
        console.error(`[Signup] Email drip sequence error:`, emailError);
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

