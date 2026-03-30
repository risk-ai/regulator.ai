#!/bin/bash
#
# Auto-update Vercel frontend with current Cloudflare Tunnel URL
#
# This script:
# 1. Extracts the current Quick Tunnel URL from logs
# 2. Updates vercel.json in the frontend
# 3. Redeploys to Vercel if URL changed
#
# Run via cron every 5 minutes to ensure console stays operational

set -euo pipefail

FRONTEND_DIR="/home/maxlawai/regulator.ai/apps/console/client"
VERCEL_JSON="${FRONTEND_DIR}/vercel.json"
TUNNEL_LOG="/tmp/cloudflared.log"
LAST_URL_FILE="/tmp/last-tunnel-url.txt"

# Extract current tunnel URL from running cloudflared process or logs
get_current_url() {
  if [ -f "$TUNNEL_LOG" ]; then
    grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1
  else
    echo ""
  fi
}

# Read last known URL
get_last_url() {
  if [ -f "$LAST_URL_FILE" ]; then
    cat "$LAST_URL_FILE"
  else
    echo ""
  fi
}

# Main logic
CURRENT_URL=$(get_current_url)
LAST_URL=$(get_last_url)

if [ -z "$CURRENT_URL" ]; then
  echo "[$(date)] No tunnel URL found in logs"
  exit 0
fi

if [ "$CURRENT_URL" = "$LAST_URL" ]; then
  echo "[$(date)] Tunnel URL unchanged: $CURRENT_URL"
  exit 0
fi

echo "[$(date)] Tunnel URL changed from '$LAST_URL' to '$CURRENT_URL'"

# Update vercel.json
cat > "$VERCEL_JSON" << EOF
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "${CURRENT_URL}/api/:path*"
    }
  ]
}
EOF

echo "[$(date)] Updated $VERCEL_JSON"

# Deploy to Vercel
cd "$FRONTEND_DIR"
vercel --prod --yes > /tmp/vercel-deploy.log 2>&1

# Extract new deployment URL and set alias
DEPLOYMENT_URL=$(grep -oP 'https://client-[a-z0-9]+-ai-ventures-portfolio\.vercel\.app' /tmp/vercel-deploy.log | tail -1)

if [ -n "$DEPLOYMENT_URL" ]; then
  vercel alias "$DEPLOYMENT_URL" console.regulator.ai >> /tmp/vercel-deploy.log 2>&1
  echo "[$(date)] Deployed $DEPLOYMENT_URL → console.regulator.ai"
fi

# Save current URL
echo "$CURRENT_URL" > "$LAST_URL_FILE"

echo "[$(date)] Console updated successfully"
