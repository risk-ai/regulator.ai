#!/bin/bash

# Vienna OS Normal Mode Restore
# Reverts to standard UI

set -e

echo "🔧 Vienna OS Normal Mode Restore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the console directory
if [ ! -f "client/src/main.tsx" ]; then
  echo "❌ Error: Run this script from vienna-core/console/"
  exit 1
fi

# Check if backup exists
if [ ! -f "client/src/main.tsx.backup" ]; then
  echo "⚠️  No backup found. Manually reverting..."
  sed -i "s|import { App } from './AppPresentation.js';|import { App } from './App.js';|g" client/src/main.tsx
else
  echo "📝 Restoring from backup..."
  mv client/src/main.tsx.backup client/src/main.tsx
  echo "   ✓ Restored client/src/main.tsx"
fi

echo ""
echo "🏗️  Rebuilding frontend..."
cd client
npm run build
cd ..
echo "   ✓ Frontend built"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Normal Mode Restored"
echo ""
echo "Restart the Vienna server:"
echo "   cd server && npm start"
echo ""
