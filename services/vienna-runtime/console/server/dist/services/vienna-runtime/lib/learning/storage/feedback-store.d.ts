export = FeedbackStore;
declare class FeedbackStore {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Record operator feedback
     */
    recordFeedback(feedback: any): Promise<any>;
    /**
     * List unprocessed feedback
     */
    listUnprocessedFeedback(filters?: {}): Promise<any>;
    /**
     * Mark feedback as processed
     */
    markFeedbackProcessed(feedbackId: any, metadata?: {}): Promise<void>;
    /**
     * Get feedback summary by action
     */
    getFeedbackSummary(filters?: {}): Promise<{
        total: any;
        approved: any;
        denied: any;
        avg_approval_time_ms: number;
    }>;
    /**
     * Archive feedback
     */
    archiveFeedback(feedbackId: any): Promise<{
        feedback_id: any;
        source: any;
        action_type: any;
        target_id: any;
        operator: any;
        decision: any;
        reason: any;
        timestamp: any;
        context: any;
        processed: boolean;
        processed_at: any;
    }>;
    _deserializeFeedback(row: any): {
        feedback_id: any;
        source: any;
        action_type: any;
        target_id: any;
        operator: any;
        decision: any;
        reason: any;
        timestamp: any;
        context: any;
        processed: boolean;
        processed_at: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=feedback-store.d.ts.map