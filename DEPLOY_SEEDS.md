# Deploy Console Seed Data - Quick Start

**Goal:** Transform console from empty to functional in 3 minutes  
**Impact:** Makes all core features instantly usable

---

## 🚀 Quick Deploy (Production)

### Option 1: Master Seeder (Recommended)
```bash
# SSH to Fly.io
fly ssh console -a vienna-console-server

# Run all seeders
cd /app
node scripts/seed-all.js
```

**Result:** Creates 72 database records in ~3 seconds
- 10 agents
- 7 policies
- 5 pending approvals  
- 50 execution records

### Option 2: Individual Seeders
```bash
node scripts/seed-agents.js      # 10 agents
node scripts/seed-policies.js    # 7 policies
node scripts/seed-approvals.js   # 5 pending
node scripts/seed-executions.js  # 50 records
```

---

## ✅ Verify Deployment

### 1. Check Approval Queue
```
Visit: https://console.regulator.ai/approvals
Expected: 5 pending approvals visible
```

### 2. Check Fleet Dashboard
```
Visit: https://console.regulator.ai/fleet
Expected: 10 agents (8 active, 1 suspended, 1 idle)
```

### 3. Check Policy Builder
```
Visit: https://console.regulator.ai/policies
Expected: 7 active policies
```

### 4. Check Execution History
```
Visit: https://console.regulator.ai/executions
Expected: 50 historical executions
```

---

## 📊 What Gets Created

### Agents (10 total)
```
Active (8):
- Alpha (deployment) - 94.5% trust
- Beta (data ops) - 88.2% trust
- Gamma (finance) - 92.7% trust
- Delta (support) - 96.1% trust
- Epsilon (infrastructure) - 90.3% trust
- Eta (marketing) - 85.9% trust
- Theta (compliance) - 98.2% trust
- Kappa (testing) - 87.6% trust

Suspended (1):
- Zeta (security) - 78.5% trust

Idle (1):
- Iota (analytics) - 91.4% trust
```

### Policies (7 total)
```
T2 (Require Approval):
- Production deployment
- Customer data deletion
- High risk auto-deny

T1 (Flag/Approve):
- Budget override
- After-hours deploy
- Rate limiting

T0 (Auto-Approve):
- Test environment
```

### Approvals (5 pending)
```
T2:
- Deploy v2.1.0 to production (expires 1h)
- Delete GDPR data (expires 2h)
- Emergency database access (expires 30m)

T1:
- Budget override $25k→$40k (expires 4h)
- Escalate customer support (expires 6h)
```

### Executions (50 records)
```
Time Range: Last 7 days
Status Distribution:
- Completed: ~35
- Failed: ~10
- Denied: ~5

Tier Distribution:
- T0: ~25
- T1: ~15
- T2: ~10
```

---

## 🎯 User Testing Checklist

After deploying seeds, test these workflows:

### Workflow 1: Approve Request
1. ✅ Login to console
2. ✅ Navigate to /approvals
3. ✅ See 5 pending items
4. ✅ Click approve on one
5. ✅ See success toast
6. ✅ Watch count decrease to 4

### Workflow 2: View Fleet
1. ✅ Navigate to /fleet
2. ✅ See 10 agent cards
3. ✅ Click on agent Alpha
4. ✅ See agent details
5. ✅ View trust score chart
6. ✅ Check last seen status

### Workflow 3: Inspect Policies
1. ✅ Navigate to /policies
2. ✅ See 7 policy cards
3. ✅ Click edit on one
4. ✅ See policy conditions
5. ✅ Toggle enable/disable
6. ✅ See confirmation

### Workflow 4: Browse History
1. ✅ Navigate to /executions
2. ✅ See 50 execution records
3. ✅ Filter by status
4. ✅ Filter by tier
5. ✅ Click on one for details
6. ✅ Export to CSV

---

## 🔄 Reseed (If Needed)

To refresh test data:

```bash
# Delete old data
psql $DATABASE_URL << EOF
DELETE FROM regulator.approval_requests WHERE tenant_id = 'your-tenant-id';
DELETE FROM regulator.agent_registry WHERE tenant_id = 'your-tenant-id';
DELETE FROM regulator.policy_rules WHERE tenant_id = 'your-tenant-id';
DELETE FROM regulator.execution_records WHERE tenant_id = 'your-tenant-id';
EOF

# Re-run seeders
node scripts/seed-all.js
```

---

## 🐛 Troubleshooting

### "No tenants found"
```bash
# Check if tenant exists
psql $DATABASE_URL -c "SELECT id FROM regulator.tenants LIMIT 1;"

# Create tenant if missing
psql $DATABASE_URL -c "
  INSERT INTO regulator.tenants (id, name, created_at)
  VALUES ('default', 'Default Tenant', NOW())
  ON CONFLICT DO NOTHING;
"
```

### "Table does not exist"
```bash
# Run migrations first
cd /app
npm run migrate
```

### "Connection error"
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## 📈 Before/After Comparison

### Before Seeds
- Approval queue: Empty
- Fleet dashboard: "No agents found"
- Policy builder: "No policies"
- History: "No executions"
- **User reaction:** "Is this just a mockup?"

### After Seeds
- Approval queue: 5 pending items
- Fleet dashboard: 10 active agents
- Policy builder: 7 active policies
- History: 50 execution records
- **User reaction:** "This is a real product!"

---

## 🎬 Next Steps

After seeding:

1. **Test workflows** - Verify all 4 core flows work
2. **Take screenshots** - Capture populated dashboards for marketing
3. **Record demo** - Show approval flow in action
4. **Customer testing** - Let first users try it
5. **Collect feedback** - Iterate based on real usage

---

**Time to deploy:** 3 minutes  
**Impact:** Transforms console from empty shell to functional product  
**Status:** ✅ Ready to execute
