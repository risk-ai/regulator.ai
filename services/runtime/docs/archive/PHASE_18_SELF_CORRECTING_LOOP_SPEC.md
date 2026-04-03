# Phase 18 — Self-Correcting Loop

**Status:** ARCHITECTURALLY COMPLETE (Not Yet Implemented)  
**Category:** Autonomy Foundation  
**Dependencies:** Phases 1-17

---

## Goal

Enable Vienna to learn from execution outcomes and adapt policies/remediation without operator intervention.

**Core principle:**
> Failures are data. Policy conflicts are signals. Repeated patterns are learning opportunities.

---

## Architecture

### 1. Pattern Detection

**Purpose:** Identify recurring execution patterns

**Components:**

**Failure Clustering:**
- Group similar failures by action_type, target_id, failure_reason
- Detect repeated failures (same action fails 3+ times in 24h)
- Identify failure cascades (failure → remediation → new failure)
- Track failure-to-recovery time

**Policy Conflict Detection:**
- Detect approvals repeatedly denied for same reason
- Identify policies blocking legitimate actions
- Track policy evaluation latency
- Measure policy false-positive rate

**Remediation Effectiveness:**
- Track remediation success rate by plan template
- Identify slow remediation paths
- Detect ineffective verification steps
- Measure time-to-recovery by action type

**Data Sources:**
- Execution Ledger (execution history)
- Approval Manager (approval outcomes)
- Policy Engine (policy decisions)
- Verification Engine (verification results)

---

### 2. Policy Recommendation Engine

**Purpose:** Suggest policy improvements based on observed patterns

**Recommendation Types:**

**Constraint Relaxation:**
```
Pattern: restart_service for auth-api repeatedly denied by rate_limit
Recommendation: Increase rate limit from 3/hour to 5/hour for auth-api
Confidence: 0.85
Evidence: 12 denials in last 7 days, all during business hours
```

**New Policy Suggestions:**
```
Pattern: gateway restarts successful 18/20 times during off-hours, 4/20 during business hours
Recommendation: Add time_window constraint: allow gateway restarts only 00:00-06:00
Confidence: 0.92
Evidence: Off-hour success rate 90%, business-hour success rate 20%
```

**Policy Removal:**
```
Pattern: health_check approval required but never denied (0/47 over 30 days)
Recommendation: Remove approval requirement for health_check
Confidence: 0.78
Evidence: 47 approvals, 0 denials, avg approval time 2.3 hours, 0 failures
```

**Policy Priority Adjustment:**
```
Pattern: Policy A (rate_limit) blocks actions that Policy B (time_window) would allow
Recommendation: Swap policy priority (Policy B before Policy A)
Confidence: 0.81
Evidence: 8 conflicts in 14 days, all resolved by operator override
```

**Recommendation Schema:**
```javascript
{
  recommendation_id: "rec_abc123",
  type: "constraint_relaxation" | "new_policy" | "policy_removal" | "priority_adjustment",
  target_policy_id: "policy_xyz",
  proposed_change: { /* policy diff */ },
  pattern_id: "pattern_123",
  confidence: 0.85,
  evidence: {
    observation_window_days: 7,
    event_count: 12,
    success_rate: 0.9,
    supporting_events: ["exec_001", "exec_002", ...]
  },
  auto_apply_eligible: true,
  requires_approval: true,
  created_at: "2026-03-21T19:00:00Z"
}
```

---

### 3. Remediation Plan Improvement

**Purpose:** Optimize remediation plans based on execution history

**Improvement Types:**

**Step Reordering:**
```
Observed: health_check → restart_service → verify_health succeeds 95% of time
Alternative: restart_service → verify_health succeeds 92% but 30% faster
Recommendation: Skip health_check, go directly to restart for degraded services
```

**Verification Strength Adjustment:**
```
Observed: Strong verification (5 checks) takes 45s, Medium (3 checks) takes 12s
Success rate: Strong 98%, Medium 97%
Recommendation: Downgrade to Medium for non-critical services
```

**Retry Policy Tuning:**
```
Observed: transient failures recover 85% of time on first retry, 10% on second, 2% on third
Recommendation: Reduce max_attempts from 5 to 2, reduce retry overhead
```

**Timeout Adjustment:**
```
Observed: restart_service completes in <10s 95% of time, timeout set to 60s
Recommendation: Reduce timeout to 15s, fail faster on hung operations
```

**Plan Improvement Schema:**
```javascript
{
  improvement_id: "imp_abc123",
  plan_template_id: "gateway_recovery",
  improvement_type: "step_reordering" | "verification_adjustment" | "retry_tuning" | "timeout_adjustment",
  current_plan: { /* existing plan */ },
  proposed_plan: { /* improved plan */ },
  expected_benefit: {
    time_reduction_pct: 30,
    success_rate_impact: 0.02,
    cost_reduction_pct: 15
  },
  evidence: {
    executions_analyzed: 47,
    success_rate_current: 0.95,
    avg_duration_current_ms: 45000,
    success_rate_proposed: 0.97,
    avg_duration_proposed_ms: 31500
  },
  confidence: 0.88,
  requires_approval: true,
  created_at: "2026-03-21T19:00:00Z"
}
```

