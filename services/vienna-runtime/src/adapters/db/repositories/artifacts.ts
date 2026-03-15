/**
 * Artifact Repository
 */

import { getDatabase } from '../client';

export type ArtifactType =
  | 'investigation_workspace'
  | 'investigation_notes'
  | 'investigation_report'
  | 'intent_trace'
  | 'execution_graph'
  | 'timeline_export'
  | 'execution_stdout'
  | 'execution_stderr'
  | 'state_snapshot'
  | 'config_snapshot'
  | 'objective_history'
  | 'objective_analysis'
  | 'incident_timeline'
  | 'incident_postmortem';

export interface Artifact {
  id: string;
  artifact_type: ArtifactType;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  investigation_id: string | null;
  intent_id: string | null;
  execution_id: string | null;
  created_by: string;
  created_at: string;
}

export interface NewArtifact {
  id: string;
  artifact_type: ArtifactType;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  investigation_id?: string;
  intent_id?: string;
  execution_id?: string;
  created_by: string;
}

export class ArtifactRepository {
  create(data: NewArtifact): Artifact {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO artifacts (
        id, artifact_type, content_type, size_bytes, storage_path,
        investigation_id, intent_id, execution_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.artifact_type,
      data.content_type,
      data.size_bytes,
      data.storage_path,
      data.investigation_id || null,
      data.intent_id || null,
      data.execution_id || null,
      data.created_by
    );
    return this.findById(data.id)!;
  }

  findById(id: string): Artifact | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM artifacts WHERE id = ?');
    return (stmt.get(id) as Artifact) || null;
  }

  list(): Artifact[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM artifacts ORDER BY created_at DESC');
    return stmt.all() as Artifact[];
  }

  listByInvestigation(investigationId: string): Artifact[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM artifacts WHERE investigation_id = ? ORDER BY created_at DESC');
    return stmt.all(investigationId) as Artifact[];
  }
}
