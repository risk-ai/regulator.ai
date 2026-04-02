/**
 * Phase 7.4 Stage 1: Global Execution Control (Kill Switch)
 *
 * Purpose: Allow operator to pause all mutations immediately without destroying queue state.
 *
 * Design:
 * - Pause state persists across restarts
 * - When paused, executor may not begin new mutations
 * - In-flight execution may finish or enter controlled stop
 * - Queue state remains intact during pause
 */
const fs = require('fs');
const path = require('path');
class ExecutionControl {
    constructor(stateDir) {
        this.stateDir = stateDir || path.join(process.env.HOME, '.openclaw', 'runtime', 'execution-control');
        this.stateFile = path.join(this.stateDir, 'pause-state.json');
        this._state = null;
        this._ensureStateDir();
        this._loadState();
    }
    _ensureStateDir() {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
    }
    _loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const raw = fs.readFileSync(this.stateFile, 'utf8');
                this._state = JSON.parse(raw);
            }
            else {
                this._state = {
                    paused: false,
                    paused_at: null,
                    resumed_at: null,
                    reason: null,
                    paused_by: null
                };
                this._persistState();
            }
        }
        catch (err) {
            throw new Error(`Failed to load execution control state: ${err.message}`);
        }
    }
    _persistState() {
        try {
            fs.writeFileSync(this.stateFile, JSON.stringify(this._state, null, 2), 'utf8');
        }
        catch (err) {
            throw new Error(`Failed to persist execution control state: ${err.message}`);
        }
    }
    /**
     * Pause all execution immediately.
     *
     * @param {string} reason - Why execution is being paused
     * @param {string} pausedBy - Who initiated the pause (default: 'vienna')
     * @returns {Object} New pause state
     */
    pauseExecution(reason, pausedBy = 'vienna') {
        if (!reason) {
            throw new Error('Pause reason required');
        }
        this._state = {
            paused: true,
            paused_at: new Date().toISOString(),
            resumed_at: null,
            reason,
            paused_by: pausedBy
        };
        this._persistState();
        return { ...this._state };
    }
    /**
     * Resume execution.
     *
     * @returns {Object} New execution state
     */
    resumeExecution() {
        if (!this._state.paused) {
            return { ...this._state, message: 'Execution was not paused' };
        }
        this._state = {
            paused: false,
            paused_at: this._state.paused_at,
            resumed_at: new Date().toISOString(),
            reason: null,
            paused_by: null
        };
        this._persistState();
        return { ...this._state };
    }
    /**
     * Get current execution control state.
     *
     * @returns {Object} Current state
     */
    getExecutionControlState() {
        return { ...this._state };
    }
    /**
     * Check if execution is currently paused.
     *
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._state.paused === true;
    }
    /**
     * Get pause reason if paused.
     *
     * @returns {string|null} Pause reason or null
     */
    getPauseReason() {
        return this._state.paused ? this._state.reason : null;
    }
    /**
     * Force reset pause state (emergency use only).
     * Does not validate or log reason.
     */
    forceReset() {
        this._state = {
            paused: false,
            paused_at: null,
            resumed_at: new Date().toISOString(),
            reason: null,
            paused_by: null
        };
        this._persistState();
        return { ...this._state };
    }
}
module.exports = ExecutionControl;
//# sourceMappingURL=execution-control.js.map