/**
 * Phase 2C Smoke Test
 * 
 * Tests planner and envelope generation (no execution)
 */

import { PlannerService } from './src/services/plannerService.js';

async function testPlanner() {
  const planner = new PlannerService();
  
  console.log('=== Phase 2C Planner Smoke Test ===\n');
  
  // Test 1: Summarize file
  console.log('Test 1: Summarize file classification');
  try {
    const plan1 = await planner.planCommand({
      objective_id: 'obj_test_001',
      command: 'Summarize this file',
      attachments: ['/test-phase2c/contract.md'],
      operator: 'test',
    });
    
    console.log('✓ Command classified as:', plan1.command_type);
    console.log('✓ Action count:', plan1.actions.length);
    console.log('✓ Actions:', plan1.actions.map(a => a.type).join(' → '));
    console.log('✓ Expected output:', plan1.expected_outputs[0]);
    console.log('');
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
  }
  
  // Test 2: Summarize folder
  console.log('Test 2: Summarize folder classification');
  try {
    const plan2 = await planner.planCommand({
      objective_id: 'obj_test_002',
      command: 'Summarize this folder',
      attachments: ['/test-phase2c'],
      operator: 'test',
    });
    
    console.log('✓ Command classified as:', plan2.command_type);
    console.log('✓ Action count:', plan2.actions.length);
    console.log('✓ Actions:', plan2.actions.map(a => a.type).join(' → '));
    console.log('✓ Expected output:', plan2.expected_outputs[0]);
    console.log('');
  } catch (error) {
    console.error('✗ Test 2 failed:', error.message);
  }
  
  // Test 3: Unsupported command
  console.log('Test 3: Unsupported command (should fail)');
  try {
    const plan3 = await planner.planCommand({
      objective_id: 'obj_test_003',
      command: 'Translate this to Spanish',
      attachments: ['/test.txt'],
      operator: 'test',
    });
    
    console.error('✗ Test 3 should have failed but succeeded');
  } catch (error) {
    console.log('✓ Correctly rejected:', error.message);
    console.log('');
  }
  
  // Test 4: No attachment
  console.log('Test 4: Summarize file without attachment (should fail)');
  try {
    const plan4 = await planner.planCommand({
      objective_id: 'obj_test_004',
      command: 'Summarize this file',
      attachments: [],
      operator: 'test',
    });
    
    console.error('✗ Test 4 should have failed but succeeded');
  } catch (error) {
    console.log('✓ Correctly rejected:', error.message);
    console.log('');
  }
  
  console.log('=== Smoke Test Complete ===');
  console.log('');
  console.log('Next: Run manual UI tests per PHASE_2C_VALIDATION.md');
}

testPlanner().catch(console.error);
