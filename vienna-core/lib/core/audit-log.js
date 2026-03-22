/**
 * Audit Log Storage
 * 
 * Phase 6.10: Audit Trail UI
 * 
 * Bounded in-memory audit event storage with query capabilities.
 * All runtime executions emit audit events for operator visibility.
 * 
 * Design:
 * - Ring buffer for bounded memory footprint
 * - Fast query by type, status, time range
 * - Structured events with consistent schema
 * - Integration with shell executor, recovery copilot, warrant system
 * 
 * Event Types:
 * - command_proposed
 * - command_approved
 * - command_executed
 * - command_failed
 * - warrant_issued
 * - warrant_verified
 * - warrant_invalidated
 * - recovery_action_proposed
 * - recovery_action_executed
 * - workflow_started
 * - workflow_step_completed
 * - workflow_failed
 */

class AuditLog {
  constructor(options = {}) {
    this.maxEvents = options.maxEvents || 10000; // Ring buffer size
    this.events = []; // Ring buffer (append-only, FIFO when full)
    this.eventIndex = new Map(); // Fast lookup by ID
    this.initialized = true;
    
    console.log('[AuditLog] Initialized', { maxEvents: this.maxEvents });
  }
  
  /**
   * Append audit event
   * 
   * @param {object} event - Audit event
   * @returns {string} Event ID
   */
  append(event) {
    // Generate event ID if not provided
    const eventId = event.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enrich event
    const enriched = {
      ...event,
      id: eventId,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    
    // Validate required fields
    if (!enriched.action) {
      throw new Error('Audit event missing required field: action');
    }
    
    // Ring buffer: Remove oldest if at capacity
    if (this.events.length >= this.maxEvents) {
      const oldest = this.events.shift();
      this.eventIndex.delete(oldest.id);
    }
    
    // Append event
    this.events.push(enriched);
    this.eventIndex.set(eventId, enriched);
    
    return eventId;
  }
  
  /**
   * Query audit events
   * 
   * @param {object} params - Query parameters
   * @param {string} params.action - Filter by action type
   * @param {string} params.operator - Filter by operator
   * @param {string} params.result - Filter by result (success|failed|pending)
   * @param {string} params.envelope_id - Filter by envelope ID
   * @param {string} params.objective_id - Filter by objective ID
   * @param {string} params.thread_id - Filter by thread ID
   * @param {string} params.start - Start timestamp (ISO)
   * @param {string} params.end - End timestamp (ISO)
   * @param {number} params.limit - Max results (default 50)
   * @param {number} params.offset - Offset for pagination (default 0)
   * @returns {object} Query result
   */
  query(params = {}) {
    let filtered = [...this.events]; // Copy for filtering
    
    // Filter by action
    if (params.action) {
      filtered = filtered.filter(e => e.action === params.action);
    }
    
    // Filter by operator
    if (params.operator) {
      filtered = filtered.filter(e => e.operator === params.operator);
    }
    
    // Filter by result
    if (params.result) {
      filtered = filtered.filter(e => e.result === params.result);
    }
    
    // Filter by envelope_id
    if (params.envelope_id) {
      filtered = filtered.filter(e => e.envelope_id === params.envelope_id);
    }
    
    // Filter by objective_id
    if (params.objective_id) {
      filtered = filtered.filter(e => e.objective_id === params.objective_id);
    }
    
    // Filter by thread_id
    if (params.thread_id) {
      filtered = filtered.filter(e => e.thread_id === params.thread_id);
    }
    
    // Filter by time range
    if (params.start) {
      const startTime = new Date(params.start).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= startTime);
    }
    
    if (params.end) {
      const endTime = new Date(params.end).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= endTime);
    }
    
    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);
    
    return {
      records: paged,
      total,
      has_more: offset + paged.length < total,
    };
  }
  
  /**
   * Get specific audit record by ID
   * 
   * @param {string} id - Event ID
   * @returns {object|null} Audit record
   */
  get(id) {
    return this.eventIndex.get(id) || null;
  }
  
  /**
   * Get recent audit events
   * 
   * @param {number} limit - Max results (default 50)
   * @returns {Array} Recent events
   */
  getRecent(limit = 50) {
    // Return most recent events
    return this.events.slice(-limit).reverse();
  }
  
  /**
   * Get stats
   * 
   * @returns {object} Stats
   */
  getStats() {
    // Group by action type
    const byAction = {};
    for (const event of this.events) {
      byAction[event.action] = (byAction[event.action] || 0) + 1;
    }
    
    // Group by result
    const byResult = {};
    for (const event of this.events) {
      if (event.result) {
        byResult[event.result] = (byResult[event.result] || 0) + 1;
      }
    }
    
    // Get time range
    const timestamps = this.events.map(e => new Date(e.timestamp).getTime());
    const oldestTime = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTime = timestamps.length > 0 ? Math.max(...timestamps) : null;
    
    return {
      record_count: this.events.length,
      max_capacity: this.maxEvents,
      utilization: this.events.length / this.maxEvents,
      by_action: byAction,
      by_result: byResult,
      oldest_event: oldestTime ? new Date(oldestTime).toISOString() : null,
      newest_event: newestTime ? new Date(newestTime).toISOString() : null,
    };
  }
  
  /**
   * Clear all events (operator command only)
   */
  clear() {
    this.events = [];
    this.eventIndex.clear();
    console.log('[AuditLog] Cleared all events');
  }
}

module.exports = { AuditLog };
