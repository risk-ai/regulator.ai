# Phase 15 — Detection Layer Implementation Plan

**Status:** Planning  
**Start Date:** 2026-03-19  
**Priority:** P0 (Primary focus through Saturday)

---

## Mission

Enable Vienna to detect anomalies, declare objectives, and propose intents for operator review while preserving all governance constraints.

**Core Invariant:**
```
Detection is NOT authority.
Anomaly → Objective → Proposed Intent → Operator Review → Governance → Execution
```

**No bypass path exists.**

---

## Phase 15 Architecture

### Flow Diagram

```
System Event
  ↓
Detector (observes)
  ↓
Anomaly (detected)
  ↓
Objective Declaration (goal)
  ↓
Intent Proposal (suggested action)
  ↓
Operator Review (approve/reject/modify)
  ↓
[IF APPROVED]
  ↓
Governance Pipeline (policy → admission → warrant)
  ↓
Execution
  ↓
Verification
  ↓
Audit Trail
```

### Authority Boundaries

**Detectors can:**
- Observe system state
- Create anomaly records
- Suggest objectives

**Detectors CANNOT:**
- Execute actions
- Bypass governance
- Approve proposals
- Modify system state

**Proposal Engine can:**
- Generate suggested intents
- Map anomaly → objective → intent
- Explain reasoning

**Proposal Engine CANNOT:**
- Execute proposals
- Skip operator review
- Grant approval

**Operator can:**
- Review proposals
- Approve/reject/modify
- Request more evidence

**Governance can:**
- Admit approved proposals
- Apply policy constraints
- Issue warrants
- Block unsafe execution

---

## Component Breakdown

### 1. Anomaly Model (Foundation)

**File:** `lib/core/anomaly-schema.js`

**Entity:** `Anomaly`

**Fields:**
```javascript
{
  anomaly_id: string,          // ano_<timestamp>_<random>
  anomaly_type: enum,          // state/behavioral/policy/temporal/graph
  severity: enum,              // low/medium/high/critical
  source: string,              // detector name
  entity_type: string,         // service/objective/intent/execution
  entity_id: string,           // linked entity
  evidence: object,            // structured evidence
  confidence: float,           // 0.0-1.0
  detected_at: timestamp,
  status: enum,                // new/reviewing/acknowledged/resolved/false_positive
  reviewed_by: string,
  reviewed_at: timestamp,
  resolution: string
}
```

**Anomaly Types:**
- `state` — Service unhealthy, provider degraded
- `behavioral` — Repeated failures, stuck objectives
- `policy` — Repeated denials, constraint violations
- `temporal` — Overdue verifications, stale evaluations
- `graph` — Broken linkages, orphaned entities

**Status Transitions:**
```
new → reviewing → acknowledged → resolved
new → reviewing → false_positive
```

**Validation rules:**
- confidence must be 0.0-1.0
- severity must be valid enum
- entity_type + entity_id must be consistent
- evidence must be non-empty object

**File:** `lib/core/anomaly-schema.js` (~300 lines)

---

### 2. Anomaly Persistence (State Graph)

**Tables:**

**`anomalies` table:**
```sql
CREATE TABLE anomalies (
  anomaly_id TEXT PRIMARY KEY,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  evidence TEXT,           -- JSON
  confidence REAL,
  detected_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  reviewed_by TEXT,
  reviewed_at TEXT,
  resolution TEXT
);
```

**`anomaly_history` table:**
```sql
CREATE TABLE anomaly_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anomaly_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- detected, reviewed, resolved, etc.
  event_data TEXT,           -- JSON
  created_at TEXT NOT NULL,
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(anomaly_id)
);
```

**State Graph Methods:**
- `createAnomaly(anomalyData)`
- `getAnomaly(anomaly_id)`
- `listAnomalies(filters)` — filter by type, severity, status, entity
- `updateAnomalyStatus(anomaly_id, status, reviewed_by, resolution)`
- `recordAnomalyEvent(anomaly_id, event_type, event_data)`
- `getAnomalyHistory(anomaly_id)`

**Migration:** `lib/state/migrations/15-add-anomalies.sql`

---

### 3. Detector Framework (Trigger System)

**File:** `lib/detection/detector-framework.js`

**Core Interface:**

