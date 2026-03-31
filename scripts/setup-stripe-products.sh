#!/bin/bash
# Setup Stripe products for Vienna OS
# Usage: STRIPE_SECRET_KEY=sk_... ./scripts/setup-stripe-products.sh

set -e

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable required"
  echo "Usage: STRIPE_SECRET_KEY=sk_... ./scripts/setup-stripe-products.sh"
  exit 1
fi

echo "Creating Vienna OS Stripe products..."

# Create Team product
echo "Creating Team product..."
TEAM_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY": \
  -d name="Vienna OS - Team" \
  -d description="Cloud-hosted AI governance for growing teams (up to 25 agents)")

TEAM_PRODUCT_ID=$(echo "$TEAM_PRODUCT" | jq -r '.id')
echo "Team Product ID: $TEAM_PRODUCT_ID"

# Create Team price ($49/agent/month)
echo "Creating Team price..."
TEAM_PRICE=$(curl -s https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY": \
  -d product="$TEAM_PRODUCT_ID" \
  -d unit_amount=4900 \
  -d currency=usd \
  -d recurring[interval]=month \
  -d recurring[usage_type]=metered \
  -d billing_scheme=per_unit)

TEAM_PRICE_ID=$(echo "$TEAM_PRICE" | jq -r '.id')
echo "Team Price ID: $TEAM_PRICE_ID"

# Create Business product
echo "Creating Business product..."
BUSINESS_PRODUCT=$(curl -s https://api.stripe.com/v1/products \
  -u "$STRIPE_SECRET_KEY": \
  -d name="Vienna OS - Business" \
  -d description="Advanced AI governance for enterprises (up to 100 agents)")

BUSINESS_PRODUCT_ID=$(echo "$BUSINESS_PRODUCT" | jq -r '.id')
echo "Business Product ID: $BUSINESS_PRODUCT_ID"

# Create Business price ($99/agent/month)
echo "Creating Business price..."
BUSINESS_PRICE=$(curl -s https://api.stripe.com/v1/prices \
  -u "$STRIPE_SECRET_KEY": \
  -d product="$BUSINESS_PRODUCT_ID" \
  -d unit_amount=9900 \
  -d currency=usd \
  -d recurring[interval]=month \
  -d recurring[usage_type]=metered \
  -d billing_scheme=per_unit)

BUSINESS_PRICE_ID=$(echo "$BUSINESS_PRICE" | jq -r '.id')
echo "Business Price ID: $BUSINESS_PRICE_ID"

echo ""
echo "✅ Stripe products created successfully!"
echo ""
echo "Add these to your Vercel environment variables:"
echo ""
echo "STRIPE_TEAM_PRICE_ID=$TEAM_PRICE_ID"
echo "STRIPE_BUSINESS_PRICE_ID=$BUSINESS_PRICE_ID"
echo ""
echo "Also set these:"
echo "STRIPE_SECRET_KEY=<your_stripe_secret_key>"
echo "STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>"
echo "STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_signing_secret>"
