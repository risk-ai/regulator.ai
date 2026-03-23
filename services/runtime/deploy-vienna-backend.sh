#!/bin/bash
set -e

echo "🚀 Deploying Vienna OS backend to Fly.io..."
echo ""

cd /home/maxlawai/.openclaw/workspace/vienna-core

# Check if fly CLI is available
if ! command -v fly &> /dev/null; then
    echo "❌ Error: fly CLI not found"
    echo "Please install: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check authentication
if ! fly auth whoami &> /dev/null; then
    echo "❌ Error: Not authenticated with Fly.io"
    echo "Please run: fly auth login"
    exit 1
fi

echo "✅ Fly CLI authenticated"
echo ""

# Deploy
echo "📦 Building and deploying..."
fly deploy --app vienna-os

echo ""
echo "🔐 Setting secrets..."

# Set secrets
fly secrets set OPERATOR_PASSWORD='P@rrish1922' --app vienna-os
fly secrets set SESSION_SECRET='LZSsKLHUDlhFL/aLEewbIREmD0o48yaqKKTD62IUwyY=' --app vienna-os

echo ""
echo "♻️  Restarting app to apply changes..."
fly apps restart vienna-os

echo ""
echo "⏳ Waiting for deployment to stabilize..."
sleep 15

echo ""
echo "✅ Verifying deployment..."
echo ""

# Verify health
echo "Health check:"
curl -s https://vienna-os.fly.dev/health | jq . || echo "Failed to fetch health"

echo ""
echo "CORS check:"
curl -s -H "Origin: https://regulator.ai" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  https://vienna-os.fly.dev/api/v1/intents \
  -w "\nHTTP Status: %{http_code}\n" 2>&1 | grep -E "(access-control|HTTP Status)" || echo "CORS headers not visible in curl"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Test CORS: Open https://regulator.ai in browser and check console"
echo "  2. Check for stale apps: fly apps list | grep vienna"
echo "  3. Test operator features at https://regulator.ai/workspace"
echo ""
echo "🔍 Useful commands:"
echo "  fly logs --app vienna-os           # View logs"
echo "  fly status --app vienna-os         # Check status"
echo "  fly ssh console --app vienna-os    # SSH into container"
echo ""
