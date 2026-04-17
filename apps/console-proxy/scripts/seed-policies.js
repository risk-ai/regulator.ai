/**
 * Seed Realistic Policy Data
 * Creates governance policies to demonstrate policy enforcement
 */

const { pool } = require('../database/client');

async function seedPolicies() {
  console.log('🌱 Seeding policy data...');

  try {
    // Get first tenant
    const tenantResult = await pool.query('SELECT id FROM regulator.tenants LIMIT 1');
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No tenants found. Run seed-tenants.js first.');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant: ${tenantId}`);

    // Create realistic governance policies
    const policies = [
      {
        policy_id: 'pol_production_deploy_approval',
        name: 'Production Deployment Requires Approval',
        description: 'All production deployments must be approved by ops team',
        enabled: true,
        priority: 100,
        tier: 'T2',
        conditions: [
          { field: 'environment', operator: 'equals', value: 'production' },
          { field: 'action_type', operator: 'equals', value: 'deploy' }
        ],
        action: 'require_approval',
        metadata: {
          approvers: ['ops@company.com', 'lead@company.com'],
          expiry_hours: 1,
          escalation_after: 30
        }
      },
      {
        policy_id: 'pol_data_deletion_approval',
        name: 'Customer Data Deletion Requires Approval',
        description: 'Any customer data deletion must be explicitly approved',
        enabled: true,
        priority: 95,
        tier: 'T2',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'delete_customer_data' },
          { field: 'record_count', operator: 'gt', value: 0 }
        ],
        action: 'require_approval',
        metadata: {
          approvers: ['legal@company.com', 'dpo@company.com'],
          expiry_hours: 24,
          requires_reason: true
        }
      },
      {
        policy_id: 'pol_budget_override',
        name: 'Budget Override Requires Manager Approval',
        description: 'Exceeding allocated budget requires manager sign-off',
        enabled: true,
        priority: 85,
        tier: 'T1',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'exceed_budget' },
          { field: 'amount', operator: 'gt', value: 10000 }
        ],
        action: 'require_approval',
        metadata: {
          approvers: ['manager@company.com', 'finance@company.com'],
          expiry_hours: 4,
          max_override: 50000
        }
      },
      {
        policy_id: 'pol_after_hours_deploy',
        name: 'After-Hours Deployments Flagged',
        description: 'Deployments outside business hours are flagged for review',
        enabled: true,
        priority: 70,
        tier: 'T1',
        conditions: [
          { field: 'action_type', operator: 'equals', value: 'deploy' },
          { field: 'time_of_day', operator: 'outside', value: '09:00-17:00' }
        ],
        action: 'flag_for_review',
        metadata: {
          business_hours: '09:00-17:00 ET',
          timezone: 'America/New_York',
          notify: ['ops@company.com']
        }
      },
      {
        policy_id: 'pol_high_risk_actions_deny',
        name: 'High Risk Score Actions Auto-Deny',
        description: 'Actions with risk score >9.0 are automatically denied',
        enabled: true,
        priority: 100,
        tier: 'T2',
        conditions: [
          { field: 'risk_score', operator: 'gt', value: 9.0 }
        ],
        action: 'deny',
        metadata: {
          reason: 'Risk score exceeds acceptable threshold',
          notify: ['security@company.com'],
          log_level: 'critical'
        }
      },
      {
        policy_id: 'pol_test_env_auto_approve',
        name: 'Test Environment Auto-Approve',
        description: 'Actions in test environments are auto-approved',
        enabled: true,
        priority: 50,
        tier: 'T0',
        conditions: [
          { field: 'environment', operator: 'equals', value: 'test' }
        ],
        action: 'allow',
        metadata: {
          audit_level: 'minimal'
        }
      },
      {
        policy_id: 'pol_rate_limit_agents',
        name: 'Agent Rate Limiting',
        description: 'Agents limited to 100 actions per hour',
        enabled: true,
        priority: 60,
        tier: 'T1',
        conditions: [
          { field: 'actions_per_hour', operator: 'gt', value: 100 }
        ],
        action: 'rate_limit',
        metadata: {
          max_actions: 100,
          time_window: '1h',
          cooldown_period: 300
        }
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const policy of policies) {
      try {
        await pool.query(
          `INSERT INTO regulator.policy_rules (
            policy_id,
            tenant_id,
            name,
            description,
            enabled,
            priority,
            tier,
            conditions,
            action,
            metadata,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (policy_id, tenant_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            enabled = EXCLUDED.enabled,
            priority = EXCLUDED.priority,
            conditions = EXCLUDED.conditions,
            updated_at = NOW()`,
          [
            policy.policy_id,
            tenantId,
            policy.name,
            policy.description,
            policy.enabled,
            policy.priority,
            policy.tier,
            JSON.stringify(policy.conditions),
            policy.action,
            JSON.stringify(policy.metadata)
          ]
        );

        inserted++;
        console.log(`✅ Created: ${policy.policy_id}`);
        console.log(`   ${policy.name} (${policy.tier})`);
      } catch (err) {
        if (err.code === '23505') {
          skipped++;
          console.log(`⏭️  Updated: ${policy.policy_id}`);
        } else {
          console.error(`❌ Failed: ${policy.policy_id}`, err.message);
        }
      }
    }

    console.log('');
    console.log(`🎉 Seeding complete!`);
    console.log(`   Created/Updated: ${inserted}`);
    console.log(`   Total: ${policies.length}`);
    console.log('');
    console.log('📊 Policy Summary:');
    console.log(`   Enabled: ${policies.filter(p => p.enabled).length}`);
    console.log(`   T0 (Auto-approve): ${policies.filter(p => p.tier === 'T0').length}`);
    console.log(`   T1 (Flag/Approve): ${policies.filter(p => p.tier === 'T1').length}`);
    console.log(`   T2 (Require Approval): ${policies.filter(p => p.tier === 'T2').length}`);
    console.log('');
    console.log('🔗 View at: https://console.regulator.ai/policies');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedPolicies()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { seedPolicies };
