# Phase 18.1 — Learning Storage

**Status:** ARCHITECTURALLY COMPLETE (Not Yet Implemented)  
**Category:** Autonomy Infrastructure  
**Dependencies:** Phase 18 (Self-Correcting Loop)

---

## Goal

Provide persistent storage and query layer for Vienna's learning system.

**Core principle:**
> Learning data is operational state, not historical logs. It must be queryable, versioned, and garbage-collected.

---

## Architecture

### Storage Model

**Three-tier storage:**

1. **Hot Storage** (State Graph SQLite) — Active patterns, recent recommendations
2. **Warm Storage** (State Graph SQLite) — Applied changes, learning history (30-90 days)
3. **Cold Storage** (Archive) — Historical patterns, old recommendations (>90 days)

**Retention policies:**
- Active patterns: Until confidence drops below threshold or superseded
- Recommendations: Until applied/denied + 90 days
- Learning history: 1 year
- Operator feedback: 1 year

---

## State Graph Schema

**Tables from Phase 18:**

```sql
CREATE TABLE learning_patterns (
  pattern_id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  action_type TEXT,
  target_id TEXT,
  observation_window_days INTEGER,
  event_count INTEGER,
  confidence REAL,
  metadata TEXT, -- JSON: {evidence, thresholds, statistics}
  created_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  superseded_by TEXT, -- pattern_id of newer pattern
  status TEXT DEFAULT 'active' -- active, superseded, expired
);

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
  approved_by TEXT,
  denied_by TEXT,
  denial_reason TEXT,
  FOREIGN KEY (pattern_id) REFERENCES learning_patterns(pattern_id)
);

CREATE TABLE learning_history (
  history_id TEXT PRIMARY KEY,
  recommendation_id TEXT REFERENCES learning_recommendations(recommendation_id),
  action TEXT, -- applied, reverted, rejected
  reason TEXT,
  operator TEXT,
  timestamp TEXT NOT NULL,
  metadata TEXT, -- JSON: {before, after, impact}
  FOREIGN KEY (recommendation_id) REFERENCES learning_recommendations(recommendation_id)
);

CREATE TABLE operator_feedback (
  feedback_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  action_type TEXT,
  target_id TEXT,
  operator TEXT,
  decision TEXT,
  reason TEXT,
  timestamp TEXT NOT NULL,
  context TEXT, -- JSON: {approval_id, execution_id, etc}
  processed INTEGER DEFAULT 0, -- Has feedback been incorporated into learning?
  processed_at TEXT
);

-- Indexes for fast queries
CREATE INDEX idx_patterns_type_confidence ON learning_patterns(pattern_type, confidence);
CREATE INDEX idx_patterns_action_target ON learning_patterns(action_type, target_id);
CREATE INDEX idx_patterns_status ON learning_patterns(status);
CREATE INDEX idx_recommendations_status ON learning_recommendations(status);
CREATE INDEX idx_recommendations_confidence ON learning_recommendations(confidence);
CREATE INDEX idx_feedback_processed ON operator_feedback(processed);
CREATE INDEX idx_feedback_action_target ON operator_feedback(action_type, target_id);
```

---

## Query API

### Pattern Queries

**List active patterns:**
```javascript
listPatterns({
  pattern_type: 'failure_cluster' | 'policy_conflict' | 'remediation_effectiveness',
  action_type: 'restart_service',
  target_id: 'auth-api',
  min_confidence: 0.7,
  status: 'active',
  limit: 50
})
```

**Get pattern details:**
```javascript
getPattern(pattern_id)
// Returns: pattern + linked recommendations + evidence
```

**Find superseding patterns:**
```javascript
getPatternEvolution(pattern_id)
// Returns: original pattern → superseding pattern chain
```

---

### Recommendation Queries

**List pending recommendations:**
```javascript
listRecommendations({
  status: 'pending',
  recommendation_type: 'constraint_relaxation',
  min_confidence: 0.8,
  auto_apply_eligible: true,
  limit: 20
})
```

**Get recommendation with evidence:**
```javascript
getRecommendation(recommendation_id)
// Returns: recommendation + pattern + supporting executions
```

**List applied recommendations (for regression monitoring):**
```javascript
listAppliedRecommendations({
  applied_since: '2026-03-14T00:00:00Z',
  status: 'applied',
  limit: 50
})
```

