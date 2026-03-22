"use strict";
/**
 * Artifact Repository
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactRepository = void 0;
const client_1 = require("../client");
class ArtifactRepository {
    create(data) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO artifacts (
        id, artifact_type, content_type, size_bytes, storage_path,
        investigation_id, intent_id, execution_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.id, data.artifact_type, data.content_type, data.size_bytes, data.storage_path, data.investigation_id || null, data.intent_id || null, data.execution_id || null, data.created_by);
        return this.findById(data.id);
    }
    findById(id) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM artifacts WHERE id = ?');
        return stmt.get(id) || null;
    }
    list() {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM artifacts ORDER BY created_at DESC');
        return stmt.all();
    }
    listByInvestigation(investigationId) {
        const db = (0, client_1.getDatabase)();
        const stmt = db.prepare('SELECT * FROM artifacts WHERE investigation_id = ? ORDER BY created_at DESC');
        return stmt.all(investigationId);
    }
}
exports.ArtifactRepository = ArtifactRepository;
//# sourceMappingURL=artifacts.js.map