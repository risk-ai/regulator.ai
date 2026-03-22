/**
 * Phase 20 — Federated Ledger Tests
 * 
 * Test unified audit trail across distributed nodes
 */

const FederatedLedger = require('../../lib/distributed/governance/federated-ledger-memory');

describe('Phase 20 — Federated Ledger', () => {
  let ledger;
  let mockLocalLedger;
  let mockNodeClient;

  beforeEach(() => {
    mockLocalLedger = {
      writeEvent: jest.fn(),
      queryEvents: jest.fn(),
      getEvent: jest.fn()
    };

    mockNodeClient = {
      fetchRemoteLedger: jest.fn(),
      streamLedgerUpdates: jest.fn()
    };

    ledger = new FederatedLedger(mockLocalLedger, mockNodeClient);
  });

  describe('Category A: Event Propagation', () => {
    test('A1: Writes event to local ledger', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-001' });

      const result = await ledger.recordEvent({
        event_type: 'execution_started',
        node_id: 'node-001',
        execution_id: 'exec-001'
      });

      expect(result.recorded).toBe(true);
      expect(mockLocalLedger.writeEvent).toHaveBeenCalled();
    });

    test('A2: Broadcasts event to peer nodes', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-001' });

      const result = await ledger.recordEvent({
        event_type: 'execution_completed',
        node_id: 'node-001'
      }, { broadcast: true, peers: ['node-002', 'node-003'] });

      expect(result.broadcasted).toBe(true);
      expect(result.peer_count).toBe(2);
    });

    test('A3: Handles broadcast failures gracefully', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-001' });
      mockNodeClient.fetchRemoteLedger.mockRejectedValue(new Error('Node unreachable'));

      const result = await ledger.recordEvent({
        event_type: 'execution_failed',
        node_id: 'node-001'
      }, { broadcast: true, peers: ['node-002'] });

      expect(result.recorded).toBe(true);
      expect(result.broadcast_failures).toBeTruthy();
    });

    test('A4: Deduplicates events across nodes', async () => {
      const event = {
        event_id: 'evt-001',
        event_type: 'execution_started',
        node_id: 'node-001'
      };

      mockLocalLedger.getEvent.mockResolvedValue(event);

      const result = await ledger.recordEvent(event);

      expect(result.duplicate).toBe(true);
      expect(mockLocalLedger.writeEvent).not.toHaveBeenCalled();
    });

    test('A5: Includes vector clock for ordering', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-001' });

      await ledger.recordEvent({
        event_type: 'execution_started',
        node_id: 'node-001'
      });

      expect(mockLocalLedger.writeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          vector_clock: expect.any(Object)
        })
      );
    });
  });

  describe('Category B: Cross-Node Queries', () => {
    test('B1: Queries local ledger first', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-001', node_id: 'node-001' }
      ]);

      const results = await ledger.queryEvents({
        event_type: 'execution_started'
      });

      expect(results.length).toBe(1);
      expect(mockLocalLedger.queryEvents).toHaveBeenCalled();
    });

    test('B2: Fetches from remote nodes when requested', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-001', node_id: 'node-001' }
      ]);

      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-002', node_id: 'node-002' }
      ]);

      const results = await ledger.queryEvents({
        event_type: 'execution_started'
      }, { includeRemote: true, remoteNodes: ['node-002'] });

      expect(results.length).toBe(2);
      expect(results.some(e => e.node_id === 'node-002')).toBe(true);
    });

    test('B3: Merges and deduplicates results', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-001', node_id: 'node-001' }
      ]);

      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-001', node_id: 'node-001' }, // Duplicate
        { event_id: 'evt-002', node_id: 'node-002' }
      ]);

      const results = await ledger.queryEvents({
        event_type: 'execution_started'
      }, { includeRemote: true, remoteNodes: ['node-002'] });

      expect(results.length).toBe(2);
      expect(results.filter(e => e.event_id === 'evt-001').length).toBe(1);
    });

    test('B4: Orders results by vector clock', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-002', vector_clock: { 'node-001': 2 }, timestamp: '2026-03-22T12:01:00Z' },
        { event_id: 'evt-001', vector_clock: { 'node-001': 1 }, timestamp: '2026-03-22T12:00:00Z' }
      ]);

      const results = await ledger.queryEvents({}, { orderBy: 'vector_clock' });

      expect(results[0].event_id).toBe('evt-001');
      expect(results[1].event_id).toBe('evt-002');
    });

    test('B5: Supports time-range queries across nodes', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([]);
      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-001', timestamp: '2026-03-22T12:00:00Z' }
      ]);

      const results = await ledger.queryEvents({
        after: '2026-03-22T11:00:00Z',
        before: '2026-03-22T13:00:00Z'
      }, { includeRemote: true, remoteNodes: ['node-002'] });

      expect(results.length).toBe(1);
    });
  });

  describe('Category C: Consistency Verification', () => {
    test('C1: Detects missing events on local node', async () => {
      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-001', node_id: 'node-002', sequence: 1 },
        { event_id: 'evt-002', node_id: 'node-002', sequence: 2 },
        { event_id: 'evt-003', node_id: 'node-002', sequence: 3 }
      ]);

      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-001', sequence: 1 },
        // evt-002 missing
        { event_id: 'evt-003', sequence: 3 }
      ]);

      const gaps = await ledger.detectConsistencyGaps('node-002');

      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0].missing_sequence).toBe(2);
    });

    test('C2: Reconciles missing events', async () => {
      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-002', sequence: 2 }
      ]);

      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-002' });

      const result = await ledger.reconcileEvents({
        missing: [{ event_id: 'evt-002', node_id: 'node-002' }]
      });

      expect(result.reconciled_count).toBe(1);
      expect(mockLocalLedger.writeEvent).toHaveBeenCalled();
    });

    test('C3: Verifies event integrity via hash chain', async () => {
      const events = [
        { event_id: 'evt-001', prev_hash: null, hash: 'hash1' },
        { event_id: 'evt-002', prev_hash: 'hash1', hash: 'hash2' },
        { event_id: 'evt-003', prev_hash: 'hash2', hash: 'hash3' }
      ];

      mockLocalLedger.queryEvents.mockResolvedValue(events);

      const validation = await ledger.validateEventChain();

      expect(validation.valid).toBe(true);
      expect(validation.chain_length).toBe(3);
    });

    test('C4: Detects chain corruption', async () => {
      const events = [
        { event_id: 'evt-001', prev_hash: null, hash: 'hash1' },
        { event_id: 'evt-002', prev_hash: 'hash1', hash: 'hash2' },
        { event_id: 'evt-003', prev_hash: 'WRONG', hash: 'hash3' } // Corrupted
      ];

      mockLocalLedger.queryEvents.mockResolvedValue(events);

      const validation = await ledger.validateEventChain();

      expect(validation.valid).toBe(false);
      expect(validation.corrupted_at).toBe('evt-003');
    });

    test('C5: Compares checksums across nodes', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'evt-001' },
        { event_id: 'evt-002' }
      ]);

      mockNodeClient.fetchRemoteLedger.mockResolvedValue([
        { event_id: 'evt-001' },
        { event_id: 'evt-002' }
      ]);

      const comparison = await ledger.compareWithNode('node-002');

      expect(comparison.consistent).toBe(true);
    });
  });

  describe('Category D: Tombstone Handling', () => {
    test('D1: Marks deleted events with tombstone', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'tomb-001' });

      const result = await ledger.deleteEvent('evt-001');

      expect(result.tombstoned).toBe(true);
      expect(mockLocalLedger.writeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'tombstone',
          deleted_event_id: 'evt-001'
        })
      );
    });

    test('D2: Propagates tombstones to peers', async () => {
      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'tomb-001' });

      const result = await ledger.deleteEvent('evt-001', {
        broadcast: true,
        peers: ['node-002']
      });

      expect(result.broadcasted).toBe(true);
    });

    test('D3: Filters tombstoned events from queries', async () => {
      // Use real ledger (no mock)
      const testLedger = new FederatedLedger();
      
      await testLedger.recordEvent({ event_id: 'evt-001', event_type: 'test', tombstoned: false });
      await testLedger.recordEvent({ event_id: 'evt-002', event_type: 'test', tombstoned: true });
      await testLedger.recordEvent({ event_id: 'evt-003', event_type: 'test', tombstoned: false });

      const results = await testLedger.queryEvents({}, { includeTombstoned: false });

      expect(results.length).toBe(2);
      expect(results.some(e => e.event_id === 'evt-002')).toBe(false);
    });

    test('D4: Supports tombstone compaction', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'tomb-001', event_type: 'tombstone', created_at: '2026-01-01T00:00:00Z' },
        { event_id: 'tomb-002', event_type: 'tombstone', created_at: '2026-01-02T00:00:00Z' }
      ]);

      const result = await ledger.compactTombstones({ olderThan: '2026-02-01T00:00:00Z' });

      expect(result.compacted_count).toBe(2);
    });

    test('D5: Preserves recent tombstones', async () => {
      mockLocalLedger.queryEvents.mockResolvedValue([
        { event_id: 'tomb-001', event_type: 'tombstone', created_at: new Date().toISOString() }
      ]);

      const result = await ledger.compactTombstones({ retentionDays: 30 });

      expect(result.compacted_count).toBe(0);
    });
  });

  describe('Category E: Real-Time Sync', () => {
    test('E1: Streams updates from remote nodes', async () => {
      const updates = [
        { event_id: 'evt-001', event_type: 'execution_started' },
        { event_id: 'evt-002', event_type: 'execution_completed' }
      ];

      mockNodeClient.streamLedgerUpdates.mockImplementation((nodeId, callback) => {
        updates.forEach(u => callback(u));
        return Promise.resolve();
      });

      const receivedUpdates = [];
      await ledger.syncWithNode('node-002', (update) => {
        receivedUpdates.push(update);
      });

      expect(receivedUpdates.length).toBe(2);
    });

    test('E2: Writes streamed events to local ledger', async () => {
      mockNodeClient.streamLedgerUpdates.mockImplementation((nodeId, callback) => {
        callback({ event_id: 'evt-001', event_type: 'execution_started' });
        return Promise.resolve();
      });

      mockLocalLedger.writeEvent.mockResolvedValue({ event_id: 'evt-001' });

      await ledger.syncWithNode('node-002');

      expect(mockLocalLedger.writeEvent).toHaveBeenCalled();
    });

    test('E3: Handles stream interruption', async () => {
      mockNodeClient.streamLedgerUpdates.mockRejectedValue(new Error('Connection lost'));

      const result = await ledger.syncWithNode('node-002');

      expect(result.sync_interrupted).toBe(true);
    });

    test('E4: Resumes from last synced position', async () => {
      ledger._setLastSyncedPosition('node-002', { sequence: 100 });

      mockNodeClient.streamLedgerUpdates.mockResolvedValue();

      await ledger.syncWithNode('node-002');

      expect(mockNodeClient.streamLedgerUpdates).toHaveBeenCalledWith(
        'node-002',
        expect.any(Function),
        expect.objectContaining({ fromSequence: 100 })
      );
    });

    test('E5: Provides sync progress updates', async () => {
      mockNodeClient.streamLedgerUpdates.mockImplementation((nodeId, callback, options) => {
        if (options.onProgress) {
          options.onProgress({ synced: 50, total: 100 });
        }
        return Promise.resolve();
      });

      let progressUpdate;
      await ledger.syncWithNode('node-002', null, {
        onProgress: (progress) => {
          progressUpdate = progress;
        }
      });

      expect(progressUpdate.synced).toBe(50);
      expect(progressUpdate.total).toBe(100);
    });
  });
});
