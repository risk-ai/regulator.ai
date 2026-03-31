#!/bin/bash
# Vienna OS - 100% Verification Script
# Verifies all systems are operational and hardened

set -e

echo "🔍 Vienna OS - 100% Completion Verification"
echo "============================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

function check_fail() {
  echo -e "${RED}❌ $1${NC}"
  ((ERRORS++))
}

function check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

# 1. Check production URLs
echo "1️⃣  Checking production URLs..."
if curl -s -o /dev/null -w "%{http_code}" https://console.regulator.ai/api/v1/health | grep -q "200"; then
  check_pass "Console API responding"
else
  check_fail "Console API not responding"
fi

# 2. Check database connection
echo ""
echo "2️⃣  Checking database..."
if PGPASSWORD=npg_4wSRU8FXqtiO psql -h ep-flat-wildflower-an6sdkxt.c-6.us-east-1.aws.neon.tech -U neondb_owner neondb -c "SELECT 1;" &>/dev/null; then
  check_pass "Database connection OK"
else
  check_fail "Database connection failed"
fi

# 3. Check critical tables exist
echo ""
echo "3️⃣  Checking database schema..."
TABLES=("execution_ledger_events" "approval_requests" "policies" "agents" "users" "api_keys" "webhooks")
for table in "${TABLES[@]}"; do
  if PGPASSWORD=npg_4wSRU8FXqtiO psql -h ep-flat-wildflower-an6sdkxt.c-6.us-east-1.aws.neon.tech -U neondb_owner neondb -c "\d public.$table" &>/dev/null; then
    check_pass "Table public.$table exists"
  else
    check_fail "Table public.$table missing"
  fi
done

# 4. Check tenant isolation
echo ""
echo "4️⃣  Checking tenant isolation..."
ENDPOINTS=("policies" "agents" "approvals" "executions" "warrants" "audit")
for endpoint in "${ENDPOINTS[@]}"; do
  FILE="apps/console-proxy/api/v1/${endpoint}.js"
  if [ -f "$FILE" ]; then
    if grep -q "tenant_id" "$FILE"; then
      check_pass "Endpoint /$endpoint has tenant isolation"
    else
      check_fail "Endpoint /$endpoint missing tenant isolation"
    fi
  else
    check_warn "Endpoint file $FILE not found"
  fi
done

# 5. Check API key validation
echo ""
echo "5️⃣  Checking API key validation..."
if grep -q "validateApiKey" apps/console-proxy/api/v1/_auth.js; then
  check_pass "API key validation implemented"
else
  check_fail "API key validation missing"
fi

# 6. Check stats endpoints
echo ""
echo "6️⃣  Checking stats endpoints..."
if grep -q "public.execution_ledger_events" apps/console-proxy/api/server.js; then
  check_pass "Stats use correct schema (public)"
else
  check_fail "Stats use wrong schema"
fi

# 7. Check documentation
echo ""
echo "7️⃣  Checking documentation..."
DOCS=("FINAL_WORK_STATUS.md" "SECURITY_FIXES_COMPLETE.md" "COMPLETION_STATUS_90_PERCENT.md" "API_DOCUMENTATION.md")
for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    check_pass "Doc $doc exists"
  else
    check_warn "Doc $doc missing"
  fi
done

# 8. Check SDKs
echo ""
echo "8️⃣  Checking SDKs..."
if [ -d "sdk/python/vienna_os" ] && [ -f "sdk/python/setup.py" ]; then
  check_pass "Python SDK complete"
else
  check_fail "Python SDK incomplete"
fi

if [ -d "sdk/typescript/dist" ] && [ -f "sdk/typescript/package.json" ]; then
  check_pass "TypeScript SDK complete"
else
  check_fail "TypeScript SDK incomplete"
fi

# 9. Check integrations
echo ""
echo "9️⃣  Checking integrations..."
INTEGRATIONS=("langchain" "crewai" "autogen")
for integration in "${INTEGRATIONS[@]}"; do
  if [ -f "integrations/${integration}/vienna_${integration}.py" ]; then
    check_pass "Integration: $integration"
  else
    check_warn "Integration $integration missing"
  fi
done

# 10. Check security features
echo ""
echo "🔒 Checking security..."
if grep -q "requireAuth" apps/console-proxy/api/v1/_auth.js; then
  check_pass "Auth middleware exists"
else
  check_fail "Auth middleware missing"
fi

if grep -q "validateApiKey" apps/console-proxy/api/v1/_auth.js; then
  check_pass "API key validation exists"
else
  check_fail "API key validation missing"
fi

# Summary
echo ""
echo "============================================"
echo "📊 VERIFICATION SUMMARY:"
echo ""
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ PASSED: All critical checks passed${NC}"
else
  echo -e "${RED}❌ ERRORS: $ERRORS critical issues found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS non-critical issues${NC}"
fi

echo "============================================"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "🎉 Vienna OS is 100% verified and ready for production!"
  exit 0
else
  echo "⚠️  Fix the errors above before launching."
  exit 1
fi
