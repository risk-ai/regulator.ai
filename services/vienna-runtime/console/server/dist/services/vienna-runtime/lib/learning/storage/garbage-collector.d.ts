export = GarbageCollector;
/**
 * Garbage Collector
 *
 * Confidence decay and retention policy enforcement
 * Phase 18.1 — Learning Storage
 */
declare class GarbageCollector {
    constructor(stateGraph: any, patternStore: any, recommendationStore: any, historyStore: any);
    stateGraph: any;
    patternStore: any;
    recommendationStore: any;
    historyStore: any;
    /**
     * Run confidence decay for all active patterns
     */
    runConfidenceDecay(options?: {}): Promise<{
        decayed: number;
        expired: number;
    }>;
    /**
     * Archive old recommendations
     */
    archiveOldRecommendations(options?: {}): Promise<{
        archived: any;
    }>;
    /**
     * Archive old history
     */
    archiveOldHistory(options?: {}): Promise<{
        archived: any;
    }>;
    /**
     * Archive expired patterns
     */
    archiveExpiredPatterns(): Promise<{
        archived: any;
    }>;
    /**
     * Run full garbage collection
     */
    runFullGarbageCollection(options?: {}): Promise<{
        decay: {
            decayed: number;
            expired: number;
        };
        recommendations: {
            archived: any;
        };
        history: {
            archived: any;
        };
        patterns: {
            archived: any;
        };
    }>;
}
//# sourceMappingURL=garbage-collector.d.ts.map