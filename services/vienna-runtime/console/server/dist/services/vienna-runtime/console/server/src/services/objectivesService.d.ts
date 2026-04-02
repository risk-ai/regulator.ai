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
export declare class ObjectivesService {
    private viennaRuntime;
    constructor(viennaRuntime: ViennaRuntimeService);
    /**
     * Get list of objectives
     */
    getObjectives(params?: {
        status?: 'active' | 'blocked' | 'completed' | 'failed' | 'cancelled';
        limit?: number;
    }): Promise<ObjectiveSummary[]>;
    /**
     * Get objective by ID
     */
    getObjective(objectiveId: string): Promise<ObjectiveDetail | null>;
    /**
     * Cancel objective
     */
    cancelObjective(objectiveId: string, operator: string, reason: string): Promise<CancelObjectiveResponse>;
    /**
     * Get dead letters
     */
    getDeadLetters(params?: {
        objectiveId?: string;
        limit?: number;
    }): Promise<DeadLetterSummary[]>;
    /**
     * Retry dead letter
     */
    retryDeadLetter(deadLetterId: string, operator: string, reason: string): Promise<RequeueDeadLetterResponse>;
    /**
     * Get objectives summary for dashboard
     */
    getObjectivesSummary(): Promise<{
        available: boolean;
        items?: ObjectiveSummary[];
        blockedCount?: number;
        deadLetterCount?: number;
        error?: string;
    }>;
    /**
     * Get objective progress (Phase 3D)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Progress data
     */
    getObjectiveProgress(objectiveId: string): Promise<any>;
    /**
     * Get objective fanout tree (Phase 3E)
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Tree structure
     */
    getObjectiveTree(objectiveId: string): Promise<any>;
}
//# sourceMappingURL=objectivesService.d.ts.map