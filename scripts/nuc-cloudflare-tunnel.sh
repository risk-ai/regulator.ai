#!/bin/bash
# =============================================================
# Cloudflare Tunnel Setup for Vienna OS Console
# Routes console.regulator.ai → localhost:3100 on the NUC
# =============================================================
set -e

echo "==========================================="
echo "  Cloudflare Tunnel — Vienna OS Console"
echo "==========================================="

# ---- Step 1: Authenticate with Cloudflare ----
echo ""
echo "[1/4] Authenticating with Cloudflare..."
echo "This will open a browser — log in with the regulator.ai domain owner account."
cloudflared tunnel login

# ---- Step 2: Create the tunnel ----
echo ""
echo "[2/4] Creating tunnel 'vienna-console'..."
cloudflared tunnel create vienna-console
TUNNEL_ID=$(cloudflared tunnel list | grep vienna-console | awk '{print $1}')
echo "✅ Tunnel created: $TUNNEL_ID"

# ---- Step 3: Create tunnel config ----
echo ""
echo "[3/4] Writing tunnel config..."
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /home/maxlawai/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: console.regulator.ai
    service: http://localhost:3100
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF

echo "✅ Config written to ~/.cloudflared/config.yml"

# ---- Step 4: Create DNS record ----
echo ""
echo "[4/4] Creating DNS CNAME for console.regulator.ai..."
cloudflared tunnel route dns vienna-console console.regulator.ai
echo "✅ DNS configured"

# ---- Create systemd service for the tunnel ----
echo ""
echo "Creating systemd service for cloudflared..."
sudo tee /etc/systemd/system/cloudflared-vienna.service > /dev/null << UNIT
[Unit]
Description=Cloudflare Tunnel for Vienna OS Console
After=network.target vienna-console.service
Wants=vienna-console.service

[Service]
Type=simple
User=maxlawai
ExecStart=/usr/bin/cloudflared tunnel run vienna-console
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable cloudflared-vienna
sudo systemctl start cloudflared-vienna

echo ""
echo "==========================================="
echo "  ✅ Tunnel is live!"
echo "==========================================="
echo ""
echo "  https://console.regulator.ai → localhost:3100"
echo ""
echo "  Verify: curl https://console.regulator.ai/health"
echo ""
echo "  Manage:"
echo "    sudo systemctl status vienna-console"
echo "    sudo systemctl status cloudflared-vienna"
echo "    sudo journalctl -u vienna-console -f"
echo "    sudo journalctl -u cloudflared-vienna -f"
echo ""
