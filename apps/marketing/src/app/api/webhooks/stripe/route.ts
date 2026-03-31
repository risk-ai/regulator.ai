import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

export const runtime = 'nodejs';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

interface CheckoutSession {
  id: string;
  customer: string;
  customer_email: string;
  subscription: string;
  metadata: Record<string, string>;
  amount_total: number;
  currency: string;
}

interface Subscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        id: string;
        nickname?: string;
      };
    }>;
  };
  metadata: Record<string, string>;
}

interface Invoice {
  id: string;
  customer: string;
  subscription: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  hosted_invoice_url: string;
  attempt_count: number;
}

function verifyStripeSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const elements = signature.split(',');
    let timestamp: string | undefined;
    let v1Signature: string | undefined;

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        v1Signature = value;
      }
    }

    if (!timestamp || !v1Signature) {
      return false;
    }

    // Check timestamp (prevent replay attacks - allow 5 minute tolerance)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    const tolerance = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - timestampMs) > tolerance) {
      console.warn(`Webhook timestamp too old: ${Math.abs(now - timestampMs)}ms`);
      return false;
    }

    // Verify signature
    const payload = `${timestamp}.${rawBody}`;
    const computedSignature = createHash('sha256')
      .update(payload, 'utf8')
      .digest('hex');

    const computedBuffer = Buffer.from(computedSignature, 'hex');
    const receivedBuffer = Buffer.from(v1Signature, 'hex');

    if (computedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, receivedBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function logEvent(event: StripeEvent, context: Record<string, any> = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    event_id: event.id,
    event_type: event.type,
    event_created: new Date(event.created * 1000).toISOString(),
    ...context,
  };
  
  console.log(`[STRIPE_WEBHOOK] ${JSON.stringify(logData)}`);
}

async function handleCheckoutSessionCompleted(session: CheckoutSession) {
  logEvent(
    { id: session.id, type: 'checkout.session.completed', data: { object: session }, created: Math.floor(Date.now() / 1000) },
    {
      customer_id: session.customer,
      customer_email: session.customer_email,
      subscription_id: session.subscription,
      amount_total: session.amount_total,
      currency: session.currency,
      plan: session.metadata.plan || 'unknown',
      domain: session.metadata.domain || 'regulator.ai',
    }
  );

  // TODO: Insert new subscription into Neon Postgres (regulator schema)
  // Table: subscriptions (id, stripe_customer_id, stripe_subscription_id, email, plan, status, created_at)
}

async function handleSubscriptionUpdated(subscription: Subscription) {
  const planName = subscription.items.data[0]?.price?.nickname || subscription.items.data[0]?.price?.id || 'unknown';
  
  logEvent(
    { id: subscription.id, type: 'customer.subscription.updated', data: { object: subscription }, created: Math.floor(Date.now() / 1000) },
    {
      customer_id: subscription.customer,
      subscription_id: subscription.id,
      status: subscription.status,
      plan: planName,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }
  );

  // TODO: Update subscription in Neon Postgres (regulator schema)
  // Update: status, plan, current_period_end based on subscription_id
}

async function handleSubscriptionDeleted(subscription: Subscription) {
  logEvent(
    { id: subscription.id, type: 'customer.subscription.deleted', data: { object: subscription }, created: Math.floor(Date.now() / 1000) },
    {
      customer_id: subscription.customer,
      subscription_id: subscription.id,
      status: 'cancelled',
      cancellation_date: new Date().toISOString(),
    }
  );

  // TODO: Update subscription status to 'cancelled' in Neon Postgres (regulator schema)
  // Update: status = 'cancelled', cancelled_at = NOW() based on subscription_id
}

async function handleInvoicePaymentSucceeded(invoice: Invoice) {
  logEvent(
    { id: invoice.id, type: 'invoice.payment_succeeded', data: { object: invoice }, created: Math.floor(Date.now() / 1000) },
    {
      customer_id: invoice.customer,
      subscription_id: invoice.subscription,
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      invoice_url: invoice.hosted_invoice_url,
    }
  );

  // TODO: Insert payment record into Neon Postgres (regulator schema)
  // Table: payments (id, stripe_invoice_id, subscription_id, amount, currency, status, paid_at)
}

async function handleInvoicePaymentFailed(invoice: Invoice) {
  logEvent(
    { id: invoice.id, type: 'invoice.payment_failed', data: { object: invoice }, created: Math.floor(Date.now() / 1000) },
    {
      customer_id: invoice.customer,
      subscription_id: invoice.subscription,
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
      status: invoice.status,
      invoice_url: invoice.hosted_invoice_url,
    }
  );

  // TODO: Insert failed payment record into Neon Postgres (regulator schema)
  // Table: payment_failures (id, stripe_invoice_id, subscription_id, amount_due, currency, attempt_count, failed_at)
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[STRIPE_WEBHOOK] Missing stripe-signature header');
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    
    // Verify webhook signature
    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
      console.error('[STRIPE_WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event: StripeEvent = JSON.parse(rawBody);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as CheckoutSession);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Invoice);
        break;

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('[STRIPE_WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}