---

### 4. Operator Feedback Integration

**Purpose:** Use operator approval/denial patterns to inform learning

**Feedback Signals:**

**Approval Patterns:**
- Actions repeatedly approved → candidate for auto-approval policy
- Actions approved quickly (<5 min) → low-risk classification
- Actions approved slowly (>2 hours) → high operator burden

**Denial Patterns:**
- Actions repeatedly denied → candidate for blocking policy
- Denials with same reason → specific constraint needed
- Denials during specific times → time-window constraint needed

**Override Patterns:**
- Operator overrides policy denial → policy too strict
- Operator overrides safe mode → false alarm detection
- Operator manually triggers action → missing automation opportunity

**Feedback Schema:**
```javascript
{
  feedback_id: "fb_abc123",
  source: "approval" | "denial" | "override" | "manual_trigger",
  action_type: "restart_service",
  target_id: "auth-api",
  operator: "operator@example.com",
  decision: "approved" | "denied" | "override",
  reason: "Business hours maintenance window",
  timestamp: "2026-03-21T19:00:00Z",
  context: {
    approval_id: "appr_123",
    execution_id: "exec_456",
    time_to_decision_ms: 12000
  }
}
```

---

## Learning Loop

### 1. Observation Phase (Continuous)

**Inputs:**
- Execution Ledger events
- Approval outcomes
- Policy decisions
- Verification results
- Operator feedback

**Processing:**
- Aggregate by action_type, target_id, time window
- Compute success rates, failure rates, latency stats
- Identify outliers and anomalies

**Output:**
- Raw pattern candidates

---

### 2. Analysis Phase (Every 6 hours)

**Inputs:**
- Raw pattern candidates from observation

**Processing:**
- Cluster similar patterns
- Compute confidence scores
- Filter low-confidence patterns (confidence < 0.7)
- Rank patterns by impact (frequency × severity)

**Output:**
- High-confidence patterns → Pattern Storage

---

### 3. Recommendation Phase (Every 12 hours)

**Inputs:**
- High-confidence patterns

**Processing:**
- Generate policy recommendations
- Generate remediation improvements
- Compute expected benefit
- Determine auto-apply eligibility

**Output:**
- Recommendations → Recommendation Queue

---

### 4. Application Phase (Gated)

**For auto-apply eligible recommendations (confidence > 0.9, low risk):**
- Apply change automatically
- Record in Learning History
- Emit ledger event: `policy_auto_adapted`
- Monitor for regressions (7-day window)

**For high-risk recommendations (requires approval):**
- Create approval request
- Present evidence to operator
- Await operator decision
- Apply if approved, discard if denied

---

## State Graph Extensions

**New Tables:**

```sql
-- Pattern storage
CREATE TABLE learning_patterns (
  pattern_id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- failure_cluster, policy_conflict, remediation_effectiveness
  action_type TEXT,
  target_id TEXT,
  observation_window_days INTEGER,
  event_count INTEGER,
  confidence REAL,
  metadata TEXT, -- JSON
  created_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL
);

-- Recommendations
CREATE TABLE learning_recommendations (
  recommendation_id TEXT PRIMARY KEY,
  recommendation_type TEXT NOT NULL,
  target_policy_id TEXT,
  proposed_change TEXT, -- JSON
  pattern_id TEXT REFERENCES learning_patterns(pattern_id),
  confidence REAL,
  evidence TEXT, -- JSON
  auto_apply_eligible INTEGER,
  requires_approval INTEGER,
  status TEXT, -- pending, approved, denied, applied, reverted
  created_at TEXT NOT NULL,
  applied_at TEXT,
  reverted_at TEXT,
  FOREIGN KEY (pattern_id) REFERENCES learning_patterns(pattern_id)
);

-- Learning history
CREATE TABLE learning_history (
  history_id TEXT PRIMARY KEY,
  recommendation_id TEXT REFERENCES learning_recommendations(recommendation_id),
  action TEXT, -- applied, reverted, rejected
  reason TEXT,
  operator TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT, -- JSON
  FOREIGN KEY (recommendation_id) REFERENCES learning_recommendations(recommendation_id)
);

-- Operator feedback
CREATE TABLE operator_feedback (
  feedback_id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- approval, denial, override, manual_trigger
  action_type TEXT,
  target_id TEXT,
  operator TEXT,
  decision TEXT,
  reason TEXT,
  timestamp TEXT NOT NULL,
  context TEXT -- JSON
);
```

---

## Implementation Components

**Planned Modules:**

1. **`lib/learning/pattern-detector.js`**
   - Failure clustering
   - Policy conflict detection
   - Remediation effectiveness tracking

2. **`lib/learning/policy-recommender.js`**
   - Constraint relaxation logic
   - New policy suggestions
   - Policy removal candidates
   - Priority adjustment logic

