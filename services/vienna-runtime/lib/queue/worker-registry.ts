/**
 * Phase 16.4 Stage 1 — Scheduler Worker Registry
 * 
 * Track active scheduler processes with heartbeat monitoring.
 */

import { getStateGraph } from "../state/state-graph";

export type WorkerStatus = "ACTIVE" | "INACTIVE";

export type SchedulerWorker = {
  worker_id: string;
  status: WorkerStatus;
  started_at: string;
  heartbeat_at: string;
  version?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export class WorkerRegistry {
  private stateGraph = getStateGraph();
  private heartbeatIntervalMs = 10000; // 10 seconds
  private heartbeatHandle?: NodeJS.Timeout;

  async initialize(): Promise<void> {
    await this.stateGraph.initialize();
  }

  /**
   * Register new worker (start of scheduler process)
   */
  async registerWorker(
    workerId: string,
    version?: string,
    metadata?: Record<string, unknown>
  ): Promise<SchedulerWorker> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const now = new Date().toISOString();

    const worker: SchedulerWorker = {
      worker_id: workerId,
      status: "ACTIVE",
      started_at: now,
      heartbeat_at: now,
      version,
      metadata,
      created_at: now,
      updated_at: now,
    };

    db.prepare(`
      INSERT INTO scheduler_workers (
        worker_id, status, started_at, heartbeat_at,
        version, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(worker_id) DO UPDATE SET
        status = 'ACTIVE',
        started_at = ?,
        heartbeat_at = ?,
        version = ?,
        metadata_json = ?,
        updated_at = ?
    `).run(
      worker.worker_id,
      worker.status,
      worker.started_at,
      worker.heartbeat_at,
      worker.version || null,
      worker.metadata ? JSON.stringify(worker.metadata) : null,
      now,
      now,
      // ON CONFLICT values
      worker.started_at,
      worker.heartbeat_at,
      worker.version || null,
      worker.metadata ? JSON.stringify(worker.metadata) : null,
      now
    );

    return worker;
  }

  /**
   * Heartbeat (periodic liveness signal)
   */
  async heartbeat(workerId: string): Promise<void> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE scheduler_workers
      SET heartbeat_at = ?, updated_at = ?
      WHERE worker_id = ? AND status = 'ACTIVE'
    `).run(now, now, workerId);
  }

  /**
   * Deactivate worker (normal shutdown)
   */
  async deactivateWorker(workerId: string): Promise<void> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE scheduler_workers
      SET status = 'INACTIVE', updated_at = ?
      WHERE worker_id = ?
    `).run(now, workerId);
  }

  /**
   * Get worker by ID
   */
  async getWorker(workerId: string): Promise<SchedulerWorker | null> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const row = db.prepare(`
      SELECT * FROM scheduler_workers WHERE worker_id = ?
    `).get(workerId);

    return row ? this.rowToWorker(row) : null;
  }

  /**
   * List workers by status
   */
  async listWorkers(status?: WorkerStatus): Promise<SchedulerWorker[]> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const query = status
      ? `SELECT * FROM scheduler_workers WHERE status = ? ORDER BY heartbeat_at DESC`
      : `SELECT * FROM scheduler_workers ORDER BY heartbeat_at DESC`;

    const rows = status
      ? db.prepare(query).all(status)
      : db.prepare(query).all();

    return rows.map((row: any) => this.rowToWorker(row));
  }

  /**
   * Find stale workers (no heartbeat beyond threshold)
   */
  async findStaleWorkers(staleThresholdMs: number = 60000): Promise<SchedulerWorker[]> {
    await this.initialize();
    const db = (this.stateGraph as any).db;

    const staleThreshold = new Date(Date.now() - staleThresholdMs).toISOString();

    const rows = db.prepare(`
      SELECT * FROM scheduler_workers
      WHERE status = 'ACTIVE' AND heartbeat_at < ?
      ORDER BY heartbeat_at ASC
    `).all(staleThreshold);

    return rows.map((row: any) => this.rowToWorker(row));
  }

  /**
   * Start automatic heartbeat (background process)
   */
  startHeartbeat(workerId: string, intervalMs: number = this.heartbeatIntervalMs): void {
    if (this.heartbeatHandle) {
      return; // Already running
    }

    this.heartbeatHandle = setInterval(() => {
      this.heartbeat(workerId).catch((err) => {
        console.error(`Worker heartbeat failed for ${workerId}:`, err);
      });
    }, intervalMs);
  }

  /**
   * Stop automatic heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = undefined;
    }
  }

  private rowToWorker(row: any): SchedulerWorker {
    return {
      worker_id: row.worker_id,
      status: row.status as WorkerStatus,
      started_at: row.started_at,
      heartbeat_at: row.heartbeat_at,
      version: row.version || undefined,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
