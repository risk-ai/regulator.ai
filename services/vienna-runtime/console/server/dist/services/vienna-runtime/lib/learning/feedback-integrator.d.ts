export = FeedbackIntegrator;
declare class FeedbackIntegrator {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Analyze approval patterns
     */
    analyzeApprovalPatterns(options?: {}): Promise<({
        pattern_type: string;
        action_type: any;
        target_id: any;
        approval_rate: number;
        avg_approval_time_ms: number;
        sample_size: any;
        recommendation: string;
        confidence: number;
        denial_rate?: undefined;
        common_denial_reason?: undefined;
    } | {
        pattern_type: string;
        action_type: any;
        target_id: any;
        denial_rate: number;
        common_denial_reason: string;
        sample_size: any;
        recommendation: string;
        confidence: number;
        approval_rate?: undefined;
        avg_approval_time_ms?: undefined;
    })[]>;
    /**
     * Analyze denial patterns
     */
    analyzeDenialPatterns(options?: {}): Promise<({
        pattern_type: string;
        denial_reason: string;
        time_windows: {
            start_hour: number;
            end_hour: number;
            denial_count: any;
        }[];
        sample_size: any;
        recommendation: string;
        confidence: number;
        target_id?: undefined;
    } | {
        pattern_type: string;
        denial_reason: string;
        target_id: string;
        sample_size: any;
        recommendation: string;
        confidence: number;
        time_windows?: undefined;
    })[]>;
    /**
     * Analyze override patterns
     */
    analyzeOverridePatterns(options?: {}): Promise<({
        pattern_type: string;
        action_type: any;
        override_reason: any;
        sample_size: any;
        recommendation: string;
        confidence: number;
    } | {
        pattern_type: string;
        action_type: any;
        sample_size: any;
        recommendation: string;
        confidence: number;
        override_reason?: undefined;
    })[]>;
    /**
     * Record operator feedback
     */
    recordFeedback(feedback: any): Promise<{
        feedback_id: string;
        source: any;
        action_type: any;
        target_id: any;
        operator: any;
        decision: any;
        reason: any;
        timestamp: string;
        context: string;
        processed: number;
    }>;
    /**
     * Mark feedback as processed
     */
    markFeedbackProcessed(feedbackId: any, metadata?: {}): Promise<void>;
    _getOperatorFeedback(filters?: {}): Promise<any[]>;
    _groupBy(items: any, keyFn: any): {};
    _detectTimeWindows(items: any): {
        start_hour: number;
        end_hour: number;
        denial_count: any;
    }[];
    _avg(numbers: any): number;
    _daysAgo(days: any): string;
    _calculateConfidence(sampleSize: any, metric: any): 0.5 | 0.9 | 0.85 | 0.7;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=feedback-integrator.d.ts.map