export = PatternStore;
declare class PatternStore {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Create pattern
     */
    createPattern(pattern: any): Promise<any>;
    /**
     * Get pattern by ID
     */
    getPattern(patternId: any): Promise<{
        pattern_id: any;
        pattern_type: any;
        action_type: any;
        target_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: any;
        metadata: any;
        created_at: any;
        last_observed_at: any;
        superseded_by: any;
        status: any;
    }>;
    /**
     * List patterns
     */
    listPatterns(filters?: {}): Promise<any>;
    /**
     * Update pattern
     */
    updatePattern(patternId: any, updates: any): Promise<void>;
    /**
     * Update pattern confidence with decay
     */
    updatePatternConfidence(patternId: any, decayFactor: any): Promise<number>;
    /**
     * Supersede pattern
     */
    supersedePattern(oldPatternId: any, newPatternId: any): Promise<void>;
    /**
     * Get pattern evolution chain
     */
    getPatternEvolution(patternId: any): Promise<{
        pattern_id: any;
        pattern_type: any;
        action_type: any;
        target_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: any;
        metadata: any;
        created_at: any;
        last_observed_at: any;
        superseded_by: any;
        status: any;
    }[]>;
    /**
     * Archive pattern
     */
    archivePattern(patternId: any): Promise<{
        pattern_id: any;
        pattern_type: any;
        action_type: any;
        target_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: any;
        metadata: any;
        created_at: any;
        last_observed_at: any;
        superseded_by: any;
        status: any;
    }>;
    _deserializePattern(row: any): {
        pattern_id: any;
        pattern_type: any;
        action_type: any;
        target_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: any;
        metadata: any;
        created_at: any;
        last_observed_at: any;
        superseded_by: any;
        status: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=pattern-store.d.ts.map