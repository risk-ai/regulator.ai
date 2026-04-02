/**
 * Example: Full Passback Execution Flow
 *
 * This example demonstrates the complete passback flow:
 * 1. Submit intent to Vienna OS
 * 2. Receive warrant for local execution
 * 3. Execute action locally with monitoring
 * 4. Report execution results back to Vienna
 */

import { ViennaClient } from '../src';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize the client
const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'passback-agent',
  apiKey: process.env.VIENNA_API_KEY, // vos_...
});

interface ExecutionContext {
  warrantId: string;
  action: string;
  payload: any;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  metrics?: {
    duration_ms: number;
    memory_used_mb?: number;
    cpu_time_ms?: number;
  };
}

async function submitIntentForPassback(action: string, payload: any): Promise<string> {
  console.log('📝 Submitting intent for passback execution...');

  try {
    const result = await vienna.submitIntent({
      action,
      payload,
      execution_mode: 'passback', // Request warrant for local execution
      agent_capabilities: [
        'local_execution',
        'file_system_access',
        'network_access'
      ]
    });

    console.log('Intent submitted:', {
      pipeline: result.pipeline,
      warrant_id: result.warrant?.id,
      risk_tier: result.risk_tier
    });

    if (result.pipeline === 'passback' && result.warrant) {
      console.log('✅ Received warrant for local execution');
      console.log('Warrant ID:', result.warrant.id);
      console.log('Expires at:', result.warrant.expires_at);
      return result.warrant.id;
    } else if (result.pipeline === 'executed') {
      throw new Error('Intent was executed remotely instead of passback');
    } else if (result.pipeline === 'blocked') {
      throw new Error(`Intent blocked: ${result.reason}`);
    } else {
      throw new Error(`Unexpected pipeline result: ${result.pipeline}`);
    }
  } catch (error) {
    console.error('❌ Failed to submit intent:', error);
    throw error;
  }
}

async function getWarrantDetails(warrantId: string) {
  console.log(`📋 Fetching warrant details: ${warrantId}...`);

  try {
    const warrant = await vienna.getWarrant(warrantId);
    
    console.log('Warrant details:', {
      id: warrant.id,
      action: warrant.action,
      status: warrant.status,
      expires_at: warrant.expires_at,
      constraints: warrant.constraints
    });

    return warrant;
  } catch (error) {
    console.error('❌ Failed to get warrant:', error);
    throw error;
  }
}

async function executeAction(context: ExecutionContext): Promise<any> {
  console.log(`🔧 Executing action: ${context.action}...`);
  context.status = 'running';
  context.startTime = new Date();

  try {
    let result: any;

    // Handle different action types
    switch (context.action) {
      case 'deploy_service':
        result = await deployService(context.payload);
        break;
        
      case 'run_database_migration':
        result = await runDatabaseMigration(context.payload);
        break;
        
      case 'execute_script':
        result = await executeScript(context.payload);
        break;
        
      case 'backup_database':
        result = await backupDatabase(context.payload);
        break;
        
      default:
        throw new Error(`Unsupported action: ${context.action}`);
    }

    context.endTime = new Date();
    context.status = 'completed';
    context.result = result;
    
    // Calculate metrics
    context.metrics = {
      duration_ms: context.endTime.getTime() - context.startTime.getTime(),
      memory_used_mb: process.memoryUsage().heapUsed / 1024 / 1024
    };

    console.log('✅ Action completed successfully');
    console.log('Duration:', context.metrics.duration_ms + 'ms');

    return result;
  } catch (error) {
    context.endTime = new Date();
    context.status = 'failed';
    context.error = error instanceof Error ? error.message : String(error);
    
    context.metrics = {
      duration_ms: context.endTime.getTime() - context.startTime.getTime()
    };

    console.error('❌ Action failed:', error);
    throw error;
  }
}