```javascript
class Detector {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }

  // Abstract method — must implement
  async detect() {
    throw new Error('Detector must implement detect()');
  }

  // Returns anomaly candidates
  async run() {
    const candidates = await this.detect();
    return candidates.filter(c => c.confidence >= this.config.threshold);
  }
}
```

**Built-in Detectors (Phase 15.1):**

1. **ServiceHealthDetector**
   - Monitors: `services` table status
   - Anomaly: `state` when service unhealthy
   - Evidence: service_id, last_status, health_check_result

2. **ObjectiveStallDetector**
   - Monitors: `managed_objectives` with status=monitoring
   - Anomaly: `behavioral` when no evaluation in >N minutes
   - Evidence: objective_id, last_evaluated_at, evaluation_interval

3. **ExecutionFailureDetector**
   - Monitors: `execution_ledger_summary` with status=failed
   - Anomaly: `behavioral` when >N failures in window
   - Evidence: objective_id, failure_count, time_window

4. **PolicyDenialDetector**
   - Monitors: `policy_decisions` with decision=deny
   - Anomaly: `policy` when repeated denials for same target
   - Evidence: policy_id, target_id, denial_count, reasons

5. **VerificationOverdueDetector**
   - Monitors: `verifications` with status=pending
   - Anomaly: `temporal` when verification overdue
   - Evidence: verification_id, plan_id, created_at, timeout

**Detector Registry:**

```javascript
class DetectorRegistry {
  constructor() {
    this.detectors = new Map();
  }

  register(detector) {
    this.detectors.set(detector.name, detector);
  }

  async runAll() {
    const results = [];
    for (const [name, detector] of this.detectors) {
      const anomalies = await detector.run();
      results.push(...anomalies);
    }
    return results;
  }

  async runOne(name) {
    const detector = this.detectors.get(name);
    if (!detector) throw new Error(`Detector not found: ${name}`);
    return await detector.run();
  }
}
```

**File:** `lib/detection/detector-framework.js` (~400 lines)

**Detector Implementations:** `lib/detection/detectors/` (5 files, ~800 lines total)

---

### 4. Objective Declaration Rules

**File:** `lib/detection/objective-declaration.js`

**Purpose:** Map anomaly → objective

**Declaration Rules:**

```javascript
const DECLARATION_RULES = {
  state: {
    service_unhealthy: {
      objective_type: 'service_health',
      objective_name: 'restore_{entity_id}_health',
      desired_state: { status: 'healthy' },
      verification_strength: 'strong'
    }
  },
  behavioral: {
    objective_stalled: {
      objective_type: 'objective_recovery',
      objective_name: 'investigate_{entity_id}_stall',
      desired_state: { status: 'monitoring' },
      verification_strength: 'moderate'
    },
    execution_repeated_failure: {
      objective_type: 'execution_stability',
      objective_name: 'stabilize_{target_id}_execution',
      desired_state: { failure_rate: '<10%' },
      verification_strength: 'strong'
    }
  },
  policy: {
    repeated_denials: {
      objective_type: 'policy_review',
      objective_name: 'review_policy_{policy_id}',
      desired_state: { policy_effectiveness: 'verified' },
      verification_strength: 'moderate'
    }
  },
  temporal: {
    verification_overdue: {
      objective_type: 'verification_completion',
      objective_name: 'complete_verification_{verification_id}',
      desired_state: { verification_status: 'completed' },
      verification_strength: 'strong'
    }
  },
  graph: {
    broken_linkage: {
      objective_type: 'graph_integrity',
      objective_name: 'repair_linkage_{entity_id}',
      desired_state: { graph_consistent: true },
      verification_strength: 'weak'
    }
  }
};
```

**ObjectiveDeclarationEngine:**

