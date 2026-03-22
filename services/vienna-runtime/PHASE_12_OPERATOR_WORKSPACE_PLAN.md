# Phase 12 — Operator Workspace + Artifact System

**Status:** Planning  
**Dependencies:** Phase 11.5 complete  
**Estimated duration:** 24-32 hours

---

## Goal

Create the operator working environment where traces, objectives, and artifacts can be investigated.

**Core principle:**
> The workspace is the primary debugging surface for Vienna.

---

## Primary Deliverables

### 1. Workspace File System
Structured storage for operator artifacts, investigation workspaces, and trace exports.

**Components:**
- Workspace directory structure
- Artifact metadata schema
- File indexing and search
- Access control (operator-owned vs system-owned)

**Storage location:** `~/.openclaw/runtime/{prod|test}/workspace/`

**Structure:**
```
workspace/
├── investigations/          # Operator investigation workspaces
│   ├── 2026-03-14_gateway_restart/
│   │   ├── intent_abc123.json
│   │   ├── execution_graph.json
│   │   ├── timeline.json
│   │   ├── logs.txt
│   │   └── notes.md
├── traces/                  # Exported intent traces
│   ├── 2026-03-14/
│   │   ├── intent_abc123_trace.json
│   │   └── intent_def456_trace.json
├── artifacts/               # Execution artifacts
│   ├── exec_xyz789/
│   │   ├── stdout.log
│   │   ├── stderr.log
│   │   └── metadata.json
└── templates/               # Investigation templates
    ├── service_restart_investigation.md
    └── policy_violation_investigation.md
```

### 2. Artifact Storage
Link execution outputs (logs, configs, metrics) to intent traces.

**Capabilities:**
- Capture stdout/stderr during execution
- Store pre/post snapshots (service status, config files)
- Link artifacts to execution_id
- Query artifacts by intent_id, objective_id, target_id

**Schema:**
```sql
CREATE TABLE execution_artifacts (
  artifact_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,  -- stdout, stderr, config_snapshot, metric_snapshot
  artifact_path TEXT NOT NULL,
  content_hash TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  environment TEXT NOT NULL,
  FOREIGN KEY (execution_id) REFERENCES execution_ledger_summary(execution_id)
);
```

### 3. Trace Exploration Tools
Interactive debugging tools for operators.

**Tools:**
- Trace export (JSON, CSV, human-readable)
- Graph visualization (Mermaid, Graphviz)
- Timeline scrubber (filter by event type, time range)
- Trace comparison (diff two traces)
- Search across traces (find all restarts, all denials, all failures)

**API endpoints:**
- `GET /api/v1/workspace/investigations` — List investigations
- `POST /api/v1/workspace/investigations` — Create investigation
- `GET /api/v1/workspace/investigations/:id` — Get investigation
- `POST /api/v1/workspace/investigations/:id/add-trace` — Add trace to investigation
- `GET /api/v1/workspace/artifacts/:execution_id` — Get artifacts

### 4. Objective Investigation Workspace
Dedicated workspace for debugging specific objectives.

**Capabilities:**
- View objective history (evaluations, reconciliations, outcomes)
- Compare desired state vs observed state over time
- Identify patterns (when does this objective fail?)
- Export investigation report

**Workspace structure:**
```
investigations/maintain_gateway_health/
├── objective.json                    # Objective definition
├── evaluations.json                  # Evaluation history
├── reconciliations.json              # Reconciliation attempts
├── traces/                           # All linked intent traces
│   ├── intent_abc123.json
│   └── intent_def456.json
├── artifacts/                        # All linked artifacts
│   ├── exec_xyz789_stdout.log
│   └── exec_xyz789_stderr.log
├── timeline.json                     # Combined timeline
└── investigation_notes.md            # Operator notes
```

### 5. Search Across Traces
Query language for finding patterns in execution history.

**Query capabilities:**
- Find all restarts in last 24 hours
- Find all denials (group by reason)
- Find all failures (group by target)
- Find all executions for objective X
- Find traces with specific governance rule applied

**Query API:**
```javascript
const results = await workspace.searchTraces({
  intent_type: 'restore_objective',
  target_id: 'openclaw-gateway',
  time_range: { start: '2026-03-14T00:00:00Z', end: '2026-03-14T23:59:59Z' },
  status: 'completed',
  governance_applied: 'safe_mode'
});
```

---

## Implementation Plan

### Stage 1: Workspace File System (6-8 hours)
- Directory structure
- Artifact metadata schema
- File indexing
- Basic CRUD operations

### Stage 2: Artifact Storage (4-6 hours)
- Execution artifact capture
- State snapshot logic
- Artifact linking to execution_id
- Query API

### Stage 3: Trace Exploration (6-8 hours)
- Trace export (JSON, human-readable)
- Graph visualization (Mermaid generation)
- Timeline filtering
- Trace comparison

### Stage 4: Objective Investigation (4-6 hours)
- Investigation workspace creation
- Objective history assembly
- Combined timeline generation
- Export investigation report

### Stage 5: Search and Query (4-6 hours)
- Query language parser
- Search across traces
- Pattern detection (frequent failures, denial reasons)
- Dashboard integration

---

## Success Criteria

