#!/bin/bash
# Stage 6 Complete Setup Script
# Handles Vercel authentication, project linking, and environment configuration

set -e

RUNTIME_URL="https://vienna-runtime-preview.fly.dev"
PROJECT_DIR="/home/maxlawai/regulator.ai"

echo "================================================"
echo "Stage 6 Setup Script"
echo "================================================"
echo ""
echo "This script will:"
echo "1. Check Vercel authentication"
echo "2. Link Vercel project"
echo "3. Configure VIENNA_RUNTIME_URL"
echo "4. Trigger deployment"
echo "5. Validate connectivity"
echo ""
echo "Press Enter to continue..."
read

# Step 1: Check Vercel Authentication
echo ""
echo "=== Step 1: Vercel Authentication ==="
if vercel whoami > /dev/null 2>&1; then
    VERCEL_USER=$(vercel whoami)
    echo "✅ Already authenticated as: $VERCEL_USER"
else
    echo "❌ Not authenticated with Vercel"
    echo ""
    echo "Please run: vercel login"
    echo ""
    echo "This will open a browser window for authentication."
    echo "After completing authentication, run this script again."
    exit 1
fi

# Step 2: Link Project
echo ""
echo "=== Step 2: Link Vercel Project ==="
cd "$PROJECT_DIR"

if [ -f ".vercel/project.json" ]; then
    echo "✅ Project already linked"
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    echo "Project ID: $PROJECT_ID"
else
    echo "Linking project to Vercel..."
    echo ""
    echo "⚠️  IMPORTANT: When prompted:"
    echo "   - Set up and deploy: Y"
    echo "   - Which scope: [select your account]"
    echo "   - Link to existing project: Y (if asked)"
    echo "   - Project name: regulator-ai (or your existing project)"
    echo ""
    echo "Press Enter to start linking..."
    read
    
    vercel link
    
    if [ $? -eq 0 ]; then
        echo "✅ Project linked successfully"
    else
        echo "❌ Project linking failed"
        echo "Please run 'vercel link' manually and then re-run this script"
        exit 1
    fi
fi

# Step 3: Configure Environment Variable
echo ""
echo "=== Step 3: Configure VIENNA_RUNTIME_URL ==="
echo "Setting environment variable: VIENNA_RUNTIME_URL=$RUNTIME_URL"
echo ""

# Check if variable already exists
EXISTING_VAR=$(vercel env ls 2>/dev/null | grep "VIENNA_RUNTIME_URL" || echo "")

if [ -n "$EXISTING_VAR" ]; then
    echo "⚠️  VIENNA_RUNTIME_URL already exists"
    echo "Current value:"
    vercel env ls | grep "VIENNA_RUNTIME_URL"
    echo ""
    read -p "Do you want to update it? (y/n): " UPDATE
    if [ "$UPDATE" != "y" ]; then
        echo "Skipping environment variable update"
    else
        echo "Removing old variable..."
        vercel env rm VIENNA_RUNTIME_URL preview --yes 2>/dev/null || true
        vercel env rm VIENNA_RUNTIME_URL development --yes 2>/dev/null || true
        echo "Adding new variable..."
        echo "$RUNTIME_URL" | vercel env add VIENNA_RUNTIME_URL preview
        echo "$RUNTIME_URL" | vercel env add VIENNA_RUNTIME_URL development
        echo "✅ Environment variable updated"
    fi
else
    echo "Adding environment variable..."
    echo "$RUNTIME_URL" | vercel env add VIENNA_RUNTIME_URL preview
    echo "$RUNTIME_URL" | vercel env add VIENNA_RUNTIME_URL development
    echo "✅ Environment variable added"
fi

# Verify
echo ""
echo "Current environment variables:"
vercel env ls

# Step 4: Trigger Deployment
echo ""
echo "=== Step 4: Trigger Deployment ==="
echo ""
read -p "Do you want to trigger a deployment now? (y/n): " DEPLOY

if [ "$DEPLOY" = "y" ]; then
    echo ""
    echo "Deploying to preview environment..."
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: $CURRENT_BRANCH"
    echo ""
    
    # Create empty commit to trigger deployment
    git commit --allow-empty -m "chore: trigger deployment with VIENNA_RUNTIME_URL configured"
    
    echo ""
    echo "Pushing to GitHub..."
    git push origin "$CURRENT_BRANCH"
    
    echo ""
    echo "✅ Deployment triggered"
    echo ""
    echo "Monitor deployment at: https://vercel.com/dashboard"
    echo ""
    echo "Deployment URL will be:"
    echo "https://regulator-ai-git-${CURRENT_BRANCH//\//-}.vercel.app"
else
    echo "Skipping deployment"
    echo ""
    echo "To deploy manually:"
    echo "  Option 1: git push (triggers auto-deploy)"
    echo "  Option 2: vercel --prod=false (manual deploy)"
fi

# Step 5: Validation Instructions
echo ""
echo "=== Step 5: Validation ==="
echo ""
echo "After deployment completes (3-5 minutes), run validation:"
echo ""
echo "cd $PROJECT_DIR"
echo "bash scripts/validate-stage6.sh"
echo ""
echo "Or test manually:"
echo "curl https://[your-deployment-url]/api/health"
echo ""

# Summary
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next Steps:"
echo "1. Wait for Vercel deployment (check dashboard)"
echo "2. Run validation script"
echo "3. Complete smoke tests"
echo "4. Document results"
echo ""
echo "See STAGE_6_COMPLETION_STEPS.md for details"
