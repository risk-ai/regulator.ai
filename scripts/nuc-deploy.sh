#!/bin/bash
# =============================================================
# Vienna OS Console — NUC Local Deploy Script
# Replaces Fly.io with local Node.js + Cloudflare Tunnel
# =============================================================
set -e

REPO_DIR="$HOME/.openclaw/workspace/regulator-ai-repo"
CONSOLE_DIR="$REPO_DIR/apps/console"
SERVER_DIR="$CONSOLE_DIR/server"
CLIENT_DIR="$CONSOLE_DIR/client"
VIENNA_LIB="$REPO_DIR/services/vienna-lib"

echo "==========================================="
echo "  Vienna OS Console — NUC Local Deploy"
echo "==========================================="

# ---- Step 1: Pull latest code ----
echo ""
echo "[1/7] Pulling latest code..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main
echo "✅ Code up to date"

# ---- Step 2: Install vienna-lib ----
echo ""
echo "[2/7] Installing vienna-lib dependencies..."
cd "$VIENNA_LIB"
npm install --omit=dev --ignore-scripts 2>/dev/null
echo "✅ vienna-lib ready"

# ---- Step 3: Install server dependencies ----
echo ""
echo "[3/7] Installing server dependencies..."
cd "$SERVER_DIR"
npm install
echo "✅ Server dependencies installed"

# ---- Step 4: Build server ----
echo ""
echo "[4/7] Building server..."
npm run build:prod
echo "✅ Server built → $SERVER_DIR/build/server.cjs"

# ---- Step 5: Install & build client ----
echo ""
echo "[5/7] Building frontend..."
cd "$CLIENT_DIR"
npm ci
npm run build
echo "✅ Frontend built → $CLIENT_DIR/dist/"

# ---- Step 6: Install cloudflared if missing ----
echo ""
echo "[6/7] Checking cloudflared..."
if ! command -v cloudflared &> /dev/null; then
  echo "Installing cloudflared..."
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  sudo dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
  echo "✅ cloudflared installed"
else
  echo "✅ cloudflared already installed ($(cloudflared --version))"
fi

# ---- Step 7: Create systemd services ----
echo ""
echo "[7/7] Creating systemd services..."

# Vienna OS Console service
sudo tee /etc/systemd/system/vienna-console.service > /dev/null << 'UNIT'
[Unit]
Description=Vienna OS Console Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=maxlawai
WorkingDirectory=/home/maxlawai/.openclaw/workspace/regulator-ai-repo/apps/console/server
ExecStart=/usr/bin/node build/server.cjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=HOST=0.0.0.0
Environment=CORS_ORIGIN=https://console.regulator.ai,https://regulator.ai,http://localhost:3100
EnvironmentFile=/home/maxlawai/.openclaw/workspace/regulator-ai-repo/.env.console

[Install]
WantedBy=multi-user.target
UNIT

echo "✅ Systemd services created"

echo ""
echo "==========================================="
echo "  Setup complete! Next steps:"
echo "==========================================="
echo ""
echo "1. Create .env.console with your secrets:"
echo "   nano $REPO_DIR/.env.console"
echo ""
echo "   Required vars:"
echo "   POSTGRES_URL=postgres://neondb_owner:PASSWORD@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
echo "   VIENNA_SESSION_SECRET=<random-64-char-string>"
echo "   VIENNA_OPERATOR_PASSWORD=<your-password>"
echo ""
echo "2. Start the console:"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable vienna-console"
echo "   sudo systemctl start vienna-console"
echo ""
echo "3. Verify it's running:"
echo "   curl http://localhost:3100/health"
echo ""
echo "4. Set up Cloudflare Tunnel (see nuc-cloudflare-tunnel.sh)"
echo ""
