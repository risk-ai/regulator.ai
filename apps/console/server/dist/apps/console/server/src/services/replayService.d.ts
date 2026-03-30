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
import type { ReplayEvent, ReplayQueryParams, AuditRecord, AuditQueryParams } from '../types/api.js';
export declare class ReplayService {
    private viennaCore;
    constructor(viennaCore: any);
    queryReplay(params: ReplayQueryParams): Promise<{
        events: ReplayEvent[];
        total: number;
        has_more: boolean;
    }>;
    getReplayEvent(eventId: string): Promise<ReplayEvent | null>;
    getEnvelopeReplay(envelopeId: string): Promise<ReplayEvent[]>;
    getStats(): Promise<{
        event_count: number;
        log_size_mb: number;
    }>;
    queryAudit(params: AuditQueryParams): Promise<{
        records: AuditRecord[];
        total: number;
        has_more: boolean;
    }>;
    getAuditRecord(auditId: string): Promise<AuditRecord | null>;
    getAuditStats(): Promise<{
        record_count: number;
        db_size_mb: number;
    }>;
    private normalizeReplayResult;
    private normalizeReplayEvent;
    private normalizeAuditResult;
    private normalizeAuditRecord;
}
//# sourceMappingURL=replayService.d.ts.map