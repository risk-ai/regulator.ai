/**
 * Anomaly Detection Service — Vienna OS
 * 
 * Analyzes recent audit events and flags anomalies
 */

import { getStateGraph } from '@vienna/lib';

export interface AnomalyAlert {
  id: string;
  type: 'rate_spike' | 'scope_violation' | 'unusual_pattern' | 'repeated_denial' | 'off_hours';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agent_id: string;
  description: string;
  detected_at: string;
  details: Record<string, any>;
}

export class AnomalyDetectionService {
  private stateGraph: any;

  constructor() {
    this.stateGraph = null;
  }

  private async getStateGraph() {
    if (!this.stateGraph) {
      this.stateGraph = await getStateGraph();
      await this.stateGraph.initialize();
    }
    return this.stateGraph;
  }

  /**
   * Run anomaly detection on recent audit events
   */
  async detectAnomalies(): Promise<AnomalyAlert[]> {
    const stateGraph = await this.getStateGraph();
    const alerts: AnomalyAlert[] = [];

    try {
      // Get recent audit events (last 24 hours)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const auditEvents = await this.getRecentAuditEvents(since);

      // Group events by agent
      const eventsByAgent = this.groupEventsByAgent(auditEvents);

      // Run detection rules for each agent
      for (const [agentId, events] of Object.entries(eventsByAgent)) {
        const agentAlerts = await this.detectAgentAnomalies(agentId, events);
        alerts.push(...agentAlerts);
      }

      console.log(`[AnomalyDetection] Found ${alerts.length} anomalies across ${Object.keys(eventsByAgent).length} agents`);
      return alerts;

    } catch (error) {
      console.error('[AnomalyDetection] Detection failed:', error);
      return [];
    }
  }

  private async getRecentAuditEvents(since: string): Promise<any[]> {
    const stateGraph = await this.getStateGraph();

    // Mock recent events if no real data
    return [
      {
        id: '1',
        agent_id: 'agent-1',
        event: 'execution_verified',
        action_type: 'deploy_to_prod',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        risk_tier: 3,
        details: { environment: 'production' }
      },
      {
        id: '2',
        agent_id: 'agent-1',
        event: 'execution_verified',
        action_type: 'deploy_to_prod',
        created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        risk_tier: 3,
        details: { environment: 'production' }
      },
      {
        id: '3',
        agent_id: 'agent-2',
        event: 'execution_denied',
        action_type: 'database_access',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        risk_tier: 2,
        details: { database: 'users' }
      },
      {
        id: '4',
        agent_id: 'agent-2',
        event: 'execution_denied',
        action_type: 'database_access',
        created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        risk_tier: 2,
        details: { database: 'users' }
      },
      {
        id: '5',
        agent_id: 'agent-2',
        event: 'execution_denied',
        action_type: 'database_access',
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        risk_tier: 2,
        details: { database: 'users' }
      },
      {
        id: '6',
        agent_id: 'agent-3',
        event: 'execution_verified',
        action_type: 'wire_transfer',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 AM
        risk_tier: 4,
        details: { amount: 50000 }
      }
    ];
  }

