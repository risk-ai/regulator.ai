#!/bin/bash
# Fix tenant isolation across all API endpoints

cd ~/regulator.ai

echo "Fixing tenant isolation in all /api/v1/ endpoints..."

# List of endpoints that need fixing
ENDPOINTS=(
  "apps/console-proxy/api/v1/agents.js"
  "apps/console-proxy/api/v1/approvals.js"
  "apps/console-proxy/api/v1/executions.js"
  "apps/console-proxy/api/v1/warrants.js"
  "apps/console-proxy/api/v1/audit.js"
  "apps/console-proxy/api/v1/api-keys.js"
)

for endpoint in "${ENDPOINTS[@]}"; do
  if [ -f "$endpoint" ]; then
    echo "Processing $endpoint..."
    
    # Replace requireAuth without await
    sed -i 's/const user = requireAuth(req, res);/const user = await requireAuth(req, res);/g' "$endpoint"
    
    # Replace Pool import
    sed -i 's/const { requireAuth } = require/const { requireAuth, pool } = require/g' "$endpoint"
    
    # Remove local pool definitions
    sed -i '/^const pool = new Pool({/,/^});$/d' "$endpoint"
    
    echo "  ✓ Fixed $endpoint"
  fi
done

echo "✅ All endpoints updated. Manual tenant_id filter additions still required."
