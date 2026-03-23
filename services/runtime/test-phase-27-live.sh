#!/bin/bash
# Phase 27 — Explainability Live Validation
# Tests explanation generation in real execution flow

set -e

API_BASE="${API_BASE:-https://vienna-os.fly.dev/api/v1}"

echo "=== Phase 27 Explainability Live Validation ==="
echo "API Base: $API_BASE"
echo ""

# Test 1: Success case (should show explanation)
echo "Test 1: Success case with explanation"
RESULT=$(curl -s -X POST "$API_BASE/intent" \
  -H "Content-Type: application/json" \
  -H "Cookie: vienna_session=$VIENNA_SESSION" \
  --cookie-jar /tmp/cookies.txt \
  --cookie /tmp/cookies.txt \
  -d '{
    "type": "governed_execute",
    "payload": {
      "prompt": "test success execution"
    },
    "source": {
      "type": "operator",
      "id": "test-operator"
    }
  }')

echo "$RESULT" | jq '.'
echo ""

if echo "$RESULT" | jq -e '.explanation' > /dev/null; then
  echo "✓ SUCCESS: Explanation field present"
  echo "  Explanation: $(echo "$RESULT" | jq -r '.explanation')"
else
  echo "✗ FAIL: No explanation field in success response"
fi
echo ""

# Test 2: Check if explanation_full is in metadata
if echo "$RESULT" | jq -e '.metadata.explanation_full' > /dev/null; then
  echo "✓ SUCCESS: Full explanation in metadata"
  echo "$RESULT" | jq '.metadata.explanation_full'
else
  echo "⚠ WARNING: No full explanation in metadata"
fi
echo ""

echo "=== Phase 27 Validation Complete ==="
echo ""
echo "Expected behavior:"
echo "- Success responses include 'explanation' field"
echo "- Blocked responses include clear reason (quota/budget/policy)"
echo "- Failure responses include what happened + why + next steps"
echo ""
echo "To test quota block:"
echo "  1. Reduce quota limit for test tenant"
echo "  2. Submit multiple requests to exceed quota"
echo "  3. Verify explanation shows quota details"
echo ""
echo "To test budget block:"
echo "  1. Reduce budget limit for test tenant"
echo "  2. Execute until budget exceeded"
echo "  3. Verify explanation shows budget details"
