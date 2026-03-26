/**
 * Integration Dispatcher — Vienna OS
 * 
 * Dispatches governance events to matching integrations in parallel.
 * Handles logging, circuit breaking, and failure tracking.
 */

import { query, queryOne, execute } from '../../db/postgres.js';
import { getAdapter } from './adapterRegistry.js';
import type { IntegrationEvent, IntegrationRecord } from './types.js';

const CIRCUIT_BREAK_THRESHOLD = 5;

/**
 * Find integrations matching an event
 */
async function findMatchingIntegrations(event: IntegrationEvent): Promise<IntegrationRecord[]> {
  const integrations = await query<IntegrationRecord>(
    `SELECT * FROM integrations WHERE enabled = true AND consecutive_failures < $1`,
    [CIRCUIT_BREAK_THRESHOLD]
  );

  return integrations.filter(integration => {
    // Check event type match
    const eventTypes = Array.isArray(integration.event_types) 
      ? integration.event_types 
      : JSON.parse(integration.event_types as any);
    if (!eventTypes.includes(event.type) && !eventTypes.includes('*')) {
      return false;
    }

    // Check filters
    const filters = integration.filters || {};
    if (filters.action_types && event.data.action_type) {
      const allowed = Array.isArray(filters.action_types) ? filters.action_types : [filters.action_types];
      if (!allowed.includes(event.data.action_type)) return false;
    }
    if (filters.agents && event.data.agent_id) {
      const allowed = Array.isArray(filters.agents) ? filters.agents : [filters.agents];
      if (!allowed.includes(event.data.agent_id)) return false;
    }
    if (filters.risk_tiers && event.data.risk_tier) {
      const allowed = Array.isArray(filters.risk_tiers) ? filters.risk_tiers : [filters.risk_tiers];
      if (!allowed.includes(event.data.risk_tier)) return false;
    }

    return true;
  });
}

/**
 * Log an integration event
 */
async function logEvent(
  integrationId: string,
  eventType: string,
  payload: any,
  success: boolean,
  responseStatus?: number,
  responseBody?: string,
  latencyMs?: number,
  errorMessage?: string
): Promise<void> {
  await execute(
    `INSERT INTO integration_events (integration_id, event_type, payload, response_status, response_body, latency_ms, success, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [integrationId, eventType, JSON.stringify(payload), responseStatus || null, responseBody || null, latencyMs || null, success, errorMessage || null]
  );
}

/**
 * Update integration health status
 */
async function updateHealth(integrationId: string, success: boolean, error?: string): Promise<void> {
  if (success) {
    await execute(
      `UPDATE integrations SET last_success = NOW(), consecutive_failures = 0, updated_at = NOW() WHERE id = $1`,
      [integrationId]
    );
  } else {
    await execute(
      `UPDATE integrations SET last_failure = NOW(), last_error = $2, consecutive_failures = consecutive_failures + 1, updated_at = NOW() WHERE id = $1`,
      [integrationId, error || 'Unknown error']
    );
  }
}

/**
 * Dispatch an event to a single integration
 */
async function dispatchToIntegration(
  integration: IntegrationRecord,
  event: IntegrationEvent
): Promise<{ success: boolean; error?: string }> {
  const adapter = getAdapter(integration.type);
  if (!adapter) {
    const error = `No adapter found for type: ${integration.type}`;
    await logEvent(integration.id, event.type, event.data, false, undefined, undefined, undefined, error);
    return { success: false, error };
  }

  const startTime = Date.now();
  try {
    const result = await adapter.sendNotification(event, integration.config);
    const latencyMs = Date.now() - startTime;

    await logEvent(
      integration.id,
      event.type,
      event.data,
      result.success,
      result.response?.status,
      typeof result.response?.body === 'string' ? result.response.body.slice(0, 2000) : JSON.stringify(result.response)?.slice(0, 2000),
      latencyMs,
      result.error
    );

    await updateHealth(integration.id, result.success, result.error);

    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const error = err instanceof Error ? err.message : 'Unknown dispatch error';

    await logEvent(integration.id, event.type, event.data, false, undefined, undefined, latencyMs, error);
    await updateHealth(integration.id, false, error);

    return { success: false, error };
  }
}

/**
 * Dispatch a governance event to all matching integrations
 */
export async function dispatchEvent(event: IntegrationEvent): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ integration_id: string; name: string; type: string; success: boolean; error?: string }>;
}> {
  const integrations = await findMatchingIntegrations(event);

  if (integrations.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  // Dispatch to all in parallel
  const promises = integrations.map(async (integration) => {
    const result = await dispatchToIntegration(integration, event);
    return {
      integration_id: integration.id,
      name: integration.name,
      type: integration.type,
      success: result.success,
      error: result.error,
    };
  });

  const results = await Promise.all(promises);
  const succeeded = results.filter(r => r.success).length;

  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}

/**
 * Reset circuit breaker for an integration (re-enable after fixing)
 */
export async function resetCircuitBreaker(integrationId: string): Promise<void> {
  await execute(
    `UPDATE integrations SET consecutive_failures = 0, last_error = NULL, updated_at = NOW() WHERE id = $1`,
    [integrationId]
  );
}

/**
 * Get dispatch statistics for an integration
 */
export async function getIntegrationStats(integrationId: string): Promise<{
  total_events: number;
  success_count: number;
  failure_count: number;
  avg_latency_ms: number;
}> {
  const row = await queryOne<any>(
    `SELECT 
       COUNT(*) as total_events,
       COUNT(*) FILTER (WHERE success = true) as success_count,
       COUNT(*) FILTER (WHERE success = false) as failure_count,
       COALESCE(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL), 0) as avg_latency_ms
     FROM integration_events 
     WHERE integration_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [integrationId]
  );

  return {
    total_events: parseInt(row?.total_events || '0'),
    success_count: parseInt(row?.success_count || '0'),
    failure_count: parseInt(row?.failure_count || '0'),
    avg_latency_ms: Math.round(parseFloat(row?.avg_latency_ms || '0')),
  };
}
