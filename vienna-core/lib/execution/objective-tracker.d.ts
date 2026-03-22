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
export class ObjectiveTracker {
    objectives: Map<any, any>;
    envelopeToObjective: Map<any, any>;
    eventEmitter: any;
    stateGraph: any;
    /**
     * Phase 5A: Connect event emitter for SSE
     *
     * @param {object} eventEmitter - ViennaEventEmitter instance
     */
    connectEventEmitter(eventEmitter: object): void;
    /**
     * Phase 7.2: Set State Graph for persistent storage
     *
     * @param {StateGraph} stateGraph - State Graph instance
     */
    setStateGraph(stateGraph: StateGraph): void;
    /**
     * Register new objective
     *
     * @param {string} objectiveId - Objective ID
     * @param {number} totalEnvelopes - Expected envelope count
     * @returns {void}
     */
    registerObjective(objectiveId: string, totalEnvelopes: number): void;
    /**
     * Track envelope for objective
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} objectiveId - Objective ID
     * @param {string} state - Initial state (usually 'queued')
     * @returns {void}
     */
    trackEnvelope(envelopeId: string, objectiveId: string, state?: string): void;
    /**
     * Transition envelope between states
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} fromState - Previous state (null if first transition)
     * @param {string} toState - New state
     * @returns {void}
     */
    transitionEnvelope(envelopeId: string, fromState: string, toState: string): void;
    /**
     * Update objective status based on envelope states
     *
     * @param {string} objectiveId - Objective ID
     * @returns {void}
     */
    updateObjectiveStatus(objectiveId: string): void;
    /**
     * Get objective summary
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Objective summary or null
     */
    getObjective(objectiveId: string): object | null;
    /**
     * List all objectives with optional filter
     *
     * @param {object} filter - Optional filter
     * @returns {array} List of objective summaries
     */
    listObjectives(filter?: object): any[];
    /**
     * Get summary statistics
     *
     * @returns {object} Summary stats
     */
    getStats(): object;
    /**
     * Clear objective (for cleanup after completion)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {boolean} True if cleared
     */
    clearObjective(objectiveId: string): boolean;
}
//# sourceMappingURL=objective-tracker.d.ts.map