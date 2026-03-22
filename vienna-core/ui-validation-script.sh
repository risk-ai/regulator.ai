#!/bin/bash
# Phase 17 Stage 4 UI Validation Script

echo "=== Phase 17 Stage 4 UI Validation ==="
echo ""

# Check if frontend is running
echo "1. Checking frontend status..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5174)
if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "   ✓ Frontend running on port 5174"
else
  echo "   ✗ Frontend not accessible"
  exit 1
fi

# Check if backend is running
echo "2. Checking backend status..."
BACKEND_STATUS=$(curl -s http://localhost:3100/health | jq -r '.status' 2>/dev/null)
if [ "$BACKEND_STATUS" = "healthy" ] || [ "$BACKEND_STATUS" = "null" ]; then
  echo "   ✓ Backend running on port 3100"
else
  echo "   ✗ Backend not accessible"
  exit 1
fi

# Check approvals endpoint (will return 401 without auth, which is correct)
echo "3. Checking approvals endpoint..."
APPROVALS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/v1/approvals)
if [ "$APPROVALS_STATUS" = "401" ]; then
  echo "   ✓ Approvals endpoint responding (auth required)"
else
  echo "   ✗ Approvals endpoint status: $APPROVALS_STATUS"
fi

echo ""
echo "=== Manual Validation Steps ==="
echo ""
echo "1. Open browser to: http://localhost:5174"
echo "2. Log in with operator credentials"
echo "3. Navigate to Approvals tab"
echo "4. Verify pending approvals list loads"
echo "5. Test approve action on a pending approval"
echo "6. Test deny action with reason"
echo "7. Verify audit trail shows reviewer identity"
echo ""
echo "Expected behavior:"
echo "  - Pending list auto-refreshes every 10s"
echo "  - Tier badges show T1/T2"
echo "  - Expiry countdown displays"
echo "  - Approve/deny actions update state"
echo "  - Reviewer identity persists in audit trail"
echo ""
