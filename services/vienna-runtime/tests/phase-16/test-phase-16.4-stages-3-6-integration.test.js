/**
 * Phase 16.4 Stages 3-6 — Integration Tests
 * 
 * Test coverage:
 * - Stage 3: Recovery (stuck work detection, fail-closed)
 * - Stage 4: Coordination (supersession, dependencies, dedupe)
 * - Stage 5: Observability (metrics collection)
 * - Stage 6: End-to-end orchestration validation
 */

process.env.VIENNA_ENV = "test";

const { RecoveryManager } = require("../../lib/queue/recovery-manager");
const { CoordinationManager } = require("../../lib/queue/coordination-manager");
const { MetricsCollector } = require("../../lib/queue/metrics-collector");
const { QueueRepository } = require("../../lib/queue/repository");
const { ClaimManager } = require("../../lib/queue/claim-manager");
const { LeaseManager } = require("../../lib/queue/lease-manager");
const { getStateGraph } = require("../../lib/state/state-graph");

describe("Phase 16.4 Stages 3-6 — Integration", () => {
  let stateGraph;
  let recoveryManager;
  let coordinationManager;
  let metricsCollector;
  let repository;
  let claimManager;
  let leaseManager;

  beforeAll(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    recoveryManager = new RecoveryManager();
    coordinationManager = new CoordinationManager();
    metricsCollector = new MetricsCollector();
    repository = new QueueRepository();
    claimManager = new ClaimManager();
    leaseManager = new LeaseManager();
  });

  afterAll(async () => {
    if (stateGraph.db) {
      stateGraph.db.close();
    }
  });

  beforeEach(async () => {
    const db = stateGraph.db;
    db.prepare("DELETE FROM recovery_events").run();
    db.prepare("DELETE FROM supersession_records").run();
    db.prepare("DELETE FROM execution_claims").run();
    db.prepare("DELETE FROM queue_leases").run();
    db.prepare("DELETE FROM queue_items").run();
    db.prepare("DELETE FROM scheduler_workers").run();

    // Create test worker
    db.prepare(`
      INSERT INTO scheduler_workers (worker_id, status, started_at, heartbeat_at, created_at, updated_at)
      VALUES ('worker_001', 'ACTIVE', datetime('now'), datetime('now'), datetime('now'), datetime('now'))
    `).run();
  });

  describe("Stage 3: Recovery", () => {
    test("S3.1: Detect stuck RUNNING item with expired lease", async () => {
      const db = stateGraph.db;

      // Create queue item in RUNNING state with expired lease
      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, started_at, last_transition_at
        ) VALUES (?, 'RUNNING', 'P1', '{"attempt_count":0}', 'test', 'plan_001', 'step_001', 'intent_001', '[]', 'T1', datetime('now', '-5 minutes'), datetime('now', '-5 minutes'), datetime('now', '-5 minutes'))
      `).run("queue_stuck_001");

      // Create expired lease
      const pastTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      db.prepare(`
        INSERT INTO queue_leases (
          lease_id, queue_item_id, worker_id, status, acquired_at, heartbeat_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
      `).run("lease_expired", "queue_stuck_001", "worker_001", pastTime, pastTime, pastTime, pastTime, pastTime);

      const stuckItems = await recoveryManager.detectStuckWork();

      expect(stuckItems.length).toBeGreaterThan(0);
      expect(stuckItems[0].queue_item.id).toBe("queue_stuck_001");
      expect(stuckItems[0].lease_expired).toBe(true);
    });

    test("S3.2: Reclaim item safely (lease expired before claim)", async () => {
      const db = stateGraph.db;

      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, started_at, last_transition_at
        ) VALUES (?, 'RUNNING', 'P1', '{"attempt_count":0}', 'test', 'plan_002', 'step_002', 'intent_002', '[]', 'T1', datetime('now'), datetime('now'), datetime('now'))
      `).run("queue_reclaim_001");

      const stuckItem = {
        queue_item: await repository.getItem("queue_reclaim_001"),
        stuck_reason: "Lease expired",
        stuck_since: new Date().toISOString(),
        lease_expired: true,
        claim_abandoned: false,
        recommended_disposition: "RECLAIM",
      };

      const recoveryEvent = await recoveryManager.recoverStuckItem(stuckItem);

      expect(recoveryEvent.disposition).toBe("RECLAIM");
      expect(recoveryEvent.resolved_at).toBeDefined();

      const item = await repository.getItem("queue_reclaim_001");
      expect(item.state).toBe("RETRY_SCHEDULED"); // Reclaimed for retry
    });

    test("S3.3: Fail-closed on uncertain execution", async () => {
      const db = stateGraph.db;

      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, started_at, last_transition_at
        ) VALUES (?, 'RUNNING', 'P1', '{"attempt_count":0}', 'test', 'plan_003', 'step_003', 'intent_003', '[]', 'T1', datetime('now'), datetime('now'), datetime('now'))
      `).run("queue_uncertain_001");

      // Create claim in STARTED state (execution may have run)
      const claim = await claimManager.acquireClaim("queue_uncertain_001", 1, "worker_001");
      await claimManager.markStarted(claim.claim.claim_id, "worker_001");

      const stuckItem = {
        queue_item: await repository.getItem("queue_uncertain_001"),
        stuck_reason: "Claim started but uncertain",
        stuck_since: new Date().toISOString(),
        lease_expired: true,
        claim_abandoned: false,
        recommended_disposition: "FAIL_CLOSED",
      };

      const recoveryEvent = await recoveryManager.recoverStuckItem(stuckItem);

      expect(recoveryEvent.disposition).toBe("FAIL_CLOSED");

      const item = await repository.getItem("queue_uncertain_001");
      expect(item.state).toBe("FAILED");
      expect(item.metadata).toBeDefined();
      expect(item.metadata.recovery_required).toBe(true);
    });
  });

  describe("Stage 4: Coordination", () => {
    test("S4.1: Detect duplicate intent", async () => {
      const db = stateGraph.db;

      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at
        ) VALUES (?, 'READY', 'P1', '{"attempt_count":0}', 'test', 'plan_dup', 'step_dup', 'intent_dup', '[]', 'T1', datetime('now'), datetime('now'))
      `).run("queue_dup_001");

      const result = await coordinationManager.checkDuplicateIntent("plan_dup", "step_dup", "intent_dup");

      expect(result.exists).toBe(true);
      expect(result.existing_queue_item_id).toBe("queue_dup_001");
    });

    test("S4.2: Supersede queue item", async () => {
      const db = stateGraph.db;

      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at
        ) VALUES (?, 'READY', 'P1', '{"attempt_count":0}', 'test', 'plan_sup', 'step_sup', 'intent_sup', '[]', 'T1', datetime('now'), datetime('now'))
      `).run("queue_sup_001");

      // Create superseding item (FOREIGN KEY requirement)
      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at
        ) VALUES (?, 'READY', 'P1', '{"attempt_count":0}', 'test', 'plan_sup', 'step_sup', 'intent_sup', '[]', 'T1', datetime('now'), datetime('now'))
      `).run("queue_sup_002");

      const record = await coordinationManager.supersede("queue_sup_001", "PLAN_REVISED", "queue_sup_002");

      expect(record.queue_item_id).toBe("queue_sup_001");
      expect(record.reason).toBe("PLAN_REVISED");

      const item = await repository.getItem("queue_sup_001");
      expect(item.state).toBe("CANCELLED");
    });

    test("S4.3: Wakeup dependents after execution", async () => {
      const db = stateGraph.db;

      // Create blocked item
      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at, resume_condition_json
        ) VALUES (?, 'BLOCKED_DEPENDENCY', 'P1', '{"attempt_count":0}', 'test', 'plan_dep', 'step_dep', 'intent_dep', '[]', 'T1', datetime('now'), datetime('now'), ?)
      `).run("queue_dep_001", JSON.stringify({
        type: "dependency_complete",
        dependency_execution_id: "exec_upstream_001"
      }));

      const wokenIds = await coordinationManager.wakeupDependents("exec_upstream_001");

      expect(wokenIds).toContain("queue_dep_001");

      const item = await repository.getItem("queue_dep_001");
      expect(item.state).toBe("READY");
    });
  });

  describe("Stage 5: Observability", () => {
    test("S5.1: Collect queue metrics", async () => {
      const db = stateGraph.db;

      // Create various queue items
      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at
        ) VALUES (?, ?, 'P1', '{"attempt_count":0}', 'test', 'plan_m', 'step_m', 'intent_m', '[]', 'T1', datetime('now'), datetime('now'))
      `);

      db.prepare("INSERT INTO queue_items (id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id, resource_keys_json, risk_tier, queued_at, last_transition_at) VALUES (?, ?, 'P1', '{\"attempt_count\":0}', 'test', 'plan_m', 'step_m', 'intent_m', '[]', 'T1', datetime('now'), datetime('now'))").run("queue_m_001", "READY");
      db.prepare("INSERT INTO queue_items (id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id, resource_keys_json, risk_tier, queued_at, last_transition_at) VALUES (?, ?, 'P1', '{\"attempt_count\":0}', 'test', 'plan_m', 'step_m', 'intent_m', '[]', 'T1', datetime('now'), datetime('now'))").run("queue_m_002", "RUNNING");
      db.prepare("INSERT INTO queue_items (id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id, resource_keys_json, risk_tier, queued_at, last_transition_at) VALUES (?, ?, 'P1', '{\"attempt_count\":0}', 'test', 'plan_m', 'step_m', 'intent_m', '[]', 'T1', datetime('now'), datetime('now'))").run("queue_m_003", "COMPLETED");

      const metrics = await metricsCollector.collect();

      expect(metrics.total_depth).toBeGreaterThanOrEqual(3);
      expect(metrics.depth_by_state["READY"]).toBeGreaterThanOrEqual(1);
      expect(metrics.depth_by_state["RUNNING"]).toBeGreaterThanOrEqual(1);
      expect(metrics.active_workers).toBe(1);
    });

    test("S5.2: Get queue summary", async () => {
      const summary = await metricsCollector.getQueueSummary();

      expect(summary.healthy).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.metrics).toBeDefined();
    });
  });

  describe("Stage 6: End-to-End Orchestration", () => {
    test("S6.1: Full lifecycle with recovery", async () => {
      const db = stateGraph.db;

      // Create queue item
      db.prepare(`
        INSERT INTO queue_items (
          id, state, priority, retry_json, requested_by, plan_id, step_id, intent_id,
          resource_keys_json, risk_tier, queued_at, last_transition_at
        ) VALUES (?, 'READY', 'P0', '{"attempt_count":0}', 'test', 'plan_e2e', 'step_e2e', 'intent_e2e', '[]', 'T1', datetime('now'), datetime('now'))
      `).run("queue_e2e_001");

      // Simulate scheduler picking it up
      const leaseResult = await leaseManager.acquireLease("queue_e2e_001", "worker_001", 30000);
      expect(leaseResult.acquired).toBe(true);

      const claimResult = await claimManager.acquireClaim("queue_e2e_001", 1, "worker_001");
      expect(claimResult.claimed).toBe(true);

      // Mark claim as STARTED (execution began)
      await claimManager.markStarted(claimResult.claim.claim_id, "worker_001");

      await repository.transitionItem({
        queue_item_id: "queue_e2e_001",
        from_state: "READY",
        to_state: "RUNNING",
        reason: "SCHEDULER_RESUME",
        resumed_by: "scheduler",
      });

      // Simulate crash (lease expires, claim abandoned)
      await leaseManager.expireLease(leaseResult.lease.lease_id);
      await claimManager.markAbandoned(claimResult.claim.claim_id);

      // Recovery detects stuck work
      const stuckItems = await recoveryManager.detectStuckWork();
      expect(stuckItems.length).toBeGreaterThan(0);

      // Recovery fails-closed (claim was STARTED, uncertain execution)
      const stuckItem = stuckItems.find(s => s.queue_item.id === "queue_e2e_001");
      if (stuckItem) {
        const recovery = await recoveryManager.recoverStuckItem(stuckItem);
        expect(recovery.disposition).toBe("FAIL_CLOSED"); // Claim was STARTED before abandon
      }

      const item = await repository.getItem("queue_e2e_001");
      expect(item.state).toBe("FAILED");
    });
  });
});
