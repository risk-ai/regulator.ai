#!/bin/bash
#
# Enable Production Monitoring for Vienna OS
#
# This script sets up:
# - Sentry error tracking
# - Log aggregation (CloudWatch)
# - Performance monitoring
#

set -e

echo "🚀 Vienna OS Production Monitoring Setup"
echo "========================================"
echo ""

# Check if running in production
if [ "$NODE_ENV" != "production" ]; then
  echo "⚠️  Warning: NODE_ENV is not 'production'"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 1: Install Sentry
echo "📦 Installing Sentry..."
npm install @sentry/node @sentry/profiling-node --save

# Step 2: Check for Sentry DSN
if [ -z "$SENTRY_DSN" ]; then
  echo ""
  echo "⚠️  SENTRY_DSN not set!"
  echo "Get your DSN from: https://sentry.io/settings/projects/vienna-os/keys/"
  echo ""
  read -p "Enter Sentry DSN: " SENTRY_DSN
  
  # Add to .env
  echo "SENTRY_DSN=$SENTRY_DSN" >> .env
  echo "✅ Added SENTRY_DSN to .env"
fi

# Step 3: Install CloudWatch SDK (optional)
read -p "Enable CloudWatch log aggregation? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Installing AWS CloudWatch SDK..."
  npm install @aws-sdk/client-cloudwatch-logs --save
  echo "✅ CloudWatch SDK installed"
  echo ""
  echo "📝 To configure CloudWatch, add to .env:"
  echo "AWS_REGION=us-east-1"
  echo "AWS_ACCESS_KEY_ID=your_key"
  echo "AWS_SECRET_ACCESS_KEY=your_secret"
  echo "CLOUDWATCH_LOG_GROUP=/vienna-os/console"
  echo "CLOUDWATCH_LOG_STREAM=production"
fi

# Step 4: Build and restart
echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Monitoring setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy to production (vercel deploy --prod)"
echo "2. Verify Sentry is receiving events: https://sentry.io/organizations/vienna-os/issues/"
echo "3. Check health endpoint: curl https://console.regulator.ai/health"
echo "4. Monitor logs for 24 hours"
echo ""
echo "📊 Monitoring endpoints:"
echo "- Health: https://console.regulator.ai/health"
echo "- Metrics: https://console.regulator.ai/health/metrics"
echo "- Readiness: https://console.regulator.ai/health/ready"
echo "- Liveness: https://console.regulator.ai/health/live"
echo ""
