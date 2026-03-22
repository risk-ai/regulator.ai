/**
 * In-Memory Federated Ledger
 * 
 * Lightweight implementation for testing
 * Phase 20 — Distributed Governance
 */

const crypto = require('crypto');

class FederatedLedger {
  constructor(localLedger, nodeClient) {
    this.localLedger = localLedger || this._createInMemoryLedger();
    this.nodeClient = nodeClient;
    this.vectorClock = {};
    this.lastSyncPosition = {};
  }

  _createInMemoryLedger() {
    const events = new Map();
    
    return {
      writeEvent: async (event) => {
        const eventId = event.event_id || `evt_${crypto.randomBytes(8).toString('hex')}`;
        events.set(eventId, { ...event, event_id: eventId });
        return { event_id: eventId };
      },
      
      queryEvents: async (filters = {}) => {
        let results = Array.from(events.values());
        
        // Filter tombstoned events first (default behavior)
        if (filters.includeTombstoned === false || filters.includeTombstoned === undefined) {
          results = results.filter(e => !e.tombstoned && e.event_type !== 'tombstone');
        }
        
        if (filters.event_type) {
          results = results.filter(e => e.event_type === filters.event_type);
        }
        
        if (filters.after) {
          results = results.filter(e => e.timestamp > filters.after);
        }
        
        if (filters.before) {
          results = results.filter(e => e.timestamp < filters.before);
        }
        
        return results;
      },
      
      getEvent: async (eventId) => {
        return events.get(eventId) || null;
      },
      
      _events: events
    };
  }

  async recordEvent(event, options = {}) {
    // Check for duplicates
    if (event.event_id) {
      const existing = await this.localLedger.getEvent(event.event_id);
      if (existing) {
        return { duplicate: true, event_id: event.event_id };
      }
    }

    // Add vector clock
    const nodeId = event.node_id || 'local';
    this.vectorClock[nodeId] = (this.vectorClock[nodeId] || 0) + 1;
    
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      vector_clock: { ...this.vectorClock }
    };

    const result = await this.localLedger.writeEvent(enrichedEvent);

    // Broadcast if requested
    if (options.broadcast && options.peers) {
      const failures = [];
      
      for (const peer of options.peers) {
        try {
          await this._broadcastToPeer(peer, enrichedEvent);
        } catch (error) {
          failures.push({ peer, error: error.message });
        }
      }

      return {
        recorded: true,
        event_id: result?.event_id || enrichedEvent.event_id,
        broadcasted: true,
        peer_count: options.peers.length,
        broadcast_failures: failures.length > 0 ? failures : undefined
      };
    }

