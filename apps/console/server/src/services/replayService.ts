/**
 * Replay Service
 * 
 * Dedicated service boundary for replay and audit operations.
 * 
 * Responsibilities:
 * - Query replay events from Vienna Core / replay log
 * - Query audit records from Vienna Core / audit store
 * - Normalize event shapes for UI
 * - Support filtering by objectiveId, envelopeId, threadId, auditRef
 * 
 * Does NOT compose replay logic inside routes.
 */

import type {
  ReplayEvent,
  ReplayQueryParams,
  AuditRecord,
  AuditQueryParams,
} from '../types/api.js';

export class ReplayService {
  private viennaCore: any; // Vienna Core instance

  constructor(viennaCore: any) {
    this.viennaCore = viennaCore;
  }

  // ==========================================================================
  // Replay Operations
  // ==========================================================================

  async queryReplay(params: ReplayQueryParams): Promise<{
    events: ReplayEvent[];
    total: number;
    has_more: boolean;
  }> {
    try {
      // Try to get replay from Vienna Core
      if (this.viennaCore.replay && typeof this.viennaCore.replay.query === 'function') {
        const result = await this.viennaCore.replay.query(params);
        return this.normalizeReplayResult(result, params);
      }
      
      // Fallback: check for replay log file
      if (this.viennaCore.replayLog && typeof this.viennaCore.replayLog.query === 'function') {
        const result = await this.viennaCore.replayLog.query(params);
        return this.normalizeReplayResult(result, params);
      }
      
      // No replay infrastructure available yet - return empty with honest status
      return {
        events: [],
        total: 0,
        has_more: false,
      };
    } catch (error) {
      console.error('Failed to query replay:', error);
      // Return empty rather than throwing - graceful degradation
      return {
        events: [],
        total: 0,
        has_more: false,
      };
    }
  }

  async getReplayEvent(eventId: string): Promise<ReplayEvent | null> {
    try {
      // Try to get specific event from Vienna Core
      if (this.viennaCore.replay && typeof this.viennaCore.replay.get === 'function') {
        const event = await this.viennaCore.replay.get(eventId);
        return event ? this.normalizeReplayEvent(event) : null;
      }
      
      // Fallback: query with filter
      const result = await this.queryReplay({ limit: 1 });
      const found = result.events.find(e => e.event_id === eventId);
      return found || null;
    } catch (error) {
      console.error(`Failed to get replay event ${eventId}:`, error);
      return null;
    }
  }

  async getEnvelopeReplay(envelopeId: string): Promise<ReplayEvent[]> {
    try {
      const result = await this.queryReplay({ envelope_id: envelopeId });
      return result.events;
    } catch (error) {
      console.error(`Failed to get envelope replay for ${envelopeId}:`, error);
      return [];
    }
  }

  async getStats(): Promise<{
    event_count: number;
    log_size_mb: number;
  }> {
    try {
      // Try to get stats from Vienna Core replay
      if (this.viennaCore.replay && typeof this.viennaCore.replay.getStats === 'function') {
        const stats = await this.viennaCore.replay.getStats();
        return {
          event_count: stats.event_count || 0,
          log_size_mb: stats.log_size_mb || 0,
        };
      }
      
      // Fallback: get count from query
      const result = await this.queryReplay({ limit: 0 });
      return {
        event_count: result.total,
        log_size_mb: 0, // Unknown without file system access
      };
    } catch (error) {
      console.error('Failed to get replay stats:', error);
      return {
        event_count: 0,
        log_size_mb: 0,
      };
    }
  }

  // ==========================================================================
  // Audit Operations
  // ==========================================================================