---

### Learning History Queries

**Get recommendation history:**
```javascript
getRecommendationHistory(recommendation_id)
// Returns: [applied, reverted, operator_overridden, ...]
```

**Query by operator:**
```javascript
listHistoryByOperator(operator, {
  action: 'approved' | 'denied' | 'reverted',
  since: '2026-03-01T00:00:00Z',
  limit: 100
})
```

**Get impact summary:**
```javascript
getLearningImpact({
  recommendation_ids: ['rec_001', 'rec_002'],
  metrics: ['success_rate_delta', 'time_reduction_pct', 'cost_reduction_pct']
})
```

---

### Feedback Queries

**List unprocessed feedback:**
```javascript
listUnprocessedFeedback({
  source: 'approval' | 'denial' | 'override',
  action_type: 'restart_service',
  limit: 100
})
```

**Mark feedback as processed:**
```javascript
markFeedbackProcessed(feedback_id, { processed_by: 'pattern_detector_v1' })
```

**Get feedback summary by action:**
```javascript
getFeedbackSummary({
  action_type: 'restart_service',
  target_id: 'auth-api',
  since: '2026-03-01T00:00:00Z'
})
// Returns: { total: 47, approved: 42, denied: 5, avg_approval_time_ms: 120000 }
```

---

## Pattern Versioning

**Challenge:** Patterns evolve as more data is observed.

**Solution:** Version patterns, supersede old versions.

**Example:**

**Week 1:**
```javascript
{
  pattern_id: "pat_001_v1",
  pattern_type: "failure_cluster",
  action_type: "restart_service",
  target_id: "auth-api",
  confidence: 0.72,
  evidence: { event_count: 8, observation_window_days: 7 },
  status: "active"
}
```

**Week 4:**
```javascript
{
  pattern_id: "pat_001_v2",
  pattern_type: "failure_cluster",
  action_type: "restart_service",
  target_id: "auth-api",
  confidence: 0.89,
  evidence: { event_count: 24, observation_window_days: 28 },
  status: "active",
  supersedes: "pat_001_v1" // Links to older version
}
```

**Query:**
```javascript
getPatternEvolution("pat_001_v1")
// Returns: [pat_001_v1 (superseded), pat_001_v2 (active)]
```

**Garbage collection:**
- Superseded patterns kept for 90 days
- Then archived to cold storage
- Confidence drop below 0.5 → mark as expired

---

## Confidence Decay

**Challenge:** Stale patterns lose relevance.

**Solution:** Decay confidence over time if not re-observed.

**Decay function:**
```javascript
confidence_current = confidence_initial × decay_factor^(days_since_last_observed / half_life_days)

// Example:
// confidence_initial = 0.9
// half_life_days = 30
// days_since_last_observed = 60
// confidence_current = 0.9 × 0.5^(60/30) = 0.9 × 0.25 = 0.225
```

**Decay policy:**
- Half-life: 30 days
- Min confidence before expiry: 0.5
- Re-observation resets last_observed_at (stops decay)

**Scheduled task:**
```javascript
// Run daily
updatePatternConfidence() {
  const activePatterns = listPatterns({ status: 'active' });
  
  for (const pattern of activePatterns) {
    const daysSinceObserved = (Date.now() - pattern.last_observed_at) / (24*60*60*1000);
    const decayFactor = Math.pow(0.5, daysSinceObserved / 30);
    const newConfidence = pattern.confidence * decayFactor;
    
    if (newConfidence < 0.5) {
      updatePattern(pattern.pattern_id, { status: 'expired' });
    } else {
      updatePattern(pattern.pattern_id, { confidence: newConfidence });
    }
  }
}
```

---

## Garbage Collection

**Retention policies:**

**Active patterns:**
- Keep while status = 'active'
- Expire when confidence < 0.5 or superseded

**Recommendations:**
- Pending: Keep until approved/denied
- Applied: Keep 90 days after application
- Denied: Keep 90 days after denial
- Reverted: Keep 1 year (important for regression analysis)

**Learning history:**
- Keep 1 year
- Archive to cold storage after 1 year

**Operator feedback:**
- Keep processed feedback 1 year
- Keep unprocessed feedback indefinitely (manual review needed)

