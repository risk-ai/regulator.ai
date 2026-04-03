import 'dotenv/config';
import { ViennaClient } from '@vienna-os/sdk';

/**
 * Production-Ready Governed DevOps Agent
 * 
 * Demonstrates enterprise-grade DevOps automation with Vienna OS governance.
 * Shows proper error handling, retry logic, and governance patterns.
 * 
 * Features:
 * - Automatic risk tier detection
 * - Comprehensive error handling
 * - Proper logging and audit trails
 * - Production-ready patterns
 * - Real DevOps workflows
 */

class GovernedDevOpsAgent {
  constructor() {
    this.vienna = new ViennaClient({
      baseUrl: process.env.VIENNA_API_URL || 'http://localhost:3100',
      apiKey: process.env.VIENNA_API_KEY,
      timeout: 30000
    });
    
    this.agentId = 'devops-agent-demo';
    this.retryCount = 3;
    this.retryDelay = 1000;
  }

  async validateEnvironment() {
    if (!process.env.VIENNA_API_KEY) {
      throw new Error('❌ VIENNA_API_KEY environment variable is required');
    }
    
    // Test connection to Vienna OS
    try {
      await this.vienna.health();
      console.log('✅ Vienna OS connection verified');
    } catch (error) {
      throw new Error(`❌ Cannot connect to Vienna OS: ${error.message}`);
    }
  }

  async registerAgent() {
    console.log('🤖 Registering DevOps Agent with Vienna OS...');
    
    try {
      await this.vienna.registerAgent({
        id: this.agentId,
        name: 'Production DevOps Agent',
        type: 'devops-automation',
        description: 'Handles infrastructure operations with Vienna OS governance',
        default_tier: 'T1',
        capabilities: ['deploy', 'restart', 'monitor', 'backup', 'scale'],
        config: {
          environment: 'production',
          region: 'us-east-1',
          max_parallel_operations: 5
        }
      });
      console.log('✅ Agent registered successfully');
    } catch (error) {
      if (error.message.includes('409') || error.message.includes('already exists')) {
        console.log('ℹ️  Agent already exists, continuing...');
      } else {
        throw new Error(`Failed to register agent: ${error.message}`);
      }
    }
  }

