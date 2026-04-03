#!/usr/bin/env node

/**
 * Vienna OS — 5-Minute Quickstart
 * 
 * Experience Vienna OS governance with zero setup required.
 * This demo shows all 4 risk tiers (T0-T3) and governance patterns
 * using Vienna OS's live demo API.
 * 
 * Usage:
 *   node index.js           # Run interactive demo
 *   node index.js --test    # Run all scenarios automatically  
 *   node index.js --help    # Show usage
 */

import { ViennaClient } from '@vienna-os/sdk';
import chalk from 'chalk';

// Demo configuration
const DEMO_CONFIG = {
  baseUrl: 'https://regulator.ai/demo/api',  // Vienna OS demo endpoint
  apiKey: 'demo_key_no_auth_required',      // Public demo key
  timeout: 10000
};

const SCENARIOS = [
  {
    name: 'Health Check (T0)',
    description: 'Monitoring agent checks service health',
    expectedTier: 'T0',
    expectedPipeline: 'executed',
    icon: '🟢',
    intent: {
      agent_id: 'monitoring-agent',
      action: 'health_check',
      payload: {
        services: ['api', 'database', 'cache'],
        timeout_ms: 5000
      }
    }
  },
  {
    name: 'Deploy to Staging (T1)', 
    description: 'DevOps agent deploys new version to staging',
    expectedTier: 'T1',
    expectedPipeline: 'executed',
    icon: '🟡',
    intent: {
      agent_id: 'devops-agent',
      action: 'deploy_service',
      payload: {
        service: 'user-api',
        version: 'v2.1.4',
        environment: 'staging',
        rollback_enabled: true
      }
    }
  },
  {
    name: 'Large Financial Transfer (T2)',
    description: 'Finance agent initiates $50K wire transfer',
    expectedTier: 'T2', 
    expectedPipeline: 'pending_approval',
    icon: '🟠',
    intent: {
      agent_id: 'finance-agent',
      action: 'wire_transfer',
      payload: {
        amount: 50000,
        currency: 'USD',
        destination: 'International Bank',
        purpose: 'Vendor payment'
      }
    }
  },
  {
    name: 'Production Database Migration (T3)',
    description: 'Database agent attempts critical schema change',
    expectedTier: 'T3',
    expectedPipeline: 'pending_approval',
    icon: '🔴', 
    intent: {
      agent_id: 'database-agent',
      action: 'schema_migration',
      payload: {
        database: 'user_data_production',
        migration: 'add_encryption_columns',
        estimated_downtime_minutes: 30,
        rollback_available: true
      }
    }
  },
  {
    name: 'Blocked Action',
    description: 'Agent attempts unauthorized data export',
    expectedTier: 'DENIED',
    expectedPipeline: 'blocked',
    icon: '⛔',
    intent: {
      agent_id: 'analytics-agent', 
      action: 'export_user_data',
      payload: {
        table: 'users',
        include_pii: true,
        destination: 'external_analytics_platform'
      }
    }
  }
];

class QuickstartDemo {
  constructor() {
    this.vienna = new ViennaClient(DEMO_CONFIG);
    this.startTime = Date.now();
  }

  async runInteractiveDemo() {
    this.printHeader();
    
    console.log(chalk.cyan('🎯 This demo shows Vienna OS protecting AI agents across all risk levels:\n'));
    console.log(chalk.gray('   T0 = Auto-approve (health checks, reads)'));
    console.log(chalk.gray('   T1 = Policy approval (deployments, config)'));  
    console.log(chalk.gray('   T2 = Human approval (financial, data operations)'));
    console.log(chalk.gray('   T3 = Executive approval (critical infrastructure)'));
    console.log(chalk.gray('   DENY = Blocked (unauthorized, policy violation)\n'));

    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      
      // Ask user if they want to continue (except for first scenario)
      if (i > 0) {
        await this.waitForEnter(`\\nPress Enter to run scenario ${i + 1}: ${scenario.name}`);
      }
      
      await this.runScenario(scenario, i + 1);
      
      // Small delay for readability
      if (i < SCENARIOS.length - 1) {
        await this.sleep(1000);
      }
    }
    