```javascript
class ObjectiveDeclarationEngine {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  // Main entry point
  async declareFromAnomaly(anomaly) {
    const rule = this.findRule(anomaly);
    if (!rule) return null;

    const objectiveSpec = this.buildObjective(anomaly, rule);
    const objective = await this.stateGraph.createManagedObjective(objectiveSpec);

    // Link anomaly → objective
    await this.stateGraph.linkAnomalyToObjective(anomaly.anomaly_id, objective.objective_id);

    // Record event
    await this.stateGraph.recordAnomalyEvent(anomaly.anomaly_id, 'objective_declared', {
      objective_id: objective.objective_id
    });

    return objective;
  }

  findRule(anomaly) {
    return DECLARATION_RULES[anomaly.anomaly_type]?.[anomaly.sub_type];
  }

  buildObjective(anomaly, rule) {
    return {
      objective_name: this.interpolate(rule.objective_name, anomaly),
      objective_type: rule.objective_type,
      target_type: anomaly.entity_type,
      target_id: anomaly.entity_id,
      desired_state: rule.desired_state,
      verification_strength: rule.verification_strength,
      evaluation_interval: '5m',
      metadata: {
        declared_from_anomaly: anomaly.anomaly_id,
        anomaly_type: anomaly.anomaly_type,
        anomaly_severity: anomaly.severity,
        auto_declared: true
      }
    };
  }

  interpolate(template, anomaly) {
    return template.replace(/\{(\w+)\}/g, (_, key) => anomaly[key] || key);
  }
}
```

**File:** `lib/detection/objective-declaration.js` (~350 lines)

---

### 5. Proposal Model

**File:** `lib/core/proposal-schema.js`

**Entity:** `Proposal`

**Fields:**
```javascript
{
  proposal_id: string,         // prop_<timestamp>_<random>
  proposal_type: enum,         // investigate/restore/reconcile/escalate/notify/quarantine
  objective_id: string,        // linked objective
  anomaly_id: string,          // originating anomaly
  suggested_intent: object,    // IntentObject structure
  rationale: string,           // explanation
  risk_assessment: object,     // {risk_tier, impact, reversibility}
  confidence: float,           // 0.0-1.0
  created_at: timestamp,
  status: enum,                // pending/approved/rejected/modified/expired
  reviewed_by: string,
  reviewed_at: timestamp,
  approval_decision: object,   // {approved, modifications, reason}
  expires_at: timestamp
}
```

**Proposal Types:**
- `investigate` — Launch investigation
- `restore` — Restore service/objective
- `reconcile` — Fix state drift
- `escalate` — Escalate to operator/incident
- `notify` — Send notification
- `quarantine` — Isolate failing entity

**Status Transitions:**
```
pending → approved → executed
pending → rejected
pending → modified → approved
pending → expired
```

**Validation:**
- suggested_intent must be valid IntentObject
- risk_assessment must include risk_tier
- expires_at must be > created_at
- status transitions must be valid

**File:** `lib/core/proposal-schema.js` (~300 lines)

---

### 6. Proposal Persistence

**Table:**

```sql
CREATE TABLE proposals (
  proposal_id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL,
  objective_id TEXT,
  anomaly_id TEXT,
  suggested_intent TEXT NOT NULL,  -- JSON
  rationale TEXT,
  risk_assessment TEXT,            -- JSON
  confidence REAL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  approval_decision TEXT,          -- JSON
  expires_at TEXT,
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id),
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(anomaly_id)
);
```

**State Graph Methods:**
- `createProposal(proposalData)`
- `getProposal(proposal_id)`
- `listProposals(filters)` — filter by status, type, objective_id
- `reviewProposal(proposal_id, decision)` — approve/reject/modify
- `expireProposal(proposal_id)` — mark expired
- `linkProposalToIncident(proposal_id, incident_id)`

**Migration:** `lib/state/migrations/15-add-proposals.sql` (combined with anomalies)

---

### 7. Intent Proposal Engine

**File:** `lib/detection/intent-proposal-engine.js`

**Purpose:** Generate suggested intents from objectives

**Proposal Templates:**

