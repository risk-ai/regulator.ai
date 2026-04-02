/**
 * Vienna Replay Log
 *
 * Append-only execution history for debugging, audit, and causal chain inspection.
 * Complete event stream for all envelope lifecycle events.
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getRuntimePath, getArchiveDir, REPLAY_LOG_CONFIG } = require('../core/runtime-config');
const DEFAULT_REPLAY_FILE = getRuntimePath('replay-log.jsonl');
/**
 * Event types tracked in replay log
 */
const EventType = {
    ENVELOPE_PROPOSED: 'envelope_proposed',
    ENVELOPE_QUEUED: 'envelope_queued',
    ENVELOPE_EXECUTING: 'envelope_executing',
    ENVELOPE_COMPLETED: 'envelope_completed',
    ENVELOPE_FAILED: 'envelope_failed',
    ENVELOPE_BLOCKED: 'envelope_blocked',
    RECURSION_REJECTED: 'recursion_rejected'
};
class ReplayLog {
    constructor(options = {}) {
        this.replayFile = options.replayFile || DEFAULT_REPLAY_FILE;
        this.initialized = false;
        this.rotationConfig = options.rotationConfig || REPLAY_LOG_CONFIG;
        this.lastSizeCheck = null;
        this.sizeCheckInterval = 60000; // Check every 60s
    }
    /**
     * Initialize replay log
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            await fs.mkdir(path.dirname(this.replayFile), { recursive: true });
            await this._checkAndRotate();
            this.initialized = true;
        }
        catch (error) {
            console.error('Failed to initialize replay log:', error);
            throw error;
        }
    }
    /**
     * Check log size and rotate if needed
     */
    async _checkAndRotate() {
        if (!this.rotationConfig.rotationEnabled)
            return;
        const now = Date.now();
        if (this.lastSizeCheck && (now - this.lastSizeCheck) < this.sizeCheckInterval) {
            return;
        }
        this.lastSizeCheck = now;
        try {
            const stats = await fs.stat(this.replayFile).catch(() => null);
            if (!stats)
                return; // File doesn't exist yet
            if (stats.size > this.rotationConfig.maxSizeBytes) {
                await this._rotate();
            }
        }
        catch (error) {
            console.warn('[ReplayLog] Rotation check failed:', error.message);
        }
    }
    /**
     * Rotate log file
     */
    async _rotate() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveDir = getArchiveDir();
        const rotatedFile = path.join(archiveDir, `replay-log-${timestamp}.jsonl`);
        try {
            await fs.mkdir(archiveDir, { recursive: true });
            await fs.rename(this.replayFile, rotatedFile);
            console.log(`[ReplayLog] Rotated to ${rotatedFile}`);
            // Prune old rotated files
            await this._pruneOldFiles();
        }
        catch (error) {
            console.error('[ReplayLog] Rotation failed:', error);
            throw error;
        }
    }
    /**
     * Prune old rotated files beyond maxFiles limit
     */
    async _pruneOldFiles() {
        try {
            const archiveDir = getArchiveDir();
            const files = await fs.readdir(archiveDir);
            const replayFiles = files
                .filter(f => f.startsWith('replay-log-') && f.endsWith('.jsonl'))
                .map(f => path.join(archiveDir, f));
            if (replayFiles.length <= this.rotationConfig.maxFiles)
                return;
            // Get file stats with timestamps
            const fileStats = await Promise.all(replayFiles.map(async (file) => {
                const stats = await fs.stat(file);
                return { file, mtime: stats.mtime };
            }));
            // Sort by modification time (oldest first)
            fileStats.sort((a, b) => a.mtime - b.mtime);
            // Delete oldest files beyond limit
            const toDelete = fileStats.slice(0, fileStats.length - this.rotationConfig.maxFiles);
            for (const { file } of toDelete) {
                await fs.unlink(file);
                console.log(`[ReplayLog] Pruned old file: ${path.basename(file)}`);
            }
        }
        catch (error) {
            console.warn('[ReplayLog] Pruning failed:', error.message);
        }
    }
    /**
     * Emit event to replay log
     *
     * @param {object} event - Event data
     */
    async emit(event) {
        if (!this.initialized) {
            await this.initialize();
        }
        // Check for rotation periodically
        await this._checkAndRotate();
        const logEntry = {
            event_id: this._generateEventId(),
            timestamp: new Date().toISOString(),
            ...event
        };
        const line = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(this.replayFile, line);
    }
    /**
     * Query replay log with streaming support for large files
     *
     * CRITICAL: This method avoids loading entire file into memory.
     * For large files, uses pagination with offset/limit or reads last N lines.
     *
     * @param {object} filters - Query filters
     * @returns {Promise<object>} {events, total, has_more, offset}
     */
    async query(filters = {}) {
        if (!this.initialized) {
            await this.initialize();
        }
        const { objective_id, trigger_id, envelope_id, event_type, causal_depth_gte, time_range, offset = 0, limit = 50 } = filters;
        try {
            // Get file stats to determine approach
            const stats = await fs.stat(this.replayFile).catch(() => null);
            if (!stats) {
                return { events: [], total: 0, has_more: false, offset: 0 };
            }
            // For small files (<100MB), load into memory
            // For large files (>100MB), use line-based streaming
            const sizeThreshold = 100 * 1024 * 1024; // 100MB
            const shouldStream = stats.size > sizeThreshold;
            if (shouldStream) {
                return await this._queryStreaming(filters, offset, limit);
            }
            else {
                return await this._queryInMemory(filters, offset, limit);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { events: [], total: 0, has_more: false, offset: 0 };
            }
            throw error;
        }
    }
    /**
     * Query small files entirely in memory
     */
    async _queryInMemory(filters = {}, offset = 0, limit = 50) {
        const { objective_id, trigger_id, envelope_id, event_type, causal_depth_gte, time_range } = filters;
        try {
            const content = await fs.readFile(this.replayFile, 'utf8');
            const lines = content.trim().split('\n').filter(l => l);
            let events = [];
            for (const line of lines) {
                try {
                    const event = JSON.parse(line);
                    events.push(event);
                }
                catch (error) {
                    console.warn('Skipping invalid replay log entry:', line);
                }
            }
            // Apply filters
            if (objective_id) {
                events = events.filter(e => e.objective_id === objective_id);
            }
            if (trigger_id) {
                events = events.filter(e => e.trigger_id === trigger_id);
            }
            if (envelope_id) {
                if (envelope_id.endsWith('*')) {
                    const prefix = envelope_id.slice(0, -1);
                    events = events.filter(e => e.envelope_id?.startsWith(prefix));
                }
                else {
                    events = events.filter(e => e.envelope_id === envelope_id);
                }
            }
            if (event_type) {
                events = events.filter(e => e.event_type === event_type);
            }
            if (causal_depth_gte !== undefined) {
                events = events.filter(e => e.causal_depth !== undefined && e.causal_depth >= causal_depth_gte);
            }
            if (time_range) {
                const [start, end] = time_range;
                events = events.filter(e => {
                    const timestamp = new Date(e.timestamp);
                    return timestamp >= start && timestamp <= end;
                });
            }
            const total = events.length;
            const paginatedEvents = events.slice(offset, offset + limit);
            const has_more = offset + limit < total;
            return {
                events: paginatedEvents,
                total,
                has_more,
                offset
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { events: [], total: 0, has_more: false, offset: 0 };
            }
            throw error;
        }
    }
    /**
     * Query large files using streaming to avoid memory spike
     *
     * For large files: reads sequentially, filters, counts total, then
     * returns paginated slice without loading entire file into memory.
     */
    async _queryStreaming(filters = {}, offset = 0, limit = 50) {
        const { objective_id, trigger_id, envelope_id, event_type, causal_depth_gte, time_range } = filters;
        const readline = require('readline');
        const stream = require('stream');
        try {
            const fileStream = fs.createReadStream(this.replayFile, { encoding: 'utf8' });
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            let events = [];
            let total = 0;
            let skipped = 0;
            for await (const line of rl) {
                if (!line.trim())
                    continue;
                try {
                    const event = JSON.parse(line);
                    total++;
                    // Apply filters
                    let matches = true;
                    if (objective_id && event.objective_id !== objective_id)
                        matches = false;
                    if (trigger_id && event.trigger_id !== trigger_id)
                        matches = false;
                    if (envelope_id) {
                        if (envelope_id.endsWith('*')) {
                            const prefix = envelope_id.slice(0, -1);
                            if (!event.envelope_id?.startsWith(prefix))
                                matches = false;
                        }
                        else {
                            if (event.envelope_id !== envelope_id)
                                matches = false;
                        }
                    }
                    if (event_type && event.event_type !== event_type)
                        matches = false;
                    if (causal_depth_gte !== undefined &&
                        (event.causal_depth === undefined || event.causal_depth < causal_depth_gte)) {
                        matches = false;
                    }
                    if (time_range) {
                        const [start, end] = time_range;
                        const timestamp = new Date(event.timestamp);
                        if (timestamp < start || timestamp > end)
                            matches = false;
                    }
                    if (matches) {
                        // Collect events within pagination window
                        if (skipped >= offset && events.length < limit) {
                            events.push(event);
                        }
                        skipped++;
                    }
                }
                catch (error) {
                    console.warn('Skipping invalid replay log entry:', line);
                }
            }
            const has_more = skipped < total && events.length >= limit;
            return {
                events,
                total: skipped, // Total matching events (not all file lines)
                has_more,
                offset
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { events: [], total: 0, has_more: false, offset: 0 };
            }
            throw error;
        }
    }
    /**
     * Get causal chain for envelope
     *
     * Returns ancestry tree by following parent_envelope_id.
     *
     * @param {string} envelopeId - Envelope to trace
     * @returns {Promise<array>} Chain of events
     */
    async getCausalChain(envelopeId) {
        const result = await this.query({ envelope_id: envelopeId, limit: 10000 });
        const events = result.events;
        if (events.length === 0) {
            return [];
        }
        // Find envelope_proposed or envelope_queued event to get parent info
        const proposalEvent = events.find(e => e.event_type === EventType.ENVELOPE_PROPOSED ||
            e.event_type === EventType.ENVELOPE_QUEUED);
        if (!proposalEvent || !proposalEvent.parent_envelope_id) {
            // Root envelope
            return events;
        }
        // Recursively get parent chain
        const parentChain = await this.getCausalChain(proposalEvent.parent_envelope_id);
        // Return parent chain + current events
        return [...parentChain, ...events];
    }
    /**
     * Get all events for objective
     *
     * @param {string} objectiveId - Objective identifier
     * @returns {Promise<array>} All events
     */
    async getObjectiveEvents(objectiveId) {
        const result = await this.query({ objective_id: objectiveId, limit: 10000 });
        return result.events;
    }
    /**
     * Get execution metrics
     *
     * @param {object} options - Metric options
     * @returns {Promise<object>} Metrics summary
     */
    async getMetrics(options = {}) {
        const { time_range, trigger_id } = options;
        const filters = { limit: 10000 }; // Get all matching events for metrics
        if (time_range)
            filters.time_range = time_range;
        if (trigger_id)
            filters.trigger_id = trigger_id;
        const result = await this.query(filters);
        const events = result.events;
        const completed = events.filter(e => e.event_type === EventType.ENVELOPE_COMPLETED);
        const failed = events.filter(e => e.event_type === EventType.ENVELOPE_FAILED);
        const blocked = events.filter(e => e.event_type === EventType.ENVELOPE_BLOCKED);
        const recursion_rejected = events.filter(e => e.event_type === EventType.RECURSION_REJECTED);
        // Compute latency for completed envelopes
        const latencies = [];
        for (const completedEvent of completed) {
            const queuedEvent = events.find(e => e.envelope_id === completedEvent.envelope_id &&
                e.event_type === EventType.ENVELOPE_QUEUED);
            if (queuedEvent) {
                const queuedTime = new Date(queuedEvent.timestamp);
                const completedTime = new Date(completedEvent.timestamp);
                const latency = completedTime - queuedTime;
                latencies.push(latency);
            }
        }
        const avgLatency = latencies.length > 0
            ? latencies.reduce((a, b) => a + b, 0) / latencies.length
            : 0;
        return {
            total_events: events.length,
            completed_count: completed.length,
            failed_count: failed.length,
            blocked_count: blocked.length,
            recursion_rejected_count: recursion_rejected.length,
            avg_latency_ms: Math.round(avgLatency),
            failure_rate: completed.length > 0
                ? failed.length / (completed.length + failed.length)
                : 0
        };
    }
    /**
     * Generate event ID
     */
    _generateEventId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `evt_${timestamp}_${random}`;
    }
}
module.exports = { ReplayLog, EventType };
//# sourceMappingURL=replay-log.js.map