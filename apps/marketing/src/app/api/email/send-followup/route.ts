import { NextResponse } from "next/server";
import { EmailService, extractFirstName, determineIndustry } from '@/lib/email-service-simple';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, template, company, plan, useCase, industry } = body;

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

    const emailService = new EmailService(resendKey);
    const firstName = extractFirstName(name);
    const detectedIndustry = industry || determineIndustry(company, useCase);
    
    const emailData = {
      firstName,
      email,
      company,
      plan: plan || 'community',
      industry: detectedIndustry
    };

    let result: { success: boolean; messageId?: string; error?: string };

    switch (template) {
      case 'use-case-deep-dive':
      case 'getting-started': // Legacy alias for compatibility
        result = await emailService.sendUseCaseDeepDiveEmail(emailData);
        break;
      
      case 'roi-urgency':
      case 'week-one': // Legacy alias for compatibility
        result = await emailService.sendROIUrgencyEmail(emailData);
        break;
      
      case 'pilot-offer':
        // For now, send ROI email for pilot offers too
        result = await emailService.sendROIUrgencyEmail(emailData);
        break;
      
      default:
        return NextResponse.json(
          { error: `Invalid template: ${template}. Valid templates: use-case-deep-dive, roi-urgency, pilot-offer` },
          { status: 400 }
        );
    }

    if (result.success) {
      console.log(`[EmailFollowup] Sent ${template} email to ${email} (Message ID: ${result.messageId})`);
      return NextResponse.json({ 
        success: true,
        message: `${template} email sent successfully`,
        template,
        recipient: email,
        messageId: result.messageId,
        industry: detectedIndustry
      });
    } else {
      console.error(`[EmailFollowup] Failed to send ${template} email to ${email}:`, result.error);
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Follow-up email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

