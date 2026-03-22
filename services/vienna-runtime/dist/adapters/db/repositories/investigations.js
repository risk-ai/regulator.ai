"use strict";
/**
 * Investigation Repository
 *
 * Data access layer for investigations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestigationRepository = void 0;
const client_1 = require("../client");
class InvestigationRepository {
    /**
     * Create a new investigation
     */
    create(data) {
        const db = (0, client_1.getDatabase)();
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
    findById(id) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM investigations WHERE id = ?
    `);
        const row = stmt.get(id);
        return row || null;
    }
    /**
     * List investigations with optional filters
     */
    list(filters) {
        const db = (0, client_1.getDatabase)();
        let query = 'SELECT * FROM investigations';
        const params = [];
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
        return stmt.all(...params);
    }
    /**
     * Update investigation
     */
    update(id, updates) {
        const db = (0, client_1.getDatabase)();
        const allowed = ['name', 'description', 'status', 'resolved_at'];
        const fields = [];
        const values = [];
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
    linkIncident(investigationId, incidentId) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO incident_investigations (investigation_id, incident_id)
      VALUES (?, ?)
    `);
        stmt.run(investigationId, incidentId);
    }
    /**
     * Get incidents linked to investigation
     */
    getLinkedIncidents(investigationId) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT incident_id FROM incident_investigations
      WHERE investigation_id = ?
    `);
        const rows = stmt.all(investigationId);
        return rows.map((r) => r.incident_id);
    }
}
exports.InvestigationRepository = InvestigationRepository;
//# sourceMappingURL=investigations.js.map