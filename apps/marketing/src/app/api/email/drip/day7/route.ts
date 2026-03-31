import { NextResponse } from "next/server";
import { EmailService, extractFirstName, determineIndustry } from '../../../../lib/email-service-simple';

/**
 * API route for sending Day 7 email: ROI & Urgency
 * Triggered by cron job or manual call
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emails } = body; // Array of email objects: [{ email, name, company, plan, useCase }]

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: "emails array is required" },
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

    const emailService = new EmailService(resendKey);
    const results = [];

    for (const emailData of emails) {
      try {
        const firstName = extractFirstName(emailData.name);
        const industry = determineIndustry(emailData.company, emailData.useCase);
        
        const data = {
          firstName,
          email: emailData.email,
          company: emailData.company,
          plan: emailData.plan || 'community',
          industry
        };

        const result = await emailService.sendROIUrgencyEmail(data);
        
        results.push({
          email: emailData.email,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          plan: emailData.plan
        });

        if (result.success) {
          console.log(`[DripDay7] Sent ROI & urgency email to ${emailData.email} (${emailData.plan || 'community'}) - Message ID: ${result.messageId}`);
        } else {
          console.error(`[DripDay7] Failed to send to ${emailData.email}:`, result.error);
        }

        // Small delay between emails to be nice to Resend
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (emailError) {
        console.error(`[DripDay7] Error processing ${emailData.email}:`, emailError);
        results.push({
          email: emailData.email,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[DripDay7] Batch complete: ${successful} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Day 7 drip emails processed: ${successful} sent, ${failed} failed`,
      results,
      summary: {
        total: emails.length,
        sent: successful,
        failed: failed
      }
    });

  } catch (error) {
    console.error("[DripDay7] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch users eligible for Day 7 email
 * Useful for cron jobs to get the list first
 */
export async function GET() {
  try {
    const neonUrl = process.env.POSTGRES_URL;
    if (!neonUrl) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(neonUrl);
    
    // Calculate 7 days ago
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    // Find signups eligible for Day 7 email
    const candidates = await sql`
      SELECT s.email, s.name, s.company, s.plan, s.use_case
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'roi-urgency'
      WHERE s.created_at::date = ${sevenDaysAgo.toISOString().split('T')[0]}::date
        AND es.email IS NULL
        AND s.email IS NOT NULL
        AND s.name IS NOT NULL
      ORDER BY s.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      candidates,
      count: candidates.length,
      targetDate: sevenDaysAgo.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error("[DripDay7] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}