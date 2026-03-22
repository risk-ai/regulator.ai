# Phase 9.1 Implementation Checklist — Objective Schema & State Machine

**Status:** Ready to begin  
**Target:** Foundation for Phase 9 Objective Orchestration  
**Estimated effort:** 15+ tests, ~500 LOC

---

## Objective

Deliver canonical objective schema and deterministic state machine before building evaluation engine.

**Success criteria:**
- ✅ Objective schema validated and frozen
- ✅ State machine transitions deterministic
- ✅ State Graph persistence working
- ✅ 15+ tests passing (100% coverage)

---

## Step 1: Objective Schema Definition

**File:** `lib/core/objective-schema.js`

**Tasks:**

1. Define canonical ObjectiveSchema
   ```javascript
   const ObjectiveSchema = {
     objective_id: { type: 'string', required: true },
     objective_type: { type: 'string', required: true },
     target_id: { type: 'string', required: true },
     target_type: { type: 'string', required: true },
     desired_state: { type: 'object', required: true },
     evaluation_interval: { type: 'number', default: 60 },
     evaluation_method: { type: 'string', required: true },
     remediation_plan_id: { type: 'string', optional: true },
     verification_strength: { type: 'string', default: 'basic' },
     priority: { type: 'number', default: 100 },
     status: { type: 'string', required: true },
     metadata: { type: 'object', default: {} },
     created_at: { type: 'number', required: true },
     updated_at: { type: 'number', required: true },
     last_evaluated_at: { type: 'number', optional: true },
     last_violation_at: { type: 'number', optional: true }
   };
   ```

2. Implement validation function
   ```javascript
   function validateObjective(objective) {
     // Required fields present
     // Types correct
     // Enums valid (objective_type, status, evaluation_method)
     // desired_state is object
     // evaluation_interval > 0
     // Return { valid: boolean, errors: [] }
   }
   ```

3. Implement factory function
   ```javascript
   function createObjective(params) {
     // Apply defaults
     // Generate objective_id if missing
     // Set timestamps
     // Set initial status ('declared')
     // Validate
     // Return objective or throw
   }
   ```

4. Define objective types (enum)
   ```javascript
   const ObjectiveTypes = {
     MAINTAIN_SERVICE_HEALTH: 'maintain_service_health',
     MAINTAIN_ENDPOINT_HEALTH: 'maintain_endpoint_health',
     MAINTAIN_FILE_STATE: 'maintain_file_state',
     MAINTAIN_SYSTEM_STATE: 'maintain_system_state'
   };
   ```

5. Define evaluation methods (enum)
   ```javascript
   const EvaluationMethods = {
     SYSTEMD_STATUS: 'systemd_status_check',
     HTTP_HEALTH: 'http_health_check',
     TCP_PORT: 'tcp_port_check',
     FILE_STATE: 'file_state_check',
     STATE_GRAPH_QUERY: 'state_graph_query',
     CUSTOM: 'custom_check'
   };
   ```

**Tests (5):**
- ✅ Valid objective creation
- ✅ Required fields enforced
- ✅ Type validation
- ✅ Enum validation
- ✅ Default values applied

**Acceptance:** Schema validation working, no TODOs in code

---

## Step 2: State Machine Definition

**File:** `lib/core/objective-state-machine.js`

**Tasks:**

1. Define valid states (enum)
   ```javascript
   const ObjectiveStates = {
     DECLARED: 'declared',
     MONITORING: 'monitoring',
     HEALTHY: 'healthy',
     VIOLATION: 'violation',
     REMEDIATION: 'remediation',
     VERIFICATION: 'verification',
     RESTORED: 'restored',
     FAILED: 'failed',
     BLOCKED: 'blocked',
     SUSPENDED: 'suspended',
     ARCHIVED: 'archived'
   };
   ```

