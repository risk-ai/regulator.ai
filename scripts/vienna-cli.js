#!/usr/bin/env node
/**
 * Vienna CLI
 * Command-line interface for Vienna OS operations
 */

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('vienna')
  .description('Vienna OS CLI - Govern AI agent actions')
  .version('8.5.0');

// Intent submission
program
  .command('intent')
  .description('Submit an intent for execution')
  .argument('<action>', 'Action to execute')
  .option('-p, --params <json>', 'Parameters (JSON)', '{}')
  .option('-t, --tier <tier>', 'Risk tier (T0/T1/T2)', 'T0')
  .option('--tenant <id>', 'Tenant ID', process.env.VIENNA_TENANT)
  .option('--api-key <key>', 'API key', process.env.VIENNA_API_KEY)
  .action(async (action, options) => {
    try {
      const params = JSON.parse(options.params);
      
      console.log(chalk.blue('Submitting intent...'));
      console.log(`Action: ${action}`);
      console.log(`Tier: ${options.tier}`);
      
      const response = await fetch(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: options.tenant,
          action,
          parameters: params,
          risk_tier: options.tier
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(chalk.green('✓ Intent submitted'));
        console.log(`Intent ID: ${result.data.intent_id}`);
        console.log(`Execution ID: ${result.data.execution_id}`);
      } else {
        console.log(chalk.red('✗ Failed'));
        console.log(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Approval management
program
  .command('approve')
  .description('Approve a pending action')
  .argument('<approval-id>', 'Approval ID')
  .option('-r, --reason <text>', 'Approval reason')
  .option('--api-key <key>', 'API key', process.env.VIENNA_API_KEY)
  .action(async (approvalId, options) => {
    try {
      console.log(chalk.blue('Approving...'));
      
      const response = await fetch(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operator: process.env.USER || 'cli',
          reason: options.reason || 'Approved via CLI'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(chalk.green('✓ Approved'));
      } else {
        console.log(chalk.red('✗ Failed'));
        console.log(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Execution trace
program
  .command('trace')
  .description('View execution trace')
  .argument('<execution-id>', 'Execution ID')
  .option('--api-key <key>', 'API key', process.env.VIENNA_API_KEY)
  .action(async (executionId, options) => {
    try {
      const response = await fetch(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/execution/${executionId}`, {
        headers: { 'Authorization': `Bearer ${options.apiKey}` }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(chalk.blue('Execution Trace:'));
        console.log(`Status: ${result.data.status}`);
        console.log(`Risk Tier: ${result.data.risk_tier}`);
        console.log(`Started: ${new Date(result.data.started_at).toLocaleString()}`);
        if (result.data.completed_at) {
          console.log(`Completed: ${new Date(result.data.completed_at).toLocaleString()}`);
        }
        console.log(`Attestation: ${result.data.attestation_id}`);
      } else {
        console.log(chalk.red('✗ Not found'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List pending approvals
program
  .command('pending')
  .description('List pending approvals')
  .option('--tier <tier>', 'Filter by tier')
  .option('--api-key <key>', 'API key', process.env.VIENNA_API_KEY)
  .action(async (options) => {
    try {
      const url = new URL(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/approvals`);
      url.searchParams.set('status', 'pending');
      if (options.tier) url.searchParams.set('tier', options.tier);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${options.apiKey}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        console.log(chalk.blue(`${result.data.length} pending approvals:\n`));
        result.data.forEach(approval => {
          console.log(`${approval.tier} | ${approval.approval_id}`);
          console.log(`  Action: ${approval.action_summary || approval.action_type}`);
          console.log(`  Requested: ${new Date(approval.requested_at).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log(chalk.green('No pending approvals'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
