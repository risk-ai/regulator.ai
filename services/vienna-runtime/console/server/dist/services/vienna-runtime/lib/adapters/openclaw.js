/**
 * OpenClaw Adapter
 *
 * Integrates Vienna Core with OpenClaw workspace.
 */
const fs = require('fs').promises;
const path = require('path');
class OpenClawAdapter {
    constructor(config) {
        this.workspace = config.workspace || path.join(process.env.HOME, '.openclaw', 'workspace');
        this.warrantsDir = path.join(this.workspace, 'warrants', 'active');
        this.auditDir = path.join(this.workspace, 'warrants', 'audit');
        this.truthDir = path.join(this.workspace, 'truth_snapshots');
        this.runtimeStateFile = path.join(this.workspace, 'VIENNA_RUNTIME_STATE.md');
    }
    /**
     * Initialize adapter (create directories)
     */
    async init() {
        await fs.mkdir(this.warrantsDir, { recursive: true });
        await fs.mkdir(this.auditDir, { recursive: true });
    }
    /**
     * Save warrant to filesystem
     *
     * @param {object} warrant - Warrant object
     */
    async saveWarrant(warrant) {
        const filename = `${warrant.change_id}.json`;
        const filepath = path.join(this.warrantsDir, filename);
        await fs.writeFile(filepath, JSON.stringify(warrant, null, 2));
    }
    /**
     * Load warrant from filesystem
     *
     * @param {string} warrantId - Warrant ID or change ID
     * @returns {Promise<object|null>} Warrant or null if not found
     */
    async loadWarrant(warrantId) {
        try {
            // Try as change ID first
            let filepath = path.join(this.warrantsDir, `${warrantId}.json`);
            // If not found, search by warrant_id field
            if (!await this._fileExists(filepath)) {
                const warrants = await this.listWarrants();
                const found = warrants.find(w => w.warrant_id === warrantId);
                if (!found)
                    return null;
                filepath = path.join(this.warrantsDir, `${found.change_id}.json`);
            }
            const content = await fs.readFile(filepath, 'utf8');
            return JSON.parse(content);
        }
        catch (err) {
            if (err.code === 'ENOENT')
                return null;
            throw err;
        }
    }
    /**
     * List all warrants
     *
     * @returns {Promise<Array>} All warrants
     */
    async listWarrants() {
        try {
            const files = await fs.readdir(this.warrantsDir);
            const warrants = await Promise.all(files
                .filter(f => f.endsWith('.json'))
                .map(async (f) => {
                const content = await fs.readFile(path.join(this.warrantsDir, f), 'utf8');
                return JSON.parse(content);
            }));
            return warrants;
        }
        catch (err) {
            if (err.code === 'ENOENT')
                return [];
            throw err;
        }
    }
    /**
     * Load truth snapshot
     *
     * @param {string} truthId - Truth snapshot ID
     * @returns {Promise<object>} Truth snapshot
     */
    async loadTruthSnapshot(truthId) {
        const filepath = path.join(this.truthDir, `${truthId}.json`);
        try {
            const content = await fs.readFile(filepath, 'utf8');
            return JSON.parse(content);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw new Error(`Truth snapshot not found: ${truthId}`);
            }
            throw err;
        }
    }
    /**
     * Load runtime state
     *
     * @returns {Promise<object>} Runtime state
     */
    async loadRuntimeState() {
        try {
            const content = await fs.readFile(this.runtimeStateFile, 'utf8');
            // Parse markdown to extract key fields
            const state = {
                autonomous_window_active: false,
                autonomous_window_start: null,
                autonomous_window_end: null,
                trading_active: false
            };
            // Extract autonomous window info
            const startMatch = content.match(/Autonomous window start:\*\* (.+)/);
            const durationMatch = content.match(/Autonomous window duration:\*\* (\d+) days/);
            if (startMatch && durationMatch) {
                const start = new Date(startMatch[1]);
                const days = parseInt(durationMatch[1]);
                const end = new Date(start);
                end.setDate(end.getDate() + days);
                const now = new Date();
                state.autonomous_window_active = now >= start && now < end;
                state.autonomous_window_start = start.toISOString();
                state.autonomous_window_end = end.toISOString();
            }
            // Extract trading status
            state.trading_active = content.includes('v1_baseline live trading:** ON');
            return state;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                // No runtime state file, assume safe defaults
                return {
                    autonomous_window_active: false,
                    autonomous_window_start: null,
                    autonomous_window_end: null,
                    trading_active: false
                };
            }
            throw err;
        }
    }
    /**
     * Emit audit event
     *
     * @param {object} event - Audit event
     */
    async emitAudit(event) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${event.event_type}_${timestamp}.json`;
        const filepath = path.join(this.auditDir, filename);
        const auditEntry = {
            ...event,
            timestamp: new Date().toISOString(),
            adapter: 'openclaw'
        };
        await fs.writeFile(filepath, JSON.stringify(auditEntry, null, 2));
    }
    // Helper methods
    async _fileExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        }
        catch {
            return false;
        }
    }
}
module.exports = OpenClawAdapter;
//# sourceMappingURL=openclaw.js.map