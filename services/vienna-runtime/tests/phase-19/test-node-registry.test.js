/**
 * Phase 19 — Node Registry Tests
 * 
 * Test node registration, capability tracking, and health monitoring
 */

const NodeRegistry = require('../../lib/distributed/node-registry-memory');

describe('Phase 19 — Node Registry', () => {
  let registry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('Category A: Node Registration', () => {
    test('A1: Registers node with capabilities', () => {
      const node = {
        node_id: 'node-001',
        node_name: 'production-worker-1',
        capabilities: ['systemd', 'docker', 'postgres'],
        endpoint: 'https://node-001.local:8443'
      };

      const result = registry.registerNode(node);

      expect(result.registered).toBe(true);
      expect(result.node_id).toBe('node-001');
    });

    test('A2: Updates existing node registration', () => {
      registry.registerNode({
        node_id: 'node-001',
        capabilities: ['systemd']
      });

      const result = registry.registerNode({
        node_id: 'node-001',
        capabilities: ['systemd', 'docker']
      });

      expect(result.registered).toBe(true);
      const node = registry.getNode('node-001');
      expect(node.capabilities).toContain('docker');
    });

    test('A3: Rejects registration without required fields', () => {
      expect(() => {
        registry.registerNode({ node_id: 'node-001' });
      }).toThrow('Missing required field: capabilities');
    });

    test('A4: Assigns registration timestamp', () => {
      registry.registerNode({
        node_id: 'node-001',
        capabilities: ['systemd']
      });

      const node = registry.getNode('node-001');
      expect(node.registered_at).toBeTruthy();
      expect(new Date(node.registered_at)).toBeInstanceOf(Date);
    });

    test('A5: Tracks last heartbeat timestamp', () => {
      registry.registerNode({
        node_id: 'node-001',
        capabilities: ['systemd']
      });

      const node = registry.getNode('node-001');
      expect(node.last_heartbeat).toBeTruthy();
    });
  });

  describe('Category B: Capability Queries', () => {
    beforeEach(() => {
      registry.registerNode({ node_id: 'node-001', capabilities: ['systemd', 'docker'] });
      registry.registerNode({ node_id: 'node-002', capabilities: ['postgres', 'redis'] });
      registry.registerNode({ node_id: 'node-003', capabilities: ['systemd', 'postgres'] });
    });

    test('B1: Finds nodes by capability', () => {
      const nodes = registry.findNodesByCapability('systemd');

      expect(nodes.length).toBe(2);
      expect(nodes.map(n => n.node_id)).toContain('node-001');
      expect(nodes.map(n => n.node_id)).toContain('node-003');
    });

    test('B2: Returns empty array when no nodes have capability', () => {
      const nodes = registry.findNodesByCapability('kubernetes');

      expect(nodes).toEqual([]);
    });

    test('B3: Finds nodes with multiple capabilities', () => {
      const nodes = registry.findNodesByCapabilities(['systemd', 'postgres']);

      expect(nodes.length).toBe(1);
      expect(nodes[0].node_id).toBe('node-003');
    });

    test('B4: Lists all registered capabilities', () => {
      const capabilities = registry.listAllCapabilities();

      expect(capabilities).toContain('systemd');
      expect(capabilities).toContain('docker');
      expect(capabilities).toContain('postgres');
      expect(capabilities).toContain('redis');
      expect(capabilities.length).toBe(4);
    });

    test('B5: Returns capability counts', () => {
      const counts = registry.getCapabilityCounts();

      expect(counts.systemd).toBe(2);
      expect(counts.postgres).toBe(2);
      expect(counts.docker).toBe(1);
      expect(counts.redis).toBe(1);
    });
  });

  describe('Category C: Health Tracking', () => {
    beforeEach(() => {
      registry.registerNode({ node_id: 'node-001', capabilities: ['systemd'] });
    });

    test('C1: Updates heartbeat timestamp', () => {
      const initialHeartbeat = registry.getNode('node-001').last_heartbeat;

      // Wait 10ms
      setTimeout(() => {
        registry.updateHeartbeat('node-001');
        const updatedHeartbeat = registry.getNode('node-001').last_heartbeat;

        expect(new Date(updatedHeartbeat).getTime()).toBeGreaterThan(new Date(initialHeartbeat).getTime());
      }, 10);
    });

    test('C2: Marks node as healthy when heartbeat recent', () => {
      registry.updateHeartbeat('node-001');

      const node = registry.getNode('node-001');
      expect(node.health_status).toBe('healthy');
    });

    test('C3: Marks node as unhealthy when heartbeat stale', () => {
      const node = registry.getNode('node-001');
      // Manually set old heartbeat
      node.last_heartbeat = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago

      const status = registry.checkNodeHealth('node-001', { staleThresholdMs: 60000 });

      expect(status.health_status).toBe('unhealthy');
      expect(status.reason).toContain('heartbeat');
    });

    test('C4: Excludes unhealthy nodes from capability queries', () => {
      registry.registerNode({ node_id: 'node-002', capabilities: ['systemd'] });
      
      // Make node-001 unhealthy
      const node001 = registry.getNode('node-001');
      node001.last_heartbeat = new Date(Date.now() - 120000).toISOString();

      const nodes = registry.findNodesByCapability('systemd', { excludeUnhealthy: true });

      expect(nodes.length).toBe(1);
      expect(nodes[0].node_id).toBe('node-002');
    });

    test('C5: Tracks consecutive failed heartbeats', () => {
      registry.recordFailedHeartbeat('node-001');
      registry.recordFailedHeartbeat('node-001');

      const node = registry.getNode('node-001');
      expect(node.failed_heartbeats).toBe(2);
    });
  });

  describe('Category D: Load Information', () => {
    beforeEach(() => {
      registry.registerNode({ 
        node_id: 'node-001', 
        capabilities: ['systemd'],
        current_load: 0.5
      });
      registry.registerNode({ 
        node_id: 'node-002', 
        capabilities: ['systemd'],
        current_load: 0.2
      });
    });

    test('D1: Updates node load', () => {
      registry.updateLoad('node-001', 0.8);

      const node = registry.getNode('node-001');
      expect(node.current_load).toBe(0.8);
    });

    test('D2: Sorts nodes by load', () => {
      const nodes = registry.findNodesByCapability('systemd', { sortBy: 'load' });

      expect(nodes[0].node_id).toBe('node-002');
      expect(nodes[1].node_id).toBe('node-001');
    });

    test('D3: Excludes overloaded nodes', () => {
      registry.updateLoad('node-001', 0.95);

      const nodes = registry.findNodesByCapability('systemd', { maxLoad: 0.9 });

      expect(nodes.length).toBe(1);
      expect(nodes[0].node_id).toBe('node-002');
    });

    test('D4: Calculates average cluster load', () => {
      const avgLoad = registry.getAverageLoad();

      expect(avgLoad).toBe(0.35); // (0.5 + 0.2) / 2
    });

    test('D5: Identifies overloaded cluster', () => {
      registry.updateLoad('node-001', 0.95);
      registry.updateLoad('node-002', 0.9);

      const status = registry.getClusterStatus();

      expect(status.overloaded).toBe(true);
      expect(status.avg_load).toBeGreaterThan(0.9);
    });
  });

  describe('Category E: Deregistration', () => {
    beforeEach(() => {
      registry.registerNode({ node_id: 'node-001', capabilities: ['systemd'] });
      registry.registerNode({ node_id: 'node-002', capabilities: ['docker'] });
    });

    test('E1: Removes node from registry', () => {
      const result = registry.deregisterNode('node-001');

      expect(result.deregistered).toBe(true);
      expect(registry.getNode('node-001')).toBeNull();
    });

    test('E2: Returns null when deregistering nonexistent node', () => {
      const result = registry.deregisterNode('node-999');

      expect(result).toBeNull();
    });

    test('E3: Excluded from capability queries after deregistration', () => {
      registry.deregisterNode('node-001');

      const nodes = registry.findNodesByCapability('systemd');

      expect(nodes.length).toBe(0);
    });

    test('E4: Can re-register after deregistration', () => {
      registry.deregisterNode('node-001');
      const result = registry.registerNode({ node_id: 'node-001', capabilities: ['redis'] });

      expect(result.registered).toBe(true);
      
      const node = registry.getNode('node-001');
      expect(node.capabilities).toContain('redis');
      expect(node.capabilities).not.toContain('systemd');
    });

    test('E5: Tracks deregistration timestamp', () => {
      const result = registry.deregisterNode('node-001');

      expect(result.deregistered_at).toBeTruthy();
      expect(new Date(result.deregistered_at)).toBeInstanceOf(Date);
    });
  });
});
