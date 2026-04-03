#!/usr/bin/env node
// Create policy_templates table and seed with 20 production-ready templates across 4 packs
const { Client } = require('pg');

const DB_URL = 'postgresql://neondb_owner:npg_qBE7o0YlGQyX@ep-purple-smoke-adpumuth-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  
  // Set search path to regulator schema
  await client.query('SET search_path TO regulator, public');
  console.log('✅ Connected to regulator schema');
  
  // Create policy_templates table
  console.log('🔄 Creating policy_templates table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS regulator.policy_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT DEFAULT '📋',
      priority INT DEFAULT 0,
      rules JSONB NOT NULL DEFAULT '[]',
      tags TEXT[] DEFAULT '{}',
      use_count INT DEFAULT 0,
      enabled BOOLEAN DEFAULT true,
      pack_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Table created');
  
  // Clear existing data
  await client.query('DELETE FROM regulator.policy_templates');
  console.log('🧹 Cleared existing templates');
  
  // Seed data for 4 policy packs (20 templates total)
  const templates = [
    // Pack 1: SOC 2 Compliance (pack_id: 'soc2', category: 'compliance', icon: '🛡️')
    {
      name: 'Audit Trail Enforcement',
      description: 'All actions logged, no exceptions',
      category: 'compliance',
      icon: '🛡️',
      priority: 1,
      rules: JSON.stringify([{"condition": "always", "action": "require_audit_log", "severity": "critical"}]),
      tags: ['audit', 'logging', 'compliance'],
      pack_id: 'soc2'
    },
    {
      name: 'Access Control Review',
      description: 'Periodic access reviews required',
      category: 'compliance',
      icon: '🛡️',
      priority: 2,
      rules: JSON.stringify([{"condition": "agent_scope_access", "action": "require_review_every_30_days", "severity": "high"}]),
      tags: ['access', 'review', 'compliance'],
      pack_id: 'soc2'
    },
    {
      name: 'Change Management',
      description: 'All production changes require approval',
      category: 'compliance',
      icon: '🛡️',
      priority: 3,
      rules: JSON.stringify([{"condition": "env == 'production'", "action": "require_t1_approval", "severity": "critical"}]),
      tags: ['production', 'approval', 'compliance'],
      pack_id: 'soc2'
    },
    {
      name: 'Data Classification',
      description: 'Classify data access by sensitivity',
      category: 'compliance',
      icon: '🛡️',
      priority: 4,
      rules: JSON.stringify([
        {"condition": "data_type in ['PII', 'PHI']", "action": "require_t2_approval", "severity": "critical"},
        {"condition": "data_type == 'public'", "action": "require_t0_approval", "severity": "low"}
      ]),
      tags: ['data', 'classification', 'compliance'],
      pack_id: 'soc2'
    },
    {
      name: 'Incident Response',
      description: 'Auto-escalate on anomalous behavior',
      category: 'compliance',
      icon: '🛡️',
      priority: 5,
      rules: JSON.stringify([
        {"condition": "error_rate > 0.05", "action": "alert_and_escalate_t2", "severity": "critical"},
        {"condition": "scope_violation", "action": "alert_and_escalate_t2", "severity": "critical"}
      ]),
      tags: ['incident', 'response', 'compliance'],
      pack_id: 'soc2'
    },
    
    // Pack 2: Financial Services (pack_id: 'financial', category: 'financial', icon: '💰')
    {
      name: 'Transaction Limits',
      description: 'Wire transfers >$10K require multi-party approval',
      category: 'financial',
      icon: '💰',
      priority: 1,
      rules: JSON.stringify([{"condition": "amount > 10000", "action": "require_t2_approval", "severity": "critical"}]),
      tags: ['transactions', 'limits', 'financial'],
      pack_id: 'financial'
    },
    {
      name: 'Sanctions Screening',
      description: 'Check against sanctions list before execution',
      category: 'financial',
      icon: '💰',
      priority: 2,
      rules: JSON.stringify([{"condition": "destination_entity", "action": "require_sanctions_screening", "severity": "critical"}]),
      tags: ['sanctions', 'screening', 'financial'],
      pack_id: 'financial'
    },
    {
      name: 'Trading Hours Enforcement',
      description: 'Block trades outside market hours',
      category: 'financial',
      icon: '💰',
      priority: 3,
      rules: JSON.stringify([{"condition": "action contains 'trade' AND (hour < 9.5 OR hour > 16) AND timezone == 'ET'", "action": "deny", "severity": "high"}]),
      tags: ['trading', 'hours', 'financial'],
      pack_id: 'financial'
    },
    {
      name: 'Anti-Money Laundering',
      description: 'Flag structured transactions',
      category: 'financial',
      icon: '💰',
      priority: 4,
      rules: JSON.stringify([{"condition": "multiple_transfers_from_agent_24h > 50000", "action": "alert_and_escalate_t3", "severity": "critical"}]),
      tags: ['aml', 'money laundering', 'financial'],
      pack_id: 'financial'
    },
    {
      name: 'Segregation of Duties',
      description: 'Agent that proposes cannot approve',
      category: 'financial',
      icon: '💰',
      priority: 5,
      rules: JSON.stringify([{"condition": "proposer_id == approver_id", "action": "deny", "severity": "critical"}]),
      tags: ['segregation', 'duties', 'financial'],
      pack_id: 'financial'
    },
    
    // Pack 3: Healthcare/HIPAA (pack_id: 'hipaa', category: 'compliance', icon: '🏥')
    {
      name: 'PHI Access Controls',
      description: 'All PHI access requires warrant with patient scope',
      category: 'compliance',
      icon: '🏥',
      priority: 1,
      rules: JSON.stringify([{"condition": "data_type == 'PHI'", "action": "require_t1_approval_with_patient_scope", "severity": "critical"}]),
      tags: ['phi', 'access', 'hipaa'],
      pack_id: 'hipaa'
    },
    {
      name: 'Minimum Necessary',
      description: 'Only access fields needed for the task',
      category: 'compliance',
      icon: '🏥',
      priority: 2,
      rules: JSON.stringify([{"condition": "phi_access", "action": "limit_to_requested_fields_only", "severity": "high"}]),
      tags: ['phi', 'minimum necessary', 'hipaa'],
      pack_id: 'hipaa'
    },
    {
      name: 'Consent Verification',
      description: 'Verify patient consent before modification',
      category: 'compliance',
      icon: '🏥',
      priority: 3,
      rules: JSON.stringify([{"condition": "phi_write", "action": "require_consent_check", "severity": "critical"}]),
      tags: ['consent', 'verification', 'hipaa'],
      pack_id: 'hipaa'
    },
    {
      name: 'Breach Notification',
      description: 'Auto-detect and alert on potential breaches',
      category: 'compliance',
      icon: '🏥',
      priority: 4,
      rules: JSON.stringify([
        {"condition": "bulk_access", "action": "alert_security_t3", "severity": "critical"},
        {"condition": "unauthorized_field_access", "action": "alert_security_t3", "severity": "critical"}
      ]),
      tags: ['breach', 'notification', 'hipaa'],
      pack_id: 'hipaa'
    },
    {
      name: 'Audit for HIPAA',
      description: 'Extended retention audit logging',
      category: 'compliance',
      icon: '🏥',
      priority: 5,
      rules: JSON.stringify([{"condition": "phi_access", "action": "audit_retention_7_years", "severity": "high"}]),
      tags: ['audit', 'retention', 'hipaa'],
      pack_id: 'hipaa'
    },
    
    // Pack 4: Developer Safety (pack_id: 'devsafety', category: 'operations', icon: '🚀')
    {
      name: 'No After-Hours Deploys',
      description: 'Prod deploys blocked outside business hours without override',
      category: 'operations',
      icon: '🚀',
      priority: 1,
      rules: JSON.stringify([{"condition": "deploy AND env == 'production' AND (hour < 9 OR hour > 17)", "action": "require_t2_escalation", "severity": "high"}]),
      tags: ['deploy', 'after hours', 'operations'],
      pack_id: 'devsafety'
    },
    {
      name: 'Rollback Required',
      description: 'All prod deploys must have rollback plan',
      category: 'operations',
      icon: '🚀',
      priority: 2,
      rules: JSON.stringify([{"condition": "deploy AND env == 'production'", "action": "require_rollback_plan", "severity": "high"}]),
      tags: ['rollback', 'deploy', 'operations'],
      pack_id: 'devsafety'
    },
    {
      name: 'Database Migration Safety',
      description: 'Schema changes require DBA review',
      category: 'operations',
      icon: '🚀',
      priority: 3,
      rules: JSON.stringify([{"condition": "action contains 'migrate' OR action contains 'alter'", "action": "require_t2_dba_approval", "severity": "critical"}]),
      tags: ['database', 'migration', 'operations'],
      pack_id: 'devsafety'
    },
    {
      name: 'Resource Limits',
      description: 'Cap compute/cost per agent per hour',
      category: 'operations',
      icon: '🚀',
      priority: 4,
      rules: JSON.stringify([{"condition": "cost_estimate > budget_threshold", "action": "deny", "severity": "high"}]),
      tags: ['resources', 'limits', 'operations'],
      pack_id: 'devsafety'
    },
    {
      name: 'Canary Deployment',
      description: 'Large deployments must use canary',
      category: 'operations',
      icon: '🚀',
      priority: 5,
      rules: JSON.stringify([{"condition": "replicas > 10", "action": "require_canary_percentage", "severity": "high"}]),
      tags: ['canary', 'deployment', 'operations'],
      pack_id: 'devsafety'
    }
  ];
  
  console.log(`🌱 Seeding ${templates.length} policy templates...`);
  
  for (const template of templates) {
    await client.query(`
      INSERT INTO regulator.policy_templates (
        name, description, category, icon, priority, rules, tags, pack_id, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      template.name,
      template.description,
      template.category,
      template.icon,
      template.priority,
      template.rules,
      template.tags,
      template.pack_id,
      true
    ]);
    console.log(`  ✅ ${template.pack_id}/${template.name}`);
  }
  
  // Show summary
  console.log('\n📊 Policy Pack Summary:');
  const summary = await client.query(`
    SELECT pack_id, category, icon, COUNT(*) as template_count 
    FROM regulator.policy_templates 
    GROUP BY pack_id, category, icon 
    ORDER BY pack_id
  `);
  summary.rows.forEach(row => {
    console.log(`  ${row.icon} ${row.pack_id} (${row.category}): ${row.template_count} templates`);
  });
  
  console.log('\n🎉 Policy templates seeded successfully!');
  
  await client.end();
}

run().catch(e => { 
  console.error('❌ Fatal error:', e.message); 
  process.exit(1); 
});