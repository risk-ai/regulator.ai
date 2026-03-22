# Phase 14 — Incident Object Schema

**Status:** Design phase  
**Goal:** Define top-level forensic container for multi-objective operational events

---

## Semantic Definition

An **Incident** is:

> A top-level forensic container representing a real-world operational event that may span multiple objectives, intents, traces, artifacts, and investigations.

**Not:**
- Just another investigation
- Just a severity wrapper
- A duplicate of objective or intent

**Is:**
- The highest-level forensic container
- A many-to-many aggregator (multiple objectives, intents, investigations)
- The operator's mental model for "what went wrong"

---

## Core Schema

```typescript
type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'archived';
type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

interface Incident {
  // Identity
  incident_id: string;            // inc_YYYYMMDD_NNN
  title: string;                  // "Gateway failure cascade"
  summary?: string;               // Brief description
  
  // Classification
  severity: IncidentSeverity;     // Impact level
  status: IncidentStatus;         // Lifecycle state
  
  // Analysis
  root_cause_summary?: string;    // Post-resolution analysis
  detection_source?: string;      // How incident was discovered
  
  // Timestamps
  created_at: string;             // ISO 8601
  updated_at: string;             // Last modification
  resolved_at?: string;           // When marked resolved
  archived_at?: string;           // When archived
  
  // Primary references (UI hint)
  primary_investigation_id?: string;  // Main investigation
  primary_objective_id?: string;      // Root objective
  
  // Related entities (many-to-many)
  objective_ids: string[];        // Linked objectives
  intent_ids: string[];           // Linked intents
  investigation_ids: string[];    // Linked investigations
  artifact_ids: string[];         // Linked artifacts
}
```

---

## State Graph Schema

**Graph-oriented storage (not arrays):**

### Table: `incidents`

```sql
CREATE TABLE incidents (
  incident_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'archived')),
  root_cause_summary TEXT,
  detection_source TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  archived_at TEXT,
  primary_investigation_id TEXT,
  primary_objective_id TEXT,
  FOREIGN KEY (primary_investigation_id) REFERENCES investigations(investigation_id),
  FOREIGN KEY (primary_objective_id) REFERENCES managed_objectives(objective_id)
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
```

### Table: `incident_objectives`

```sql
CREATE TABLE incident_objectives (
  incident_id TEXT NOT NULL,
  objective_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (incident_id, objective_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES managed_objectives(objective_id)
);

CREATE INDEX idx_incident_objectives_objective_id ON incident_objectives(objective_id);
```

### Table: `incident_intents`

```sql
CREATE TABLE incident_intents (
  incident_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (incident_id, intent_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (intent_id) REFERENCES intents(intent_id)
);

CREATE INDEX idx_incident_intents_intent_id ON incident_intents(intent_id);
```

### Table: `incident_investigations`

```sql
CREATE TABLE incident_investigations (
  incident_id TEXT NOT NULL,
  investigation_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (incident_id, investigation_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (investigation_id) REFERENCES investigations(investigation_id)
);

CREATE INDEX idx_incident_investigations_investigation_id ON incident_investigations(investigation_id);
```

### Table: `incident_artifacts`

```sql
CREATE TABLE incident_artifacts (
  incident_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (incident_id, artifact_id),
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE,
  FOREIGN KEY (artifact_id) REFERENCES workspace_artifacts(artifact_id)
);

CREATE INDEX idx_incident_artifacts_artifact_id ON incident_artifacts(artifact_id);
```

---

## State Machine

**States:**
- `open` — Incident detected, not yet under investigation
- `investigating` — Active investigation in progress
- `resolved` — Root cause identified, remediation complete
- `archived` — Closed, historical record

**Transitions:**
```
open → investigating (start investigation)
investigating → resolved (complete investigation)
investigating → open (reopen)
resolved → archived (archive)
archived → (terminal)
```

**Terminal state:** `archived` has no exits (same as other Vienna entities)

---

