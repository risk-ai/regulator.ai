#!/usr/bin/env node
/**
 * Example: Governed DevOps Agent
 * 
 * A simple DevOps agent that uses Vienna OS to govern its actions.
 * Demonstrates: intent submission, approval waiting, execution reporting.
 * 
 * Usage:
 *   VIENNA_API_KEY=vos_xxx node agent.js
 */

const { ViennaClient } = require('@vienna-os/sdk');
// Or if running from repo:
// const { FrameworkAdapter } = require('../../services/vienna-lib/adapters/framework-adapter');

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY || 'vos_demo_key',
  baseUrl: process.env.VIENNA_API_URL || 'https://api.regulator.ai',
});

// Simulated DevOps tasks
const tasks = [
  { action: 'check_status', params: { service: 'api-gateway' }, description: 'Check service status' },
  { action: 'deploy_code', params: { service: 'api-gateway', version: '2.4.1', env: 'production' }, description: 'Deploy to production' },
  { action: 'restart_service', params: { service: 'worker-queue' }, description: 'Restart worker' },
  { action: 'delete_old_logs', params: { older_than_days: 30 }, description: 'Clean up logs' },
];

async function runAgent() {
  console.log('🤖 Governed DevOps Agent starting...\n');

  // Register with Vienna OS
  try {
    await vienna.fleet.register({
      agentId: 'devops-agent-demo',
      name: 'DevOps Demo Agent',
      capabilities: ['check_status', 'deploy_code', 'restart_service', 'delete_old_logs'],
    });
    console.log('✅ Registered with Vienna OS\n');
  } catch (e) {
    console.log('⚠️  Registration skipped (API may not be running)\n');
  }

  for (const task of tasks) {
    console.log(`━━━ Task: ${task.description} ━━━`);
    console.log(`  Action: ${task.action}`);
    console.log(`  Params: ${JSON.stringify(task.params)}`);

    try {
      // Submit intent to Vienna OS
      const result = await vienna.intent.submit({
        action: task.action,
        source: 'devops-agent-demo',
        payload: task.params,
      });

      console.log(`  Risk Tier: ${result.risk_tier || result.tier || 'unknown'}`);
      console.log(`  Status: ${result.status}`);

      if (result.status === 'approved' || result.status === 'auto-approved') {
        console.log(`  ✅ Approved — Warrant: ${result.warrant_id || 'N/A'}`);
        
        // Execute the task
        console.log(`  ⚡ Executing: ${task.action}...`);
        await simulateExecution(task);
        
        // Report success
        if (result.warrant_id) {
          await vienna.intent.submit({
            action: 'execution_report',
            source: 'devops-agent-demo',
            payload: { warrant_id: result.warrant_id, success: true },
          });
          console.log(`  📋 Execution reported to audit trail`);
        }
      } else if (result.status === 'pending') {
        console.log(`  ⏳ Awaiting human approval...`);
        console.log(`  🔗 Approve at: ${result.poll_url || 'console.regulator.ai'}`);
      } else if (result.status === 'denied') {
        console.log(`  🚫 DENIED: ${result.reason || 'Policy violation'}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('🏁 Agent completed all tasks');
}

async function simulateExecution(task) {
  // Simulate execution delay
  await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
}

runAgent().catch(console.error);