2. Define valid transitions (table-driven)
   ```javascript
   const ValidTransitions = {
     declared: ['monitoring', 'archived'],
     monitoring: ['healthy', 'violation', 'suspended', 'archived'],
     healthy: ['monitoring', 'violation', 'suspended', 'archived'],
     violation: ['remediation', 'blocked', 'suspended', 'archived'],
     remediation: ['verification', 'failed', 'archived'],
     verification: ['restored', 'failed', 'archived'],
     restored: ['monitoring', 'archived'],
     failed: ['suspended', 'archived'],
     blocked: ['suspended', 'archived'],
     suspended: ['monitoring', 'archived']
   };
   ```

3. Implement transition validation
   ```javascript
   function isValidTransition(from, to) {
     return ValidTransitions[from]?.includes(to) ?? false;
   }
   ```

4. Implement transition execution
   ```javascript
   async function transitionObjective(objective, newState, reason, triggeredBy) {
     // Validate transition
     // Update objective.status
     // Update objective.updated_at
     // Record state_transitions entry
     // Emit ledger event
     // Return updated objective
   }
   ```

5. Implement state queries
   ```javascript
   function isTerminalState(state) {
     return ['archived'].includes(state);
   }
   
   function isActiveState(state) {
     return ['monitoring', 'healthy', 'violation', 'remediation', 'verification'].includes(state);
   }
   
   function requiresIntervention(state) {
     return ['failed', 'blocked', 'suspended'].includes(state);
   }
   ```

**Tests (5):**
- ✅ Valid transitions allowed
- ✅ Invalid transitions rejected
- ✅ State helper functions correct
- ✅ Terminal state detection
- ✅ Intervention state detection

**Acceptance:** State machine deterministic, no ambiguous paths

---

## Step 3: State Graph Extension

**File:** `lib/state/schema.sql`

**Tasks:**

1. Add objectives table
   ```sql
   CREATE TABLE IF NOT EXISTS objectives (
     objective_id TEXT PRIMARY KEY,
     objective_type TEXT NOT NULL,
     target_id TEXT NOT NULL,
     target_type TEXT NOT NULL,
     desired_state TEXT NOT NULL,
     evaluation_interval INTEGER NOT NULL,
     evaluation_method TEXT NOT NULL,
     remediation_plan_id TEXT,
     verification_strength TEXT DEFAULT 'basic',
     priority INTEGER DEFAULT 100,
     status TEXT NOT NULL,
     metadata TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL,
     last_evaluated_at INTEGER,
     last_violation_at INTEGER
   );
   
   CREATE INDEX idx_objectives_status ON objectives(status);
   CREATE INDEX idx_objectives_target_id ON objectives(target_id);
   CREATE INDEX idx_objectives_priority ON objectives(priority);
   ```

2. Add objective_history table
   ```sql
   CREATE TABLE IF NOT EXISTS objective_history (
     history_id TEXT PRIMARY KEY,
     objective_id TEXT NOT NULL,
     from_state TEXT NOT NULL,
     to_state TEXT NOT NULL,
     reason TEXT,
     triggered_by TEXT,
     timestamp INTEGER NOT NULL,
     FOREIGN KEY (objective_id) REFERENCES objectives(objective_id)
   );
   
   CREATE INDEX idx_objective_history_objective_id ON objective_history(objective_id);
   CREATE INDEX idx_objective_history_timestamp ON objective_history(timestamp);
   ```

**File:** `lib/state/state-graph.js`

**Tasks:**

3. Implement createObjective
   ```javascript
   async createObjective(objective) {
     // Validate schema
     // Insert into objectives table
     // Record initial state_transitions entry
     // Return objective
   }
   ```

4. Implement getObjective
   ```javascript
   async getObjective(objective_id) {
     // Query by ID
     // Parse JSON fields (desired_state, metadata)
     // Return objective or null
   }
   ```

5. Implement listObjectives
   ```javascript
   async listObjectives(filters = {}) {
     // Filter by status, target_id, objective_type
     // Order by priority DESC, created_at ASC
     // Return array
   }
   ```

6. Implement updateObjectiveState
   ```javascript
   async updateObjectiveState(objective_id, new_state, reason, triggered_by) {
     // Load objective
     // Validate transition
     // Update status + updated_at
     // Record objective_history entry
     // Return updated objective
   }
   ```

