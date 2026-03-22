#!/bin/bash
# Provider Integration Verification Script
# 
# Verifies that provider manager is correctly integrated and accessible

set -e

BASE_URL="http://localhost:3100"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Provider Manager Integration Verification"
echo "=================================================="
echo ""

# Check if server is running
echo -n "Checking if server is running... "
if curl -s "${BASE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "ERROR: Server is not running at ${BASE_URL}"
    echo "Start server with: cd console/server && npm run dev"
    exit 1
fi

# Test GET /api/v1/system/providers
echo ""
echo -n "Testing GET /api/v1/system/providers... "
PROVIDERS_RESPONSE=$(curl -s "${BASE_URL}/api/v1/system/providers")
if echo "$PROVIDERS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    
    # Show provider count
    PROVIDER_COUNT=$(echo "$PROVIDERS_RESPONSE" | jq '.data.providers | length')
    echo "  Found $PROVIDER_COUNT provider(s)"
    
    # Show primary provider
    PRIMARY=$(echo "$PROVIDERS_RESPONSE" | jq -r '.data.primary')
    echo "  Primary: $PRIMARY"
    
    # Show provider statuses
    echo "$PROVIDERS_RESPONSE" | jq -r '.data.providers | to_entries[] | "  - \(.key): \(.value.status) (failures: \(.value.consecutiveFailures))"'
else
    echo -e "${RED}✗${NC}"
    echo "ERROR: Invalid response from providers endpoint"
    echo "$PROVIDERS_RESPONSE" | jq .
    exit 1
fi

# Test GET /api/v1/system/providers/:name for each provider
echo ""
echo "Testing individual provider endpoints:"
for PROVIDER in $(echo "$PROVIDERS_RESPONSE" | jq -r '.data.providers | keys[]'); do
    echo -n "  GET /api/v1/system/providers/$PROVIDER... "
    PROVIDER_RESPONSE=$(curl -s "${BASE_URL}/api/v1/system/providers/${PROVIDER}")
    if echo "$PROVIDER_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        STATUS=$(echo "$PROVIDER_RESPONSE" | jq -r '.data.status')
        echo -e "${GREEN}✓${NC} (status: $STATUS)"
    else
        echo -e "${RED}✗${NC}"
        echo "$PROVIDER_RESPONSE" | jq .
        exit 1
    fi
done

# Test architecture boundaries
echo ""
echo "Verifying architecture boundaries:"

echo -n "  Routes don't import providers directly... "
if grep -r "from.*\/lib\/providers" console/server/src/routes/*.ts 2>/dev/null; then
    echo -e "${RED}✗${NC}"
    echo "ERROR: Found direct provider imports in routes"
    exit 1
else
    echo -e "${GREEN}✓${NC}"
fi

echo -n "  Services don't import providers directly... "
if grep "from.*\/lib\/providers" console/server/src/services/viennaRuntime.ts 2>/dev/null; then
    echo -e "${RED}✗${NC}"
    echo "ERROR: Found direct provider imports in viennaRuntime service"
    exit 1
else
    echo -e "${GREEN}✓${NC}"
fi

echo -n "  Bridge module exists... "
if [ -f "console/server/src/integrations/providerManager.ts" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "ERROR: Bridge module not found"
    exit 1
fi

# Test system status includes provider info
echo ""
echo -n "Testing system status integration... "
STATUS_RESPONSE=$(curl -s "${BASE_URL}/api/v1/system/status")
if echo "$STATUS_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    SYSTEM_STATE=$(echo "$STATUS_RESPONSE" | jq -r '.data.system_state')
    EXECUTOR_STATE=$(echo "$STATUS_RESPONSE" | jq -r '.data.executor_state')
    echo "  System: $SYSTEM_STATE, Executor: $EXECUTOR_STATE"
else
    echo -e "${RED}✗${NC}"
    exit 1
fi

# Test services endpoint
echo ""
echo -n "Testing services endpoint... "
SERVICES_RESPONSE=$(curl -s "${BASE_URL}/api/v1/system/services")
if echo "$SERVICES_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    echo "$SERVICES_RESPONSE" | jq -r '.data.services[] | "  - \(.service): \(.status)"'
else
    echo -e "${RED}✗${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}All checks passed!${NC}"
echo "=================================================="
echo ""
echo "Provider Manager integration is working correctly."
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:5174 in browser"
echo "  2. Verify provider status in top status bar"
echo "  3. Check Services panel for provider list"
echo "  4. Confirm degraded providers show warning indicators"
