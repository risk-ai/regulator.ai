/**
 * Trace Repository
 */

import { getDatabase } from '../client';

export interface Trace {
  id: string;
  intent_id: string;
  intent_text: string;
  interpretation: string | null;
  risk_tier: 'T0' | 'T1' | 'T2';
  status: 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface TraceTimelineEntry {
  id: number;
  trace_id: string;
  event_type: string;
  event_timestamp: string;
  actor: string | null;
  metadata: string | null;
  created_at: string;
}

export class TraceRepository {
  findById(id: string): Trace | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM traces WHERE id = ?');
    return (stmt.get(id) as Trace) || null;
  }

  getTimeline(traceId: string): TraceTimelineEntry[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM trace_timeline WHERE trace_id = ? ORDER BY event_timestamp ASC
    `);
    return stmt.all(traceId) as TraceTimelineEntry[];
  }
}