    this.printSummary();
  }

  async runAllScenarios() {
    this.printHeader();
    console.log(chalk.cyan('🤖 Running all scenarios automatically...\n'));
    
    for (let i = 0; i < SCENARIOS.length; i++) {
      await this.runScenario(SCENARIOS[i], i + 1);
      if (i < SCENARIOS.length - 1) {
        await this.sleep(1500);
      }
    }
    
    this.printSummary();
  }

  async runScenario(scenario, number) {
    const { name, description, expectedTier, expectedPipeline, icon, intent } = scenario;
    
    console.log(chalk.bold(`\\n━━━ Scenario ${number}: ${name} ${icon} ━━━`));
    console.log(chalk.gray(`${description}\\n`));
    
    const startTime = Date.now();
    
    try {
      // Show intent details
      console.log(chalk.blue('📤 Submitting intent:'));
      console.log(chalk.gray(`   Agent: ${intent.agent_id}`));
      console.log(chalk.gray(`   Action: ${intent.action}`));
      console.log(chalk.gray(`   Payload: ${JSON.stringify(intent.payload, null, 4).replace(/\\n/g, '\\n     ')}`));
      console.log();
      
      // Submit to Vienna OS
      const result = await this.vienna.submitIntent(intent);
      const duration = Date.now() - startTime;
      
      // Display results
      this.displayResult(result, expectedPipeline, duration);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`❌ Error after ${duration}ms: ${error.message}`));
      console.log(chalk.gray('   This might be expected in demo mode\\n'));
    }
  }

  displayResult(result, expectedPipeline, duration) {
    const { pipeline, risk_tier, warrant, proposal, reason } = result;
    
    // Status line
    const statusColor = pipeline === 'executed' ? 'green' : 
                       pipeline === 'pending_approval' ? 'yellow' :
                       pipeline === 'blocked' ? 'red' : 'gray';
                       
    console.log(chalk[statusColor](`✓ Result: ${pipeline.toUpperCase()} (${risk_tier}) — ${duration}ms`));
    
    // Details based on pipeline outcome
    if (pipeline === 'executed') {
      console.log(chalk.green(`🎫 Warrant issued: ${warrant?.id || 'wrt_demo_123'}`));
      console.log(chalk.gray(`   • Cryptographically signed execution authority`));
      console.log(chalk.gray(`   • Expires: ${new Date(Date.now() + 300000).toISOString()}`));
      console.log(chalk.gray(`   • Full audit trail maintained`));
      
    } else if (pipeline === 'pending_approval') {
      console.log(chalk.yellow(`⏳ Awaiting approval: ${proposal?.id || 'prop_demo_456'}`));
      console.log(chalk.gray(`   • Risk tier ${risk_tier} requires human review`));
      console.log(chalk.gray(`   • Notifications sent to approvers`)); 
      console.log(chalk.gray(`   • Auto-timeout: 24 hours`));
      
    } else if (pipeline === 'blocked') {
      console.log(chalk.red(`🚫 Action blocked: ${reason || 'Policy violation'}`));
      console.log(chalk.gray(`   • Agent lacks permission for this action`));
      console.log(chalk.gray(`   • Blocked actions logged for security audit`));
      console.log(chalk.gray(`   • No execution attempted`));
    }
    
    // Governance explanation
    this.explainGovernance(risk_tier, pipeline);
  }

  explainGovernance(riskTier, pipeline) {
    console.log(chalk.cyan('\\n📋 Governance Details:'));
    
    switch (riskTier) {
      case 'T0':
        console.log(chalk.gray('   • Low-risk read operation'));
        console.log(chalk.gray('   • Automatically approved by policy engine'));
        console.log(chalk.gray('   • No human intervention required'));
        console.log(chalk.gray('   • Full audit trail still maintained'));
        break;
        
      case 'T1': 
        console.log(chalk.gray('   • Moderate-risk operational task'));
        console.log(chalk.gray('   • Policy-based approval (automated)'));
        console.log(chalk.gray('   • Warrant issued with constraints'));
        console.log(chalk.gray('   • Execution monitored and verified'));
        break;
        
      case 'T2':
        console.log(chalk.gray('   • High-risk operation requiring oversight'));
        console.log(chalk.gray('   • Single human approval required'));
        console.log(chalk.gray('   • MFA challenge for approver'));
        console.log(chalk.gray('   • Detailed justification recorded'));
        break;
        
      case 'T3':
        console.log(chalk.gray('   • Critical operation with major impact'));
        console.log(chalk.gray('   • Multiple approvers required'));
        console.log(chalk.gray('   • Executive-level authorization'));
        console.log(chalk.gray('   • Board notification may be triggered'));
        break;
        
      default:
        if (pipeline === 'blocked') {
          console.log(chalk.gray('   • Action violates established policies'));
          console.log(chalk.gray('   • Agent lacks scope for this operation'));
          console.log(chalk.gray('   • Security team automatically notified'));
          console.log(chalk.gray('   • No warrant issued, no execution attempted'));
        }
    }
  }

  async waitForEnter(prompt) {
    console.log(chalk.yellow(prompt));
    process.stdin.setRawMode(true);
    return new Promise(resolve => {
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      });
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printHeader() {
    console.clear();
    console.log(chalk.bold.blue(`
╔══════════════════════════════════════════════════════════╗
║              Vienna OS — 5-Minute Quickstart              ║
║         Governed AI Execution in Under 5 Minutes          ║
╚══════════════════════════════════════════════════════════╝`));
    console.log();
  }

  printSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log(chalk.bold('\\n🎯 Demo Complete!'));
    console.log(chalk.gray(`   Total time: ${totalTime} seconds`));
    console.log(chalk.gray(`   Scenarios: ${SCENARIOS.length}`));
    console.log();
    
    console.log(chalk.cyan('✅ What Vienna OS provided:'));
    console.log(chalk.gray('   • Risk assessment for every agent action'));
    console.log(chalk.gray('   • Automated policy evaluation'));  
    console.log(chalk.gray('   • Approval workflows for high-risk operations'));
    console.log(chalk.gray('   • Cryptographic warrants for authorized actions'));
    console.log(chalk.gray('   • Complete audit trail for compliance'));
    console.log(chalk.gray('   • Security blocks for unauthorized actions'));
    console.log();
    
    console.log(chalk.cyan('🚀 Next Steps:'));
    console.log(chalk.gray('   • Try the live sandbox: https://regulator.ai/try'));
    console.log(chalk.gray('   • Install locally: npm install @vienna-os/sdk'));
    console.log(chalk.gray('   • Read the docs: https://regulator.ai/docs'));
    console.log(chalk.gray('   • Join Discord: https://discord.gg/vienna-os'));
    console.log();
    
    console.log(chalk.bold('🏛️ Experience governance that doesn\\'t slow down AI — it makes it safe.'));
  }

  printUsage() {
    console.log(`
Vienna OS 5-Minute Quickstart

Usage:
  node index.js           Run interactive demo (recommended)
  node index.js --test    Run all scenarios automatically
  node index.js --help    Show this help

This demo shows Vienna OS governance across all risk tiers:
• T0 (auto-approve) — Health checks, read operations
• T1 (policy-approve) — Deployments, configuration  
• T2 (human-approve) — Financial operations, data changes
• T3 (executive-approve) — Critical infrastructure
• DENY (blocked) — Unauthorized or policy violations

No Vienna OS instance required — uses demo API endpoints.
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const demo = new QuickstartDemo();
  
  if (args.includes('--help') || args.includes('-h')) {
    demo.printUsage();
  } else if (args.includes('--test') || args.includes('-t')) {
    await demo.runAllScenarios();
  } else {
    await demo.runInteractiveDemo();
  }
}

// Error handling
process.on('SIGINT', () => {
  console.log(chalk.yellow('\\n👋 Demo interrupted. Thanks for trying Vienna OS!'));
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('💥 Demo error:'), error.message);
  console.log(chalk.gray('This might be normal in demo mode. Try: npm install && node index.js'));
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}