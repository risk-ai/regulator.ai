#!/bin/bash
# Test Vienna Console Server boot with Postgres
# Usage: ./test-postgres-boot.sh

set -e

echo "🧪 Vienna Console Server - Postgres Boot Test"
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Start Postgres if not already running
if ! docker ps | grep -q vienna-postgres-dev; then
  echo "📦 Starting Postgres container..."
  docker-compose -f docker-compose.postgres.yml up -d
  
  echo "⏳ Waiting for Postgres to be ready..."
  sleep 5
  
  # Wait for health check
  until docker exec vienna-postgres-dev pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Still waiting..."
    sleep 2
  done
  
  echo "✅ Postgres is ready"
else
  echo "✅ Postgres container already running"
fi

echo ""

# Set environment variables
export POSTGRES_URL="postgres://postgres:dev@localhost:5432/vienna_dev"
export VIENNA_OPERATOR_PASSWORD="test-password-local-only"
export VIENNA_SESSION_SECRET="test-secret-local-only-do-not-use-in-production"
export VIENNA_ENV="test"
export NODE_ENV="development"
export PORT="3100"

echo "🔧 Environment configured:"
echo "   POSTGRES_URL: postgres://postgres:***@localhost:5432/vienna_dev"
echo "   VIENNA_ENV: test"
echo "   PORT: 3100"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "🚀 Starting server..."
echo ""
echo "Expected: Server should boot successfully and log:"
echo "  ✓ [StateGraph] Initialized with Postgres"
echo "  ✓ [ChatHistoryService] Initialized with Postgres"
echo "  ✓ Server listening on 0.0.0.0:3100"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run server
npm run dev
