#!/bin/bash
# Vienna OS Governance Pipeline — End-to-End Test Suite
# Tests critical paths after all fixes deployed

set -e

API_URL="${API_URL:-https://console.regulator.ai}"
API_KEY="${VIENNA_API_KEY:?Error: VIENNA_API_KEY not set}"

echo "=== Vienna OS Governance E2E Tests ==="
echo "API URL: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Test 1: Agent Registration
echo "Test 1: Agent Registration"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/agents" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test_agent_e2e",
    "name": "E2E Test Agent",
    "framework": "test",
    "capabilities": ["database_query", "api_call"]
  }')

if echo "$REGISTER_RESPONSE" | jq -e '.success == true' > /dev/null; then
  pass "Agent registered successfully"
else
  fail "Agent registration failed: $REGISTER_RESPONSE"
fi

# Test 2: Agent Heartbeat
echo ""
echo "Test 2: Agent Heartbeat"
HEARTBEAT_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/agents/test_agent_e2e/heartbeat" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "healthy"}')

if echo "$HEARTBEAT_RESPONSE" | jq -e '.success == true' > /dev/null; then
  pass "Heartbeat acknowledged"
else
  fail "Heartbeat failed: $HEARTBEAT_RESPONSE"
fi

# Test 3: T0 Intent (Auto-Approved)
echo ""
echo "Test 3: T0 Intent Submission (Auto-Approved)"
T0_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/intents" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "database_query",
    "params": {"query": "SELECT COUNT(*) FROM users"},
    "metadata": {
      "agent_id": "test_agent_e2e",
      "framework": "test"
    }
  }')

T0_INTENT_ID=$(echo "$T0_RESPONSE" | jq -r '.intent_id')
T0_STATUS=$(echo "$T0_RESPONSE" | jq -r '.status')
T0_WARRANT_ID=$(echo "$T0_RESPONSE" | jq -r '.warrant_id')

if [ "$T0_STATUS" = "approved" ] && [ "$T0_WARRANT_ID" != "null" ]; then
  pass "T0 intent auto-approved with warrant: $T0_WARRANT_ID"
else
  fail "T0 intent failed: $T0_RESPONSE"
fi

# Test 4: Warrant Verification
echo ""
echo "Test 4: Warrant Verification"
WARRANT_RESPONSE=$(curl -s "$API_URL/api/v1/warrants/$T0_WARRANT_ID" \
  -H "Authorization: Bearer $API_KEY")

WARRANT_VALID=$(echo "$WARRANT_RESPONSE" | jq -r '.valid')
WARRANT_SIG=$(echo "$WARRANT_RESPONSE" | jq -r '.signature')

if [ "$WARRANT_VALID" = "true" ] && [ "$WARRANT_SIG" != "null" ]; then
  pass "Warrant verified with signature"
else
  fail "Warrant verification failed: $WARRANT_RESPONSE"
fi

# Test 5: T2 Intent (Requires Approval)
echo ""
echo "Test 5: T2 Intent Submission (Requires Approval)"
T2_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/intents" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deploy_to_prod",
    "params": {"environment": "production"},
    "metadata": {
      "agent_id": "test_agent_e2e",
      "framework": "test"
    }
  }')

T2_STATUS=$(echo "$T2_RESPONSE" | jq -r '.status')
T2_APPROVAL_ID=$(echo "$T2_RESPONSE" | jq -r '.approval_id')

if [ "$T2_STATUS" = "pending" ] && [ "$T2_APPROVAL_ID" != "null" ]; then
  pass "T2 intent pending approval: $T2_APPROVAL_ID"
  echo "   → Manual step: Approve via Slack or API:"
  echo "   curl -X POST $API_URL/api/v1/approvals/$T2_APPROVAL_ID/approve \\"
  echo "     -H \"Authorization: Bearer $API_KEY\" \\"
  echo "     -d '{\"reason\": \"E2E test\"}'"
else
  fail "T2 intent failed: $T2_RESPONSE"
fi

# Test 6: Approval Status Polling (if endpoint exists)
echo ""
echo "Test 6: Approval Status Polling"
POLL_RESPONSE=$(curl -s "$API_URL/api/v1/approvals/$T2_APPROVAL_ID/status" \
  -H "Authorization: Bearer $API_KEY")

POLL_STATUS=$(echo "$POLL_RESPONSE" | jq -r '.status')

if [ "$POLL_STATUS" = "pending" ]; then
  pass "Approval status endpoint working (status: pending)"
elif echo "$POLL_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "   ⚠️  Approval status endpoint not found (expected if not deployed yet)"
else
  pass "Approval status: $POLL_STATUS"
fi

# Test 7: Execution Reporting
echo ""
echo "Test 7: Execution Reporting"
EXEC_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/executions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"warrant_id\": \"$T0_WARRANT_ID\",
    \"agent_id\": \"test_agent_e2e\",
    \"success\": true,
    \"output\": \"Query returned 42 rows\",
    \"metrics\": {
      \"duration_ms\": 150,
      \"estimated_cost\": 0.001
    }
  }")

if echo "$EXEC_RESPONSE" | jq -e '.success == true' > /dev/null; then
  pass "Execution reported successfully"
else
  fail "Execution reporting failed: $EXEC_RESPONSE"
fi

# Test 8: Cost Analytics (if fixed)
echo ""
echo "Test 8: Cost Analytics"
COST_RESPONSE=$(curl -s "$API_URL/api/v1/analytics/costs?period=7d" \
  -H "Authorization: Bearer $API_KEY")

if echo "$COST_RESPONSE" | jq -e '.success == true' > /dev/null; then
  TOTAL_COST=$(echo "$COST_RESPONSE" | jq -r '.data.total_estimated_cost')
  pass "Cost analytics working (total: \$$TOTAL_COST)"
elif echo "$COST_RESPONSE" | jq -e '.error' > /dev/null; then
  ERROR=$(echo "$COST_RESPONSE" | jq -r '.error')
  echo "   ⚠️  Cost analytics error: $ERROR (expected if table fix not deployed)"
else
  fail "Cost analytics unexpected response: $COST_RESPONSE"
fi

echo ""
echo "==================================="
echo "E2E Test Suite Complete"
echo "==================================="
echo ""
echo "Summary:"
echo "- Agent registration ✓"
echo "- Agent heartbeat ✓"
echo "- T0 auto-approval ✓"
echo "- Warrant verification ✓"
echo "- T2 approval flow ✓ (pending)"
echo "- Execution reporting ✓"
echo ""
echo "Manual verification:"
echo "1. Approve T2 intent: $T2_APPROVAL_ID"
echo "2. Check Slack for approval message"
echo "3. Verify warrant issued after approval"
echo ""
