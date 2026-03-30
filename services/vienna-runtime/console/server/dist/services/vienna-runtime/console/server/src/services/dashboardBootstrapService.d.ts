/**
 * Dashboard Bootstrap Service
 *
 * Provides unified initial state for Operator Shell.
 * Single authoritative source for dashboard hydration.
 *
 * RESPONSIBILITY:
 * - Gather system status, providers, services
 * - Get current thread and recent chat history
 * - Shape unified bootstrap response
 * - Handle partial failures gracefully
 *
 * ARCHITECTURE:
 * - Routes call this service
 * - This service calls ViennaRuntimeService + ChatHistoryService
 * - Returns one consolidated response
 * - Never accessed directly from routes
 */
import type { ViennaRuntimeService } from './viennaRuntime.js';
import type { ChatService } from './chatServiceSimple.js';
import type { ObjectivesService } from './objectivesService.js';
import type { SystemStatus } from '../types/api.js';
import type { ServiceStatus, ProvidersResponse } from './viennaRuntime.js';
export interface DashboardBootstrapResponse {
    timestamp: string;
    systemStatus: {
        available: boolean;
        data?: SystemStatus;
        error?: string;
    };
    providers: {
        available: boolean;
        data?: ProvidersResponse;
        error?: string;
    };
    services: {
        available: boolean;
        data?: ServiceStatus[];
        error?: string;
    };
    chat: {
        available: boolean;
        currentThreadId?: string | null;
        currentThread?: {
            threadId: string;
            title?: string | null;
            updatedAt: string;
            messageCount: number;
        } | null;
        recentMessages?: Array<any>;
        error?: string;
    };
    objectives?: {
        available: boolean;
        items?: Array<any>;
        blockedCount?: number;
        deadLetterCount?: number;
        error?: string;
    };
    replay?: {
        available: boolean;
        recentCount?: number;
        latest?: Array<any>;
        error?: string;
    };
    audit?: {
        available: boolean;
        recentCount?: number;
        latest?: Array<any>;
        error?: string;
    };
}
export declare class DashboardBootstrapService {
    private viennaRuntime;
    private chatService;
    private objectivesService?;
    constructor(viennaRuntime: ViennaRuntimeService, chatService: ChatService, objectivesService?: ObjectivesService);
    /**
     * Get unified dashboard bootstrap payload
     *
     * Gathers all initial state required for Operator Shell.
     * Handles partial failures gracefully.
     */
    getBootstrap(options?: {
        includeCurrentThread?: boolean;
        chatHistoryLimit?: number;
    }): Promise<DashboardBootstrapResponse>;
    /**
     * Get system status
     */
    private getSystemStatus;
    /**
     * Get providers
     */
    private getProviders;
    /**
     * Get services
     */
    private getServices;
    /**
     * Get current chat thread and recent history
     */
    private getCurrentChat;
    /**
     * Get objectives summary
     */
    private getObjectivesSummary;
    /**
     * Unwrap PromiseSettledResult into response format
     */
    private unwrapResult;
    /**
     * Get replay summary for bootstrap
     */
    private getReplaySummary;
    /**
     * Get audit summary for bootstrap
     */
    private getAuditSummary;
    /**
     * Get statistics about bootstrap performance
     */
    getBootstrapStats(): Promise<{
        avgResponseTimeMs: number | null;
        successRate: number | null;
        lastBootstrap: string | null;
    }>;
}
//# sourceMappingURL=dashboardBootstrapService.d.ts.map