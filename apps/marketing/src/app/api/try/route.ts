import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Try API — sandbox governance testing from regulator.ai
 * 
 * Forwards the real client IP to Vienna OS to avoid Vercel's
 * server IP triggering rate limits.
 */
export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    const allowedActions = [
      "check_health",
      "list_objectives",
      "check_system_status",
      "list_recent_executions",
    ];

    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${allowedActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Forward real client IP so rate limiter doesn't block Vercel's IP
    const headersList = await headers();
    const clientIp =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";

    const res = await fetch("https://vienna-os.fly.dev/api/v1/agent/intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp,
        "X-Real-IP": clientIp,
      },
      body: JSON.stringify({
        action,
        source: "openclaw",
        tenant_id: "sandbox",
        context: { origin: "regulator.ai-try", client_ip: clientIp },
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Try API error:", error);
    return NextResponse.json(
      { error: "Failed to reach Vienna OS", success: false, code: "PROXY_ERROR" },
      { status: 502 }
    );
  }
}
