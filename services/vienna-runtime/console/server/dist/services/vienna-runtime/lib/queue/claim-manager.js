/**
 * Phase 16.4 Stage 2 — Claim Manager
 *
 * Exactly-once orchestration semantics via atomic claim creation.
 * Guarantees: No duplicate execution for same attempt number.
 */
import { getStateGraph } from "../state/state-graph";
import crypto from "crypto";
export class ClaimManager {
    stateGraph = getStateGraph();
    async initialize() {
        await this.stateGraph.initialize();
    }
    /**
     * Generate deterministic execution key
     *
     * Formula: SHA-256(queue_item_id:attempt_number)
     */
    generateExecutionKey(queueItemId, attemptNumber) {
        const input = `${queueItemId}:${attemptNumber}`;
        return crypto.createHash("sha256").update(input).digest("hex");
    }
    /**
     * Acquire execution claim (atomic, exactly-once guarantee)
     *
     * Only succeeds if no claim exists for this queue_item_id + attempt_number.
     */
    async acquireClaim(queueItemId, attemptNumber, workerId, metadata) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const claimId = `claim_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const executionKey = this.generateExecutionKey(queueItemId, attemptNumber);
        try {
            // Check for existing claim (atomic)
            const existing = db.prepare(`
        SELECT claim_id, execution_key, status
        FROM execution_claims
        WHERE queue_item_id = ? AND attempt_number = ?
        LIMIT 1
      `).get(queueItemId, attemptNumber);
            if (existing) {
                return {
                    claimed: false,
                    reason: "CLAIM_ALREADY_EXISTS",
                    existing_claim_id: existing.claim_id,
                };
            }
            // Acquire new claim (atomic INSERT with UNIQUE constraint enforcement)
            const claim = {
                claim_id: claimId,
                queue_item_id: queueItemId,
                execution_key: executionKey,
                attempt_number: attemptNumber,
                worker_id: workerId,
                status: "CLAIMED",
                claimed_at: now,
                metadata,
                created_at: now,
                updated_at: now,
            };
            const stmt = db.prepare(`
        INSERT INTO execution_claims (
          claim_id, queue_item_id, execution_key, attempt_number,
          worker_id, status, claimed_at, metadata_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(claim.claim_id, claim.queue_item_id, claim.execution_key, claim.attempt_number, claim.worker_id, claim.status, claim.claimed_at, metadata ? JSON.stringify(metadata) : null, now, now);
            return { claimed: true, claim };
        }
        catch (error) {
            // UNIQUE constraint violation means concurrent claim attempt
            if (error.message.includes("UNIQUE constraint")) {
                // Re-query to get existing claim ID
                const existing = db.prepare(`
          SELECT claim_id FROM execution_claims
          WHERE queue_item_id = ? AND attempt_number = ?
        `).get(queueItemId, attemptNumber);
                return {
                    claimed: false,
                    reason: "CONCURRENT_CLAIM_CONFLICT",
                    existing_claim_id: existing?.claim_id,
                };
            }
            throw error;
        }
    }
    /**
     * Transition claim to STARTED
     */
    async markStarted(claimId, workerId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const result = db.prepare(`
      UPDATE execution_claims
      SET status = 'STARTED',
          started_at = ?,
          updated_at = ?
      WHERE claim_id = ?
        AND worker_id = ?
        AND status = 'CLAIMED'
    `).run(now, now, claimId, workerId);
        if (result.changes === 0) {
            return {
                transitioned: false,
                reason: "CLAIM_NOT_FOUND_OR_ALREADY_STARTED",
            };
        }
        return { transitioned: true };
    }
    /**
     * Transition claim to COMPLETED
     */
    async markCompleted(claimId, workerId, resultSummary) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const result = db.prepare(`
      UPDATE execution_claims
      SET status = 'COMPLETED',
          completed_at = ?,
          result_summary = ?,
          updated_at = ?
      WHERE claim_id = ?
        AND worker_id = ?
        AND status IN ('CLAIMED', 'STARTED')
    `).run(now, resultSummary || null, now, claimId, workerId);
        if (result.changes === 0) {
            return {
                transitioned: false,
                reason: "CLAIM_NOT_FOUND_OR_ALREADY_TERMINAL",
            };
        }
        return { transitioned: true };
    }
    /**
     * Transition claim to FAILED
     */
    async markFailed(claimId, workerId, errorMessage) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const result = db.prepare(`
      UPDATE execution_claims
      SET status = 'FAILED',
          completed_at = ?,
          error_message = ?,
          updated_at = ?
      WHERE claim_id = ?
        AND worker_id = ?
        AND status IN ('CLAIMED', 'STARTED')
    `).run(now, errorMessage || null, now, claimId, workerId);
        if (result.changes === 0) {
            return {
                transitioned: false,
                reason: "CLAIM_NOT_FOUND_OR_ALREADY_TERMINAL",
            };
        }
        return { transitioned: true };
    }
    /**
     * Mark claim as ABANDONED (recovery action)
     */
    async markAbandoned(claimId, reason) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE execution_claims
      SET status = 'ABANDONED',
          completed_at = ?,
          error_message = ?,
          updated_at = ?
      WHERE claim_id = ?
        AND status IN ('CLAIMED', 'STARTED')
    `).run(now, reason || "Abandoned by recovery", now, claimId);
    }
    /**
     * Get claim by ID
     */
    async getClaim(claimId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const row = db.prepare(`
      SELECT * FROM execution_claims WHERE claim_id = ?
    `).get(claimId);
        return row ? this.rowToClaim(row) : null;
    }
    /**
     * Get claim by execution key (for idempotency check)
     */
    async getClaimByExecutionKey(executionKey) {
        await this.initialize();
        const db = this.stateGraph.db;
        const row = db.prepare(`
      SELECT * FROM execution_claims WHERE execution_key = ?
    `).get(executionKey);
        return row ? this.rowToClaim(row) : null;
    }
    /**
     * Get active claim for queue item (latest attempt)
     */
    async getActiveClaim(queueItemId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const row = db.prepare(`
      SELECT * FROM execution_claims
      WHERE queue_item_id = ?
        AND status IN ('CLAIMED', 'STARTED')
      ORDER BY attempt_number DESC
      LIMIT 1
    `).get(queueItemId);
        return row ? this.rowToClaim(row) : null;
    }
    /**
     * Find abandoned claims (CLAIMED/STARTED beyond threshold)
     */
    async findAbandonedClaims(abandonmentThresholdMs = 300000) {
        await this.initialize();
        const db = this.stateGraph.db;
        const threshold = new Date(Date.now() - abandonmentThresholdMs).toISOString();
        const rows = db.prepare(`
      SELECT * FROM execution_claims
      WHERE status IN ('CLAIMED', 'STARTED')
        AND claimed_at < ?
      ORDER BY claimed_at ASC
    `).all(threshold);
        return rows.map((row) => this.rowToClaim(row));
    }
    /**
     * List claims by queue item (all attempts)
     */
    async listClaimsByQueueItem(queueItemId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const rows = db.prepare(`
      SELECT * FROM execution_claims
      WHERE queue_item_id = ?
      ORDER BY attempt_number DESC
    `).all(queueItemId);
        return rows.map((row) => this.rowToClaim(row));
    }
    /**
     * List claims by worker
     */
    async listClaimsByWorker(workerId, status) {
        await this.initialize();
        const db = this.stateGraph.db;
        const query = status
            ? `SELECT * FROM execution_claims WHERE worker_id = ? AND status = ? ORDER BY claimed_at DESC`
            : `SELECT * FROM execution_claims WHERE worker_id = ? ORDER BY claimed_at DESC`;
        const rows = status
            ? db.prepare(query).all(workerId, status)
            : db.prepare(query).all(workerId);
        return rows.map((row) => this.rowToClaim(row));
    }
    rowToClaim(row) {
        return {
            claim_id: row.claim_id,
            queue_item_id: row.queue_item_id,
            execution_key: row.execution_key,
            attempt_number: row.attempt_number,
            worker_id: row.worker_id,
            status: row.status,
            claimed_at: row.claimed_at,
            started_at: row.started_at || undefined,
            completed_at: row.completed_at || undefined,
            result_summary: row.result_summary || undefined,
            error_message: row.error_message || undefined,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
//# sourceMappingURL=claim-manager.js.map