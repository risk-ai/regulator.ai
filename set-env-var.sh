#!/bin/bash
# Set VIENNA_RUNTIME_URL environment variable in Vercel

cd /home/maxlawai/regulator.ai

# Use expect to handle interactive prompts
expect << 'EOF'
set timeout 30
spawn vercel env add VIENNA_RUNTIME_URL preview
expect "Add VIENNA_RUNTIME_URL to which Git branch?"
send "\r"
expect "What's the value of VIENNA_RUNTIME_URL?"
send "https://vienna-runtime-preview.fly.dev\r"
expect eof
EOF

# Also add for development
expect << 'EOF'
set timeout 30
spawn vercel env add VIENNA_RUNTIME_URL development
expect "Add VIENNA_RUNTIME_URL to which Git branch?"
send "\r"
expect "What's the value of VIENNA_RUNTIME_URL?"
send "https://vienna-runtime-preview.fly.dev\r"
expect eof
EOF

echo "Environment variables configured!"
vercel env ls
