/**
 * Phase 16.3 — Queue Ledger Events
 *
 * Emit lifecycle events to execution ledger for full queue visibility.
 */
import { QueueItem, QueueLedgerEventType } from "./types";
export declare function emitQueueLedgerEvent(eventType: QueueLedgerEventType, queueItem: QueueItem, metadata?: Record<string, unknown>): Promise<void>;
export declare function getQueueEventTypeFromTransition(fromState: string, toState: string): QueueLedgerEventType | null;
//# sourceMappingURL=ledger-events.d.ts.map