## API Surface

### Core CRUD

```
GET    /api/v1/incidents
POST   /api/v1/incidents
GET    /api/v1/incidents/:incident_id
PATCH  /api/v1/incidents/:incident_id
DELETE /api/v1/incidents/:incident_id
```

### Relationships

```
POST   /api/v1/incidents/:incident_id/link
DELETE /api/v1/incidents/:incident_id/link
GET    /api/v1/incidents/:incident_id/objectives
GET    /api/v1/incidents/:incident_id/intents
GET    /api/v1/incidents/:incident_id/investigations
GET    /api/v1/incidents/:incident_id/artifacts
```

### Analysis

```
GET    /api/v1/incidents/:incident_id/graph
GET    /api/v1/incidents/:incident_id/timeline
```

---

## State Graph Methods

```javascript
// Create
createIncident({ title, summary, severity, detection_source })

// Read
getIncident(incident_id)
listIncidents({ status, severity, limit, offset })

// Update
updateIncident(incident_id, { title, summary, severity, root_cause_summary })
updateIncidentStatus(incident_id, status, { resolved_at, archived_at })

// Link
linkObjective(incident_id, objective_id)
linkIntent(incident_id, intent_id)
linkInvestigation(incident_id, investigation_id)
linkArtifact(incident_id, artifact_id)

// Unlink
unlinkObjective(incident_id, objective_id)
unlinkIntent(incident_id, intent_id)
unlinkInvestigation(incident_id, investigation_id)
unlinkArtifact(incident_id, artifact_id)

// Query relationships
getIncidentObjectives(incident_id)
getIncidentIntents(incident_id)
getIncidentInvestigations(incident_id)
getIncidentArtifacts(incident_id)

// Analysis
getIncidentGraph(incident_id)      // Nodes + edges
getIncidentTimeline(incident_id)   // Chronological events
```

---

## UI Information Architecture

**Mental hierarchy:**

```
Incident (top-level container)
├── Investigations
│   └── Notes, reports, analysis
├── Objectives
│   └── Remediation targets
├── Intents
│   └── Operator/autonomous actions
├── Traces
│   └── Execution graphs
├── Artifacts
│   └── Evidence, logs, snapshots
└── Timeline
    └── Chronological event sequence
```

**Three operator questions (answered in <10 seconds):**

1. **What happened?** (timeline, trace, execution graph)
2. **Why was action allowed?** (policy decisions, warrant chain)
3. **What is the current state now?** (resolved, degraded, safe mode, awaiting action)

---

## Design Principles

1. **Incident is not investigation** — Investigation is process, incident is event
2. **Many-to-many relationships** — One incident can span multiple objectives/intents
3. **Primary references are UI hints** — Not constraints, just navigation aids
4. **Graph integrity preserved** — Relationships in junction tables, not arrays
5. **Terminal state enforced** — Archived incidents cannot transition

---

## Phase 13 Implication

Phase 13 UI should be built **incident-aware** even if backend doesn't exist yet:

- Route structure: `/incidents/:id` (reserved)
- Shared panels: entity-agnostic (work with incident or investigation root)
- Timeline/graph: do not assume investigation is root container
- Navigation: leave top-level slot for incident shell

**Temporary behavior until Phase 14 complete:**
- UI operates in "investigation-centric shell that is incident-ready"
- Investigation detail view can later become incident detail view
- Related entities panel already structured for incident aggregation

---

## Exit Criteria

**Phase 14 complete when:**
- ✅ 5 tables added to State Graph schema
- ✅ 18+ State Graph methods operational
- ✅ API endpoints defined and tested
- ✅ State machine enforcement implemented
- ✅ Junction table relationships working
- ✅ Timeline/graph queries operational
- ✅ Test coverage ≥90%

**Estimated time:** 6-8 hours (schema + implementation + tests)

---

## Status

**Current phase:** Design complete  
**Next:** State Graph schema implementation  
**Blocked by:** None (ready to begin)
