#!/bin/bash
set -e

echo "🚀 Deploying Vienna OS to Fly.io..."

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Build the server
echo "📦 Building server..."
npm run build

# Deploy to Fly
echo "🌐 Deploying to Fly..."
fly deploy

echo "✅ Deployment complete!"
echo ""
echo "🔗 Production URL: https://vienna-os.fly.dev"
echo "🔗 Console URL: https://console.regulator.ai"
echo ""
echo "🧪 Test authentication:"
echo 'curl -X POST https://vienna-os.fly.dev/api/v1/auth/login -H "Content-Type: application/json" -d '"'"'{"password":"P@rrish1922"}'"'"''
