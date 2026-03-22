#!/bin/bash
#
# Phase 3D/3E API Endpoint Validation Script
#
# Tests all 4 new endpoints to verify integration

echo "==================================================================="
echo "Phase 3D/3E API Endpoint Validation"
echo "==================================================================="
echo ""

BASE_URL="http://localhost:3000/api/v1"

# Check if server is running
echo "Checking server availability..."
if ! curl -s -f -o /dev/null "$BASE_URL/system/status" 2>/dev/null; then
  echo "⚠️  Server not running. Start with: npm run dev"
  echo ""
  echo "Then run this script again."
  exit 1
fi
echo "✅ Server is running"
echo ""

# Test 1: Objective Progress
echo "-------------------------------------------------------------------"
echo "Test 1: GET /objectives/:id/progress"
echo "-------------------------------------------------------------------"
echo "Request: GET $BASE_URL/objectives/obj_test_001/progress"
echo ""
curl -s -X GET "$BASE_URL/objectives/obj_test_001/progress" | jq '.' || echo "No data (expected for new objective)"
echo ""

# Test 2: Objective Metrics (alias)
echo "-------------------------------------------------------------------"
echo "Test 2: GET /objectives/:id/metrics"
echo "-------------------------------------------------------------------"
echo "Request: GET $BASE_URL/objectives/obj_test_001/metrics"
echo ""
curl -s -X GET "$BASE_URL/objectives/obj_test_001/metrics" | jq '.' || echo "No data (expected for new objective)"
echo ""

# Test 3: Objective Tree
echo "-------------------------------------------------------------------"
echo "Test 3: GET /objectives/:id/tree"
echo "-------------------------------------------------------------------"
echo "Request: GET $BASE_URL/objectives/obj_test_001/tree"
echo ""
curl -s -X GET "$BASE_URL/objectives/obj_test_001/tree" | jq '.' || echo "No data (expected for new objective)"
echo ""

# Test 4: Envelope Lineage
echo "-------------------------------------------------------------------"
echo "Test 4: GET /execution/envelopes/:id/lineage"
echo "-------------------------------------------------------------------"
echo "Request: GET $BASE_URL/execution/envelopes/env_test_001/lineage"
echo ""
curl -s -X GET "$BASE_URL/execution/envelopes/env_test_001/lineage" | jq '.' || echo "No data (expected for new envelope)"
echo ""

echo "==================================================================="
echo "Validation Complete"
echo "==================================================================="
echo ""
echo "Expected Results:"
echo "  - All endpoints should return JSON responses"
echo "  - 404 responses are normal for non-existent objectives/envelopes"
echo "  - Success format: { success: true/false, data: {...}, timestamp: ... }"
echo ""
echo "To test with real data:"
echo "  1. Submit envelopes via Vienna Core"
echo "  2. Query progress/tree for those objectives"
echo "  3. Verify real-time updates"
echo ""
