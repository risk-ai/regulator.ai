/**
 * Phase 16.3 — Queue Ledger Events
 * 
 * Emit lifecycle events to execution ledger for full queue visibility.
 */

import { QueueItem, QueueLedgerEventType } from "./types";
import { getStateGraph } from "../state/state-graph";

export async function emitQueueLedgerEvent(
  eventType: QueueLedgerEventType,
  queueItem: QueueItem,
  metadata?: Record<string, unknown>
): Promise<void> {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const executionId = queueItem.execution_id || `queue_${queueItem.id}`;

  const eventMetadata = {
    queue_item_id: queueItem.id,
    plan_id: queueItem.plan_id,
    step_id: queueItem.step_id,
    intent_id: queueItem.intent_id,
    approval_id: queueItem.approval_id,
    requested_by: queueItem.requested_by,
    approved_by: queueItem.approved_by,
    resumed_by: queueItem.resumed_by,
    state: queueItem.state,
    priority: queueItem.priority,
    blocked_reason: queueItem.blocked_reason,
    resume_condition: queueItem.resume_condition,
    retry_attempt: queueItem.retry.attempt_count,
    ...metadata,
  };

  await stateGraph.appendLedgerEvent({
    execution_id: executionId,
    event_type: eventType,
    event_metadata: eventMetadata,
  });
}

export function getQueueEventTypeFromTransition(
  fromState: string,
  toState: string
): QueueLedgerEventType | null {
  // Map state transitions to ledger event types
  if (toState === "READY") {
    return "QUEUE_ITEM_READY";
  }
  
  if (toState === "BLOCKED_LOCK" || toState === "BLOCKED_APPROVAL" || toState === "BLOCKED_DEPENDENCY") {
    return "QUEUE_ITEM_BLOCKED";
  }
  
  if (toState === "RETRY_SCHEDULED") {
    return "QUEUE_ITEM_RETRY_SCHEDULED";
  }
  
  if (toState === "RUNNING") {
    return "QUEUE_ITEM_EXECUTION_STARTED";
  }
  
  if (toState === "COMPLETED") {
    return "QUEUE_ITEM_EXECUTION_COMPLETED";
  }
  
  if (toState === "FAILED") {
    return "QUEUE_ITEM_EXECUTION_FAILED";
  }
  
  if (toState === "CANCELLED") {
    return "QUEUE_ITEM_CANCELLED";
  }

  return null;
}
