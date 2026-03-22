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

import type {
  TimelineItem,
  TimelineCategory,
  TimelineStatus,
  ObjectiveTimelineResponse,
  TimelineQueryParams,
  EVENT_TIMELINE_MAPPINGS,
} from '../types/timeline.js';
import { EVENT_TIMELINE_MAPPINGS as MAPPINGS } from '../types/timeline.js';
import type { ViennaRuntimeService } from './viennaRuntime.js';

/**
 * In-memory event buffer for timeline derivation
 * Bounded by objective and retention window
 */
interface TimelineEventBuffer {
  events: Map<string, TimelineItem[]>; // objectiveId -> events
  maxEventsPerObjective: number;
  retentionWindowMs: number;
}

export class TimelineService {
  private eventBuffer: TimelineEventBuffer;

  constructor(
    private viennaRuntime: ViennaRuntimeService,
    private config: {
      maxEventsPerObjective?: number;
      retentionWindowHours?: number;
    } = {}
  ) {
    this.eventBuffer = {
      events: new Map(),
      maxEventsPerObjective: config.maxEventsPerObjective || 500,
      retentionWindowMs: (config.retentionWindowHours || 24) * 60 * 60 * 1000,
    };

    console.log('[TimelineService] Initialized with config:', config);
  }

  /**
   * Get objective timeline
   * Aggregates historical events + summary state
   */
  async getObjectiveTimeline(
    objectiveId: string,
    params?: TimelineQueryParams
  ): Promise<ObjectiveTimelineResponse | null> {
    try {
      // Get objective to verify it exists and get summary state
      const objective = await this.viennaRuntime.getObjective(objectiveId);
      
      if (!objective) {
        console.log('[TimelineService] Objective not found:', objectiveId);
        return null;
      }

      // Get timeline items (from replay log or event buffer)
      const items = await this.getTimelineItems(objectiveId, params);

      // Get progress/summary from ViennaRuntime
      const progress = await this.viennaRuntime.getObjectiveProgress(objectiveId);

      // Build response
      const response: ObjectiveTimelineResponse = {
        objectiveId,
        items,
        summary: {
          state: objective.status || 'unknown',
          progressPct: progress?.progress_pct,
          queued: progress?.envelopes?.queued || 0,
          executing: progress?.envelopes?.executing || 0,
          verified: progress?.envelopes?.verified || 0,
          failed: progress?.envelopes?.failed || 0,
          deadLettered: progress?.envelopes?.dead_lettered || 0,
        },
      };

      return response;
    } catch (error) {
      console.error('[TimelineService] Error getting timeline:', error);
      throw error;
    }
  }

  /**
   * Get timeline items for objective
   * Attempts to derive from replay log, falls back to event buffer
   */
  private async getTimelineItems(
    objectiveId: string,
    params?: TimelineQueryParams
  ): Promise<TimelineItem[]> {
    try {
      // Try to get from replay log (canonical source)
      const replayResult = await this.viennaRuntime.queryReplay({
        objective_id: objectiveId,
        limit: params?.limit || 500,
      });

      if (replayResult && replayResult.events && replayResult.events.length > 0) {
        // Transform replay events to timeline items
        let items = replayResult.events
          .map(event => this.eventToTimelineItem(event))
          .filter((item): item is TimelineItem => item !== null);

        // Apply filters
        if (params?.category) {
          items = items.filter(item => item.category === params.category);
        }
        if (params?.status) {
          items = items.filter(item => item.status === params.status);
        }

        // Sort by timestamp descending (most recent first)
        items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

        return items;
      }

      // Fallback: Get from in-memory event buffer
      const bufferedItems = this.eventBuffer.events.get(objectiveId) || [];
      
      // Apply filters
      let items = [...bufferedItems];
      if (params?.category) {
        items = items.filter(item => item.category === params.category);
      }
      if (params?.status) {
        items = items.filter(item => item.status === params.status);
      }

      // Sort by timestamp descending
      items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      // Apply limit
      if (params?.limit) {
        items = items.slice(0, params.limit);
      }

      return items;
    } catch (error) {
      console.error('[TimelineService] Error getting timeline items:', error);
      
      // Graceful degradation - return buffered events
      const bufferedItems = this.eventBuffer.events.get(objectiveId) || [];
      return bufferedItems.slice(0, params?.limit || 500);
    }
  }