  private groupEventsByAgent(events: any[]): Record<string, any[]> {
    return events.reduce((acc, event) => {
      if (!acc[event.agent_id]) {
        acc[event.agent_id] = [];
      }
      acc[event.agent_id].push(event);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private async detectAgentAnomalies(agentId: string, events: any[]): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    // Rule 1: Rate spike (>50 requests in 60 seconds)
    const rateSpikeAlert = this.detectRateSpike(agentId, events);
    if (rateSpikeAlert) alerts.push(rateSpikeAlert);

    // Rule 2: Scope violation (agent using new action types)
    const scopeViolationAlert = await this.detectScopeViolation(agentId, events);
    if (scopeViolationAlert) alerts.push(scopeViolationAlert);

    // Rule 3: Repeated denials (>3 denials in 10 minutes)
    const repeatedDenialAlert = this.detectRepeatedDenials(agentId, events);
    if (repeatedDenialAlert) alerts.push(repeatedDenialAlert);

    // Rule 4: Off-hours activity (T2+ actions outside business hours)
    const offHoursAlert = this.detectOffHoursActivity(agentId, events);
    if (offHoursAlert) alerts.push(offHoursAlert);

    // Rule 5: Unusual pattern (accessing resources not touched in >30 days)
    const unusualPatternAlert = await this.detectUnusualPattern(agentId, events);
    if (unusualPatternAlert) alerts.push(unusualPatternAlert);

    return alerts;
  }

  private detectRateSpike(agentId: string, events: any[]): AnomalyAlert | null {
    // Check for >50 events in the last 60 seconds
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const recentEvents = events.filter(e => new Date(e.created_at).getTime() > oneMinuteAgo);

    if (recentEvents.length > 50) {
      return {
        id: `rate_spike_${agentId}_${Date.now()}`,
        type: 'rate_spike',
        severity: 'high',
        agent_id: agentId,
        description: `Agent ${agentId} made ${recentEvents.length} requests in the last minute`,
        detected_at: new Date().toISOString(),
        details: {
          event_count: recentEvents.length,
          time_window: '60 seconds',
          threshold: 50
        }
      };
    }

    return null;
  }

  private async detectScopeViolation(agentId: string, events: any[]): Promise<AnomalyAlert | null> {
    // Get historical action types for this agent (mock data)
    const historicalActionTypes = new Set(['database_query', 'file_read', 'api_call']);
    
    const newActionTypes = new Set();
    for (const event of events) {
      if (event.action_type && !historicalActionTypes.has(event.action_type)) {
        newActionTypes.add(event.action_type);
      }
    }

    if (newActionTypes.size > 0) {
      return {
        id: `scope_violation_${agentId}_${Date.now()}`,
        type: 'scope_violation',
        severity: 'medium',
        agent_id: agentId,
        description: `Agent ${agentId} used new action types: ${Array.from(newActionTypes).join(', ')}`,
        detected_at: new Date().toISOString(),
        details: {
          new_action_types: Array.from(newActionTypes),
          historical_action_types: Array.from(historicalActionTypes)
        }
      };
    }

    return null;
  }

  private detectRepeatedDenials(agentId: string, events: any[]): AnomalyAlert | null {
    // Check for >3 denials in the last 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentDenials = events.filter(e => 
      e.event === 'execution_denied' && 
      new Date(e.created_at).getTime() > tenMinutesAgo
    );

    if (recentDenials.length > 3) {
      return {
        id: `repeated_denial_${agentId}_${Date.now()}`,
        type: 'repeated_denial',
        severity: 'medium',
        agent_id: agentId,
        description: `Agent ${agentId} had ${recentDenials.length} denials in the last 10 minutes`,
        detected_at: new Date().toISOString(),
        details: {
          denial_count: recentDenials.length,
          time_window: '10 minutes',
          threshold: 3,
          denied_actions: recentDenials.map(d => d.action_type)
        }
      };
    }

    return null;
  }

  private detectOffHoursActivity(agentId: string, events: any[]): AnomalyAlert | null {
    // Business hours: 9 AM - 5 PM (configurable)
    const businessStart = 9; // 9 AM
    const businessEnd = 17; // 5 PM

    const offHoursEvents = events.filter(e => {
      if (e.risk_tier < 2) return false; // Only T2+ actions
      
      const eventTime = new Date(e.created_at);
      const hour = eventTime.getHours();
      return hour < businessStart || hour >= businessEnd;
    });

    if (offHoursEvents.length > 0) {
      return {
        id: `off_hours_${agentId}_${Date.now()}`,
        type: 'off_hours',
        severity: 'low',
        agent_id: agentId,
        description: `Agent ${agentId} performed ${offHoursEvents.length} T2+ actions outside business hours`,
        detected_at: new Date().toISOString(),
        details: {
          off_hours_count: offHoursEvents.length,
          business_hours: `${businessStart}:00-${businessEnd}:00`,
          events: offHoursEvents.map(e => ({
            action_type: e.action_type,
            time: e.created_at,
            risk_tier: e.risk_tier
          }))
        }
      };
    }

    return null;
  }

  private async detectUnusualPattern(agentId: string, events: any[]): Promise<AnomalyAlert | null> {
    // Mock historical resource access patterns
    const lastAccessTime = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
    const unusualResources = [];

    for (const event of events) {
      if (event.details && event.details.resource) {
        // Check if this resource hasn't been accessed in >30 days (mock check)
        if (event.details.resource === 'legacy_database' || event.details.resource === 'archived_files') {
          unusualResources.push(event.details.resource);
        }
      }
    }

    if (unusualResources.length > 0) {
      return {
        id: `unusual_pattern_${agentId}_${Date.now()}`,
        type: 'unusual_pattern',
        severity: 'low',
        agent_id: agentId,
        description: `Agent ${agentId} accessed resources not used in >30 days: ${unusualResources.join(', ')}`,
        detected_at: new Date().toISOString(),
        details: {
          unusual_resources: unusualResources,
          threshold_days: 30
        }
      };
    }

    return null;
  }

  /**
   * Get agent behavioral baseline
   */
  async getAgentBaseline(agentId: string): Promise<any | null> {
    try {
      const stateGraph = await this.getStateGraph();
      
      // Get historical events for baseline calculation (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const events = await this.getRecentAuditEvents(thirtyDaysAgo);
      const agentEvents = events.filter(e => e.agent_id === agentId);
      
      if (agentEvents.length < 10) {
        // Not enough data for baseline
        return null;
      }

      // Calculate baseline metrics
      const actionTypes = new Map<string, number>();
      const hourlyActivity = new Map<number, number>();
      let totalErrorRate = 0;
      let errorCount = 0;

      for (const event of agentEvents) {
        // Action type distribution
        const actionType = event.action_type || 'unknown';
        actionTypes.set(actionType, (actionTypes.get(actionType) || 0) + 1);

        // Activity by hour
        const hour = new Date(event.created_at).getHours();
        hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);

        // Error rate
        if (event.event === 'execution_denied' || event.event === 'execution_failed') {
          errorCount++;
        }
      }

      totalErrorRate = (errorCount / agentEvents.length) * 100;

      // Calculate velocity (events per day)
      const firstEvent = new Date(agentEvents[0].created_at);
      const lastEvent = new Date(agentEvents[agentEvents.length - 1].created_at);
      const durationDays = Math.max(1, (lastEvent.getTime() - firstEvent.getTime()) / (24 * 60 * 60 * 1000));
      const velocityMean = agentEvents.length / durationDays;

      return {
        agent_id: agentId,
        created_at: firstEvent.toISOString(),
        last_updated: lastEvent.toISOString(),
        sample_size: agentEvents.length,
        metrics: {
          velocity: {
            mean: Math.round(velocityMean * 100) / 100,
            std_dev: Math.round(velocityMean * 0.2 * 100) / 100, // Estimate: 20% of mean
          },
          error_rate: {
            mean: Math.round(totalErrorRate * 100) / 100,
            std_dev: Math.round(totalErrorRate * 0.15 * 100) / 100, // Estimate: 15% of mean
          },
        },
        action_patterns: Object.fromEntries(actionTypes),
        active_hours: Object.fromEntries(hourlyActivity),
      };
    } catch (error) {
      console.error('[AnomalyDetection] Failed to get agent baseline:', error);
      return null;
    }
  }

  /**
   * Get anomaly statistics
   */
  async getStats(): Promise<any> {
    const alerts = await this.detectAnomalies();
    
    const stats = {
      total: alerts.length,
      by_type: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      by_agent: {} as Record<string, number>
    };

    for (const alert of alerts) {
      stats.by_type[alert.type] = (stats.by_type[alert.type] || 0) + 1;
      stats.by_severity[alert.severity] = (stats.by_severity[alert.severity] || 0) + 1;
      stats.by_agent[alert.agent_id] = (stats.by_agent[alert.agent_id] || 0) + 1;
    }

    return stats;
  }
}

// Singleton instance
export const anomalyDetectionService = new AnomalyDetectionService();