**Scheduled task:**
```javascript
// Run weekly
garbageCollectLearningData() {
  const now = Date.now();
  
  // Archive old recommendations
  const oldRecommendations = listRecommendations({
    status: ['applied', 'denied'],
    applied_before: subtractDays(now, 90),
    denied_before: subtractDays(now, 90)
  });
  
  for (const rec of oldRecommendations) {
    archiveRecommendation(rec.recommendation_id);
  }
  
  // Archive old history
  const oldHistory = listHistory({
    timestamp_before: subtractDays(now, 365)
  });
  
  for (const hist of oldHistory) {
    archiveHistory(hist.history_id);
  }
  
  // Archive expired patterns
  const expiredPatterns = listPatterns({ status: 'expired' });
  
  for (const pattern of expiredPatterns) {
    archivePattern(pattern.pattern_id);
  }
}
```

---

## Archive Format

**Cold storage location:** `~/.openclaw/runtime/{prod|test}/archive/learning/`

**Archive structure:**
```
learning/
  patterns/
    2026-03/
      pat_001_v1.json
      pat_002_v1.json
  recommendations/
    2026-03/
      rec_001.json
      rec_002.json
  history/
    2026-03/
      hist_001.json
      hist_002.json
```

**Archive JSON format:**
```javascript
{
  archived_at: "2026-06-15T00:00:00Z",
  retention_until: "2027-06-15T00:00:00Z", // 1 year from archive
  entity_type: "pattern" | "recommendation" | "history",
  entity_id: "pat_001_v1",
  entity_data: { /* full entity JSON */ },
  metadata: {
    archival_reason: "expired" | "superseded" | "retention_policy",
    active_duration_days: 90,
    final_confidence: 0.42
  }
}
```

---

## Restoration API

**Restore archived pattern:**
```javascript
restorePattern(pattern_id)
// Moves from cold storage back to State Graph
// Status set to 'restored' (not 'active')
```

**Query archived data:**
```javascript
queryArchive({
  entity_type: 'pattern',
  pattern_type: 'failure_cluster',
  archived_since: '2026-01-01T00:00:00Z',
  limit: 50
})
```

---

## Implementation Components

**Planned Modules:**

1. **`lib/learning/storage/pattern-store.js`**
   - CRUD operations for patterns
   - Pattern versioning
   - Confidence decay
   - Query API

2. **`lib/learning/storage/recommendation-store.js`**
   - CRUD operations for recommendations
   - Recommendation lifecycle tracking
   - Evidence linking

3. **`lib/learning/storage/history-store.js`**
   - Learning history persistence
   - Impact tracking
   - Timeline reconstruction

4. **`lib/learning/storage/feedback-store.js`**
   - Operator feedback persistence
   - Feedback aggregation
   - Processed flag management

5. **`lib/learning/storage/garbage-collector.js`**
   - Confidence decay scheduler
   - Retention policy enforcement
   - Archive management

6. **`lib/learning/storage/archive-manager.js`**
   - Cold storage writes
   - Archive queries
   - Restoration logic

**Planned Tests:**

- Pattern store (25 tests)
- Recommendation store (25 tests)
- History store (20 tests)
- Feedback store (20 tests)
- Garbage collector (15 tests)
- Archive manager (15 tests)

**Total:** ~120 tests

---

## Success Criteria

**Phase 18.1 is complete when:**

1. ✅ Pattern storage operational (CRUD, versioning, confidence decay)
2. ✅ Recommendation storage operational (CRUD, lifecycle tracking)
3. ✅ Learning history persisted (impact tracking, timeline reconstruction)
4. ✅ Operator feedback stored (aggregation, processing flags)
5. ✅ Garbage collection operational (retention policies, archival)
6. ✅ Archive manager operational (cold storage, restoration)
7. ✅ 120+ tests passing (100%)

---

## Timeline Estimate

**Pattern Store:** 2-3 days  
**Recommendation Store:** 2-3 days  
**History Store:** 2 days  
**Feedback Store:** 2 days  
**Garbage Collector:** 2-3 days  
**Archive Manager:** 2-3 days  
**Testing:** 2-3 days  
**Documentation:** 1-2 days  

**Total:** 15-21 days (3-4 weeks)

---

## Status

**Architecture:** ✅ COMPLETE  
**Implementation:** ⚙️ PENDING  
**Validation:** ⚙️ PENDING  

**Recommendation:** Implement alongside Phase 18 (shared schema design session recommended)
