/**
 * Timeline Service
 * Phase 5B: Objective Timeline View
 *
 * Derives operator-focused timeline from canonical event history.
 * Principles:
 * - Timeline is a read model, not source of truth
 * - Derives from replay log when available
 * - Falls back to in-memory event buffer
 * - Never shows raw event names to operators
 */
import type { ObjectiveTimelineResponse, TimelineQueryParams } from '../types/timeline.js';
import type { ViennaRuntimeService } from './viennaRuntime.js';
export declare class TimelineService {
    private viennaRuntime;
    private config;
    private eventBuffer;
    constructor(viennaRuntime: ViennaRuntimeService, config?: {
        maxEventsPerObjective?: number;
        retentionWindowHours?: number;
    });
    /**
     * Get objective timeline
     * Aggregates historical events + summary state
     */
    getObjectiveTimeline(objectiveId: string, params?: TimelineQueryParams): Promise<ObjectiveTimelineResponse | null>;
    /**
     * Get timeline items for objective
     * Attempts to derive from replay log, falls back to event buffer
     */
    private getTimelineItems;
    /**
     * Transform replay event to timeline item
     */
    private eventToTimelineItem;
    /**
     * Buffer SSE event for timeline
     * Called when SSE events arrive
     */
    bufferEvent(event: {
        type: string;
        timestamp: string;
        payload: any;
    }): void;
    /**
     * Clear old events from buffer
     * Called periodically to prevent unbounded growth
     */
    cleanupBuffer(): void;
}
//# sourceMappingURL=timelineService.d.ts.map