  async submitIntent(action, payload, options = {}) {
    const { riskTier, retries = this.retryCount } = options;
    
    console.log(`\n━━━ DevOps Operation: ${action} ━━━`);
    console.log(`  Payload: ${JSON.stringify(payload, null, 2)}`);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const intent = {
          agent_id: this.agentId,
          action: action,
          payload: payload,
          metadata: {
            timestamp: new Date().toISOString(),
            operator: process.env.USER || 'demo-user',
            environment: 'production',
            attempt: attempt + 1
          }
        };

        // Add risk tier override if specified
        if (riskTier) {
          intent.risk_tier = riskTier;
        }

        const result = await this.vienna.submitIntent(intent);
        
        // Handle different pipeline outcomes
        switch (result.pipeline) {
          case 'executed':
            console.log(`  ✅ Auto-approved and executed (${result.risk_tier})`);
            console.log(`  📋 Warrant: ${result.warrant?.id}`);
            await this.simulateExecution(action, payload);
            break;
            
          case 'pending_approval':
            console.log(`  ⏳ Pending human approval (${result.risk_tier})`);
            console.log(`  🆔 Proposal ID: ${result.proposal?.id}`);
            console.log(`  🔗 Approve at: http://localhost:5173/approvals`);
            break;
            
          case 'blocked':
            console.log(`  ❌ Action blocked: ${result.reason}`);
            break;
            
          case 'simulated':
            console.log(`  🧪 Simulation result: ${result.would_approve ? 'would approve' : 'would block'}`);
            break;
        }
        
        return result;
        
      } catch (error) {
        console.log(`  ⚠️  Attempt ${attempt + 1} failed: ${error.message}`);
        
        if (attempt === retries) {
          console.log(`  ❌ All ${retries + 1} attempts failed`);
          throw error;
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.log(`  ⏱️  Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async simulateExecution(action, payload) {
    // Simulate real DevOps work with realistic delays
    console.log(`  ⚡ Executing ${action}...`);
    
    const executionTime = Math.random() * 3000 + 1000; // 1-4 seconds
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    switch (action) {
      case 'health_check':
        const services = payload.services || ['api', 'database'];
        console.log(`    🔍 Checked ${services.length} services - All healthy`);
        break;
        
      case 'deploy_service':
        console.log(`    🚀 Deployed ${payload.service}:${payload.version} to ${payload.environment}`);
        console.log(`    📊 Deployment took ${Math.round(executionTime)}ms`);
        break;
        
      case 'restart_service':
        console.log(`    🔄 Gracefully restarted ${payload.service}`);
        console.log(`    ⏱️  Downtime: 0ms (rolling restart)`);
        break;
        
      case 'scale_service':
        console.log(`    📈 Scaled ${payload.service} from ${payload.current_instances} to ${payload.target_instances} instances`);
        break;
        
      case 'backup_database':
        console.log(`    💾 Created backup: ${payload.database}_backup_${Date.now()}.sql`);
        console.log(`    📏 Backup size: ${Math.round(Math.random() * 1000)}MB`);
        break;
        
      case 'cleanup_storage':
        const savedSpace = Math.round(Math.random() * 10000);
        console.log(`    🗑️  Cleaned up ${savedSpace}MB of old files`);
        break;
    }
    
    console.log(`  ✓ Operation completed successfully`);
  }

  async runProductionWorkflow() {
    console.log('🏭 Vienna OS Production DevOps Workflow');
    console.log('══════════════════════════════════════════\n');
    
    try {
      // Validate setup
      await this.validateEnvironment();
      await this.registerAgent();
      
      console.log('\n🔄 Running daily DevOps operations...\n');
      
      // Real-world DevOps workflow
      const operations = [
        // Morning health checks (T0 - auto-approved)
        {
          action: 'health_check',
          payload: { 
            services: ['api-gateway', 'user-service', 'database', 'cache'],
            deep_check: true 
          },
          description: 'Daily health verification'
        },
        
        // Deploy hotfix (T1 - policy approval)  
        {
          action: 'deploy_service',
          payload: {
            service: 'api-gateway',
            version: 'v2.1.3-hotfix',
            environment: 'staging',
            rollback_on_failure: true
          },
          description: 'Deploy security hotfix to staging'
        },
        
        // Scale services based on load (T1 - policy approval)
        {
          action: 'scale_service', 
          payload: {
            service: 'user-service',
            current_instances: 3,
            target_instances: 5,
            reason: 'Increased traffic detected'
          },
          description: 'Scale user service for peak hours'
        },
        
        // Production deployment (T2 - human approval required)
        {
          action: 'deploy_service',
          payload: {
            service: 'payment-processor',
            version: 'v3.0.0',
            environment: 'production',
            database_migration: true,
            rollback_plan: 'automated'
          },
          riskTier: 'T2',
          description: 'Major release with database schema changes'
        },
        
        // Database backup (T1 - policy approval)
        {
          action: 'backup_database',
          payload: {
            database: 'user_data',
            type: 'full',
            retention_days: 30,
            encryption: true
          },
          description: 'Weekly encrypted backup'
        },
        
        // Storage cleanup (T1 - policy approval)
        {
          action: 'cleanup_storage',
          payload: {
            paths: ['/tmp', '/var/log/old'],
            retention_days: 7,
            dry_run: false
          },
          description: 'Clean up old temporary files and logs'
        }
      ];
      
      // Execute operations with proper spacing
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        console.log(`\n📋 Operation ${i + 1}/${operations.length}: ${op.description}`);
        
        try {
          const result = await this.submitIntent(op.action, op.payload, { 
            riskTier: op.riskTier 
          });
          
          // Brief pause between operations (realistic timing)
          if (i < operations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
        } catch (error) {
          console.log(`  ❌ Operation failed: ${error.message}`);
          // In production, you might want to continue with other operations
          // or implement circuit breaker patterns
        }
      }
      
      console.log('\n🎯 Daily DevOps workflow completed!');
      console.log('📊 Check Vienna OS console at http://localhost:5173 for:');
      console.log('   • Detailed audit trails');
      console.log('   • Approval workflows'); 
      console.log('   • Risk assessment reports');
      console.log('   • Compliance evidence');
      
    } catch (error) {
      console.error('💥 Workflow failed:', error.message);
      process.exit(1);
    }
  }

  async runSimulation() {
    console.log('\n🧪 Running simulation mode (no actual execution)...\n');
    
    const testOperation = {
      action: 'deploy_service',
      payload: {
        service: 'critical-payment-service',
        version: 'v4.0.0-beta',
        environment: 'production'
      },
      riskTier: 'T2'
    };
    
    // Add simulation flag to intent
    const result = await this.vienna.submitIntent({
      ...testOperation,
      agent_id: this.agentId,
      simulation: true
    });
    
    console.log('📊 Simulation Results:');
    console.log(`   • Would approve: ${result.would_approve ? 'YES' : 'NO'}`);
    console.log(`   • Risk tier: ${result.risk_tier}`);
    console.log(`   • Reason: ${result.reason || 'Normal processing'}`);
  }
}

// Main execution
async function main() {
  const agent = new GovernedDevOpsAgent();
  
  // Check if running in simulation mode
  const args = process.argv.slice(2);
  const isSimulation = args.includes('--simulate') || args.includes('-s');
  
  if (isSimulation) {
    await agent.runSimulation();
  } else {
    await agent.runProductionWorkflow();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down DevOps agent gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}