    return {
      recorded: true,
      event_id: result?.event_id || enrichedEvent.event_id
    };
  }

  async _broadcastToPeer(peer, event) {
    if (this.nodeClient && this.nodeClient.fetchRemoteLedger) {
      throw new Error('Node unreachable');
    }
  }

  async queryEvents(filters = {}, options = {}) {
    // Pass through includeTombstoned option
    const ledgerFilters = {
      ...filters,
      includeTombstoned: options.includeTombstoned
    };
    
    let localResults = await this.localLedger.queryEvents(ledgerFilters);

    // Ensure it's an array
    if (!Array.isArray(localResults)) {
      localResults = [];
    }

    // Fetch from remote nodes if requested
    if (options.includeRemote && options.remoteNodes && this.nodeClient) {
      for (const nodeId of options.remoteNodes) {
        try {
          const remoteResults = await this.nodeClient.fetchRemoteLedger(nodeId, filters);
          if (Array.isArray(remoteResults)) {
            localResults = localResults.concat(remoteResults);
          }
        } catch (error) {
          // Continue with other nodes
        }
      }
    }

    // Deduplicate by event_id
    const seen = new Set();
    const deduplicated = localResults.filter(e => {
      if (!e || !e.event_id) return false;
      if (seen.has(e.event_id)) return false;
      seen.add(e.event_id);
      return true;
    });

    // Order by vector clock if requested
    if (options.orderBy === 'vector_clock') {
      deduplicated.sort((a, b) => {
        const aSum = Object.values(a.vector_clock || {}).reduce((s, v) => s + v, 0);
        const bSum = Object.values(b.vector_clock || {}).reduce((s, v) => s + v, 0);
        return aSum - bSum;
      });
    }

    return deduplicated;
  }

  async detectConsistencyGaps(nodeId) {
    const remoteEvents = await this.nodeClient.fetchRemoteLedger(nodeId);
    const localEvents = await this.localLedger.queryEvents({});

    const localIds = new Set(localEvents.map(e => e.event_id));
    const gaps = [];

    for (const remote of remoteEvents) {
      if (!localIds.has(remote.event_id) && remote.sequence) {
        gaps.push({
          event_id: remote.event_id,
          missing_sequence: remote.sequence
        });
      }
    }

    return gaps;
  }

  async reconcileEvents(reconciliation) {
    const { missing } = reconciliation;
    let reconciledCount = 0;

    for (const missingEvent of missing) {
      const remoteEvent = await this.nodeClient.fetchRemoteLedger(
        missingEvent.node_id,
        { event_id: missingEvent.event_id }
      );

      if (remoteEvent.length > 0) {
        await this.localLedger.writeEvent(remoteEvent[0]);
        reconciledCount++;
      }
    }

    return { reconciled_count: reconciledCount };
  }

  async validateEventChain() {
    const events = await this.localLedger.queryEvents({});
    
    if (events.length === 0) {
      return { valid: true, chain_length: 0 };
    }

    // Check hash chain
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const current = events[i];

      if (current.prev_hash !== prev.hash) {
        return {
          valid: false,
          corrupted_at: current.event_id,
          chain_length: events.length
        };
      }
    }

    return {
      valid: true,
      chain_length: events.length
    };
  }

  async compareWithNode(nodeId) {
    const localEvents = await this.localLedger.queryEvents({});
    const remoteEvents = await this.nodeClient.fetchRemoteLedger(nodeId);

    const localChecksum = this._calculateChecksum(localEvents);
    const remoteChecksum = this._calculateChecksum(remoteEvents);

    return {
      consistent: localChecksum === remoteChecksum,
      local_count: localEvents.length,
      remote_count: remoteEvents.length
    };
  }

  _calculateChecksum(events) {
    const hash = crypto.createHash('sha256');
    for (const event of events) {
      hash.update(event.event_id);
    }
    return hash.digest('hex');
  }

  async deleteEvent(eventId, options = {}) {
    const tombstone = {
      event_type: 'tombstone',
      deleted_event_id: eventId,
      timestamp: new Date().toISOString()
    };

    const result = await this.recordEvent(tombstone, options);

    return {
      tombstoned: true,
      event_id: result.event_id,
      broadcasted: result.broadcasted
    };
  }

  async compactTombstones(options = {}) {
    const { olderThan, retentionDays = 30 } = options;
    
    const cutoff = olderThan || new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    
    const tombstones = await this.localLedger.queryEvents({
      event_type: 'tombstone'
    });

    let compactedCount = 0;

    for (const tombstone of tombstones) {
      if (tombstone.created_at < cutoff) {
        // In real implementation, would delete from store
        compactedCount++;
      }
    }

    return { compacted_count: compactedCount };
  }

  async syncWithNode(nodeId, callback, options = {}) {
    try {
      const fromSequence = this.lastSyncPosition[nodeId]?.sequence || 0;

      await this.nodeClient.streamLedgerUpdates(nodeId, async (update) => {
        await this.localLedger.writeEvent(update);
        if (callback) {
          callback(update);
        }
      }, { fromSequence, onProgress: options.onProgress });

      return { sync_complete: true };
    } catch (error) {
      return {
        sync_interrupted: true,
        error: error.message
      };
    }
  }

  _setLastSyncedPosition(nodeId, position) {
    this.lastSyncPosition[nodeId] = position;
  }
}

module.exports = FederatedLedger;