```javascript
const PROPOSAL_TEMPLATES = {
  service_health: {
    proposal_type: 'restore',
    intent_action: 'restart_service',
    risk_tier: 'T1',
    rationale: 'Service {target_id} is unhealthy. Restart may restore operation.',
    preconditions: ['service_exists', 'not_recently_restarted'],
    verification: {
      template: 'service_recovery',
      timeout: 300
    }
  },
  objective_recovery: {
    proposal_type: 'investigate',
    intent_action: 'investigate_objective',
    risk_tier: 'T0',
    rationale: 'Objective {objective_id} has stalled. Investigation recommended.',
    preconditions: ['objective_exists', 'not_recently_investigated'],
    verification: {
      template: 'investigation_created',
      timeout: 60
    }
  },
  execution_stability: {
    proposal_type: 'reconcile',
    intent_action: 'reconcile_state',
    risk_tier: 'T1',
    rationale: 'Execution failures detected. State reconciliation may resolve.',
    preconditions: ['no_active_reconciliation'],
    verification: {
      template: 'execution_stable',
      timeout: 300
    }
  },
  policy_review: {
    proposal_type: 'escalate',
    intent_action: 'escalate_to_operator',
    risk_tier: 'T0',
    rationale: 'Policy {policy_id} blocking repeatedly. Operator review needed.',
    preconditions: [],
    verification: {
      template: 'operator_notified',
      timeout: 30
    }
  },
  verification_completion: {
    proposal_type: 'escalate',
    intent_action: 'escalate_verification',
    risk_tier: 'T0',
    rationale: 'Verification {verification_id} overdue. Manual review needed.',
    preconditions: [],
    verification: {
      template: 'escalation_recorded',
      timeout: 30
    }
  }
};
```

**IntentProposalEngine:**

```javascript
class IntentProposalEngine {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  async proposeFromObjective(objective) {
    const template = PROPOSAL_TEMPLATES[objective.objective_type];
    if (!template) {
      return this.createEscalationProposal(objective);
    }

    // Check preconditions
    const preconditionsCheck = await this.checkPreconditions(template.preconditions, objective);
    if (!preconditionsCheck.passed) {
      return this.createBlockedProposal(objective, preconditionsCheck.reason);
    }

    // Build suggested intent
    const suggestedIntent = this.buildIntent(objective, template);

    // Create proposal
    const proposal = await this.stateGraph.createProposal({
      proposal_type: template.proposal_type,
      objective_id: objective.objective_id,
      anomaly_id: objective.metadata?.declared_from_anomaly,
      suggested_intent: suggestedIntent,
      rationale: this.interpolate(template.rationale, objective),
      risk_assessment: {
        risk_tier: template.risk_tier,
        impact: this.assessImpact(objective),
        reversibility: this.assessReversibility(template)
      },
      confidence: this.calculateConfidence(objective, template),
      expires_at: this.calculateExpiry(template)
    });

    return proposal;
  }

  buildIntent(objective, template) {
    return {
      intent_type: 'proposed',
      action: template.intent_action,
      target_type: objective.target_type,
      target_id: objective.target_id,
      parameters: this.extractParameters(objective, template),
      verification_spec: template.verification,
      risk_tier: template.risk_tier,
      metadata: {
        proposed_from_objective: objective.objective_id,
        proposal_confidence: this.calculateConfidence(objective, template)
      }
    };
  }

  async checkPreconditions(preconditions, objective) {
    for (const precondition of preconditions) {
      const checker = this.preconditionCheckers[precondition];
      if (!checker) continue;
      
      const result = await checker(objective, this.stateGraph);
      if (!result.passed) {
        return { passed: false, reason: result.reason };
      }
    }
    return { passed: true };
  }

  preconditionCheckers = {
    service_exists: async (obj, sg) => {
      const service = await sg.getService(obj.target_id);
      return { passed: !!service, reason: 'Service not found' };
    },
    not_recently_restarted: async (obj, sg) => {
      const recent = await sg.listExecutionLedger({
        target_id: obj.target_id,
        intent_action: 'restart_service',
        time_range: '5m'
      });
      return { passed: recent.length === 0, reason: 'Recently restarted' };
    },
    objective_exists: async (obj, sg) => {
      const objective = await sg.getManagedObjective(obj.target_id);
      return { passed: !!objective, reason: 'Objective not found' };
    },
    not_recently_investigated: async (obj, sg) => {
      const investigations = await sg.listInvestigations({
        objective_id: obj.target_id,
        status: 'investigating',
        limit: 1
      });
      return { passed: investigations.length === 0, reason: 'Already investigating' };
    },
    no_active_reconciliation: async (obj, sg) => {
      const active = await sg.listManagedObjectives({
        target_id: obj.target_id,
        status: 'reconciling',
        limit: 1
      });
      return { passed: active.length === 0, reason: 'Reconciliation in progress' };
    }
  };

  calculateConfidence(objective, template) {
    // Base confidence from template
    let confidence = 0.7;

    // Boost if anomaly confidence high
    if (objective.metadata?.anomaly_confidence > 0.8) {
      confidence += 0.1;
    }

    // Reduce if objective is new
    if (!objective.last_evaluated_at) {
      confidence -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  calculateExpiry(template) {
    // Proposals expire after 1 hour
    return new Date(Date.now() + 3600000).toISOString();
  }

  assessImpact(objective) {
    if (objective.target_type === 'service') return 'medium';
    if (objective.target_type === 'objective') return 'low';
    return 'low';
  }

  assessReversibility(template) {
    if (template.intent_action.includes('restart')) return 'reversible';
    if (template.intent_action.includes('investigate')) return 'safe';
    return 'reversible';
  }

  createEscalationProposal(objective) {
    return this.stateGraph.createProposal({
      proposal_type: 'escalate',
      objective_id: objective.objective_id,
      suggested_intent: {
        intent_type: 'proposed',
        action: 'escalate_to_operator',
        parameters: { reason: 'No automatic proposal available' }
      },
      rationale: `Objective ${objective.objective_id} requires operator review.`,
      risk_assessment: { risk_tier: 'T0', impact: 'none', reversibility: 'safe' },
      confidence: 1.0,
      expires_at: this.calculateExpiry({})
    });
  }

  createBlockedProposal(objective, reason) {
    return this.stateGraph.createProposal({
      proposal_type: 'escalate',
      objective_id: objective.objective_id,
      suggested_intent: {
        intent_type: 'proposed',
        action: 'escalate_to_operator',
        parameters: { reason: `Precondition failed: ${reason}` }
      },
      rationale: `Cannot auto-propose for ${objective.objective_id}: ${reason}`,
      risk_assessment: { risk_tier: 'T0', impact: 'none', reversibility: 'safe' },
      confidence: 1.0,
      expires_at: this.calculateExpiry({})
    });
  }

  interpolate(template, obj) {
    return template.replace(/\{(\w+)\}/g, (_, key) => obj[key] || key);
  }

  extractParameters(objective, template) {
    return {
      target_id: objective.target_id,
      objective_id: objective.objective_id
    };
  }
}
```

