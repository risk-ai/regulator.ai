/**
 * Vienna OS SDK Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViennaClient } from '../src/client';
import { ViennaError, AuthError } from '../src/errors';

describe('ViennaClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  describe('constructor', () => {
    it('should create a client with required config', () => {
      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
      });
      expect(client).toBeInstanceOf(ViennaClient);
    });

    it('should strip trailing slash from baseUrl', () => {
      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai/',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });

      // Should call without double slash
      client.getSystemStatus();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.regulator.ai/health',
        expect.any(Object)
      );
    });

    it('should accept optional apiKey and timeout', () => {
      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        apiKey: 'vos_test_key',
        timeout: 5000,
      });
      expect(client).toBeInstanceOf(ViennaClient);
    });
  });

  describe('submitIntent', () => {
    it('should submit an intent successfully', async () => {
      const responseData = {
        data: {
          pipeline: 'executed',
          warrant: { id: 'war_123', status: 'active' },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        apiKey: 'vos_test_key',
        fetch: mockFetch,
      });

      const result = await client.submitIntent({
        action: 'deploy',
        payload: { service: 'api-gateway', version: 'v2.0.0' },
      });

      expect(result.pipeline).toBe('executed');
      expect(result.warrant?.id).toBe('war_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://console.regulator.ai/api/v1/agent/intent',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer vos_test_key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle pending approval state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            pipeline: 'pending_approval',
            proposal: { id: 'prop_456', status: 'pending' },
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const result = await client.submitIntent({
        action: 'deploy',
        payload: { service: 'api-gateway' },
      });

      expect(result.pipeline).toBe('pending_approval');
      expect(result.proposal?.id).toBe('prop_456');
    });

    it('should handle simulation mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            pipeline: 'simulated',
            risk_tier: 'low',
            would_approve: true,
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const result = await client.submitIntent({
        action: 'deploy',
        payload: { service: 'api-gateway' },
        simulation: true,
      });

      expect(result.pipeline).toBe('simulated');
    });
  });

  describe('verifyWarrant', () => {
    it('should verify a warrant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            valid: true,
            warrant: { id: 'war_123', status: 'active' },
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const result = await client.verifyWarrant('war_123', 'sig_abc');
      expect(result.valid).toBe(true);
    });
  });

  describe('approveProposal', () => {
    it('should approve a proposal and return warrant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            warrant: { id: 'war_789', status: 'active' },
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'operator-1',
        fetch: mockFetch,
      });

      const result = await client.approveProposal('prop_456', {
        reviewer: 'operator-1',
        reason: 'Approved after review',
      });

      expect(result.warrant.id).toBe('war_789');
    });
  });

  describe('error handling', () => {
    it('should throw AuthError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        apiKey: 'invalid_key',
        fetch: mockFetch,
      });

      await expect(client.submitIntent({ action: 'deploy' })).rejects.toThrow(
        AuthError
      );
    });

    it('should throw ViennaError on non-401 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      await expect(client.submitIntent({ action: 'deploy' })).rejects.toThrow(
        ViennaError
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      await expect(client.submitIntent({ action: 'deploy' })).rejects.toThrow(
        ViennaError
      );
    });

    it('should timeout after configured duration', async () => {
      // Mock fetch that respects AbortSignal
      mockFetch.mockImplementationOnce((url: string, options: any) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ data: {} }),
            });
          }, 1000); // 1 second delay

          // Respect abort signal
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        timeout: 100, // 100ms timeout
        fetch: mockFetch,
      });

      await expect(client.submitIntent({ action: 'deploy' })).rejects.toThrow(
        'Request timed out'
      );
    }, 2000); // Test timeout: 2 seconds
  });

  describe('query methods', () => {
    it('should list agents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'agent_1', name: 'Agent Alpha' },
            { id: 'agent_2', name: 'Agent Beta' },
          ],
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const agents = await client.listAgents();
      expect(agents).toHaveLength(2);
    });

    it('should get audit trail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            entries: [
              { id: 'audit_1', action: 'deploy', timestamp: '2026-03-31T10:00:00Z' },
            ],
            total: 1,
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const audit = await client.getAuditTrail(50);
      expect(audit.entries).toHaveLength(1);
      expect(audit.total).toBe(1);
    });

    it('should get system status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            status: 'healthy',
            uptime: 123456,
            version: '0.10.0',
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const status = await client.getSystemStatus();
      expect(status.status).toBe('healthy');
    });
  });

  describe('simulate', () => {
    it('should run intent in simulation mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            pipeline: 'simulated',
            risk_tier: 'medium',
            would_approve: false,
          },
        }),
      });

      const client = new ViennaClient({
        baseUrl: 'https://console.regulator.ai',
        agentId: 'test-agent',
        fetch: mockFetch,
      });

      const result = await client.simulate({
        action: 'delete_data',
        payload: { table: 'users' },
      });

      expect(result.pipeline).toBe('simulated');
    });
  });
});
