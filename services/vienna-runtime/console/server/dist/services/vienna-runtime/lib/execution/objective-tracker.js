/**
 * Objective Tracker
 *
 * Phase 3D: Objective summary metrics
 *
 * RESPONSIBILITIES:
 * - Track envelope states per objective
 * - Compute summary metrics (queued, executing, verified, failed)
 * - Maintain timeline metadata (queued_at, started_at, completed_at)
 * - Expose objective status for visibility
 *
 * DESIGN:
 * - In-memory tracking with optional persistence
 * - Real-time metric updates as envelopes transition
 * - Objective-level progress (X of Y envelopes complete)
 */
class ObjectiveTracker {
    constructor() {
        // Map: objective_id → objective_state
        this.objectives = new Map();
        // Map: envelope_id → objective_id (for reverse lookup)
        this.envelopeToObjective = new Map();
        // Phase 5A: Event emitter for SSE
        this.eventEmitter = null;
        // Phase 7.2: State Graph integration
        this.stateGraph = null; // Set by ViennaCore
    }
    /**
     * Phase 5A: Connect event emitter for SSE
     *
     * @param {object} eventEmitter - ViennaEventEmitter instance
     */
    connectEventEmitter(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    /**
     * Phase 7.2: Set State Graph for persistent storage
     *
     * @param {StateGraph} stateGraph - State Graph instance
     */
    setStateGraph(stateGraph) {
        this.stateGraph = stateGraph;
    }
    /**
     * Register new objective
     *
     * @param {string} objectiveId - Objective ID
     * @param {number} totalEnvelopes - Expected envelope count
     * @returns {void}
     */
    registerObjective(objectiveId, totalEnvelopes) {
        if (this.objectives.has(objectiveId)) {
            console.warn(`[ObjectiveTracker] Objective ${objectiveId} already registered`);
            return;
        }
        this.objectives.set(objectiveId, {
            objective_id: objectiveId,
            total_envelopes: totalEnvelopes,
            queued: 0,
            executing: 0,
            verified: 0,
            failed: 0,
            dead_lettered: 0,
            queued_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
            status: 'pending', // pending, active, complete, failed
        });
        console.log(`[ObjectiveTracker] Registered objective ${objectiveId} with ${totalEnvelopes} envelopes`);
        // Phase 5A: Emit SSE event
        if (this.eventEmitter) {
            this.eventEmitter.emitObjectiveEvent('created', {
                objective_id: objectiveId,
                total_envelopes: totalEnvelopes,
                queued_at: this.objectives.get(objectiveId).queued_at,
                status: 'pending'
            });
        }
    }
    /**
     * Track envelope for objective
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} objectiveId - Objective ID
     * @param {string} state - Initial state (usually 'queued')
     * @returns {void}
     */
    trackEnvelope(envelopeId, objectiveId, state = 'queued') {
        // Register objective if not exists
        if (!this.objectives.has(objectiveId)) {
            this.registerObjective(objectiveId, 1); // Unknown total, start with 1
        }
        // Track envelope mapping
        this.envelopeToObjective.set(envelopeId, objectiveId);
        // Increment state counter
        this.transitionEnvelope(envelopeId, null, state);
    }
    /**
     * Transition envelope between states
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} fromState - Previous state (null if first transition)
     * @param {string} toState - New state
     * @returns {void}
     */
    transitionEnvelope(envelopeId, fromState, toState) {
        const objectiveId = this.envelopeToObjective.get(envelopeId);
        if (!objectiveId) {
            console.warn(`[ObjectiveTracker] Envelope ${envelopeId} not tracked`);
            return;
        }
        const objective = this.objectives.get(objectiveId);
        if (!objective) {
            console.warn(`[ObjectiveTracker] Objective ${objectiveId} not found`);
            return;
        }
        // Phase 5A.2: No-op suppression - skip if same state
        if (fromState && toState && fromState === toState) {
            return; // No state change, no event
        }
        // Decrement old state
        if (fromState && objective[fromState] !== undefined) {
            objective[fromState] = Math.max(0, objective[fromState] - 1);
        }
        // Increment new state
        if (toState && objective[toState] !== undefined) {
            objective[toState] += 1;
        }
        // Update objective status
        this.updateObjectiveStatus(objectiveId);
    }
    /**
     * Update objective status based on envelope states
     *
     * @param {string} objectiveId - Objective ID
     * @returns {void}
     */
    updateObjectiveStatus(objectiveId) {
        const objective = this.objectives.get(objectiveId);
        if (!objective) {
            return;
        }
        const now = new Date().toISOString();
        const oldStatus = objective.status;
        // Set started_at when first envelope begins executing
        if (!objective.started_at && objective.executing > 0) {
            objective.started_at = now;
            objective.status = 'active';
        }
        // Check if all envelopes are complete (verified or failed/dead_lettered)
        const completed = objective.verified + objective.failed + objective.dead_lettered;
        const pending = objective.queued + objective.executing;
        if (pending === 0 && completed > 0) {
            // Objective complete
            if (!objective.completed_at) {
                objective.completed_at = now;
            }
            // Determine final status
            if (objective.failed > 0 || objective.dead_lettered > 0) {
                objective.status = 'failed'; // Partial or total failure
            }
            else {
                objective.status = 'complete'; // Full success
            }
        }
        // Phase 5A: Emit SSE events for status changes and progress updates
        if (this.eventEmitter) {
            // Calculate progress
            const total = objective.total_envelopes;
            const progress = total > 0 ? completed / total : 0;
            // Always emit progress update
            this.eventEmitter.emitObjectiveEvent('progress.updated', {
                objective_id: objectiveId,
                status: objective.status,
                queued: objective.queued,
                executing: objective.executing,
                verified: objective.verified,
                failed: objective.failed,
                dead_lettered: objective.dead_lettered,
                completed_envelopes: completed,
                total_envelopes: total,
                progress,
                started_at: objective.started_at,
                completed_at: objective.completed_at
            });
            // Emit specific status change events
            if (oldStatus !== objective.status) {
                if (objective.status === 'complete') {
                    this.eventEmitter.emitObjectiveEvent('completed', {
                        objective_id: objectiveId,
                        total_envelopes: total,
                        verified: objective.verified,
                        completed_at: objective.completed_at,
                        duration_ms: objective.started_at
                            ? new Date(objective.completed_at) - new Date(objective.started_at)
                            : null
                    });
                }
                else if (objective.status === 'failed') {
                    this.eventEmitter.emitObjectiveEvent('failed', {
                        objective_id: objectiveId,
                        total_envelopes: total,
                        verified: objective.verified,
                        failed: objective.failed,
                        dead_lettered: objective.dead_lettered,
                        completed_at: objective.completed_at
                    });
                }
            }
        }
    }
    /**
     * Get objective summary
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Objective summary or null
     */
    getObjective(objectiveId) {
        const objective = this.objectives.get(objectiveId);
        if (!objective) {
            return null;
        }
        // Calculate progress
        const completed = objective.verified + objective.failed + objective.dead_lettered;
        const total = objective.total_envelopes;
        const progress = total > 0 ? completed / total : 0;
        return {
            ...objective,
            completed_envelopes: completed,
            progress,
        };
    }
    /**
     * List all objectives with optional filter
     *
     * @param {object} filter - Optional filter
     * @returns {array} List of objective summaries
     */
    listObjectives(filter = {}) {
        const { status, limit = 100 } = filter;
        let objectives = Array.from(this.objectives.values())
            .map(obj => this.getObjective(obj.objective_id));
        // Filter by status if provided
        if (status) {
            objectives = objectives.filter(obj => obj.status === status);
        }
        // Sort by most recent first
        objectives.sort((a, b) => {
            return new Date(b.queued_at) - new Date(a.queued_at);
        });
        return objectives.slice(0, limit);
    }
    /**
     * Get summary statistics
     *
     * @returns {object} Summary stats
     */
    getStats() {
        const objectives = Array.from(this.objectives.values());
        const byStatus = {};
        let totalEnvelopes = 0;
        let totalQueued = 0;
        let totalExecuting = 0;
        let totalVerified = 0;
        let totalFailed = 0;
        for (const obj of objectives) {
            byStatus[obj.status] = (byStatus[obj.status] || 0) + 1;
            totalEnvelopes += obj.total_envelopes;
            totalQueued += obj.queued;
            totalExecuting += obj.executing;
            totalVerified += obj.verified;
            totalFailed += obj.failed + obj.dead_lettered;
        }
        return {
            total_objectives: objectives.length,
            by_status: byStatus,
            envelope_totals: {
                total: totalEnvelopes,
                queued: totalQueued,
                executing: totalExecuting,
                verified: totalVerified,
                failed: totalFailed,
            },
        };
    }
    /**
     * Clear objective (for cleanup after completion)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {boolean} True if cleared
     */
    clearObjective(objectiveId) {
        const objective = this.objectives.get(objectiveId);
        if (!objective) {
            return false;
        }
        // Remove envelope mappings
        for (const [envId, objId] of this.envelopeToObjective.entries()) {
            if (objId === objectiveId) {
                this.envelopeToObjective.delete(envId);
            }
        }
        // Remove objective
        this.objectives.delete(objectiveId);
        console.log(`[ObjectiveTracker] Cleared objective ${objectiveId}`);
        return true;
    }
}
module.exports = { ObjectiveTracker };
//# sourceMappingURL=objective-tracker.js.map