**File:** `lib/detection/intent-proposal-engine.js` (~600 lines)

---

### 8. Operator Review Flow

**File:** `lib/core/proposal-review.js`

**ProposalReviewer:**

```javascript
class ProposalReviewer {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  async approve(proposal_id, reviewed_by, modifications = null) {
    const proposal = await this.stateGraph.getProposal(proposal_id);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'pending') throw new Error('Proposal not pending');

    const decision = {
      approved: true,
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      modifications
    };

    await this.stateGraph.reviewProposal(proposal_id, decision);

    // If approved, create actual intent and enter governance pipeline
    const intent = modifications 
      ? { ...proposal.suggested_intent, ...modifications }
      : proposal.suggested_intent;

    // Create plan from intent
    const planGenerator = require('./plan-generator');
    const plan = await planGenerator.generatePlan(intent);

    // Policy evaluation happens here (Phase 8.4)
    const policyEngine = require('./constraint-evaluator');
    const policyDecision = await policyEngine.evaluateForPlan(plan);

    if (!policyDecision.allowed) {
      // Policy blocked even after approval
      await this.stateGraph.recordProposalEvent(proposal_id, 'policy_blocked', {
        reason: policyDecision.reason
      });
      return { admitted: false, reason: policyDecision.reason };
    }

    // Governance admitted
    await this.stateGraph.recordProposalEvent(proposal_id, 'admitted_to_governance');
    
    return { admitted: true, plan_id: plan.plan_id };
  }

  async reject(proposal_id, reviewed_by, reason) {
    const proposal = await this.stateGraph.getProposal(proposal_id);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'pending') throw new Error('Proposal not pending');

    const decision = {
      approved: false,
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      reason
    };

    await this.stateGraph.reviewProposal(proposal_id, decision);
    await this.stateGraph.recordProposalEvent(proposal_id, 'rejected', { reason });

    return { rejected: true };
  }

  async modify(proposal_id, reviewed_by, modifications) {
    const proposal = await this.stateGraph.getProposal(proposal_id);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'pending') throw new Error('Proposal not pending');

    // Update status to modified
    await this.stateGraph.updateProposal(proposal_id, {
      status: 'modified',
      approval_decision: {
        approved: null,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        modifications
      }
    });

    await this.stateGraph.recordProposalEvent(proposal_id, 'modified', { modifications });

    return { modified: true };
  }
}
```

