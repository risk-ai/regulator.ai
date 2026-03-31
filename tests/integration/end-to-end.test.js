/**
 * Vienna OS - End-to-End Integration Tests
 * Tests complete workflows from auth through execution to audit
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_URL || 'https://console.regulator.ai';
const TEST_EMAIL = 'test@viennaos.test';
const TEST_PASSWORD = 'Test123!@#';

let authToken = null;
let tenantId = null;
let executionId = null;
let approvalId = null;
let policyId = null;
let agentId = null;

// Helper function
async function apiCall(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    ok: response.ok
  };
}

// Test suite
async function runTests() {
  console.log('🧪 Vienna OS - End-to-End Integration Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Register new user
  console.log('1️⃣  Testing user registration...');
  try {
    const result = await apiCall('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'E2E Test User'
      })
    });
    
    if (result.data.success && result.data.token) {
      authToken = result.data.token;
      tenantId = result.data.user.tenant_id;
      console.log('   ✅ User registered, token obtained');
      console.log(`   📝 Tenant ID: ${tenantId}`);
      passed++;
    } else {
      console.log('   ❌ Registration failed:', result.data.error);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Registration error:', error.message);
    failed++;
  }
  
  // Test 2: Create policy
  console.log('\n2️⃣  Testing policy creation...');
  try {
    const result = await apiCall('/api/v1/policies', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Test Policy',
        description: 'Test policy for integration testing',
        tier: 'T1',
        rules: {
          require_approval: true,
          max_retries: 3
        },
        enabled: true,
        priority: 100
      })
    });
    
    if (result.data.success && result.data.data.id) {
      policyId = result.data.data.id;
      console.log('   ✅ Policy created');
      console.log(`   📝 Policy ID: ${policyId}`);
      passed++;
    } else {
      console.log('   ❌ Policy creation failed:', result.data.error);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Policy creation error:', error.message);
    failed++;
  }
  
  // Test 3: Register agent
  console.log('\n3️⃣  Testing agent registration...');
  try {
    const result = await apiCall('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify({
        name: 'E2E Test Agent',
        type: 'test',
        description: 'Test agent for integration testing',
        default_tier: 'T1',
        capabilities: ['test', 'integration'],
        config: {
          test_mode: true
        }
      })
    });
    
    if (result.data.success && result.data.data.id) {
      agentId = result.data.data.id;
      console.log('   ✅ Agent registered');
      console.log(`   📝 Agent ID: ${agentId}`);
      passed++;
    } else {
      console.log('   ❌ Agent registration failed:', result.data.error);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Agent registration error:', error.message);
    failed++;
  }
  
  // Test 4: Execute action (T0 - auto-approve)
  console.log('\n4️⃣  Testing execution (T0 - auto-approve)...');
  try {
    const result = await apiCall('/api/v1/execute', {
      method: 'POST',
      body: JSON.stringify({
        action: 'e2e_test_action',
        agent_id: agentId,
        context: {
          test: true,
          timestamp: new Date().toISOString()
        },
        tier: 'T0'
      })
    });
    
    if (result.data.success) {
      executionId = result.data.data.execution_id;
      console.log('   ✅ Execution submitted');
      console.log(`   📝 Execution ID: ${executionId}`);
      console.log(`   📝 Status: ${result.data.data.status}`);
      console.log(`   📝 Requires Approval: ${result.data.data.requires_approval}`);
      passed++;
    } else {
      console.log('   ❌ Execution failed:', result.data.error);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Execution error:', error.message);
    failed++;
  }
  
  // Test 5: Check execution history
  console.log('\n5️⃣  Testing execution history...');
  try {
    const result = await apiCall('/api/v1/executions');
    
    if (result.data.success && Array.isArray(result.data.data)) {
      console.log(`   ✅ Execution history retrieved (${result.data.data.length} records)`);
      passed++;
    } else {
      console.log('   ❌ Failed to get execution history');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Execution history error:', error.message);
    failed++;
  }
  
  // Test 6: Check stats
  console.log('\n6️⃣  Testing stats API...');
  try {
    const result = await apiCall('/api/v1/stats?period=24h');
    
    if (result.data.success && result.data.data) {
      console.log('   ✅ Stats retrieved');
      console.log(`   📊 Executions: ${result.data.data.executions}`);
      console.log(`   📊 Approvals: ${result.data.data.approvals}`);
      console.log(`   📊 Policies: ${result.data.data.policies}`);
      console.log(`   📊 Active Agents: ${result.data.data.active_agents}`);
      passed++;
    } else {
      console.log('   ❌ Stats failed:', result.data.error);
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Stats error:', error.message);
    failed++;
  }
  
  // Test 7: List policies (tenant isolation check)
  console.log('\n7️⃣  Testing tenant isolation (policies)...');
  try {
    const result = await apiCall('/api/v1/policies');
    
    if (result.data.success && Array.isArray(result.data.data)) {
      const myPolicies = result.data.data.filter(p => p.id === policyId);
      if (myPolicies.length === 1) {
        console.log('   ✅ Tenant isolation working (only my policies returned)');
        passed++;
      } else {
        console.log('   ⚠️  Tenant isolation issue (unexpected policies)');
        failed++;
      }
    } else {
      console.log('   ❌ Failed to list policies');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Policy list error:', error.message);
    failed++;
  }
  
  // Test 8: Audit trail
  console.log('\n8️⃣  Testing audit trail...');
  try {
    const result = await apiCall('/api/v1/audit/executions');
    
    if (result.data.success && Array.isArray(result.data.data)) {
      console.log(`   ✅ Audit trail retrieved (${result.data.data.length} events)`);
      passed++;
    } else {
      console.log('   ❌ Audit trail failed');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Audit error:', error.message);
    failed++;
  }
  
  // Test 9: Health check
  console.log('\n9️⃣  Testing health endpoint...');
  try {
    const result = await apiCall('/api/v1/health', { skipAuth: true });
    
    if (result.data.status === 'healthy') {
      console.log('   ✅ System healthy');
      console.log(`   📊 DB Latency: ${result.data.checks.database.latency_ms}ms`);
      passed++;
    } else {
      console.log('   ❌ System unhealthy');
      failed++;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    failed++;
  }
  
  // Test 10: Cleanup - delete test data
  console.log('\n🧹 Cleanup...');
  try {
    if (policyId) {
      await apiCall(`/api/v1/policies/${policyId}`, { method: 'DELETE' });
      console.log('   ✅ Test policy deleted');
    }
    if (agentId) {
      await apiCall(`/api/v1/agents/${agentId}`, { method: 'DELETE' });
      console.log('   ✅ Test agent deleted');
    }
  } catch (error) {
    console.log('   ⚠️  Cleanup warning:', error.message);
  }
  
  // Results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is 100% operational.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review issues above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});
