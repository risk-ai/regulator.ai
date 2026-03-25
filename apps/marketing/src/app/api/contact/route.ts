import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, company, type, message } = await request.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Vienna OS <noreply@regulator.ai>",
          to: ["admin@ai.ventures"],
          replyTo: email,
          subject: `[Vienna OS Contact] ${type}: ${name}`,
          html: `<h2>Contact Form Submission</h2>
            <table style="border-collapse:collapse;font-family:sans-serif;">
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Name:</strong></td><td>${name}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Company:</strong></td><td>${company || "—"}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666;"><strong>Type:</strong></td><td>${type}</td></tr>
            </table>
            <h3>Message:</h3>
            <p style="white-space:pre-wrap;">${message}</p>`,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
