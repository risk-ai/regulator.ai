/**
 * Intent API Client
 * 
 * Phase 21-30: Structured intent submission to Vienna OS
 * Distinct from conversational chat — this is the governed execution path
 */

import { apiClient } from './client.js';

export interface IntentSubmission {
  intent_type: string;
  payload: any;
  simulation?: boolean;
}

export interface IntentResponse {
  success: boolean;
  data?: {
    intent_id: string;
    tenant_id: string;
    action: string;
    execution_id?: string;
    simulation?: boolean;
    explanation?: string;
    attestation?: {
      attestation_id: string;
      status: string;
      attested_at: string;
    };
    cost?: {
      total_cost: number;
      input_tokens: number;
      output_tokens: number;
    };
    quota_state?: {
      available: number;
      utilization: number;
    };
    metadata?: any;
  };
  error?: string;
  code?: string;
  timestamp: string;
}

export const intentApi = {
  /**
   * Submit intent to Vienna OS
   * 
   * Phase 21-30: Full governance pipeline
   * - Tenant attribution
   * - Quota enforcement
   * - Cost tracking
   * - Policy evaluation
   * - Attestation generation
   * - Explainability
   */
  async submitIntent(intent: IntentSubmission): Promise<IntentResponse> {
    try {
      const response = await apiClient.post<IntentResponse, IntentSubmission>(
        '/recovery/intent',
        intent
      );

      return response;
    } catch (error) {
      console.error('[IntentAPI] Submission failed:', error);

      // Return structured error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTENT_SUBMISSION_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