**File:** `lib/core/proposal-review.js` (~250 lines)

---

### 9. Detection Orchestrator

**File:** `lib/detection/detection-orchestrator.js`

**Purpose:** Coordinate full detection → objective → proposal flow

**DetectionOrchestrator:**

```javascript
class DetectionOrchestrator {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
    this.detectorRegistry = new DetectorRegistry();
    this.objectiveDeclaration = new ObjectiveDeclarationEngine(stateGraph);
    this.intentProposal = new IntentProposalEngine(stateGraph);
  }

  async runDetectionCycle() {
    console.log('[DetectionOrchestrator] Starting detection cycle');

    // Step 1: Run all detectors
    const anomalies = await this.detectorRegistry.runAll();
    console.log(`[DetectionOrchestrator] Detected ${anomalies.length} anomalies`);

    // Step 2: Persist anomalies
    const persistedAnomalies = [];
    for (const anomaly of anomalies) {
      const persisted = await this.stateGraph.createAnomaly(anomaly);
      persistedAnomalies.push(persisted);
    }

    // Step 3: Declare objectives from anomalies
    const objectives = [];
    for (const anomaly of persistedAnomalies) {
      if (await this.shouldDeclareObjective(anomaly)) {
        const objective = await this.objectiveDeclaration.declareFromAnomaly(anomaly);
        if (objective) {
          objectives.push(objective);
          console.log(`[DetectionOrchestrator] Declared objective: ${objective.objective_id}`);
        }
      }
    }

    // Step 4: Generate proposals from objectives
    const proposals = [];
    for (const objective of objectives) {
      if (await this.shouldProposeIntent(objective)) {
        const proposal = await this.intentProposal.proposeFromObjective(objective);
        if (proposal) {
          proposals.push(proposal);
          console.log(`[DetectionOrchestrator] Created proposal: ${proposal.proposal_id}`);
        }
      }
    }

    // Step 5: Emit summary event
    await this.stateGraph.recordRuntimeEvent('detection_cycle_completed', {
      anomalies_detected: anomalies.length,
      objectives_declared: objectives.length,
      proposals_created: proposals.length
    });

    return {
      anomalies: persistedAnomalies,
      objectives,
      proposals
    };
  }

  async shouldDeclareObjective(anomaly) {
    // Don't declare if already has objective
    const existing = await this.stateGraph.listManagedObjectives({
      metadata_key: 'declared_from_anomaly',
      metadata_value: anomaly.anomaly_id,
      limit: 1
    });
    return existing.length === 0;
  }

  async shouldProposeIntent(objective) {
    // Don't propose if already has pending proposal
    const existing = await this.stateGraph.listProposals({
      objective_id: objective.objective_id,
      status: 'pending',
      limit: 1
    });
    return existing.length === 0;
  }

  registerDetector(detector) {
    this.detectorRegistry.register(detector);
  }
}
```

**File:** `lib/detection/detection-orchestrator.js` (~300 lines)

---

### 10. Trace Emission

**Events to emit:**

**Anomaly lifecycle:**
- `anomaly.detected` — Anomaly created
- `anomaly.reviewed` — Operator reviewed
- `anomaly.resolved` — Anomaly resolved
- `anomaly.false_positive` — Marked false positive

**Objective lifecycle (new events):**
- `objective.auto_declared` — Objective declared from anomaly
- `objective.proposal_generated` — Intent proposed

**Proposal lifecycle:**
- `proposal.created` — Proposal created
- `proposal.reviewed` — Operator reviewed
- `proposal.approved` — Approved
- `proposal.rejected` — Rejected
- `proposal.modified` — Modified
- `proposal.policy_blocked` — Policy blocked after approval
- `proposal.admitted_to_governance` — Entered execution pipeline
- `proposal.expired` — Expired before review

**Integration:** Emit via existing `execution_ledger_events` table

