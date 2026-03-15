/**
 * Investigation Repository
 * 
 * Data access layer for investigations
 */

import { getDatabase } from '../client';

export interface Investigation {
  id: string;
  name: string;
  description: string | null;
  status: 'open' | 'investigating' | 'resolved' | 'archived';
  created_at: string;
  created_by: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface NewInvestigation {
  id: string;
  name: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'archived';
  created_by: string;
}

export interface InvestigationFilters {
  status?: string;
  limit?: number;
}

export class InvestigationRepository {
  /**
   * Create a new investigation
   */
  create(data: NewInvestigation): Investigation {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO investigations (id, name, description, status, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(data.id, data.name, data.description || null, data.status, data.created_by);
    
    const result = this.findById(data.id);
    if (!result) {
      throw new Error(`Failed to create investigation ${data.id}`);
    }
    
    return result;
  }

  /**
   * Find investigation by ID
   */
  findById(id: string): Investigation | null {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT * FROM investigations WHERE id = ?
    `);
    
    const row = stmt.get(id) as Investigation | undefined;
    return row || null;
  }

  /**
   * List investigations with optional filters
   */
  list(filters?: InvestigationFilters): Investigation[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM investigations';
    const params: any[] = [];
    
    if (filters?.status) {
      query += ' WHERE status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params) as Investigation[];
  }

  /**
   * Update investigation
   */
  update(id: string, updates: Partial<Investigation>): Investigation {
    const db = getDatabase();
    
    const allowed = ['name', 'description', 'status', 'resolved_at'];
    const fields: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length > 0) {
      fields.push('updated_at = datetime("now")');
      values.push(id);
      
      const query = `UPDATE investigations SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      stmt.run(...values);
    }
    
    const result = this.findById(id);
    if (!result) {
      throw new Error(`Investigation ${id} not found after update`);
    }
    
    return result;
  }

  /**
   * Link investigation to incident
   */
  linkIncident(investigationId: string, incidentId: string): void {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO incident_investigations (investigation_id, incident_id)
      VALUES (?, ?)
    `);
    
    stmt.run(investigationId, incidentId);
  }

  /**
   * Get incidents linked to investigation
   */
  getLinkedIncidents(investigationId: string): string[] {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      SELECT incident_id FROM incident_investigations
      WHERE investigation_id = ?
    `);
    
    const rows = stmt.all(investigationId) as { incident_id: string }[];
    return rows.map((r) => r.incident_id);
  }
}