  /**
   * Transform replay event to timeline item
   */
  private eventToTimelineItem(event: any): TimelineItem | null {
    const mapping = MAPPINGS[event.event_type];
    
    if (!mapping) {
      // Unknown event type - skip or log
      console.log('[TimelineService] Unknown event type:', event.event_type);
      return null;
    }

    // Extract metadata from payload
    const metadata: Record<string, unknown> = {};
    
    if (event.payload) {
      if (event.payload.duration_ms) metadata.duration_ms = event.payload.duration_ms;
      if (event.payload.provider) metadata.provider = event.payload.provider;
      if (event.payload.error) metadata.error = event.payload.error;
      if (event.payload.attempt) metadata.attempt = event.payload.attempt;
      if (event.payload.reason) metadata.reason = event.payload.reason;
    }

    // Build title from template and payload
    let title = mapping.titleTemplate;
    
    // Add context to title when available
    if (event.payload?.error && mapping.status === 'error') {
      title = `${title}: ${event.payload.error}`;
    } else if (event.payload?.reason) {
      title = `${title}: ${event.payload.reason}`;
    } else if (event.payload?.name) {
      title = `${title} for ${event.payload.name}`;
    }

    // Build message from payload
    let message: string | undefined;
    if (event.payload?.message) {
      message = event.payload.message;
    } else if (event.payload?.description) {
      message = event.payload.description;
    }

    return {
      id: event.event_id,
      ts: event.timestamp,
      objectiveId: event.objective_id || '',
      envelopeId: event.envelope_id,
      category: mapping.category,
      type: event.event_type,
      title,
      status: mapping.status,
      message,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  }

  /**
   * Buffer SSE event for timeline
   * Called when SSE events arrive
   */
  bufferEvent(event: {
    type: string;
    timestamp: string;
    payload: any;
  }): void {
    const mapping = MAPPINGS[event.type];
    
    if (!mapping) {
      // Not a timeline-relevant event
      return;
    }

    const objectiveId = event.payload?.objective_id;
    if (!objectiveId) {
      // No objective context - skip
      return;
    }

    // Create timeline item
    const item = this.eventToTimelineItem({
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_type: event.type,
      timestamp: event.timestamp,
      objective_id: objectiveId,
      envelope_id: event.payload?.envelope_id,
      payload: event.payload,
    });

    if (!item) return;

    // Add to buffer
    const objectiveEvents = this.eventBuffer.events.get(objectiveId) || [];
    objectiveEvents.unshift(item); // Add to front (most recent)

    // Enforce retention limits
    const now = Date.now();
    const filtered = objectiveEvents
      .filter(e => now - new Date(e.ts).getTime() < this.eventBuffer.retentionWindowMs)
      .slice(0, this.eventBuffer.maxEventsPerObjective);

    this.eventBuffer.events.set(objectiveId, filtered);

    console.log(`[TimelineService] Buffered event ${event.type} for objective ${objectiveId}`);
  }

  /**
   * Clear old events from buffer
   * Called periodically to prevent unbounded growth
   */
  cleanupBuffer(): void {
    const now = Date.now();
    
    for (const [objectiveId, events] of this.eventBuffer.events.entries()) {
      const filtered = events.filter(
        e => now - new Date(e.ts).getTime() < this.eventBuffer.retentionWindowMs
      );
      
      if (filtered.length === 0) {
        this.eventBuffer.events.delete(objectiveId);
      } else if (filtered.length !== events.length) {
        this.eventBuffer.events.set(objectiveId, filtered);
      }
    }

    console.log(`[TimelineService] Buffer cleanup complete. Active objectives: ${this.eventBuffer.events.size}`);
  }
}
