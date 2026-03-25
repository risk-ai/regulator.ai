import { NextResponse } from "next/server";

/**
 * Try API — lets users test the Vienna OS governance pipeline
 * directly from regulator.ai without needing to go to the console.
 * 
 * POST /api/try
 * Body: { action: string } 
 * Proxies to vienna-os.fly.dev/api/v1/agent/intent
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
        {
          error: `Invalid action. Allowed: ${allowedActions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const res = await fetch("https://vienna-os.fly.dev/api/v1/agent/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        source: "regulator.ai-try",
        tenant_id: "sandbox",
      }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Try API error:", error);
    return NextResponse.json(
      { error: "Failed to reach Vienna OS" },
      { status: 502 }
    );
  }
}