7. Implement getObjectiveHistory
   ```javascript
   async getObjectiveHistory(objective_id, limit = 50) {
     // Query objective_history by objective_id
     // Order by timestamp DESC
     // Return transitions
   }
   ```

**Tests (5):**
- ✅ createObjective persists to State Graph
- ✅ getObjective retrieves correctly
- ✅ listObjectives filters working
- ✅ updateObjectiveState records history
- ✅ getObjectiveHistory returns timeline

**Acceptance:** State Graph CRUD operational, migrations clean

---

## Step 4: Integration Preparation

**File:** `lib/core/objective-schema.js` (export)

**Tasks:**

1. Export all schemas and enums
   ```javascript
   module.exports = {
     ObjectiveSchema,
     ObjectiveTypes,
     ObjectiveStates,
     EvaluationMethods,
     validateObjective,
     createObjective
   };
   ```

**File:** `lib/core/objective-state-machine.js` (export)

**Tasks:**

2. Export state machine utilities
   ```javascript
   module.exports = {
     ObjectiveStates,
     ValidTransitions,
     isValidTransition,
     transitionObjective,
     isTerminalState,
     isActiveState,
     requiresIntervention
   };
   ```

**File:** `lib/state/state-graph.js` (export)

**Tasks:**

3. Export objective methods
   ```javascript
   // Add to StateGraph class
   this.createObjective = createObjective.bind(this);
   this.getObjective = getObjective.bind(this);
   this.listObjectives = listObjectives.bind(this);
   this.updateObjectiveState = updateObjectiveState.bind(this);
   this.getObjectiveHistory = getObjectiveHistory.bind(this);
   ```

**Acceptance:** All modules export correctly, no circular dependencies

---

## Step 5: Test Suite

**File:** `test-phase-9.1-objective-foundation.js`

**Test categories:**

### Category A: Schema Validation (5 tests)
- Valid objective creation
- Required fields enforced
- Type validation
- Enum validation
- Default values applied

### Category B: State Machine (5 tests)
- Valid transitions allowed
- Invalid transitions rejected
- State helper functions correct
- Terminal state detection
- Intervention state detection

### Category C: State Graph Integration (5 tests)
- createObjective persists
- getObjective retrieves
- listObjectives filters
- updateObjectiveState records history
- getObjectiveHistory timeline

**Total: 15 tests**

**Acceptance:** 15/15 passing (100%)

---

## Step 6: Documentation

**File:** `PHASE_9.1_COMPLETE.md`

**Contents:**

1. Summary (what was delivered)
2. Objective schema specification
3. State machine diagram
4. State Graph schema changes
5. API reference
6. Test results
7. Example usage
8. Integration notes for Phase 9.2

**Acceptance:** Complete documentation, ready for Phase 9.2

---

## Commit Sequence

**Recommended commits:**

1. `phase-9.1: Add objective schema definition`
   - `lib/core/objective-schema.js`
   - Tests (Category A)

2. `phase-9.1: Add objective state machine`
   - `lib/core/objective-state-machine.js`
   - Tests (Category B)

3. `phase-9.1: Extend State Graph with objectives tables`
   - `lib/state/schema.sql`
   - `lib/state/state-graph.js`
   - Tests (Category C)

4. `phase-9.1: Complete foundation + documentation`
   - `PHASE_9.1_COMPLETE.md`
   - Test suite validation

**Total: 4 commits, tight scope per commit**

---

## Validation Checklist

Before marking Phase 9.1 complete:

- [ ] All 15 tests passing
- [ ] No schema validation edge cases
- [ ] State machine transitions deterministic
- [ ] State Graph migrations clean
- [ ] No circular dependencies
- [ ] Documentation complete
- [ ] Example usage validated
- [ ] Ready for Phase 9.2 integration

---

## Next Phase Preview

**Phase 9.2 — Evaluation Engine**

Will implement:
- `lib/core/objective-evaluator.js` — System state observation
- `lib/core/evaluation-methods.js` — Check handlers
- Integration with objective schema
- Evaluation result persistence

**Dependencies from 9.1:**
- Objective schema (desired_state structure)
- State machine (status transitions)
- State Graph (objective persistence)

---

**End of Phase 9.1 Checklist**
