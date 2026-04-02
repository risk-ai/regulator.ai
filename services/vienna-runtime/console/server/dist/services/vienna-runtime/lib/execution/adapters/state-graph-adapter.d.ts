export class StateGraphAdapter {
    stateGraph: any;
    initialize(): Promise<void>;
    /**
     * Execute state update action
     *
     * @param {Object} action - State update action from envelope
     * @param {Object} warrant - Execution warrant
     * @returns {Object} Result { success, entity_id, changes, error }
     */
    execute(action: any, warrant: any): any;
    /**
     * Create entity
     */
    _create(entity_type: any, entity_data: any): {
        entity_id: any;
        changes: any;
    };
    /**
     * Update entity
     */
    _update(entity_type: any, entity_id: any, updates: any, changed_by: any): any;
    /**
     * Delete entity
     */
    _delete(entity_type: any, entity_id: any): any;
    /**
     * Validate action before execution
     *
     * @param {Object} action - State update action
     * @returns {Object} { valid, error }
     */
    validate(action: any): any;
    /**
     * Determine risk tier for action
     *
     * @param {Object} action - State update action
     * @returns {string} 'T0' | 'T1' | 'T2'
     */
    getRiskTier(action: any): string;
    /**
     * Check if action affects trading
     *
     * @param {Object} action - State update action
     * @returns {boolean}
     */
    affectsTrading(action: any): boolean;
}
//# sourceMappingURL=state-graph-adapter.d.ts.map