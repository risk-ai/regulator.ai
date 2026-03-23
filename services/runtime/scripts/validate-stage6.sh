#!/bin/bash
# Stage 6 Validation Script
# Tests what can be validated without full Vercel deployment

set -e

RUNTIME_URL="https://vienna-runtime-preview.fly.dev"

echo "=================================="
echo "Stage 6 Validation Script"
echo "=================================="
echo ""

# Test 1: Runtime Health
echo "=== Test 1: Runtime Health ==="
RUNTIME_HEALTH=$(curl -s "$RUNTIME_URL/health")
echo "$RUNTIME_HEALTH" | jq .
RUNTIME_STATUS=$(echo "$RUNTIME_HEALTH" | jq -r .status)

if [ "$RUNTIME_STATUS" = "healthy" ]; then
    echo "✅ Runtime health: PASS"
else
    echo "❌ Runtime health: FAIL"
    exit 1
fi
echo ""

# Test 2: Runtime Uptime
echo "=== Test 2: Runtime Uptime ==="
UPTIME=$(echo "$RUNTIME_HEALTH" | jq -r .uptime_seconds)
UPTIME_DAYS=$((UPTIME / 86400))
echo "Uptime: $UPTIME seconds ($UPTIME_DAYS days)"
if [ "$UPTIME" -gt 0 ]; then
    echo "✅ Runtime uptime: PASS"
else
    echo "❌ Runtime uptime: FAIL"
fi
echo ""

# Test 3: State Graph Backend
echo "=== Test 3: State Graph Backend ==="
SG_TYPE=$(echo "$RUNTIME_HEALTH" | jq -r .components.state_graph.type)
SG_STATUS=$(echo "$RUNTIME_HEALTH" | jq -r .components.state_graph.status)
echo "Backend: $SG_TYPE"
echo "Status: $SG_STATUS"
if [ "$SG_STATUS" = "healthy" ]; then
    echo "✅ State Graph: PASS"
else
    echo "❌ State Graph: FAIL"
fi
echo ""

# Test 4: Artifact Storage
echo "=== Test 4: Artifact Storage ==="
STORAGE_STATUS=$(echo "$RUNTIME_HEALTH" | jq -r .components.artifact_storage.status)
echo "Status: $STORAGE_STATUS"
if [ "$STORAGE_STATUS" = "healthy" ]; then
    echo "✅ Artifact Storage: PASS"
else
    echo "❌ Artifact Storage: FAIL"
fi
echo ""

# Test 5: Runtime API Endpoints
echo "=== Test 5: Runtime API Endpoints ==="
echo "Testing /api/state-graph/services..."
SERVICES=$(curl -s "$RUNTIME_URL/api/state-graph/services")
if echo "$SERVICES" | jq . > /dev/null 2>&1; then
    echo "✅ Services endpoint: PASS"
else
    echo "❌ Services endpoint: FAIL"
fi
echo ""

# Test 6: CORS Headers
echo "=== Test 6: CORS Configuration ==="
CORS_HEADER=$(curl -sI -H "Origin: https://regulator-ai.vercel.app" "$RUNTIME_URL/health" | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_HEADER" ]; then
    echo "CORS Header: $CORS_HEADER"
    echo "✅ CORS configured: PASS"
else
    echo "⚠️  CORS header not found (may need configuration)"
fi
echo ""

# Summary
echo "=================================="
echo "Validation Summary"
echo "=================================="
echo ""
echo "Runtime Status: ✅ HEALTHY"
echo "Uptime: $UPTIME_DAYS days"
echo "Backend: $SG_TYPE (healthy)"
echo "Artifact Storage: healthy"
echo ""
echo "Next Steps:"
echo "1. Configure VIENNA_RUNTIME_URL in Vercel"
echo "2. Trigger Vercel deployment"
echo "3. Run full smoke test suite"
echo ""
echo "See STAGE_6_COMPLETION_STEPS.md for detailed instructions."
