/**
 * Seed Templates - Policy & Agent Templates for Vienna OS
 * 
 * Run: node apps/console/server/seed-templates.js
 * Populates database with starter templates for new organizations
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/vienna_dev';
const pool = new Pool({ connectionString: DATABASE_URL });

// Policy Templates
const POLICY_TEMPLATES = [
  {
    name: 'Financial Transaction Policy',
    description: 'Require multi-party approval for charges over $1000',
    category: 'finance',
    conditions: {
      action_types: ['charge_card', 'initiate_payment', 'refund'],
      min_amount: 1000
    },
    actions: {
      action: 'require_approval',
      risk_tier: 'T2',
      approvers_required: 2
    },
    priority: 100,
    enabled: true,
    tags: ['finance', 'high-risk', 'compliance']
  },
  {
    name: 'Database Write Protection',
    description: 'Require operator review for production database modifications',
    category: 'data',
    conditions: {
      action_types: ['update_database', 'delete_records', 'run_migration'],
      environment: 'production'
    },
    actions: {
      action: 'require_approval',
      risk_tier: 'T1',
      approvers_required: 1
    },
    priority: 90,
    enabled: true,
    tags: ['database', 'production', 'data-integrity']
  },
  {
    name: 'Marketing Actions Auto-Approve',
    description: 'Auto-approve low-risk marketing actions with daily limits',
    category: 'marketing',
    conditions: {
      action_types: ['send_email', 'schedule_post', 'update_campaign'],
      daily_limit: 1000
    },
    actions: {
      action: 'auto_approve',
      risk_tier: 'T0'
    },
    priority: 50,
    enabled: true,
    tags: ['marketing', 'low-risk', 'automation']
  },
  {
    name: 'Customer Data Access',
    description: 'Log and notify when agents access customer PII',
    category: 'privacy',
    conditions: {
      action_types: ['read_customer_data', 'export_data'],
      data_classification: 'PII'
    },
    actions: {
      action: 'audit_and_notify',
      risk_tier: 'T1',
      notification_channels: ['slack', 'email']
    },
    priority: 95,
    enabled: true,
    tags: ['privacy', 'gdpr', 'compliance', 'pii']
  },
  {
    name: 'API Rate Limiting',
    description: 'Throttle agents making excessive API calls',
    category: 'performance',
    conditions: {
      action_types: ['api_call'],
      rate_limit: 100,
      window: '1m'
    },
    actions: {
      action: 'throttle',
      risk_tier: 'T0'
    },
    priority: 30,
    enabled: true,
    tags: ['performance', 'rate-limiting']
  },
  {
    name: 'External Integration Security',
    description: 'Require approval for new external integrations',
    category: 'security',
    conditions: {
      action_types: ['create_webhook', 'add_oauth_app', 'enable_integration']
    },
    actions: {
      action: 'require_approval',
      risk_tier: 'T2',
      approvers_required: 2
    },
    priority: 100,
    enabled: true,
    tags: ['security', 'integrations', 'high-risk']
  },
  {
    name: 'Code Deployment Gate',
    description: 'Require approval for production deployments',
    category: 'devops',
    conditions: {
      action_types: ['deploy', 'rollback'],
      environment: 'production'
    },
    actions: {
      action: 'require_approval',
      risk_tier: 'T2',
      approvers_required: 1
    },
    priority: 100,
    enabled: true,
    tags: ['devops', 'deployment', 'production']
  },
  {
    name: 'Support Ticket Auto-Response',
    description: 'Auto-approve support agents responding to tickets',
    category: 'support',
    conditions: {
      action_types: ['send_support_message', 'update_ticket'],
      ticket_priority: ['low', 'medium']
    },
    actions: {
      action: 'auto_approve',
      risk_tier: 'T0'
    },
    priority: 40,
    enabled: true,
    tags: ['support', 'customer-service', 'low-risk']
  }
];

// Agent Templates
const AGENT_TEMPLATES = [
  {
    name: 'Marketing Bot',
    description: 'Automated email campaigns and social media scheduling',
    category: 'marketing',
    capabilities: ['send_email', 'schedule_post', 'update_campaign'],
    recommended_policies: ['Marketing Actions Auto-Approve', 'API Rate Limiting'],
    trust_level: 'standard',
    config_template: {
      max_emails_per_day: 1000,
      allowed_domains: ['company.com'],
      require_unsubscribe_link: true
    },
    tags: ['marketing', 'automation', 'low-risk']
  },
  {
    name: 'Finance Agent',
    description: 'Payment processing and invoice management',
    category: 'finance',
    capabilities: ['charge_card', 'initiate_payment', 'refund', 'generate_invoice'],
    recommended_policies: ['Financial Transaction Policy'],
    trust_level: 'high',
    config_template: {
      max_transaction_amount: 10000,
      require_receipt: true,
      audit_all_transactions: true
    },
    tags: ['finance', 'payments', 'high-risk']
  },
  {
    name: 'Data Agent',
    description: 'Database operations and data pipeline management',
    category: 'data',
    capabilities: ['update_database', 'run_query', 'export_data'],
    recommended_policies: ['Database Write Protection', 'Customer Data Access'],
    trust_level: 'high',
    config_template: {
      allowed_tables: ['analytics', 'logs'],
      read_only_default: true,
      require_approval_for_writes: true
    },
    tags: ['database', 'data', 'infrastructure']
  },
  {
    name: 'Support Agent',
    description: 'Customer support ticket management',
    category: 'support',
    capabilities: ['send_support_message', 'update_ticket', 'escalate_issue'],
    recommended_policies: ['Support Ticket Auto-Response', 'Customer Data Access'],
    trust_level: 'standard',
    config_template: {
      max_messages_per_hour: 100,
      auto_escalate_vip: true,
      response_time_sla: 120
    },
    tags: ['support', 'customer-service']
  },
  {
    name: 'DevOps Agent',
    description: 'Deployment automation and infrastructure management',
    category: 'devops',
    capabilities: ['deploy', 'rollback', 'scale_infrastructure', 'run_migration'],
    recommended_policies: ['Code Deployment Gate', 'Database Write Protection'],
    trust_level: 'critical',
    config_template: {
      require_approval_production: true,
      auto_rollback_on_error: true,
      deployment_window: 'business_hours'
    },
    tags: ['devops', 'deployment', 'critical']
  },
  {
    name: 'Analytics Agent',
    description: 'Data analysis and reporting',
    category: 'analytics',
    capabilities: ['run_query', 'generate_report', 'export_data'],
    recommended_policies: ['Customer Data Access', 'API Rate Limiting'],
    trust_level: 'standard',
    config_template: {
      read_only: true,
      allowed_schemas: ['analytics', 'warehouse'],
      max_query_time: 300
    },
    tags: ['analytics', 'reporting', 'read-only']
  },
  {
    name: 'Integration Agent',
    description: 'Third-party API integration and webhook management',
    category: 'integration',
    capabilities: ['api_call', 'create_webhook', 'enable_integration'],
    recommended_policies: ['External Integration Security', 'API Rate Limiting'],
    trust_level: 'high',
    config_template: {
      rate_limit: 1000,
      retry_failed_requests: true,
      timeout: 30
    },
    tags: ['integrations', 'api', 'automation']
  },
  {
    name: 'Compliance Agent',
    description: 'Audit logging and compliance reporting',
    category: 'compliance',
    capabilities: ['generate_report', 'export_audit_logs', 'check_compliance'],
    recommended_policies: ['Customer Data Access'],
    trust_level: 'critical',
    config_template: {
      retention_period: 2555,
      encrypt_exports: true,
      notify_on_violation: true
    },
    tags: ['compliance', 'audit', 'reporting']
  }
];

async function seedTemplates() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding Vienna OS Templates...\n');
    
    await client.query('BEGIN');
    await client.query('SET search_path TO regulator, public');
    
    // Create templates tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        priority INTEGER DEFAULT 50,
        enabled BOOLEAN DEFAULT true,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS agent_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        capabilities TEXT[],
        recommended_policies TEXT[],
        trust_level TEXT DEFAULT 'standard',
        config_template JSONB,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Templates tables created\n');
    
    // Seed policy templates
    console.log('📋 Seeding policy templates...');
    for (const template of POLICY_TEMPLATES) {
      await client.query(`
        INSERT INTO policy_templates 
          (name, description, category, conditions, actions, priority, enabled, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        template.name,
        template.description,
        template.category,
        JSON.stringify(template.conditions),
        JSON.stringify(template.actions),
        template.priority,
        template.enabled,
        template.tags
      ]);
      console.log(`  ✓ ${template.name}`);
    }
    
    // Seed agent templates
    console.log('\n🤖 Seeding agent templates...');
    for (const template of AGENT_TEMPLATES) {
      await client.query(`
        INSERT INTO agent_templates 
          (name, description, category, capabilities, recommended_policies, trust_level, config_template, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        template.name,
        template.description,
        template.category,
        template.capabilities,
        template.recommended_policies,
        template.trust_level,
        JSON.stringify(template.config_template),
        template.tags
      ]);
      console.log(`  ✓ ${template.name}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Template seeding complete!');
    console.log(`\n📊 Summary:`);
    console.log(`  - ${POLICY_TEMPLATES.length} policy templates`);
    console.log(`  - ${AGENT_TEMPLATES.length} agent templates`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding templates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedTemplates, POLICY_TEMPLATES, AGENT_TEMPLATES };
