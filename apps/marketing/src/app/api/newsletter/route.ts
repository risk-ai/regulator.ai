import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

interface NewsletterEntry {
  email: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// Ensure schema is set on every connection
pool.on("connect", (client) => {
  client.query("SET search_path TO regulator, public");
});

async function getSignupCount(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT COUNT(*) as count FROM newsletter_signups");
    return parseInt(result.rows[0].count, 10);
  } finally {
    client.release();
  }
}

async function addSignup(email: string, ip?: string, userAgent?: string): Promise<{ success: boolean; duplicate?: boolean }> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO newsletter_signups (email, ip, user_agent, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [email, ip, userAgent]
    );
    return { success: true };
  } catch (error: any) {
    // Postgres unique constraint violation (duplicate email)
    if (error.code === "23505") {
      return { success: false, duplicate: true };
    }
    throw error;
  } finally {
    client.release();
  }
}

async function sendWelcomeEmail(email: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not set, skipping email send");
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "Vienna OS <updates@regulator.ai>",
      to: [email],
      subject: "Welcome to Vienna OS — Governance Layer for AI Agents",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0f172a; color: #cbd5e1;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h9"></path>
                <path d="m3 7 9 6 9-6"></path>
              </svg>
              <h1 style="color: white; font-size: 24px; font-weight: bold; margin: 0;">
                Vienna<span style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">OS</span>
              </h1>
            </div>
            <h2 style="color: #8b5cf6; font-size: 20px; margin: 0;">Welcome to the waitlist!</h2>
          </div>

          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: white; font-size: 18px; margin-top: 0; margin-bottom: 16px;">What's Vienna OS?</h3>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
              Vienna OS is the <strong style="color: #8b5cf6;">governance and authorization layer</strong> for AI agent systems. 
              Instead of hoping agents behave correctly, we make misbehavior impossible through:
            </p>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong style="color: #06b6d4;">Cryptographic warrants</strong> — Every action requires authorization</li>
              <li><strong style="color: #06b6d4;">Risk-tiered approval</strong> — T0-T3 workflows based on impact</li>
              <li><strong style="color: #06b6d4;">Immutable audit trails</strong> — Complete governance records</li>
              <li><strong style="color: #06b6d4;">Policy enforcement</strong> — Automated rule evaluation</li>
            </ul>
          </div>

          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: white; font-size: 18px; margin-top: 0; margin-bottom: 16px;">What happens next?</h3>
            <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>We'll notify you when Vienna OS enters public beta</li>
              <li>You'll get early access to the governance console</li>
              <li>Free tier includes governance for up to 3 AI agents</li>
              <li>Priority support during the beta period</li>
            </ol>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://regulator.ai/try" 
               style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #06b6d4); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
              Try the Interactive Demo
            </a>
          </div>

          <div style="text-align: center; border-top: 1px solid #334155; padding-top: 24px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
              Vienna OS — The governance layer agents answer to
            </p>
            <p style="margin: 0; color: #475569; font-size: 12px;">
              © 2026 Technetwork 2 LLC dba ai.ventures
            </p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

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

    // Try to add signup to database
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    
    const result = await addSignup(trimmedEmail, ip, userAgent);

    if (result.duplicate) {
      return NextResponse.json(
        { error: "This email is already on our waitlist" },
        { status: 409 }
      );
    }

    // Try to send welcome email
    const emailSent = await sendWelcomeEmail(trimmedEmail);

    console.log(`Newsletter signup: ${trimmedEmail} (email sent: ${emailSent})`);

    return NextResponse.json({ 
      success: true, 
      emailSent,
      message: "Successfully joined the waitlist" 
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
  try {
    const count = await getSignupCount();
    
    // Return only count for privacy
    return NextResponse.json({ 
      count,
      message: `${count} signups so far` 
    });
  } catch (error) {
    console.error("Newsletter count error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}