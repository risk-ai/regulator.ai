"use strict";
/**
 * Incident Repository
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentRepository = void 0;
const client_1 = require("../client");
class IncidentRepository {
    create(data) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO incidents (id, title, description, severity, status, detected_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.title, data.description || null, data.severity, data.status, data.detected_at);
        return this.findById(data.id);
    }
    findById(id) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM incidents WHERE id = ?');
        return stmt.get(id) || null;
    }
    list() {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM incidents ORDER BY detected_at DESC');
        return stmt.all();
    }
    linkInvestigation(incidentId, investigationId) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO incident_investigations (incident_id, investigation_id)
      VALUES (?, ?)
    `);
        stmt.run(incidentId, investigationId);
    }
}
exports.IncidentRepository = IncidentRepository;
//# sourceMappingURL=incidents.js.map