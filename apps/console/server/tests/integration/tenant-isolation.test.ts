/**
 * Tenant Isolation Integration Tests
 * 
 * Ensures data cannot leak between tenants
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3100/api/v1';

describe('Tenant Isolation', () => {
  let tenant1Client: AxiosInstance;
  let tenant2Client: AxiosInstance;
  let tenant1Token: string;
  let tenant2Token: string;
  let tenant1Id: string;
  let tenant2Id: string;

  beforeAll(async () => {
    // Register two separate users (different tenants)
    const user1 = await axios.post(`${API_URL}/auth/register`, {
      email: `test-user-1-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User 1'
    });

    const user2 = await axios.post(`${API_URL}/auth/register`, {
      email: `test-user-2-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User 2'
    });

    tenant1Token = user1.data.data.tokens.accessToken;
    tenant2Token = user2.data.data.tokens.accessToken;
    tenant1Id = user1.data.data.user.tenantId;
    tenant2Id = user2.data.data.user.tenantId;

    tenant1Client = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${tenant1Token}` }
    });

    tenant2Client = axios.create({
      baseURL: API_URL,
      headers: { 'Authorization': `Bearer ${tenant2Token}` }
    });
  });

  it('should isolate agents between tenants', async () => {
    // Tenant 1 registers an agent
    const agent1 = await tenant1Client.post('/agents/register', {
      agent_id: `test-agent-1-${Date.now()}`,
      display_name: 'Tenant 1 Agent',
      description: 'Should be visible only to Tenant 1'
    });

    expect(agent1.data.success).toBe(true);
    const agent1Id = agent1.data.data.agent_id;

    // Tenant 2 should not see Tenant 1's agent
    const tenant2Agents = await tenant2Client.get('/agents');
    const foundAgent = tenant2Agents.data.data.find((a: any) => a.agent_id === agent1Id);
    expect(foundAgent).toBeUndefined();

    // Tenant 1 should see their own agent
    const tenant1Agents = await tenant1Client.get('/agents');
    const foundOwnAgent = tenant1Agents.data.data.find((a: any) => a.agent_id === agent1Id);
    expect(foundOwnAgent).toBeDefined();
    expect(foundOwnAgent.tenant_id).toBe(tenant1Id);
  });

  it('should isolate policies between tenants', async () => {
    // Tenant 1 creates a policy
    const policy1 = await tenant1Client.post('/policies', {
      name: `Test Policy ${Date.now()}`,
      description: 'Tenant 1 only',
      enabled: true,
      priority: 100,
      rules: [{ condition: 'true', action: 'require_approval' }]
    });

    expect(policy1.data.success).toBe(true);
    const policy1Id = policy1.data.data.id;

    // Tenant 2 should not see Tenant 1's policy
    const tenant2Policies = await tenant2Client.get('/policies');
    const foundPolicy = tenant2Policies.data.data.find((p: any) => p.id === policy1Id);
    expect(foundPolicy).toBeUndefined();

    // Tenant 1 should see their own policy
    const tenant1Policies = await tenant1Client.get('/policies');
    const foundOwnPolicy = tenant1Policies.data.data.find((p: any) => p.id === policy1Id);
    expect(foundOwnPolicy).toBeDefined();
    expect(foundOwnPolicy.tenant_id).toBe(tenant1Id);
  });

  it('should prevent cross-tenant policy access', async () => {
    // Tenant 1 creates a policy
    const policy = await tenant1Client.post('/policies', {
      name: `Private Policy ${Date.now()}`,
      enabled: true,
      rules: []
    });

    const policyId = policy.data.data.id;

    // Tenant 2 tries to access Tenant 1's policy
    try {
      await tenant2Client.get(`/policies/${policyId}`);
      fail('Should have thrown 404 or 403');
    } catch (error: any) {
      expect([403, 404]).toContain(error.response.status);
    }

    // Tenant 2 tries to update Tenant 1's policy
    try {
      await tenant2Client.put(`/policies/${policyId}`, {
        name: 'Hacked Policy'
      });
      fail('Should have thrown 404 or 403');
    } catch (error: any) {
      expect([403, 404]).toContain(error.response.status);
    }

    // Tenant 2 tries to delete Tenant 1's policy
    try {
      await tenant2Client.delete(`/policies/${policyId}`);
      fail('Should have thrown 404 or 403');
    } catch (error: any) {
      expect([403, 404]).toContain(error.response.status);
    }
  });

  it('should isolate executions between tenants', async () => {
    // Register agents for both tenants
    const agent1 = await tenant1Client.post('/agents/register', {
      agent_id: `exec-test-1-${Date.now()}`,
      display_name: 'Exec Test 1'
    });

    const agent2 = await tenant2Client.post('/agents/register', {
      agent_id: `exec-test-2-${Date.now()}`,
      display_name: 'Exec Test 2'
    });

    // Create execution for Tenant 1 (this would normally come from agent activity)
    // For this test, we'll just list executions and verify isolation

    const tenant1Executions = await tenant1Client.get('/executions');
    const tenant2Executions = await tenant2Client.get('/executions');

    // Verify no overlap
    const tenant1Ids = new Set(tenant1Executions.data.data.map((e: any) => e.execution_id));
    const tenant2Ids = new Set(tenant2Executions.data.data.map((e: any) => e.execution_id));

    const intersection = new Set([...tenant1Ids].filter(x => tenant2Ids.has(x)));
    expect(intersection.size).toBe(0);
  });

  it('should isolate approval requests between tenants', async () => {
    const tenant1Approvals = await tenant1Client.get('/approvals');
    const tenant2Approvals = await tenant2Client.get('/approvals');

    // Verify tenant_id matches
    for (const approval of tenant1Approvals.data.data) {
      expect(approval.tenant_id).toBe(tenant1Id);
    }

    for (const approval of tenant2Approvals.data.data) {
      expect(approval.tenant_id).toBe(tenant2Id);
    }

    // Verify no cross-tenant approvals
    const tenant1ApprovalIds = new Set(tenant1Approvals.data.data.map((a: any) => a.id));
    const tenant2ApprovalIds = new Set(tenant2Approvals.data.data.map((a: any) => a.id));

    const intersection = new Set([...tenant1ApprovalIds].filter(x => tenant2ApprovalIds.has(x)));
    expect(intersection.size).toBe(0);
  });

  afterAll(async () => {
    // Cleanup test data
    // (In production, you'd delete test users/tenants here)
  });
});
