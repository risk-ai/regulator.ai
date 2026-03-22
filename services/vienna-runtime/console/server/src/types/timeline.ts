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
  ts: string; // ISO 8601
  objectiveId: string;
  envelopeId?: string;
  category: TimelineCategory;
  type: string; // Original event type
  title: string; // Human-readable title
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
export const EVENT_TIMELINE_MAPPINGS: Record<string, EventTimelineMapping> = {
  // Execution events
  'execution.started': {
    category: 'execution',
    status: 'running',
    titleTemplate: 'Execution started',
  },
  'execution.completed': {
    category: 'execution',
    status: 'success',
    titleTemplate: 'Execution completed',
  },
  'execution.failed': {
    category: 'execution',
    status: 'error',
    titleTemplate: 'Execution failed',
  },
  'execution.retried': {
    category: 'execution',
    status: 'warning',
    titleTemplate: 'Execution retried',
  },
  'execution.timeout': {
    category: 'execution',
    status: 'error',
    titleTemplate: 'Execution timeout',
  },
  'execution.blocked': {
    category: 'execution',
    status: 'warning',
    titleTemplate: 'Execution blocked',
  },
  
  // Objective events
  'objective.created': {
    category: 'objective',
    status: 'info',
    titleTemplate: 'Objective created',
  },
  'objective.updated': {
    category: 'objective',
    status: 'info',
    titleTemplate: 'Progress updated',
  },
  'objective.completed': {
    category: 'objective',
    status: 'success',
    titleTemplate: 'Objective completed',
  },
  'objective.failed': {
    category: 'objective',
    status: 'error',
    titleTemplate: 'Objective failed',
  },
  
  // Alert events
  'alert.created': {
    category: 'alert',
    status: 'warning',
    titleTemplate: 'Alert created',
  },
  
  // System events
  'system.paused': {
    category: 'system',
    status: 'warning',
    titleTemplate: 'System paused',
  },
  'system.resumed': {
    category: 'system',
    status: 'info',
    titleTemplate: 'System resumed',
  },
};
