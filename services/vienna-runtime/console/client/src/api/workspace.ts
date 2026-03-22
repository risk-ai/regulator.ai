/**
 * Workspace API Client
 * Phase 13b - Investigation Index + Skeletons
 * Phase 13e - Timeline + Graph + Explanation
 */

import { apiClient } from './client.js';
import type {
  Investigation,
  InvestigationDetail,
  Artifact,
  ListInvestigationsParams,
  ListArtifactsParams,
  IntentTrace,
  IntentTimeline,
  IntentGraph,
  IntentExplanation,
} from '../types/workspace.js';

/**
 * List investigations with optional filters
 */
export async function listInvestigations(
  params: ListInvestigationsParams = {}
): Promise<{ investigations: Investigation[]; total: number }> {
  return apiClient.get<{ investigations: Investigation[]; total: number }>(
    '/investigations',
    params as Record<string, string | number | boolean | undefined>
  );
}

/**
 * Get investigation by ID with related entities
 */
export async function getInvestigation(id: string): Promise<InvestigationDetail> {
  return apiClient.get<InvestigationDetail>(`/investigations/${id}`);
}

/**
 * Create new investigation
 */
export async function createInvestigation(data: {
  name: string;
  description?: string;
  objective_id?: string;
  incident_id?: string;
}): Promise<Investigation> {
  return apiClient.post<Investigation>('/investigations', data);
}

/**
 * Update investigation
 */
export async function updateInvestigation(
  id: string,
  updates: Partial<Pick<Investigation, 'name' | 'description' | 'status'>>
): Promise<Investigation> {
  return apiClient.fetch<Investigation>(`/investigations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Archive investigation (soft delete)
 */
export async function archiveInvestigation(id: string): Promise<void> {
  await apiClient.delete<void>(`/investigations/${id}`);
}

/**
 * List artifacts with optional filters
 */
export async function listArtifacts(
  params: ListArtifactsParams = {}
): Promise<{ artifacts: Artifact[]; total: number }> {
  return apiClient.get<{ artifacts: Artifact[]; total: number }>(
    '/artifacts',
    params as Record<string, string | number | boolean | undefined>
  );
}

/**
 * Get artifact by ID
 */
export async function getArtifact(id: string): Promise<Artifact> {
  return apiClient.get<Artifact>(`/artifacts/${id}`);
}

/**
 * Get artifact content (returns raw content)
 */
export async function getArtifactContent(id: string): Promise<string> {
  const response = await fetch(`/api/v1/artifacts/${id}/content`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch artifact content: ${response.statusText}`);
  }
  
  return response.text();
}

/**
 * Create artifact
 */
export async function createArtifact(data: {
  artifact_type: string;
  name?: string;
  content: string;
  investigation_id?: string;
  intent_id?: string;
  execution_id?: string;
  objective_id?: string;
  incident_id?: string;
}): Promise<Artifact> {
  return apiClient.post<Artifact>('/artifacts', data);
}

/**
 * Get intent trace by ID
 * Phase 13e
 */
export async function getIntentTrace(intentId: string): Promise<IntentTrace> {
  const response = await apiClient.get<{ success: boolean; intent: IntentTrace }>(
    `/intents/${intentId}`
  );
  return response.intent;
}

/**
 * Get intent timeline (chronological events)
 * Phase 13e
 */
export async function getIntentTimeline(intentId: string): Promise<IntentTimeline> {
  const response = await apiClient.get<{ success: boolean; timeline: IntentTimeline }>(
    `/intents/${intentId}/timeline`
  );
  return response.timeline;
}

/**
 * Get intent execution graph (nodes + edges)
 * Phase 13e
 */
export async function getIntentGraph(intentId: string): Promise<IntentGraph> {
  const response = await apiClient.get<{ success: boolean; graph: IntentGraph }>(
    `/intents/${intentId}/graph`
  );
  return response.graph;
}

/**
 * Get intent decision explanation
 * Phase 13e
 */
export async function getIntentExplanation(intentId: string): Promise<IntentExplanation> {
  const response = await apiClient.get<{ success: boolean; explanation: IntentExplanation }>(
    `/intents/${intentId}/explanation`
  );
  return response.explanation;
}
