import { NextRequest, NextResponse } from "next/server";

/**
 * Verify a Stripe Checkout Session server-side.
 * Called by /signup/success after Stripe redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id || typeof session_id !== "string" || !session_id.startsWith("cs_")) {
      return NextResponse.json(
        { verified: false, error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // No Stripe key — allow graceful degradation
      return NextResponse.json({ verified: true, fallback: true });
    }

    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(stripeKey + ":").toString("base64")}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { verified: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const session = await res.json();

    return NextResponse.json({
      verified: true,
      status: session.payment_status,
      plan: session.metadata?.plan || "unknown",
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    console.error("Stripe session verification error:", err);
    return NextResponse.json(
      { verified: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
