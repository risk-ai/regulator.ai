/**
 * Timeline Types
 * Phase 5B: Objective Timeline View
 *
 * Operator-focused read model for objective execution history.
 * Transforms SSE events into operator-comprehensible timeline items.
 */
export type TimelineCategory = 'execution' | 'objective' | 'alert' | 'system';
export type TimelineStatus = 'info' | 'running' | 'success' | 'warning' | 'error';
/**
 * Timeline Item
 * Operator-focused event representation
 */
export interface TimelineItem {
    id: string;
    ts: string;
    objectiveId: string;
    envelopeId?: string;
    category: TimelineCategory;
    type: string;
    title: string;
    status: TimelineStatus;
    message?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Timeline Response
 */
export interface ObjectiveTimelineResponse {
    objectiveId: string;
    items: TimelineItem[];
    summary: {
        state: string;
        progressPct?: number;
        queued: number;
        executing: number;
        verified: number;
        failed: number;
        deadLettered: number;
    };
}
/**
 * Timeline Query Parameters
 */
export interface TimelineQueryParams {
    category?: TimelineCategory;
    status?: TimelineStatus;
    limit?: number;
}
/**
 * Event to Timeline Mapping
 * Maps SSE event types to timeline items
 */
export interface EventTimelineMapping {
    category: TimelineCategory;
    status: TimelineStatus;
    titleTemplate: string;
}
/**
 * Timeline Event Mappings
 * Defines how SSE events transform into timeline items
 */
export declare const EVENT_TIMELINE_MAPPINGS: Record<string, EventTimelineMapping>;
//# sourceMappingURL=timeline.d.ts.map