// Example action implementations
async function deployService(payload: any): Promise<any> {
  console.log('🚀 Deploying service:', payload.service_name);
  
  // Simulate deployment steps
  console.log('  • Building container image...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('  • Pushing to registry...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('  • Updating deployment...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    service_name: payload.service_name,
    version: payload.version,
    deployment_id: 'dep_' + Date.now(),
    status: 'deployed',
    endpoint: `https://${payload.service_name}.example.com`
  };
}

async function runDatabaseMigration(payload: any): Promise<any> {
  console.log('🗄️ Running database migration:', payload.migration_name);
  
  // In a real scenario, this would run actual migrations
  console.log('  • Checking current schema version...');
  console.log('  • Running migration scripts...');
  console.log('  • Updating schema version...');
  
  return {
    migration_name: payload.migration_name,
    from_version: payload.from_version,
    to_version: payload.to_version,
    affected_tables: ['users', 'orders', 'products'],
    rows_affected: 12534
  };
}

async function executeScript(payload: any): Promise<any> {
  console.log('📜 Executing script:', payload.script_path);
  
  try {
    const { stdout, stderr } = await execAsync(payload.command, {
      timeout: 30000, // 30 second timeout
      cwd: payload.working_directory || process.cwd()
    });
    
    return {
      command: payload.command,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exit_code: 0
    };
  } catch (error: any) {
    return {
      command: payload.command,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exit_code: error.code || 1
    };
  }
}

async function backupDatabase(payload: any): Promise<any> {
  console.log('💾 Creating database backup:', payload.database_name);
  
  // Simulate backup process
  console.log('  • Creating backup snapshot...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('  • Compressing backup file...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    database_name: payload.database_name,
    backup_id: 'backup_' + Date.now(),
    file_size_mb: 247.3,
    backup_location: `s3://backups/${payload.database_name}/${Date.now()}.sql.gz`,
    checksum: 'sha256:a1b2c3d4e5f6...'
  };
}

async function reportExecutionResult(context: ExecutionContext): Promise<void> {
  console.log('📊 Reporting execution results to Vienna OS...');

  try {
    const callbackPayload = {
      warrant_id: context.warrantId,
      status: context.status,
      result: context.result,
      error: context.error,
      metrics: context.metrics,
      execution_log: {
        start_time: context.startTime.toISOString(),
        end_time: context.endTime?.toISOString(),
        agent_id: vienna.agentId,
        action: context.action
      }
    };

    const response = await vienna.reportExecutionCallback(callbackPayload);
    
    console.log('✅ Execution results reported successfully');
    console.log('Callback ID:', response.callback_id);
    console.log('Audit trail updated:', response.audit_trail_id);
    
  } catch (error) {
    console.error('❌ Failed to report execution results:', error);
    // Don't re-throw - this is a reporting issue, not an execution issue
  }
}

async function monitorExecution(context: ExecutionContext): Promise<void> {
  // Simple execution monitoring
  const monitorInterval = setInterval(() => {
    if (context.status === 'running') {
      const elapsed = Date.now() - context.startTime.getTime();
      console.log(`⏱️  Execution running for ${Math.round(elapsed / 1000)}s...`);
    }
  }, 5000);

  // Wait for execution to complete
  while (context.status === 'running') {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  clearInterval(monitorInterval);
}

async function main() {
  try {
    console.log('🚀 Vienna OS Passback Execution Example\n');
    console.log('This example demonstrates the full passback flow for local execution.\n');

    // Example: Deploy a service with governance
    const actionType = 'deploy_service';
    const actionPayload = {
      service_name: 'user-api',
      version: 'v2.4.1',
      environment: 'production',
      replicas: 3,
      resource_limits: {
        cpu: '500m',
        memory: '1Gi'
      }
    };

    console.log('Action to execute:', {
      action: actionType,
      payload: actionPayload
    });
    console.log();

    // Step 1: Submit intent and get warrant
    const warrantId = await submitIntentForPassback(actionType, actionPayload);
    console.log();

    // Step 2: Get warrant details and validate
    const warrant = await getWarrantDetails(warrantId);
    console.log();

    // Verify warrant is still valid
    if (new Date(warrant.expires_at) < new Date()) {
      throw new Error('Warrant has expired');
    }

    // Step 3: Create execution context
    const executionContext: ExecutionContext = {
      warrantId: warrant.id,
      action: warrant.action,
      payload: warrant.payload || actionPayload,
      startTime: new Date(),
      status: 'pending'
    };

    // Step 4: Execute the action with monitoring
    console.log('🎯 Beginning local execution...\n');
    
    // Start monitoring in background
    const monitoringPromise = monitorExecution(executionContext);
    
    // Execute the actual action
    await executeAction(executionContext);
    
    // Wait for monitoring to finish
    await monitoringPromise;
    
    console.log();

    // Step 5: Report results back to Vienna
    await reportExecutionResult(executionContext);

    console.log('\n✅ Passback execution completed successfully!');
    console.log('\n📋 Execution Summary:');
    console.log('  • Warrant ID:', executionContext.warrantId);
    console.log('  • Action:', executionContext.action);
    console.log('  • Status:', executionContext.status);
    console.log('  • Duration:', executionContext.metrics?.duration_ms + 'ms');
    console.log('  • Result:', JSON.stringify(executionContext.result, null, 2));

  } catch (error) {
    console.error('\n💥 Passback execution failed:', error);
    process.exit(1);
  }
}

// Run with proper error handling
main().catch(console.error);

/*
 * Environment Variables Required:
 * 
 * VIENNA_API_KEY=vos_your_api_key_here
 * VIENNA_AGENT_ID=your_agent_id
 * 
 * Optional:
 * VIENNA_BASE_URL=https://console.regulator.ai (default)
 */