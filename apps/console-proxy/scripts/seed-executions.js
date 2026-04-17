/**
 * Seed Execution History Data
 * Creates audit trail of past executions for history/analytics
 */

const { pool } = require('../database/client');

async function seedExecutions() {
  console.log('🌱 Seeding execution history...');

  try {
    // Get first tenant
    const tenantResult = await pool.query('SELECT id FROM regulator.tenants LIMIT 1');
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No tenants found. Run seed-tenants.js first.');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant: ${tenantId}`);

    const agents = ['agent_alpha', 'agent_beta', 'agent_gamma', 'agent_delta', 'agent_epsilon'];
    const actionTypes = [
      'deploy_to_production',
      'query_database',
      'send_email',
      'update_config',
      'create_user',
      'delete_resource',
      'scale_infrastructure',
      'backup_data'
    ];
    const statuses = ['completed', 'completed', 'completed', 'failed', 'denied'];
    const tiers = ['T0', 'T0', 'T1', 'T1', 'T2'];

    const executions = [];
    const now = Date.now();

    // Generate 50 executions over the past 7 days
    for (let i = 0; i < 50; i++) {
      const hoursAgo = Math.floor(Math.random() * 168); // 0-168 hours (7 days)
      const executedAt = new Date(now - (hoursAgo * 3600 * 1000));
      const durationMs = Math.floor(Math.random() * 30000) + 1000; // 1-30 seconds
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)];

      executions.push({
        execution_id: `exec_${String(i + 1).padStart(3, '0')}`,
        agent_id: agent,
        action_type: actionType,
        tier,
        status,
        executed_at: executedAt,
        duration_ms: durationMs,
        approved_by: tier !== 'T0' && status !== 'denied' ? 'ops@company.com' : null,
        denied_by: status === 'denied' ? 'ops@company.com' : null,
        metadata: {
          request_id: `req_${Math.random().toString(36).substr(2, 9)}`,
          outcome: status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'rejected',
          risk_score: Math.random() * 10
        }
      });
    }

    let inserted = 0;

    for (const exec of executions) {
      try {
        await pool.query(
          `INSERT INTO regulator.execution_records (
            execution_id,
            tenant_id,
            agent_id,
            action_type,
            tier,
            status,
            executed_at,
            duration_ms,
            approved_by,
            denied_by,
            metadata,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (execution_id) DO NOTHING`,
          [
            exec.execution_id,
            tenantId,
            exec.agent_id,
            exec.action_type,
            exec.tier,
            exec.status,
            exec.executed_at,
            exec.duration_ms,
            exec.approved_by,
            exec.denied_by,
            JSON.stringify(exec.metadata),
            exec.executed_at
          ]
        );

        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   ... ${inserted}/50 executions created`);
        }
      } catch (err) {
        if (err.code !== '23505') {
          console.error(`❌ Failed: ${exec.execution_id}`, err.message);
        }
      }
    }

    console.log('');
    console.log(`🎉 Seeding complete!`);
    console.log(`   Created: ${inserted}/50 executions`);
    console.log('');
    console.log('📊 Execution Summary:');
    console.log(`   Completed: ${executions.filter(e => e.status === 'completed').length}`);
    console.log(`   Failed: ${executions.filter(e => e.status === 'failed').length}`);
    console.log(`   Denied: ${executions.filter(e => e.status === 'denied').length}`);
    console.log(`   T0: ${executions.filter(e => e.tier === 'T0').length}`);
    console.log(`   T1: ${executions.filter(e => e.tier === 'T1').length}`);
    console.log(`   T2: ${executions.filter(e => e.tier === 'T2').length}`);
    console.log('');
    console.log('🔗 View at: https://console.regulator.ai/executions');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedExecutions()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { seedExecutions };
