/**
 * Objectives Service
 * 
 * Surfaces Vienna's governed work: objectives, blocked work, dead letters.
 * Provides operator visibility and action paths (retry/cancel).
 * 
 * RESPONSIBILITY:
 * - Retrieve objective summaries from Vienna Core
 * - Get objective detail where available
 * - Retrieve dead letters from Vienna Core
 * - Execute governed retry/cancel actions through ViennaRuntimeService
 * - Normalize data for operator shell
 * 
 * ARCHITECTURE:
 * - Routes call this service
 * - This service calls ViennaRuntimeService
 * - ViennaRuntimeService calls Vienna Core
 * - Never accessed directly from routes
 * 
 * FRAMING:
 * - Objectives are first-class operator objects
 * - Not agent silos or domain controllers
 * - Vienna as one governed system
 */

import type { ViennaRuntimeService } from './viennaRuntime.js';

// ============================================================================
// Types
// ============================================================================

export interface ObjectiveSummary {
  objectiveId: string;
  title: string | null;
  status: 'active' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  riskTier?: string | null;
  currentStep?: string | null;
  envelopeCount?: number;
  blockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveDetail extends ObjectiveSummary {
  envelopes: Array<{
    envelopeId: string;
    status: string;
    createdAt: string;
  }>;
  warrant?: {
    warrantId: string;
    tier: string;
    approved: boolean;
  } | null;
}

export interface DeadLetterSummary {
  id: string;
  objectiveId: string | null;
  envelopeId: string | null;
  reason: string;
  createdAt: string;
  retryable: boolean;
  retryCount: number;
}

export interface CancelObjectiveResponse {
  objectiveId: string;
  status: 'preview' | 'executing' | 'completed' | 'failed';
  message: string;
  cancelledAt?: string;
  envelopesCancelled?: number;
}

export interface RequeueDeadLetterResponse {
  deadLetterId: string;
  status: 'preview' | 'executing' | 'completed' | 'failed';
  message: string;
  requeuedAt?: string;
}

// ============================================================================
// Objectives Service
// ============================================================================

export class ObjectivesService {
  constructor(private viennaRuntime: ViennaRuntimeService) {
    console.log('[ObjectivesService] Initialized');
  }

  /**
   * Get list of objectives
   */
  async getObjectives(params?: {
    status?: 'active' | 'blocked' | 'completed' | 'failed' | 'cancelled';
    limit?: number;
  }): Promise<ObjectiveSummary[]> {
    try {
      // Query objectives from Vienna StateGraph (if available)
      // Note: Requires StateGraph objectives table and Vienna Core integration
      // For MVP: Return queue-based visibility
      console.log('[ObjectivesService] getObjectives called — using queue-based visibility');
      
      // Placeholder: Check queue state for some visibility
      const queueState = await this.viennaRuntime.getQueueState();
      
      // Return empty for now - will be wired when Vienna Core objective tracking is ready
      return [];
    } catch (error) {
      console.error('[ObjectivesService] Failed to get objectives:', error);
      throw error;
    }
  }

  /**
   * Get objective by ID
   */
  async getObjective(objectiveId: string): Promise<ObjectiveDetail | null> {
    try {
      console.log('[ObjectivesService] getObjective called for:', objectiveId);
      
      // Get objective detail from ViennaRuntimeService
      const objective = await this.viennaRuntime.getObjective(objectiveId);
      
      return objective;
    } catch (error) {
      console.error('[ObjectivesService] Failed to get objective:', error);
      throw error;
    }
  }

  /**
   * Cancel objective
   */
  async cancelObjective(
    objectiveId: string,
    operator: string,
    reason: string
  ): Promise<CancelObjectiveResponse> {
    try {
      console.log('[ObjectivesService] cancelObjective called:', { objectiveId, operator, reason });
      
      // Route through ViennaRuntimeService for governance
      const result = await this.viennaRuntime.cancelObjective(objectiveId, {
        operator,
        reason,
      });
      
      return {
        objectiveId,
        status: 'completed',
        message: `Objective cancelled successfully`,
        cancelledAt: result.cancelled_at,
        envelopesCancelled: result.envelopes_cancelled,
      };
    } catch (error) {
      console.error('[ObjectivesService] Failed to cancel objective:', error);
      
      // Return honest failure
      return {
        objectiveId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get dead letters
   */
  async getDeadLetters(params?: {
    objectiveId?: string;
    limit?: number;
  }): Promise<DeadLetterSummary[]> {
    try {
      console.log('[ObjectivesService] getDeadLetters called');
      
      // Get dead letters from ViennaRuntimeService
      const deadLetters = await this.viennaRuntime.getDeadLetters({
        objective_id: params?.objectiveId,
      });
      
      // Normalize to DeadLetterSummary format
      return deadLetters.map(dl => ({
        id: dl.envelope_id,
        objectiveId: dl.objective_id || null,
        envelopeId: dl.envelope_id,
        reason: dl.reason || 'Unknown failure',
        createdAt: dl.failed_at,
        retryable: dl.state === 'pending',
        retryCount: entry.metadata?.retry_count || 0
      }));
    } catch (error) {
      console.error('[ObjectivesService] Failed to get dead letters:', error);
      
      // Graceful degradation - return empty array
      return [];
    }
  }

  /**
   * Retry dead letter
   */
  async retryDeadLetter(
    deadLetterId: string,
    operator: string,
    reason: string
  ): Promise<RequeueDeadLetterResponse> {
    try {
      console.log('[ObjectivesService] retryDeadLetter called:', { deadLetterId, operator, reason });
      
      // Route through ViennaRuntimeService for governance
      const result = await this.viennaRuntime.retryDeadLetter(deadLetterId, {
        operator,
        reason,
      });
      
      return {
        deadLetterId,
        status: 'completed',
        message: `Dead letter requeued successfully`,
        requeuedAt: result.requeued_at,
      };
    } catch (error) {
      console.error('[ObjectivesService] Failed to retry dead letter:', error);
      
      // Return honest failure
      return {
        deadLetterId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get objectives summary for dashboard
   */
  async getObjectivesSummary(): Promise<{
    available: boolean;
    items?: ObjectiveSummary[];
    blockedCount?: number;
    deadLetterCount?: number;
    error?: string;
  }> {
    try {
      const objectives = await this.getObjectives({ limit: 10 });
      const deadLetters = await this.getDeadLetters({ limit: 100 });
      
      const blockedCount = objectives.filter(o => o.status === 'blocked').length;
      
      return {
        available: true,
        items: objectives,
        blockedCount,
        deadLetterCount: deadLetters.length,
      };
    } catch (error) {
      console.error('[ObjectivesService] Failed to get objectives summary:', error);
      
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get objective progress (Phase 3D)
   * 
   * @param {string} objectiveId - Objective ID
   * @returns {Promise<object|null>} Progress data
   */
  async getObjectiveProgress(objectiveId: string): Promise<any> {
    try {
      // Delegate to ViennaRuntimeService
      return await this.viennaRuntime.getObjectiveProgress(objectiveId);
    } catch (error) {
      console.error('[ObjectivesService] Failed to get objective progress:', error);
      throw error;
    }
  }

  /**
   * Get objective fanout tree (Phase 3E)
   * 
   * @param {string} objectiveId - Objective ID
   * @returns {Promise<object|null>} Tree structure
   */
  async getObjectiveTree(objectiveId: string): Promise<any> {
    try {
      // Delegate to ViennaRuntimeService
      return await this.viennaRuntime.getObjectiveTree(objectiveId);
    } catch (error) {
      console.error('[ObjectivesService] Failed to get objective tree:', error);
      throw error;
    }
  }
}