**Extension to event types:**
```sql
-- Add to existing event types
INSERT INTO event_types VALUES
  ('anomaly.detected'),
  ('anomaly.reviewed'),
  ('anomaly.resolved'),
  ('objective.auto_declared'),
  ('objective.proposal_generated'),
  ('proposal.created'),
  ('proposal.reviewed'),
  ('proposal.approved'),
  ('proposal.rejected'),
  ('proposal.admitted_to_governance');
```

---

## Data Model Summary

**New Tables (3):**
1. `anomalies` — Anomaly records
2. `anomaly_history` — Anomaly event history
3. `proposals` — Proposed intents awaiting review

**New Relationships:**
- anomaly → objective (via metadata)
- anomaly → proposal (via foreign key)
- proposal → objective (via foreign key)
- proposal → incident (via linking table)

**Extended Tables:**
- `managed_objective_history` — New event types
- `execution_ledger_events` — New event types

**State Graph Extensions:**
- 12 new methods for anomaly CRUD
- 6 new methods for proposal CRUD
- Event emission helpers

---

## Implementation Order

### Stage 1: Foundation (2-3 hours)
1. Anomaly schema (`anomaly-schema.js`)
2. Proposal schema (`proposal-schema.js`)
3. State Graph migration (`15-add-anomalies.sql`)
4. State Graph anomaly methods
5. State Graph proposal methods

**Deliverable:** Anomaly and proposal entities can be created/queried

### Stage 2: Detection (2-3 hours)
1. Detector framework (`detector-framework.js`)
2. Detector registry
3. 5 built-in detectors (`detectors/service-health.js`, etc.)
4. Test detection cycle

**Deliverable:** Detectors can create anomaly records

### Stage 3: Objective Declaration (1-2 hours)
1. Objective declaration rules
2. Objective declaration engine (`objective-declaration.js`)
3. Test anomaly → objective

**Deliverable:** Anomalies can declare objectives

### Stage 4: Proposal Generation (2-3 hours)
1. Intent proposal templates
2. Intent proposal engine (`intent-proposal-engine.js`)
3. Precondition checkers
4. Test objective → proposal

**Deliverable:** Objectives can generate proposals

### Stage 5: Review Flow (1-2 hours)
1. Proposal reviewer (`proposal-review.js`)
2. Governance integration
3. Test proposal → plan → execution

**Deliverable:** Approved proposals enter governance

### Stage 6: Orchestration (1-2 hours)
1. Detection orchestrator (`detection-orchestrator.js`)
2. Scheduled runner
3. End-to-end test

**Deliverable:** Full detection cycle operational

### Stage 7: API Integration (2-3 hours)
1. Backend API routes (`/api/v1/anomalies`, `/api/v1/proposals`)
2. Frontend stubs (minimal)
3. Operator review endpoints

**Deliverable:** Operators can review proposals via API

### Stage 8: Testing & Validation (2-3 hours)
1. Unit tests (schema, detectors, engines)
2. Integration tests (end-to-end cycle)
3. Validation with real Vienna state

**Deliverable:** Phase 15 production-ready

---

## Total Estimated Effort

**Backend:** 14-20 hours  
**Testing:** 2-3 hours  
**Documentation:** 1-2 hours  

**Total:** 17-25 hours

**Target completion:** Saturday evening if started Thursday

---

## Success Criteria

✅ Anomalies can be detected from system state  
✅ Objectives can be auto-declared from anomalies  
✅ Intents can be proposed from objectives  
✅ Proposals can be reviewed by operator  
✅ Approved proposals enter governance pipeline  
✅ No bypass path exists  
✅ All flows preserve traceability  
✅ All events emit audit trail  
✅ Tests validate invariants  

---

## Governance Guarantees

**What Phase 15 DOES:**
- Detect anomalies
- Declare objectives
- Propose intents
- Present proposals for review

**What Phase 15 DOES NOT:**
- Execute directly from detection
- Bypass operator review
- Skip governance pipeline
- Modify system state without approval

**Invariant preserved:**
```
Detection → Proposal → Operator → Governance → Execution
```

---

## Next Steps

1. Review this plan
2. Approve implementation order
3. Start Stage 1 (Foundation)
4. Proceed sequentially through stages
5. Test continuously
6. Document as you build

**Ready to begin Stage 1?**