3. **`lib/learning/plan-optimizer.js`**
   - Step reordering
   - Verification strength adjustment
   - Retry policy tuning
   - Timeout adjustment

4. **`lib/learning/feedback-integrator.js`**
   - Approval pattern analysis
   - Denial pattern analysis
   - Override pattern detection

5. **`lib/learning/learning-coordinator.js`**
   - Observation loop
   - Analysis scheduler
   - Recommendation generator
   - Auto-apply logic

**Planned Tests:**

- Pattern detection (20 tests)
- Policy recommendations (25 tests)
- Plan optimization (20 tests)
- Feedback integration (15 tests)
- Learning coordinator (20 tests)

**Total:** ~100 tests

---

## Safety Constraints

### 1. Confidence Thresholds

**Auto-apply:** confidence >= 0.9, risk_tier = T0  
**Operator approval:** confidence >= 0.7, risk_tier = T1/T2  
**Discard:** confidence < 0.7

### 2. Regression Detection

**Monitor applied changes for 7 days:**
- Track failure rate before/after
- If failure rate increases >10%, auto-revert
- Emit ledger event: `policy_auto_reverted`
- Operator notified of regression

### 3. Rate Limiting

**Auto-apply limits:**
- Max 3 auto-applied changes per 24 hours
- Max 1 auto-applied change per policy per 7 days
- No auto-apply during business hours (configurable)

### 4. Operator Override

**Operator can:**
- Disable learning for specific action_type
- Disable auto-apply globally
- Force revert of any applied change
- Manually approve/deny recommendations

---

## Ledger Events

**New event types:**

- `learning.pattern_detected` — High-confidence pattern identified
- `learning.recommendation_created` — Recommendation generated
- `learning.policy_auto_adapted` — Policy auto-applied
- `learning.policy_auto_reverted` — Regression detected, auto-reverted
- `learning.recommendation_approved` — Operator approved recommendation
- `learning.recommendation_denied` — Operator denied recommendation
- `learning.feedback_recorded` — Operator feedback captured

---

## Metrics

**Learning effectiveness:**
- Patterns detected per week
- Recommendations generated per week
- Recommendations auto-applied per week
- Recommendations approved by operator per week
- Regressions detected per week
- Auto-revert rate

**System improvement:**
- Failure rate before/after learning
- Remediation success rate before/after
- Policy denial rate before/after
- Operator approval time before/after

---

## Example Scenario

**Initial State:**
- gateway restarts require operator approval (T1)
- 20 gateway restarts in 30 days
- 18 approved, 2 denied (during business hours)
- Avg approval time: 1.2 hours
- Success rate: 95%

**Pattern Detection (Day 30):**
```
Pattern: gateway_restart repeatedly approved
Confidence: 0.88
Evidence: 18/20 approved, avg approval time 1.2h, success rate 95%
Recommendation: Remove approval requirement for gateway_restart during off-hours
```

**Operator Review:**
- Operator reviews evidence
- Approves recommendation
- New policy applied: `gateway_restart` auto-approved 00:00-06:00

**Outcome (Day 60):**
- 15 gateway restarts during off-hours (auto-approved)
- 5 gateway restarts during business hours (still require approval)
- Avg time-to-execution reduced from 1.2h to 45s (off-hours)
- Success rate: 96% (no regression)
- Operator burden reduced by 75%

**Learning History:**
```
{
  recommendation_id: "rec_001",
  type: "new_policy",
  applied_at: "2026-04-15T02:00:00Z",
  operator: "operator@example.com",
  outcome: "success",
  regression_detected: false,
  impact: {
    time_to_execution_reduction_pct: 96,
    operator_burden_reduction_pct: 75,
    success_rate_delta: 0.01
  }
}
```

---

## Success Criteria

**Phase 18 is complete when:**

1. ✅ Pattern detection operational (failure clustering, policy conflicts, remediation effectiveness)
2. ✅ Policy recommendations generated (constraint relaxation, new policies, removals, priority adjustments)
3. ✅ Plan optimization operational (step reordering, verification adjustment, retry tuning, timeouts)
4. ✅ Operator feedback integrated (approval/denial/override patterns)
5. ✅ Auto-apply logic operational (confidence thresholds, regression detection, rate limiting)
6. ✅ Learning history persisted (State Graph storage)
7. ✅ 100+ tests passing (100%)

---

## Timeline Estimate

**Pattern Detection:** 3-4 days  
**Policy Recommendations:** 3-4 days  
**Plan Optimization:** 3-4 days  
**Feedback Integration:** 2-3 days  
**Learning Coordinator:** 2-3 days  
**Testing:** 2-3 days  
**Documentation:** 1-2 days  

**Total:** 16-23 days (3-4 weeks)

---

## Status

**Architecture:** ✅ COMPLETE  
**Implementation:** ⚙️ PENDING  
**Validation:** ⚙️ PENDING  

**Recommendation:** Implement after Phase 10 complete (operational reliability baseline required before autonomy)
