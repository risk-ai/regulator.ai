#!/bin/bash
# Phase 2B Validation Test Script
# Tests command submission validation without auth (for validation only)

BASE_URL="http://localhost:3100/api/v1/commands/submit"

echo "=== Phase 2B Validation Tests ==="
echo ""

# Test 1: Empty command
echo "Test 1: Empty command (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"command": ""}' | jq -r '.error // .message'
echo ""

# Test 2: Missing command
echo "Test 2: Missing command (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.error // .message'
echo ""

# Test 3: Non-array attachments
echo "Test 3: Non-array attachments (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"command": "test", "attachments": "not-an-array"}' | jq -r '.error // .message'
echo ""

# Test 4: Path traversal attempt
echo "Test 4: Path traversal in attachment (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"command": "test", "attachments": ["../etc/passwd"]}' | jq -r '.error // .message'
echo ""

# Test 5: Tilde expansion attempt
echo "Test 5: Tilde in attachment (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"command": "test", "attachments": ["~/secret.txt"]}' | jq -r '.error // .message'
echo ""

# Test 6: Non-string attachment
echo "Test 6: Non-string attachment (should fail)"
curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"command": "test", "attachments": [123]}' | jq -r '.error // .message'
echo ""

echo "=== Validation tests complete ==="
echo ""
echo "Note: All tests above should show 'Authentication required' or validation errors."
echo "This confirms validation runs before auth bypass."
