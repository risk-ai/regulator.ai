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

    // Send notification email via Resend
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
            </table>
          `,
        }),
      });
    }

    // Send welcome email to the user
    if (resendKey && email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Vienna OS <hello@regulator.ai>",
          to: [email],
          subject: "Welcome to Vienna OS",
          html: `
            <div style="font-family:sans-serif;max-width:560px;">
              <h2 style="color:#A78BFA;">Welcome to Vienna OS</h2>
              <p>Hi ${name.split(" ")[0]},</p>
              <p>Thanks for signing up for the <strong>${plan}</strong> plan.</p>
              ${
                plan === "community"
                  ? `
                <p>Your sandbox console is ready:</p>
                <ul>
                  <li><strong>URL:</strong> <a href="https://vienna-os.fly.dev">vienna-os.fly.dev</a></li>
                  <li><strong>Username:</strong> vienna</li>
                  <li><strong>Password:</strong> vienna2024</li>
                </ul>
                <p>You can also test the API directly:</p>
                <pre style="background:#1a1a2e;color:#e2e8f0;padding:12px;border-radius:8px;font-size:13px;overflow-x:auto;">curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \\
  -H "Content-Type: application/json" \\
  -d '{"action":"check_health","source":"openclaw","tenant_id":"test"}'</pre>
              `
                  : plan === "enterprise"
                  ? `<p>Our team will reach out within 24 hours to discuss your enterprise deployment.</p>
                     <p>In the meantime, you can explore the sandbox at <a href="https://vienna-os.fly.dev">vienna-os.fly.dev</a>.</p>`
                  : `<p>We're provisioning your ${plan} environment. You'll receive setup instructions shortly.</p>
                     <p>In the meantime, explore the sandbox at <a href="https://vienna-os.fly.dev">vienna-os.fly.dev</a>.</p>`
              }
              <p>Docs: <a href="https://regulator.ai/docs">regulator.ai/docs</a></p>
              <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— The Vienna OS Team (ai.ventures)</p>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
