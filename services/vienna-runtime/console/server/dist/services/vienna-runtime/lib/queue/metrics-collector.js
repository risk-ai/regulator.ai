/**
 * Phase 16.4 Stage 5 — Metrics Collector
 *
 * Queue health metrics and operational observability.
 */
import { getStateGraph } from "../state/state-graph";
import { QueueRepository } from "./repository";
import { LeaseManager } from "./lease-manager";
import { ClaimManager } from "./claim-manager";
export class MetricsCollector {
    stateGraph = getStateGraph();
    repository = new QueueRepository();
    leaseManager = new LeaseManager();
    claimManager = new ClaimManager();
    async initialize() {
        await this.stateGraph.initialize();
    }
    /**
     * Collect current queue metrics
     */
    async collect() {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        // Total depth
        const totalDepth = db.prepare(`SELECT COUNT(*) as count FROM queue_items`).get().count;
        // Depth by state
        const depthByState = {};
        const stateRows = db.prepare(`
      SELECT state, COUNT(*) as count FROM queue_items GROUP BY state
    `).all();
        stateRows.forEach((row) => {
            depthByState[row.state] = row.count;
        });
        // Depth by priority
        const depthByPriority = {};
        const priorityRows = db.prepare(`
      SELECT priority, COUNT(*) as count FROM queue_items GROUP BY priority
    `).all();
        priorityRows.forEach((row) => {
            depthByPriority[row.priority] = row.count;
        });
        // Running count
        const runningCount = depthByState["RUNNING"] || 0;
        // Leased count
        const leasedCount = db.prepare(`
      SELECT COUNT(*) as count FROM queue_leases WHERE status = 'ACTIVE'
    `).get().count;
        // Active claims
        const activeClaims = db.prepare(`
      SELECT COUNT(*) as count FROM execution_claims WHERE status IN ('CLAIMED', 'STARTED')
    `).get().count;
        // Abandoned claims
        const abandonedClaims = db.prepare(`
      SELECT COUNT(*) as count FROM execution_claims WHERE status = 'ABANDONED'
    `).get().count;
        // Recovery events (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 86400000).toISOString();
        const recoveryEvents24h = db.prepare(`
      SELECT COUNT(*) as count FROM recovery_events WHERE detected_at > ?
    `).get(twentyFourHoursAgo).count;
        // Fail-closed count
        const failClosedCount = db.prepare(`
      SELECT COUNT(*) as count FROM recovery_events WHERE disposition = 'FAIL_CLOSED'
    `).get().count;
        // Active workers
        const activeWorkers = db.prepare(`
      SELECT COUNT(*) as count FROM scheduler_workers WHERE status = 'ACTIVE'
    `).get().count;
        // Stale workers (no heartbeat in 60s)
        const staleThreshold = new Date(Date.now() - 60000).toISOString();
        const staleWorkers = db.prepare(`
      SELECT COUNT(*) as count FROM scheduler_workers
      WHERE status = 'ACTIVE' AND heartbeat_at < ?
    `).get(staleThreshold).count;
        return {
            timestamp: now,
            total_depth: totalDepth,
            depth_by_state: depthByState,
            depth_by_priority: depthByPriority,
            running_count: runningCount,
            leased_count: leasedCount,
            active_claims: activeClaims,
            abandoned_claims: abandonedClaims,
            recovery_events_24h: recoveryEvents24h,
            fail_closed_count: failClosedCount,
            active_workers: activeWorkers,
            stale_workers: staleWorkers,
        };
    }
    /**
     * Log current metrics to console (structured JSON)
     */
    async logMetrics() {
        const metrics = await this.collect();
        console.log(JSON.stringify({
            type: "queue_metrics",
            ...metrics,
        }));
    }
    /**
     * Get operator-visible queue summary
     */
    async getQueueSummary() {
        const metrics = await this.collect();
        const warnings = [];
        let healthy = true;
        // Health checks
        if (metrics.stale_workers > 0) {
            warnings.push(`${metrics.stale_workers} stale worker(s) detected`);
            healthy = false;
        }
        if (metrics.abandoned_claims > 10) {
            warnings.push(`${metrics.abandoned_claims} abandoned claims (threshold: 10)`);
            healthy = false;
        }
        if (metrics.fail_closed_count > 0) {
            warnings.push(`${metrics.fail_closed_count} fail-closed recoveries (require operator review)`);
        }
        if (metrics.running_count > 50) {
            warnings.push(`${metrics.running_count} items running (high concurrency)`);
        }
        const summary = healthy
            ? `Queue healthy: ${metrics.total_depth} items, ${metrics.running_count} running`
            : `Queue issues detected: ${warnings.join(", ")}`;
        return {
            healthy,
            warnings,
            summary,
            metrics,
        };
    }
}
//# sourceMappingURL=metrics-collector.js.map