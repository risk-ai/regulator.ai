"use strict";
/**
 * Trace Repository
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceRepository = void 0;
const client_1 = require("../client");
class TraceRepository {
    findById(id) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM traces WHERE id = ?');
        return stmt.get(id) || null;
    }
    getTimeline(traceId) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      SELECT * FROM trace_timeline WHERE trace_id = ? ORDER BY event_timestamp ASC
    `);
        return stmt.all(traceId);
    }
}
exports.TraceRepository = TraceRepository;
//# sourceMappingURL=traces.js.map