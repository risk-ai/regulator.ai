/**
 * Seed Realistic Agent Fleet Data
 * Creates test agents to populate the fleet dashboard
 */

const { pool } = require('../database/client');

async function seedAgents() {
  console.log('🌱 Seeding agent fleet data...');

  try {
    // Get first tenant
    const tenantResult = await pool.query('SELECT id FROM regulator.tenants LIMIT 1');
    
    if (tenantResult.rows.length === 0) {
      console.log('⚠️  No tenants found. Run seed-tenants.js first.');
      return;
    }

    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant: ${tenantId}`);

    // Create realistic test agents
    const agents = [
      {
        agent_id: 'agent_alpha',
        name: 'Alpha Deployment Agent',
        status: 'active',
        trust_score: 94.5,
        agent_type: 'deployment',
        description: 'Handles production deployments and rollbacks',
        capabilities: ['deploy', 'rollback', 'monitor', 'canary'],
        total_executions: 342,
        successful_executions: 335,
        failed_executions: 7,
        avg_execution_time_ms: 8500,
        last_seen: 'NOW()',
        metadata: {
          environment: 'production',
          regions: ['us-east-1', 'eu-west-1'],
          version: '2.1.0'
        }
      },
      {
        agent_id: 'agent_beta',
        name: 'Beta Data Operations Agent',
        status: 'active',
        trust_score: 88.2,
        agent_type: 'data_ops',
        description: 'Data pipeline management and transformations',
        capabilities: ['query', 'transform', 'backup', 'restore'],
        total_executions: 1247,
        successful_executions: 1201,
        failed_executions: 46,
        avg_execution_time_ms: 2300,
        last_seen: 'NOW() - INTERVAL \'2 minutes\'',
        metadata: {
          database: 'postgresql',
          max_query_size: '10GB',
          backup_schedule: 'daily'
        }
      },
      {
        agent_id: 'agent_gamma',
        name: 'Gamma Finance Agent',
        status: 'active',
        trust_score: 92.7,
        agent_type: 'finance',
        description: 'Budget management and expense tracking',
        capabilities: ['approve_expense', 'budget_allocation', 'reporting'],
        total_executions: 567,
        successful_executions: 562,
        failed_executions: 5,
        avg_execution_time_ms: 1200,
        last_seen: 'NOW() - INTERVAL \'5 minutes\'',
        metadata: {
          approval_limit: 50000,
          currency: 'USD',
          fiscal_year: '2026'
        }
      },
      {
        agent_id: 'agent_delta',
        name: 'Delta Support Agent',
        status: 'active',
        trust_score: 96.1,
        agent_type: 'customer_support',
        description: 'Customer escalation and ticket routing',
        capabilities: ['escalate', 'route', 'prioritize', 'respond'],
        total_executions: 2341,
        successful_executions: 2315,
        failed_executions: 26,
        avg_execution_time_ms: 450,
        last_seen: 'NOW() - INTERVAL \'30 seconds\'',
        metadata: {
          sla_target: '2h',
          language_support: ['en', 'es', 'fr'],
          escalation_tiers: 3
        }
      },
      {
        agent_id: 'agent_epsilon',
        name: 'Epsilon Infrastructure Agent',
        status: 'active',
        trust_score: 90.3,
        agent_type: 'infrastructure',
        description: 'Server provisioning and scaling',
        capabilities: ['provision', 'scale', 'monitor', 'alert'],
        total_executions: 891,
        successful_executions: 867,
        failed_executions: 24,
        avg_execution_time_ms: 15000,
        last_seen: 'NOW() - INTERVAL \'1 minute\'',
        metadata: {
          provider: 'aws',
          auto_scaling: true,
          max_instances: 50
        }
      },
      {
        agent_id: 'agent_zeta',
        name: 'Zeta Security Agent',
        status: 'suspended',
        trust_score: 78.5,
        agent_type: 'security',
        description: 'Security scanning and vulnerability detection',
        capabilities: ['scan', 'detect', 'patch', 'audit'],
        total_executions: 456,
        successful_executions: 423,
        failed_executions: 33,
        avg_execution_time_ms: 45000,
        last_seen: 'NOW() - INTERVAL \'2 hours\'',
        metadata: {
          last_scan: '2026-04-16T20:00:00Z',
          vulnerabilities_found: 12,
          suspend_reason: 'High false positive rate'
        }
      },
      {
        agent_id: 'agent_eta',
        name: 'Eta Marketing Agent',
        status: 'active',
        trust_score: 85.9,
        agent_type: 'marketing',
        description: 'Campaign management and analytics',
        capabilities: ['create_campaign', 'analyze', 'optimize'],
        total_executions: 234,
        successful_executions: 219,
        failed_executions: 15,
        avg_execution_time_ms: 3200,
        last_seen: 'NOW() - INTERVAL \'10 minutes\'',
        metadata: {
          platforms: ['google_ads', 'facebook', 'linkedin'],
          monthly_budget: 25000,
          roi_target: 2.5
        }
      },
      {
        agent_id: 'agent_theta',
        name: 'Theta Compliance Agent',
        status: 'active',
        trust_score: 98.2,
        agent_type: 'compliance',
        description: 'Regulatory compliance and reporting',
        capabilities: ['audit', 'report', 'verify', 'certify'],
        total_executions: 178,
        successful_executions: 177,
        failed_executions: 1,
        avg_execution_time_ms: 8900,
        last_seen: 'NOW() - INTERVAL \'15 minutes\'',
        metadata: {
          frameworks: ['SOC2', 'GDPR', 'HIPAA'],
          last_audit: '2026-04-01',
          certification_status: 'active'
        }
      },
      {
        agent_id: 'agent_iota',
        name: 'Iota Analytics Agent',
        status: 'idle',
        trust_score: 91.4,
        agent_type: 'analytics',
        description: 'Business intelligence and reporting',
        capabilities: ['query', 'visualize', 'predict', 'export'],
        total_executions: 89,
        successful_executions: 87,
        failed_executions: 2,
        avg_execution_time_ms: 5600,
        last_seen: 'NOW() - INTERVAL \'1 day\'',
        metadata: {
          data_sources: ['postgres', 'snowflake', 'salesforce'],
          report_types: ['daily', 'weekly', 'monthly'],
          last_active: '2026-04-15'
        }
      },
      {
        agent_id: 'agent_kappa',
        name: 'Kappa Testing Agent',
        status: 'active',
        trust_score: 87.6,
        agent_type: 'testing',
        description: 'Automated testing and quality assurance',
        capabilities: ['test', 'validate', 'benchmark', 'report'],
        total_executions: 1523,
        successful_executions: 1458,
        failed_executions: 65,
        avg_execution_time_ms: 12000,
        last_seen: 'NOW() - INTERVAL \'3 minutes\'',
        metadata: {
          test_suites: ['unit', 'integration', 'e2e'],
          coverage_target: 85,
          flaky_tests: 3
        }
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const agent of agents) {
      try {
        // Insert into agent_registry table
        await pool.query(
          `INSERT INTO regulator.agent_registry (
            agent_id,
            tenant_id,
            name,
            status,
            trust_score,
            agent_type,
            description,
            capabilities,
            total_executions,
            successful_executions,
            failed_executions,
            avg_execution_time_ms,
            last_seen,
            metadata,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ${agent.last_seen}, $13, NOW(), NOW()
          )
          ON CONFLICT (agent_id, tenant_id) DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            trust_score = EXCLUDED.trust_score,
            total_executions = EXCLUDED.total_executions,
            successful_executions = EXCLUDED.successful_executions,
            failed_executions = EXCLUDED.failed_executions,
            last_seen = ${agent.last_seen},
            updated_at = NOW()`,
          [
            agent.agent_id,
            tenantId,
            agent.name,
            agent.status,
            agent.trust_score,
            agent.agent_type,
            agent.description,
            JSON.stringify(agent.capabilities),
            agent.total_executions,
            agent.successful_executions,
            agent.failed_executions,
            agent.avg_execution_time_ms,
            JSON.stringify(agent.metadata)
          ]
        );

        inserted++;
        console.log(`✅ Created: ${agent.agent_id} (${agent.name})`);
      } catch (err) {
        if (err.code === '23505') {
          skipped++;
          console.log(`⏭️  Updated: ${agent.agent_id}`);
        } else {
          console.error(`❌ Failed: ${agent.agent_id}`, err.message);
        }
      }
    }

    console.log('');
    console.log(`🎉 Seeding complete!`);
    console.log(`   Created/Updated: ${inserted}`);
    console.log(`   Total: ${agents.length}`);
    console.log('');
    console.log('📊 Fleet Summary:');
    console.log(`   Active: ${agents.filter(a => a.status === 'active').length}`);
    console.log(`   Suspended: ${agents.filter(a => a.status === 'suspended').length}`);
    console.log(`   Idle: ${agents.filter(a => a.status === 'idle').length}`);
    console.log('');
    console.log('🔗 View at: https://console.regulator.ai/fleet');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  seedAgents()
    .then(() => {
      console.log('✅ Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { seedAgents };
