/**
 * Audit Event Emitter
 * 
 * Emits structured audit events via adapter.
 * Phase 6.10: Also appends to audit log storage.
 */

class Audit {
  constructor(adapter, auditLog = null) {
    this.adapter = adapter;
    this.auditLog = auditLog; // Phase 6.10: In-memory audit storage
  }
  
  /**
   * Set audit log storage (for late binding during Vienna Core init)
   * 
   * @param {object} auditLog - AuditLog instance
   */
  setAuditLog(auditLog) {
    this.auditLog = auditLog;
  }
  
  /**
   * Emit audit event
   * 
   * @param {object} event - Event object (or event type string)
   * @param {object} payload - Event payload (if event is string)
   */
  async emit(event, payload = null) {
    // Support both emit(eventObj) and emit(eventType, payload) signatures
    let eventData;
    if (typeof event === 'string') {
      // emit('shell_command.proposed', { ... })
      eventData = {
        action: event,
        ...payload,
      };
    } else {
      // emit({ action: '...', ... })
      eventData = event;
    }
    
    const enriched = {
      ...eventData,
      timestamp: eventData.timestamp || new Date().toISOString(),
      emitted_by: 'vienna-core'
    };
    
    // Emit via adapter (external audit trail)
    await this.adapter.emitAudit(enriched);
    
    // Phase 6.10: Also append to in-memory audit log
    if (this.auditLog) {
      try {
        this.auditLog.append(enriched);
      } catch (err) {
        console.error('[Audit] Failed to append to audit log:', err);
        // Don't fail the entire emit if audit log append fails
      }
    }
  }
  
  /**
   * Emit warrant issued event
   */
  async warrantIssued(warrant) {
    await this.emit({
      event_type: 'warrant_issued',
      warrant_id: warrant.warrant_id,
      change_id: warrant.change_id,
      risk_tier: warrant.risk_tier,
      issued_at: warrant.issued_at
    });
  }
  
  /**
   * Emit warrant invalidated event
   */
  async warrantInvalidated(warrant, reason) {
    await this.emit({
      event_type: 'warrant_invalidated',
      warrant_id: warrant.warrant_id,
      reason,
      invalidated_at: warrant.invalidated_at
    });
  }
  
  /**
   * Emit warrant verified event
   */
  async warrantVerified(warrantId, valid, reason = null) {
    await this.emit({
      event_type: 'warrant_verified',
      warrant_id: warrantId,
      valid,
      reason
    });
  }
}

module.exports = Audit;
