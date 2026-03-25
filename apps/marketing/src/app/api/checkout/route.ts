import { NextResponse } from "next/server";

const PRICE_MAP: Record<string, string | undefined> = {
  team: process.env.STRIPE_TEAM_PRICE,
  business: process.env.STRIPE_BUSINESS_PRICE,
};

export async function POST(request: Request) {
  try {
    const { plan, email, name } = await request.json();

    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid plan. Use 'team' or 'business'." },
        { status: 400 }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("success_url", `https://regulator.ai/signup/success?plan=${plan}`);
    params.append("cancel_url", `https://regulator.ai/signup?plan=${plan}`);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("allow_promotion_codes", "true");
    params.append("billing_address_collection", "required");
    if (email) params.append("customer_email", email);
    params.append("metadata[plan]", plan);
    params.append("metadata[domain]", "regulator.ai");
    if (name) params.append("metadata[customer_name]", name);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(stripeKey + ":").toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      console.error("Stripe error:", session.error);
      return NextResponse.json(
        { error: session.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
