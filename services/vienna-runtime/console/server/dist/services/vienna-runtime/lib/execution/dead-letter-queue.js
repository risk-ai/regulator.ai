/**
 * Phase 7.4 Stage 3: Dead Letter Queue
 *
 * Purpose: Isolate permanently failed or operator-blocked envelopes from normal execution flow.
 *
 * Design:
 * - Durable JSONL storage
 * - In-memory index for fast lookup
 * - Explicit operator requeue/cancel required
 * - No automatic re-entry to execution
 */
const fs = require('fs').promises;
const path = require('path');
const { getRuntimePath, getArchiveDir, DLQ_CONFIG } = require('../core/runtime-config');
const DEFAULT_DLQ_FILE = getRuntimePath('dead-letter-queue.jsonl');
/**
 * Dead letter entry states
 */
const DLQState = {
    DEAD_LETTERED: 'dead_lettered',
    REQUEUED: 'requeued',
    CANCELLED: 'cancelled'
};
/**
 * Dead letter reasons
 */
const DLQReason = {
    PERMANENT_FAILURE: 'PERMANENT_FAILURE',
    RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
    OPERATOR_REJECTED: 'OPERATOR_REJECTED',
    INTEGRITY_BLOCKED: 'INTEGRITY_BLOCKED',
    EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT', // Phase 4A
    CRASH_RECOVERY_EXHAUSTED: 'CRASH_RECOVERY_EXHAUSTED' // Phase 6C
};
class DeadLetterQueue {
    constructor(options = {}) {
        this.dlqFile = options.dlqFile || DEFAULT_DLQ_FILE;
        this.entries = new Map(); // envelope_id → dlq_entry
        this.loaded = false;
    }
    /**
     * Initialize DLQ (load from disk)
     */
    async initialize() {
        if (this.loaded)
            return;
        try {
            await fs.mkdir(path.dirname(this.dlqFile), { recursive: true });
            const exists = await fs.access(this.dlqFile).then(() => true).catch(() => false);
            if (exists) {
                await this._loadFromDisk();
            }
            this.loaded = true;
        }
        catch (error) {
            console.error('Failed to initialize dead letter queue:', error);
            throw error;
        }
    }
    /**
     * Add envelope to dead letter queue
     *
     * @param {object} params - Dead letter params
     * @returns {Promise<object>} DLQ entry
     */
    async deadLetter(params) {
        const { envelope_id, envelope, objective_id, agent_id, reason, error, retry_count, last_state } = params;
        if (!envelope_id) {
            throw new Error('envelope_id required for dead letter');
        }
        if (!reason || !Object.values(DLQReason).includes(reason)) {
            throw new Error(`Invalid dead letter reason: ${reason}`);
        }
        const entry = {
            envelope_id,
            envelope: envelope || null,
            objective_id: objective_id || null,
            agent_id: agent_id || null,
            reason,
            error: error || null,
            retry_count: retry_count || 0,
            last_state: last_state || 'failed',
            dead_lettered_at: new Date().toISOString(),
            state: DLQState.DEAD_LETTERED,
            requeued_at: null,
            cancelled_at: null
        };
        // Store in memory
        this.entries.set(envelope_id, entry);
        // Persist to disk
        await this._appendToDisk(entry);
        return entry;
    }
    /**
     * Requeue dead-lettered envelope (operator action)
     *
     * @param {string} envelopeId - Envelope to requeue
     * @returns {Promise<object>} Updated entry and envelope
     */
    async requeue(envelopeId) {
        if (!this.entries.has(envelopeId)) {
            throw new Error(`Envelope ${envelopeId} not found in dead letter queue`);
        }
        const entry = this.entries.get(envelopeId);
        if (entry.state !== DLQState.DEAD_LETTERED) {
            throw new Error(`Envelope ${envelopeId} is not in dead_lettered state (current: ${entry.state})`);
        }
        // Update state
        entry.state = DLQState.REQUEUED;
        entry.requeued_at = new Date().toISOString();
        // Persist state change
        await this._appendToDisk({
            envelope_id: envelopeId,
            event_type: 'requeued',
            requeued_at: entry.requeued_at
        });
        return {
            entry,
            envelope: entry.envelope
        };
    }
    /**
     * Cancel dead-lettered envelope (operator action)
     *
     * Marks envelope as permanently cancelled.
     * Entry remains for audit history but no further execution allowed.
     *
     * @param {string} envelopeId - Envelope to cancel
     * @returns {Promise<object>} Updated entry
     */
    async cancel(envelopeId) {
        if (!this.entries.has(envelopeId)) {
            throw new Error(`Envelope ${envelopeId} not found in dead letter queue`);
        }
        const entry = this.entries.get(envelopeId);
        if (entry.state === DLQState.CANCELLED) {
            return entry; // Already cancelled
        }
        // Update state
        entry.state = DLQState.CANCELLED;
        entry.cancelled_at = new Date().toISOString();
        // Persist state change
        await this._appendToDisk({
            envelope_id: envelopeId,
            event_type: 'cancelled',
            cancelled_at: entry.cancelled_at
        });
        return entry;
    }
    /**
     * Get dead letter entries
     *
     * @param {object} filters - Optional filters
     * @returns {Array<object>} Matching entries
     */
    getEntries(filters = {}) {
        const { state, reason, agent_id, objective_id, limit = 100 } = filters;
        let results = Array.from(this.entries.values());
        if (state) {
            results = results.filter(e => e.state === state);
        }
        if (reason) {
            results = results.filter(e => e.reason === reason);
        }
        if (agent_id) {
            results = results.filter(e => e.agent_id === agent_id);
        }
        if (objective_id) {
            results = results.filter(e => e.objective_id === objective_id);
        }
        // Sort by most recent first
        results.sort((a, b) => {
            return new Date(b.dead_lettered_at) - new Date(a.dead_lettered_at);
        });
        return results.slice(0, limit);
    }
    /**
     * Get single entry
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {object|null} Entry or null
     */
    getEntry(envelopeId) {
        return this.entries.get(envelopeId) || null;
    }
    /**
     * Get statistics
     *
     * @returns {object} DLQ stats
     */
    getStats() {
        const entries = Array.from(this.entries.values());
        const byState = {};
        const byReason = {};
        for (const entry of entries) {
            byState[entry.state] = (byState[entry.state] || 0) + 1;
            byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
        }
        return {
            total: entries.length,
            by_state: byState,
            by_reason: byReason
        };
    }
    /**
     * Load entries from disk
     */
    async _loadFromDisk() {
        try {
            const content = await fs.readFile(this.dlqFile, 'utf8');
            const lines = content.trim().split('\n').filter(l => l);
            for (const line of lines) {
                const record = JSON.parse(line);
                // Handle event-type records (requeued, cancelled)
                if (record.event_type === 'requeued') {
                    const entry = this.entries.get(record.envelope_id);
                    if (entry) {
                        entry.state = DLQState.REQUEUED;
                        entry.requeued_at = record.requeued_at;
                    }
                }
                else if (record.event_type === 'cancelled') {
                    const entry = this.entries.get(record.envelope_id);
                    if (entry) {
                        entry.state = DLQState.CANCELLED;
                        entry.cancelled_at = record.cancelled_at;
                    }
                }
                else {
                    // Initial dead letter entry
                    this.entries.set(record.envelope_id, record);
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    /**
     * Append entry to disk
     */
    async _appendToDisk(entry) {
        try {
            await fs.appendFile(this.dlqFile, JSON.stringify(entry) + '\n', 'utf8');
        }
        catch (error) {
            console.error('Failed to append to dead letter queue:', error);
            throw error;
        }
    }
    /**
     * Clear completed entries (requeued or cancelled > 30 days old)
     *
     * For periodic maintenance.
     */
    async clearOld(daysOld = 30) {
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const toRemove = [];
        for (const [envelopeId, entry] of this.entries.entries()) {
            if (entry.state === DLQState.REQUEUED || entry.state === DLQState.CANCELLED) {
                const relevantDate = entry.requeued_at || entry.cancelled_at;
                if (new Date(relevantDate).getTime() < cutoff) {
                    toRemove.push(envelopeId);
                }
            }
        }
        for (const envelopeId of toRemove) {
            this.entries.delete(envelopeId);
        }
        // Optionally rewrite file to compact (not implemented for simplicity)
        return toRemove.length;
    }
}
module.exports = { DeadLetterQueue, DLQState, DLQReason };
//# sourceMappingURL=dead-letter-queue.js.map