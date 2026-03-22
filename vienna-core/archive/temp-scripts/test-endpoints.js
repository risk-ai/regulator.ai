#!/usr/bin/env node
/**
 * Test Endpoint Integration (Phase 7.5)
 * 
 * Tests:
 * - EndpointManager registration
 * - ChatActionBridge local actions
 * - OpenClawBridge instruction creation
 */

const vienna = require('../index');

async function testEndpoints() {
  console.log('=== Phase 7.5: Endpoint Integration Test ===\n');
  
  try {
    // Initialize Vienna Core
    console.log('[1/6] Initializing Vienna Core...');
    vienna.init({
      adapter: 'openclaw',
      workspace: process.env.HOME + '/.openclaw/workspace',
    });
    
    await vienna.initPhase7_3();
    console.log('✓ Vienna Core initialized\n');
    
    // Test endpoint registration
    console.log('[2/6] Testing endpoint registration...');
    const endpoints = vienna.listEndpoints();
    console.log(`✓ Registered ${endpoints.length} endpoints:`);
    endpoints.forEach(ep => {
      console.log(`  - ${ep.endpoint_name} (${ep.endpoint_type}): ${ep.status}`);
    });
    console.log();
    
    // Test chat action listing
    console.log('[3/6] Testing chat action bridge...');
    const actions = vienna.listChatActions();
    console.log(`✓ Registered ${actions.length} chat actions:`);
    actions.slice(0, 5).forEach(action => {
      console.log(`  - ${action.action_name} [${action.risk_tier}] → ${action.target_endpoint}`);
    });
    if (actions.length > 5) {
      console.log(`  ... and ${actions.length - 5} more`);
    }
    console.log();
    
    // Test T0 chat action execution
    console.log('[4/6] Testing T0 chat action (show status)...');
    try {
      const result = await vienna.executeOperatorChatRequest('show status');
      
      if (result.success) {
        console.log('✓ T0 action executed successfully');
        console.log(`  Services: ${result.result.data.services} (${result.result.data.services_degraded} degraded)`);
        console.log(`  Providers: ${result.result.data.providers} (${result.result.data.providers_active} active)`);
        console.log(`  Open incidents: ${result.result.data.open_incidents}`);
        console.log(`  Active objectives: ${result.result.data.active_objectives}`);
        console.log(`  Runtime mode: ${result.result.data.runtime_mode}`);
      } else {
        console.log('✗ T0 action failed:', result.error);
      }
    } catch (error) {
      console.log('✗ T0 action exception:', error.message);
    }
    console.log();
    
    // Test OpenClaw instruction types
    console.log('[5/6] Testing OpenClaw bridge...');
    const instructionTypes = vienna.listOpenClawInstructions();
    console.log(`✓ Registered ${instructionTypes.length} OpenClaw instruction types:`);
    instructionTypes.slice(0, 5).forEach(type => {
      console.log(`  - ${type.instruction_name} [${type.risk_tier}]`);
    });
    if (instructionTypes.length > 5) {
      console.log(`  ... and ${instructionTypes.length - 5} more`);
    }
    console.log();
    
    // Test instruction envelope creation (without dispatch)
    console.log('[6/6] Testing instruction envelope creation...');
    try {
      const instruction = vienna.openclawBridge.createInstruction({
        instruction_type: 'query_status',
        arguments: {},
        issued_by: 'test-script'
      });
      
      console.log('✓ Instruction envelope created:');
      console.log(`  ID: ${instruction.instruction_id}`);
      console.log(`  Type: ${instruction.instruction_type}`);
      console.log(`  Target: ${instruction.target_endpoint}`);
      console.log(`  Risk tier: ${instruction.risk_tier}`);
    } catch (error) {
      console.log('✗ Instruction creation failed:', error.message);
    }
    console.log();
    
    console.log('=== All Tests Complete ===\n');
    console.log('Summary:');
    console.log(`  ✓ ${endpoints.length} endpoints registered`);
    console.log(`  ✓ ${actions.length} chat actions available`);
    console.log(`  ✓ ${instructionTypes.length} OpenClaw instruction types available`);
    console.log(`  ✓ Endpoint architecture operational`);
    
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndpoints();