**Workspace operational:**
- ✅ Operator can create investigation workspace
- ✅ Operator can export intent trace
- ✅ Operator can view execution artifacts
- ✅ Operator can compare two traces
- ✅ Operator can search execution history

**Artifact capture:**
- ✅ Execution stdout/stderr captured
- ✅ Pre/post state snapshots stored
- ✅ Artifacts linked to execution_id
- ✅ Artifacts queryable by intent_id

**Investigation workflow:**
- ✅ Operator can create objective investigation
- ✅ Operator can view combined timeline
- ✅ Operator can identify failure patterns
- ✅ Operator can export investigation report

---

## Design Constraints

### 1. Storage Efficiency
- Artifacts compressed if >1MB
- Old artifacts archived after 30 days
- Configurable retention policy

### 2. Access Control
- Operator-owned investigations (editable)
- System-owned artifacts (read-only)
- Clear ownership boundaries

### 3. Backward Compatibility
- Workspace optional (no breaking changes)
- Trace exploration works without workspace
- Artifact capture can be disabled

### 4. Environment Separation
- Prod workspace: `~/.openclaw/runtime/prod/workspace/`
- Test workspace: `~/.openclaw/runtime/test/workspace/`
- No cross-environment artifact access

---

## API Design

### Workspace API

**Create investigation:**
```
POST /api/v1/workspace/investigations
{
  "name": "2026-03-14_gateway_restart",
  "objective_id": "maintain_gateway_health",
  "description": "Investigate repeated restarts"
}
```

**Add trace to investigation:**
```
POST /api/v1/workspace/investigations/:id/add-trace
{
  "intent_id": "intent-abc123"
}
```

**Export investigation:**
```
GET /api/v1/workspace/investigations/:id/export?format=json
```

### Artifact API

**List artifacts for execution:**
```
GET /api/v1/workspace/artifacts?execution_id=exec-xyz789
```

**Get artifact content:**
```
GET /api/v1/workspace/artifacts/:artifact_id/content
```

### Search API

**Search traces:**
```
GET /api/v1/workspace/search/traces?intent_type=restore_objective&target_id=openclaw-gateway&time_range=24h
```

**Search artifacts:**
```
GET /api/v1/workspace/search/artifacts?execution_id=exec-xyz789&artifact_type=stderr
```

---

## Dashboard Integration

### Investigation View

**Layout:**
```
┌─────────────────────────────────────────┐
│ Investigation: 2026-03-14_gateway_restart│
├─────────────────────────────────────────┤
│ Objective: maintain_gateway_health       │
│ Created: 2026-03-14 16:45 EDT           │
│                                          │
│ Traces: 5                                │
│ Artifacts: 12                            │
│ Evaluations: 47                          │
│                                          │
│ [View Timeline] [View Graph] [Export]   │
└─────────────────────────────────────────┘
```

### Trace Explorer

**Features:**
- Timeline scrubber (filter by event type)
- Graph visualization (nodes + edges)
- Event details panel
- Artifact links
- Compare mode (side-by-side diff)

### Artifact Viewer

**Features:**
- Syntax highlighting (logs, JSON, YAML)
- Search within artifact
- Download raw content
- Link to parent execution

---

## Test Plan

### Unit Tests
- Workspace file operations (create, read, update, delete)
- Artifact capture (stdout, stderr, snapshots)
- Trace export (JSON, human-readable)
- Search query parsing

### Integration Tests
- End-to-end investigation workflow
- Artifact linking to execution
- Trace comparison
- Search across multiple traces

### Load Tests
- 1000+ traces in workspace
- 100+ artifacts per execution
- Search performance (10,000+ traces)

---

## Risks

### 1. Storage Growth
**Risk:** Unbounded artifact storage  
**Mitigation:** Configurable retention, compression, archival

### 2. Query Performance
**Risk:** Slow search with 10,000+ traces  
**Mitigation:** Indexed search, pagination, time-range filtering

### 3. Scope Creep
**Risk:** Investigation features expand indefinitely  
**Mitigation:** Focus on core debugging workflow, defer nice-to-haves

---

## Dependencies

**Phase 11.5 (Intent Tracing):**
- ✅ Intent trace schema
- ✅ Execution graph reconstruction
- ✅ Timeline generation
- ✅ Explanation API

**Phase 8 (Execution Ledger):**
- ✅ Execution events
- ✅ Execution summary
- ✅ Ledger query API

**Phase 10 (Reconciliation Control Plane):**
- ✅ Reconciliation state
- ✅ Admission gate
- ✅ Generation tracking

---

## Out of Scope (Future Phases)

### Phase 13 Candidates
- Real-time trace streaming
- Trace replay (re-execute from trace)
- Anomaly detection (ML-based pattern recognition)
- Multi-operator collaboration (shared investigations)

---

## Next Steps

**Pre-implementation:**
1. Review Phase 12 plan with operator
2. Confirm scope and priorities
3. Identify any missing dependencies

**Implementation order:**
1. Workspace file system (foundation)
2. Artifact storage (capture execution outputs)
3. Trace exploration (export, visualization)
4. Objective investigation (workspace creation)
5. Search and query (pattern detection)

**Estimated timeline:** 24-32 hours across 5 stages

---

✅ Phase 12 planning complete. Ready to begin implementation.
