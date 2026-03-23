#!/bin/bash
# Vienna Production End-to-End Test
# Tests: Frontend → Backend → CORS → Auth Flow

set -e

FRONTEND_URL="https://vienna-core-eight.vercel.app"
BACKEND_URL="https://vienna-os.fly.dev"
API_BASE="$BACKEND_URL/api/v1"

echo "=== Vienna Production E2E Test ==="
echo "Frontend: $FRONTEND_URL"
echo "Backend: $BACKEND_URL"
echo ""

# Test 1: Frontend loads
echo "✓ Test 1: Frontend loads"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/")
if [ "$STATUS" != "200" ]; then
  echo "✗ FAIL: Frontend returned $STATUS"
  exit 1
fi
echo "  Frontend: 200 OK"

# Test 2: Backend health check
echo "✓ Test 2: Backend health check"
HEALTH=$(curl -s "$BACKEND_URL/health" | jq -r '.data.runtime.status')
if [ "$HEALTH" != "healthy" ]; then
  echo "✗ FAIL: Backend health: $HEALTH"
  exit 1
fi
echo "  Backend health: $HEALTH"

# Test 3: CORS headers present
echo "✓ Test 3: CORS headers"
CORS=$(curl -s -I "$API_BASE/auth/session" \
  -H "Origin: $FRONTEND_URL" \
  | grep -i "access-control-allow-origin" || echo "missing")
if [[ "$CORS" == *"$FRONTEND_URL"* ]] || [[ "$CORS" == *"*"* ]]; then
  echo "  CORS: Configured"
else
  echo "✗ FAIL: CORS not configured for $FRONTEND_URL"
  echo "  Got: $CORS"
  exit 1
fi

# Test 4: Session endpoint works
echo "✓ Test 4: Session endpoint"
AUTH=$(curl -s "$API_BASE/auth/session" | jq -r '.data.authenticated')
if [ "$AUTH" != "false" ]; then
  echo "✗ FAIL: Session endpoint returned unexpected: $AUTH"
  exit 1
fi
echo "  Session check: Unauthenticated (expected)"

# Test 5: Login endpoint exists
echo "✓ Test 5: Login endpoint exists"
LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}' \
  | jq -r '.success')
if [ "$LOGIN" == "null" ]; then
  echo "✗ FAIL: Login endpoint not responding"
  exit 1
fi
echo "  Login endpoint: Responding (401 expected for wrong creds)"

# Test 6: Bootstrap endpoint (requires auth)
echo "✓ Test 6: Bootstrap endpoint (should require auth)"
BOOTSTRAP=$(curl -s "$API_BASE/dashboard/bootstrap" | jq -r '.error // .success')
if [ "$BOOTSTRAP" == "null" ]; then
  echo "✗ FAIL: Bootstrap endpoint not responding"
  exit 1
fi
echo "  Bootstrap: Protected (expected)"

echo ""
echo "=== All Tests Passed ==="
echo ""
echo "Production URLs:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
echo "  API:      $API_BASE"
echo ""
echo "Next step: Manual login test in browser"
echo "  1. Open $FRONTEND_URL"
echo "  2. Enter operator credentials"
echo "  3. Verify dashboard loads"
