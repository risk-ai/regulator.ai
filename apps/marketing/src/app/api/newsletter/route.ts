import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const neonUrl = process.env.DATABASE_URL;
    let stored = false;

    if (neonUrl) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(neonUrl);

        // Ensure table exists
        await sql`
          CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            source TEXT DEFAULT 'website',
            ip TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `;

        // Insert (or ignore duplicate)
        const result = await sql`
          INSERT INTO newsletter_subscribers (email, source, ip, user_agent)
          VALUES (
            ${trimmedEmail},
            'homepage',
            ${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null},
            ${request.headers.get("user-agent") || null}
          )
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `;

        stored = true;

        // If it was a duplicate (no rows returned), still succeed
        if (result.length === 0) {
          return NextResponse.json({
            success: true,
            message: "Already subscribed",
          });
        }

        console.log(`[Newsletter] New subscriber: ${trimmedEmail}`);
      } catch (dbError) {
        console.error("[Newsletter] Database error:", dbError);
        // Fall through — still try to send welcome email
      }
    }

    // Send welcome email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendKey && stored) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Vienna OS <updates@regulator.ai>",
            to: [trimmedEmail],
            subject:
              "Welcome to Vienna OS — Governance Layer for AI Agents",
            html: `
              <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0e14; color: #a1a1aa;">
                <div style="border: 1px solid rgba(251, 191, 36, 0.3); padding: 0; margin-bottom: 32px;">
                  <div style="background: rgba(251, 191, 36, 0.1); border-bottom: 1px solid rgba(251, 191, 36, 0.3); padding: 8px 16px;">
                    <span style="color: #f59e0b; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">DISPATCH_CONFIRMED</span>
                  </div>
                  <div style="padding: 24px;">
                    <h1 style="color: #f59e0b; font-size: 20px; margin: 0 0 16px 0; font-family: 'Courier New', monospace;">
                      Welcome to Vienna OS
                    </h1>
                    <p style="margin: 0 0 16px 0; line-height: 1.6; font-size: 13px;">
                      You're now subscribed to governance dispatches. Here's what Vienna OS does:
                    </p>
                    <div style="font-size: 12px; line-height: 1.8; padding-left: 12px; border-left: 2px solid rgba(251, 191, 36, 0.3);">
                      <div><span style="color: #71717a;">→</span> <strong style="color: #f59e0b;">Cryptographic warrants</strong> — every agent action requires authorization</div>
                      <div><span style="color: #71717a;">→</span> <strong style="color: #f59e0b;">Risk-tiered approval</strong> — T0-T3 workflows based on impact</div>
                      <div><span style="color: #71717a;">→</span> <strong style="color: #f59e0b;">Immutable audit trails</strong> — complete governance records</div>
                      <div><span style="color: #71717a;">→</span> <strong style="color: #f59e0b;">Policy enforcement</strong> — automated rule evaluation</div>
                    </div>
                  </div>
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="https://console.regulator.ai/signup"
                     style="display: inline-block; background: #f59e0b; color: #000; text-decoration: none; padding: 12px 32px; font-weight: bold; font-family: 'Courier New', monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                    GENERATE_WARRANT →
                  </a>
                </div>

                <div style="text-align: center; border-top: 1px solid rgba(251, 191, 36, 0.1); padding-top: 24px;">
                  <p style="margin: 0 0 4px 0; color: #52525b; font-size: 11px;">
                    Vienna OS — The governance kernel for autonomous AI
                  </p>
                  <p style="margin: 0; color: #3f3f46; font-size: 10px;">
                    © 2026 ai.ventures | <a href="https://regulator.ai" style="color: #f59e0b; text-decoration: none;">regulator.ai</a>
                  </p>
                </div>
              </div>
            `,
          }),
        });
        emailSent = true;
      } catch (emailError) {
        console.error("[Newsletter] Email send error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      message: "Successfully subscribed",
    });
  } catch (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const neonUrl = process.env.DATABASE_URL;

  if (!neonUrl) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(neonUrl);
    const result = await sql`SELECT count(*)::int as count FROM newsletter_subscribers`;
    return NextResponse.json({ count: result[0]?.count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
