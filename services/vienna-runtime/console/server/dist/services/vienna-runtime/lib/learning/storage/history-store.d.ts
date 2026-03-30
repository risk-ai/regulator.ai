export = HistoryStore;
declare class HistoryStore {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Record learning history event
     */
    recordHistory(history: any): Promise<any>;
    /**
     * Get history for recommendation
     */
    getRecommendationHistory(recommendationId: any): Promise<any>;
    /**
     * List history by operator
     */
    listHistoryByOperator(operator: any, filters?: {}): Promise<any>;
    /**
     * Get learning impact summary
     */
    getLearningImpact(filters?: {}): Promise<{
        applied_count: any;
        avg_time_reduction_pct: number;
        avg_success_rate_delta: number;
        recommendations_analyzed: any;
    }>;
    /**
     * Archive history
     */
    archiveHistory(historyId: any): Promise<{
        history_id: any;
        recommendation_id: any;
        action: any;
        reason: any;
        operator: any;
        timestamp: any;
        metadata: any;
    }>;
    _deserializeHistory(row: any): {
        history_id: any;
        recommendation_id: any;
        action: any;
        reason: any;
        operator: any;
        timestamp: any;
        metadata: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=history-store.d.ts.map