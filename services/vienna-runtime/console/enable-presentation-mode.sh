#!/bin/bash

# Vienna OS Presentation Mode Quick Enable
# Automatically switches to presentation UI and rebuilds

set -e

echo "🎨 Vienna OS Presentation Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the console directory
if [ ! -f "client/src/main.tsx" ]; then
  echo "❌ Error: Run this script from vienna-core/console/"
  exit 1
fi

echo "📝 Step 1/4: Backing up main.tsx..."
cp client/src/main.tsx client/src/main.tsx.backup
echo "   ✓ Backup created: client/src/main.tsx.backup"
echo ""

echo "🔄 Step 2/4: Switching to presentation mode..."
# Replace the App import
sed -i "s|import { App } from './App.js';|import { App } from './AppPresentation.js';|g" client/src/main.tsx
echo "   ✓ Updated client/src/main.tsx"
echo ""

echo "🏗️  Step 3/4: Building frontend..."
cd client
npm run build
cd ..
echo "   ✓ Frontend built"
echo ""

echo "🚀 Step 4/4: Presentation mode ready!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Presentation Mode Enabled"
echo ""
echo "Next steps:"
echo "1. Restart the Vienna server:"
echo "   cd server && npm start"
echo ""
echo "2. Open in browser:"
echo "   http://100.120.116.10:5174"
echo ""
echo "To revert to normal mode:"
echo "   ./disable-presentation-mode.sh"
echo ""
