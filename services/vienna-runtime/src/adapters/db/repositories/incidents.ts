/**
 * Incident Repository
 */

import { getDatabase } from '../client';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewIncident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
  detected_at: string;
}

export class IncidentRepository {
  create(data: NewIncident): Incident {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO incidents (id, title, description, severity, status, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(data.id, data.title, data.description || null, data.severity, data.status, data.detected_at);
    return this.findById(data.id)!;
  }

  findById(id: string): Incident | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM incidents WHERE id = ?');
    return (stmt.get(id) as Incident) || null;
  }

  list(): Incident[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM incidents ORDER BY detected_at DESC');
    return stmt.all() as Incident[];
  }

  linkInvestigation(incidentId: string, investigationId: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO incident_investigations (incident_id, investigation_id)
      VALUES (?, ?)
    `);
    stmt.run(incidentId, investigationId);
  }
}