  async queryAudit(params: AuditQueryParams): Promise<{
    records: AuditRecord[];
    total: number;
    has_more: boolean;
  }> {
    try {
      // Try to get audit records from Vienna Core
      if (this.viennaCore.audit && typeof this.viennaCore.audit.query === 'function') {
        const result = await this.viennaCore.audit.query(params);
        return this.normalizeAuditResult(result, params);
      }
      
      // Fallback: check for audit log
      if (this.viennaCore.auditLog && typeof this.viennaCore.auditLog.query === 'function') {
        const result = await this.viennaCore.auditLog.query(params);
        return this.normalizeAuditResult(result, params);
      }
      
      // No audit infrastructure available yet - return empty with honest status
      return {
        records: [],
        total: 0,
        has_more: false,
      };
    } catch (error) {
      console.error('Failed to query audit:', error);
      // Return empty rather than throwing - graceful degradation
      return {
        records: [],
        total: 0,
        has_more: false,
      };
    }
  }

  async getAuditRecord(auditId: string): Promise<AuditRecord | null> {
    try {
      // Try to get specific audit record from Vienna Core
      if (this.viennaCore.audit && typeof this.viennaCore.audit.get === 'function') {
        const record = await this.viennaCore.audit.get(auditId);
        return record ? this.normalizeAuditRecord(record) : null;
      }
      
      // Fallback: query with filter
      const result = await this.queryAudit({ limit: 1 });
      const found = result.records.find(r => r.id === auditId);
      return found || null;
    } catch (error) {
      console.error(`Failed to get audit record ${auditId}:`, error);
      return null;
    }
  }

  async getAuditStats(): Promise<{
    record_count: number;
    db_size_mb: number;
  }> {
    try {
      // Try to get stats from Vienna Core audit
      if (this.viennaCore.audit && typeof this.viennaCore.audit.getStats === 'function') {
        const stats = await this.viennaCore.audit.getStats();
        return {
          record_count: stats.record_count || 0,
          db_size_mb: stats.db_size_mb || 0,
        };
      }
      
      // Fallback: get count from query
      const result = await this.queryAudit({ limit: 0 });
      return {
        record_count: result.total,
        db_size_mb: 0, // Unknown without file system access
      };
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        record_count: 0,
        db_size_mb: 0,
      };
    }
  }

  // ==========================================================================
  // Normalization Helpers
  // ==========================================================================

  private normalizeReplayResult(result: any, params: ReplayQueryParams): {
    events: ReplayEvent[];
    total: number;
    has_more: boolean;
  } {
    // Handle different result shapes from Vienna Core
    const events = Array.isArray(result) ? result : (result.events || []);
    const total = result.total || events.length;
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    return {
      events: events.map(e => this.normalizeReplayEvent(e)),
      total,
      has_more: offset + events.length < total,
    };
  }

  private normalizeReplayEvent(event: any): ReplayEvent {
    return {
      event_id: event.event_id || event.id || 'unknown',
      event_type: event.event_type || event.type || 'envelope.queued',
      timestamp: event.timestamp || new Date().toISOString(),
      
      envelope_id: event.envelope_id,
      objective_id: event.objective_id,
      warrant_id: event.warrant_id,
      
      actor: event.actor || event.source || 'system',
      
      payload: event.payload || event.data || {},
      
      metadata: {
        session_id: event.session_id,
        operator: event.operator,
        parent_event_id: event.parent_event_id,
        ...event.metadata,
      },
    };
  }

  private normalizeAuditResult(result: any, params: AuditQueryParams): {
    records: AuditRecord[];
    total: number;
    has_more: boolean;
  } {
    // Handle different result shapes from Vienna Core
    const records = Array.isArray(result) ? result : (result.records || []);
    const total = result.total || records.length;
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    return {
      records: records.map(r => this.normalizeAuditRecord(r)),
      total,
      has_more: offset + records.length < total,
    };
  }

  private normalizeAuditRecord(record: any): AuditRecord {
    return {
      id: record.id || record.audit_id || 'unknown',
      action: record.action || record.event || 'unknown',
      timestamp: record.timestamp || new Date().toISOString(),
      operator: record.operator || record.user || null,
      result: record.result || record.status || 'completed',
      
      objective_id: record.objective_id || null,
      envelope_id: record.envelope_id || null,
      thread_id: record.thread_id || null,
      
      metadata: record.metadata || record.data || {},
    };
  }
}
