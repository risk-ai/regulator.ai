/**
 * Phase 16.4 Stage 4 — Coordination Manager
 * 
 * Cross-state coordination: supersession, dependency wakeup, duplicate-intent prevention.
 */

import { getStateGraph } from "../state/state-graph";
import { QueueRepository } from "./repository";

export type SupersessionReason =
  | "PLAN_REVISED"
  | "OPERATOR_CANCELLED"
  | "DEPENDENCY_INVALIDATED"
  | "POLICY_SUPERSEDED";

export type SupersessionRecord = {
  queue_item_id: string;
  superseded_by_queue_item_id?: string;
  reason: SupersessionReason;
  created_at: string;
};

export type IntentDedupKey = string;

export class CoordinationManager {
  private stateGraph = getStateGraph();
  private repository = new QueueRepository();

  async initialize(): Promise<void> {
    await this.stateGraph.initialize();
  }

  /**
   * Generate dedup key for intent
   * 
   * Formula: plan_id:step_id:intent_id
   */
  generateDedupKey(planId: string, stepId: string, intentId: string): IntentDedupKey {
    return `${planId}:${stepId}:${intentId}`;
  }

  /**
   * Check for duplicate intent (by dedupe key)
   */
  async checkDuplicateIntent(planId: string, stepId: string, intentId: string): Promise<{
    exists: boolean;
    existing_queue_item_id?: string;
  }> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const row = db.prepare(`
      SELECT id FROM queue_items
      WHERE plan_id = ?
        AND step_id = ?
        AND intent_id = ?
        AND state NOT IN ('COMPLETED', 'FAILED', 'CANCELLED')
      LIMIT 1
    `).get(planId, stepId, intentId);

    if (row) {
      return {
        exists: true,
        existing_queue_item_id: row.id,
      };
    }

    return { exists: false };
  }

  /**
   * Supersede queue item (mark as cancelled + record supersession)
   */
  async supersede(
    queueItemId: string,
    reason: SupersessionReason,
    supersededBy?: string
  ): Promise<SupersessionRecord> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const now = new Date().toISOString();

    // Transition queue item to CANCELLED
    await this.repository.transitionItem({
      queue_item_id: queueItemId,
      from_state: (await this.repository.getItem(queueItemId))!.state,
      to_state: "CANCELLED",
      reason: "SUPERSEDED",
      metadata: {
        supersession_reason: reason,
        superseded_by: supersededBy,
      },
    });

    // Record supersession
    const record: SupersessionRecord = {
      queue_item_id: queueItemId,
      superseded_by_queue_item_id: supersededBy,
      reason,
      created_at: now,
    };

    db.prepare(`
      INSERT INTO supersession_records (
        queue_item_id, superseded_by_queue_item_id, reason, created_at
      ) VALUES (?, ?, ?, ?)
    `).run(
      record.queue_item_id,
      record.superseded_by_queue_item_id || null,
      record.reason,
      record.created_at
    );

    console.log(`Superseded queue item ${queueItemId}: ${reason}`);

    return record;
  }

  /**
   * Wake up items blocked on dependency completion
   */
  async wakeupDependents(executionId: string): Promise<string[]> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    // Find items blocked on this execution
    const blockedItems = db.prepare(`
      SELECT id, resume_condition_json FROM queue_items
      WHERE state = 'BLOCKED_DEPENDENCY'
    `).all();

    const wokenIds: string[] = [];

    for (const row of blockedItems) {
      const resumeCondition = JSON.parse(row.resume_condition_json);

      if (
        resumeCondition.type === "dependency_complete" &&
        resumeCondition.dependency_execution_id === executionId
      ) {
        // Transition to READY
        await this.repository.transitionItem({
          queue_item_id: row.id,
          from_state: "BLOCKED_DEPENDENCY",
          to_state: "READY",
          reason: "DEPENDENCY_COMPLETED",
          metadata: { completed_execution_id: executionId },
        });

        wokenIds.push(row.id);
      }
    }

    if (wokenIds.length > 0) {
      console.log(`Woke up ${wokenIds.length} item(s) after execution ${executionId}`);
    }

    return wokenIds;
  }

  /**
   * List superseded items
   */
  async listSuperseded(limit: number = 100): Promise<SupersessionRecord[]> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const rows = db.prepare(`
      SELECT * FROM supersession_records
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map((row: any) => ({
      queue_item_id: row.queue_item_id,
      superseded_by_queue_item_id: row.superseded_by_queue_item_id || undefined,
      reason: row.reason as SupersessionReason,
      created_at: row.created_at,
    }));
  }

  /**
   * Get supersession record by queue item
   */
  async getSupersession(queueItemId: string): Promise<SupersessionRecord | null> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const row = db.prepare(`
      SELECT * FROM supersession_records WHERE queue_item_id = ?
    `).get(queueItemId);

    if (!row) {
      return null;
    }

    return {
      queue_item_id: row.queue_item_id,
      superseded_by_queue_item_id: row.superseded_by_queue_item_id || undefined,
      reason: row.reason as SupersessionReason,
      created_at: row.created_at,
    };
  }
}
