/**
 * Seed Realistic Approval Data
 * Creates test approvals to make the console feel alive
 */

const { pool } = require('../database/client');

async function seedApprovals() {
  console.log('🌱 Seeding approval data...');

  try {
    // Get first tenant
    const tenantResult = await pool.query('SELECT id FROM regulator.tenants LIMIT 1');
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No tenants found. Run seed-tenants.js first.');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant: ${tenantId}`);

    // Create realistic test approvals
    const approvals = [
      {
        approval_id: 'appr_deploy_prod_v210',
        agent_id: 'agent_alpha',
        action_type: 'deploy_to_production',
        action_summary: 'Deploy version 2.1.0 to production environment',
        required_tier: 'T2',
        status: 'pending',
        requested_by: 'agent_alpha@vienna.ai',
        minutes_ago: 5,
        expires_hours: 1,
        metadata: {
          environment: 'production',
          version: '2.1.0',
          risk_score: 8.5,
          affected_services: ['api', 'worker', 'frontend'],
          rollback_plan: 'automatic'
        }
      },
      {
        approval_id: 'appr_delete_gdpr_data',
        agent_id: 'agent_beta',
        action_type: 'delete_customer_data',
        action_summary: 'Delete inactive customer records (GDPR request)',
        required_tier: 'T2',
        status: 'pending',
        requested_by: 'agent_beta@vienna.ai',
        minutes_ago: 15,
        expires_hours: 2,
        metadata: {
          record_count: 127,
          reason: 'GDPR deletion request',
          customer_id: 'cust_983',
          data_types: ['profile', 'activity_log', 'preferences'],
          verification_status: 'identity_verified'
        }
      },
      {
        approval_id: 'appr_budget_override_q4',
        agent_id: 'agent_gamma',
        action_type: 'exceed_budget',
        action_summary: 'Request budget override for Q4 campaign ($25k → $40k)',
        required_tier: 'T1',
        status: 'pending',
        requested_by: 'agent_gamma@vienna.ai',
        minutes_ago: 2,
        expires_hours: 4,
        metadata: {
          current_budget: 25000,
          requested_budget: 40000,
          campaign: 'Q4_launch',
          expected_roi: 2.5,
          justification: 'Market opportunity requires faster execution'
        }
      },
      {
        approval_id: 'appr_escalate_support_tier',
        agent_id: 'agent_delta',
        action_type: 'escalate_customer',
        action_summary: 'Escalate enterprise customer to executive support',
        required_tier: 'T1',
        status: 'pending',
        requested_by: 'agent_delta@vienna.ai',
        minutes_ago: 8,
        expires_hours: 6,
        metadata: {
          customer: 'Acme Corp',
          current_tier: 'premium',
          requested_tier: 'executive',
          issue_severity: 'high',
          revenue_at_risk: 120000
        }
      },
      {
        approval_id: 'appr_emergency_access_db',
        agent_id: 'agent_epsilon',
        action_type: 'emergency_database_access',
        action_summary: 'Request emergency database access for data recovery',
        required_tier: 'T2',
        status: 'pending',
        requested_by: 'agent_epsilon@vienna.ai',
        minutes_ago: 1,
        expires_hours: 0.5,
        metadata: {
          database: 'production-primary',
          reason: 'Customer data corruption detected',
          impact: 'critical',
          affected_records: 3421,
          urgency: 'immediate'
        }
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const approval of approvals) {
      try {
        await pool.query(
          `INSERT INTO regulator.approval_requests (
            approval_id,
            tenant_id,
            agent_id,
            action_type,
            action_summary,
            required_tier,
            status,
            requested_by,
            requested_at,
            expires_at,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '${approval.minutes_ago} minutes', NOW() + INTERVAL '${approval.expires_hours} hours', $9)
          ON CONFLICT (approval_id) DO NOTHING`,
          [
            approval.approval_id,
            tenantId,
            approval.agent_id,
            approval.action_type,
            approval.action_summary,
            approval.required_tier,
            approval.status,
            approval.requested_by,
            JSON.stringify(approval.metadata)
          ]
        );

        inserted++;
        console.log(`✅ Created: ${approval.approval_id}`);
      } catch (err) {
        if (err.code === '23505') {
          skipped++;
          console.log(`⏭️  Skipped (exists): ${approval.approval_id}`);
        } else {
          console.error(`❌ Failed: ${approval.approval_id}`, err.message);
        }
      }
    }

    console.log('');
    console.log(`🎉 Seeding complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${approvals.length}`);
    console.log('');
    console.log('🔗 View at: https://console.regulator.ai/approvals');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedApprovals()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { seedApprovals };
