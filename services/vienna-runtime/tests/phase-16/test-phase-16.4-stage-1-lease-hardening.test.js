/**
 * Phase 16.4 Stage 1 — Lease Hardening Tests
 * 
 * Test coverage:
 * - Atomic lease acquisition
 * - Concurrent acquisition conflict
 * - Lease renewal
 * - Lease expiry detection
 * - Worker registry
 * - Worker heartbeat
 */

process.env.VIENNA_ENV = "test";

const { LeaseManager } = require("../../lib/queue/lease-manager");
const { WorkerRegistry } = require("../../lib/queue/worker-registry");
const { ExpiryDetector } = require("../../lib/queue/expiry-detector");
const { getStateGraph } = require("../../lib/state/state-graph");

describe("Phase 16.4 Stage 1 — Lease Hardening", () => {
  let stateGraph;
  let leaseManager;
  let workerRegistry;
  let expiryDetector;

  beforeAll(async () => {
    stateGraph = getStateGraph();
    await stateGraph.initialize();
    leaseManager = new LeaseManager();
    workerRegistry = new WorkerRegistry();
    expiryDetector = new ExpiryDetector();
  });

  afterAll(async () => {
    if (stateGraph.db) {
      stateGraph.db.close();
    }
  });

  beforeEach(async () => {
    // Clear tables
    const db = stateGraph.db;
    db.prepare("DELETE FROM queue_leases").run();
    db.prepare("DELETE FROM scheduler_workers").run();

    // Create test workers (required for FOREIGN KEY constraint)
    await workerRegistry.registerWorker("worker_001", "test");
    await workerRegistry.registerWorker("worker_002", "test");
  });

  describe("Category A: Atomic Lease Acquisition", () => {
    test("A1: First acquisition succeeds", async () => {
      const result = await leaseManager.acquireLease("queue_001", "worker_001", 30000);

      expect(result.acquired).toBe(true);
      expect(result.lease).toBeDefined();
      expect(result.lease.queue_item_id).toBe("queue_001");
      expect(result.lease.worker_id).toBe("worker_001");
      expect(result.lease.status).toBe("ACTIVE");
    });

    test("A2: Second acquisition on same queue item fails", async () => {
      await leaseManager.acquireLease("queue_002", "worker_001", 30000);

      const result = await leaseManager.acquireLease("queue_002", "worker_002", 30000);

      expect(result.acquired).toBe(false);
      expect(result.reason).toBe("ACTIVE_LEASE_EXISTS");
      expect(result.conflicting_lease_id).toBeDefined();
    });

    test("A3: Acquisition on different queue item succeeds", async () => {
      await leaseManager.acquireLease("queue_003", "worker_001", 30000);

      const result = await leaseManager.acquireLease("queue_004", "worker_001", 30000);

      expect(result.acquired).toBe(true);
    });

    test("A4: Same worker can acquire multiple queue items", async () => {
      const result1 = await leaseManager.acquireLease("queue_005", "worker_001", 30000);
      const result2 = await leaseManager.acquireLease("queue_006", "worker_001", 30000);

      expect(result1.acquired).toBe(true);
      expect(result2.acquired).toBe(true);
    });
  });

  describe("Category B: Lease Renewal", () => {
    test("B1: Owner can renew lease", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_007", "worker_001", 30000);
      const lease = acquireResult.lease;

      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay for timestamp difference

      const renewResult = await leaseManager.renewLease(lease.lease_id, "worker_001", 30000);

      expect(renewResult.renewed).toBe(true);
      expect(renewResult.new_expires_at).toBeDefined();
      expect(new Date(renewResult.new_expires_at).getTime()).toBeGreaterThan(
        new Date(lease.expires_at).getTime()
      );
    });

    test("B2: Non-owner cannot renew lease", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_008", "worker_001", 30000);
      const lease = acquireResult.lease;

      const renewResult = await leaseManager.renewLease(lease.lease_id, "worker_002", 30000);

      expect(renewResult.renewed).toBe(false);
      expect(renewResult.reason).toBe("LEASE_NOT_FOUND_OR_NOT_OWNED");
    });

    test("B3: Released lease cannot be renewed", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_009", "worker_001", 30000);
      const lease = acquireResult.lease;

      await leaseManager.releaseLease(lease.lease_id, "worker_001");

      const renewResult = await leaseManager.renewLease(lease.lease_id, "worker_001", 30000);

      expect(renewResult.renewed).toBe(false);
    });
  });

  describe("Category C: Lease Release", () => {
    test("C1: Owner can release lease", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_010", "worker_001", 30000);
      const lease = acquireResult.lease;

      await leaseManager.releaseLease(lease.lease_id, "worker_001");

      const activeLease = await leaseManager.getActiveLease("queue_010");
      expect(activeLease).toBeNull();
    });

    test("C2: After release, new acquisition succeeds", async () => {
      const acquireResult1 = await leaseManager.acquireLease("queue_011", "worker_001", 30000);
      await leaseManager.releaseLease(acquireResult1.lease.lease_id, "worker_001");

      const acquireResult2 = await leaseManager.acquireLease("queue_011", "worker_002", 30000);

      expect(acquireResult2.acquired).toBe(true);
      expect(acquireResult2.lease.worker_id).toBe("worker_002");
    });

    test("C3: Non-owner release is no-op", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_012", "worker_001", 30000);
      const lease = acquireResult.lease;

      await leaseManager.releaseLease(lease.lease_id, "worker_002");

      const activeLease = await leaseManager.getActiveLease("queue_012");
      expect(activeLease).not.toBeNull();
      expect(activeLease.worker_id).toBe("worker_001");
    });
  });

  describe("Category D: Lease Expiry Detection", () => {
    test("D1: Expired lease detected", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_013", "worker_001", 100); // 100ms TTL
      const lease = acquireResult.lease;

      await new Promise((resolve) => setTimeout(resolve, 150)); // Wait for expiry

      const expiredLeases = await leaseManager.findExpiredLeases();

      expect(expiredLeases.length).toBeGreaterThan(0);
      expect(expiredLeases.some((l) => l.lease_id === lease.lease_id)).toBe(true);
    });

    test("D2: Expired lease marked as EXPIRED", async () => {
      const acquireResult = await leaseManager.acquireLease("queue_014", "worker_001", 100);
      const lease = acquireResult.lease;

      await new Promise((resolve) => setTimeout(resolve, 150));

      await leaseManager.expireLease(lease.lease_id);

      const activeLease = await leaseManager.getActiveLease("queue_014");
      expect(activeLease).toBeNull();
    });

    test("D3: After expiry, new acquisition succeeds", async () => {
      const acquireResult1 = await leaseManager.acquireLease("queue_015", "worker_001", 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const acquireResult2 = await leaseManager.acquireLease("queue_015", "worker_002", 30000);

      expect(acquireResult2.acquired).toBe(true);
      expect(acquireResult2.lease.worker_id).toBe("worker_002");
    });
  });

  describe("Category E: Worker Registry", () => {
    test("E1: Register worker", async () => {
      const worker = await workerRegistry.registerWorker("worker_100", "16.4-stage-1");

      expect(worker.worker_id).toBe("worker_100");
      expect(worker.status).toBe("ACTIVE");
      expect(worker.version).toBe("16.4-stage-1");
    });

    test("E2: Heartbeat updates timestamp", async () => {
      await workerRegistry.registerWorker("worker_101", "16.4-stage-1");

      const before = await workerRegistry.getWorker("worker_101");
      await new Promise((resolve) => setTimeout(resolve, 50));
      await workerRegistry.heartbeat("worker_101");
      const after = await workerRegistry.getWorker("worker_101");

      expect(new Date(after.heartbeat_at).getTime()).toBeGreaterThan(
        new Date(before.heartbeat_at).getTime()
      );
    });

    test("E3: Deactivate worker", async () => {
      await workerRegistry.registerWorker("worker_102", "16.4-stage-1");
      await workerRegistry.deactivateWorker("worker_102");

      const worker = await workerRegistry.getWorker("worker_102");
      expect(worker.status).toBe("INACTIVE");
    });

    test("E4: Find stale workers", async () => {
      await workerRegistry.registerWorker("worker_103", "16.4-stage-1");
      await new Promise((resolve) => setTimeout(resolve, 150));

      const staleWorkers = await workerRegistry.findStaleWorkers(100); // 100ms threshold

      expect(staleWorkers.length).toBeGreaterThan(0);
      expect(staleWorkers.some((w) => w.worker_id === "worker_103")).toBe(true);
    });
  });

  describe("Category F: Integration", () => {
    test("F1: ExpiryDetector marks expired leases", async () => {
      await leaseManager.acquireLease("queue_016", "worker_001", 100);
      await new Promise((resolve) => setTimeout(resolve, 150));

      await expiryDetector.detectOnce();

      const activeLease = await leaseManager.getActiveLease("queue_016");
      expect(activeLease).toBeNull();
    });

    test("F2: ExpiryDetector deactivates stale workers", async () => {
      await workerRegistry.registerWorker("worker_104", "16.4-stage-1");
      await new Promise((resolve) => setTimeout(resolve, 150));

      const detector = new ExpiryDetector(1000);
      detector["staleWorkerThresholdMs"] = 100; // Override threshold for test
      await detector.detectOnce();

      const worker = await workerRegistry.getWorker("worker_104");
      expect(worker.status).toBe("INACTIVE");
    });
  });
});
