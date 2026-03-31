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
// ============================================================================
// Dashboard Bootstrap Service
// ============================================================================
export class DashboardBootstrapService {
    viennaRuntime;
    chatService;
    objectivesService;
    constructor(viennaRuntime, chatService, objectivesService) {
        this.viennaRuntime = viennaRuntime;
        this.chatService = chatService;
        this.objectivesService = objectivesService;
        console.log('[DashboardBootstrapService] Initialized');
    }
    /**
     * Get unified dashboard bootstrap payload
     *
     * Gathers all initial state required for Operator Shell.
     * Handles partial failures gracefully.
     */
    async getBootstrap(options) {
        const timestamp = new Date().toISOString();
        // Gather all subsections in parallel
        const [systemStatusResult, providersResult, servicesResult, chatResult, objectivesResult, replayResult, auditResult,] = await Promise.allSettled([
            this.getSystemStatus(),
            this.getProviders(),
            this.getServices(),
            this.getCurrentChat(options),
            this.getObjectivesSummary(),
            this.getReplaySummary(),
            this.getAuditSummary(),
        ]);
        // Build response with graceful degradation
        return {
            timestamp,
            systemStatus: this.unwrapResult(systemStatusResult, 'systemStatus'),
            providers: this.unwrapResult(providersResult, 'providers'),
            services: this.unwrapResult(servicesResult, 'services'),
            chat: this.unwrapResult(chatResult, 'chat'),
            objectives: this.unwrapResult(objectivesResult, 'objectives'),
            replay: this.unwrapResult(replayResult, 'replay'),
            audit: this.unwrapResult(auditResult, 'audit'),
        };
    }
    /**
     * Get system status
     */
    async getSystemStatus() {
        try {
            return await this.viennaRuntime.getSystemStatus();
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get system status:', error);
            throw error;
        }
    }
    /**
     * Get providers
     */
    async getProviders() {
        try {
            return await this.viennaRuntime.getProviders();
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get providers:', error);
            throw error;
        }
    }
    /**
     * Get services
     */
    async getServices() {
        try {
            return await this.viennaRuntime.getServices();
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get services:', error);
            throw error;
        }
    }
    /**
     * Get current chat thread and recent history
     */
    async getCurrentChat(options) {
        try {
            // Get most recent active thread
            const threads = await this.chatService.getThreads({
                status: 'active',
                limit: 1,
            });
            if (threads.length === 0) {
                return {
                    currentThreadId: null,
                    currentThread: null,
                    recentMessages: [],
                };
            }
            const currentThread = threads[0];
            const limit = options?.chatHistoryLimit || 50;
            // Get recent messages for current thread
            const recentMessages = await this.chatService.getHistory({
                threadId: currentThread.threadId,
                limit,
            });
            return {
                currentThreadId: currentThread.threadId,
                currentThread: {
                    threadId: currentThread.threadId,
                    title: currentThread.title,
                    updatedAt: currentThread.updatedAt,
                    messageCount: currentThread.messageCount,
                },
                recentMessages,
            };
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get current chat:', error);
            throw error;
        }
    }
    /**
     * Get objectives summary
     */
    async getObjectivesSummary() {
        if (!this.objectivesService) {
            return {
                available: false,
                error: 'Objectives service not initialized',
            };
        }
        try {
            return await this.objectivesService.getObjectivesSummary();
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get objectives summary:', error);
            throw error;
        }
    }
    /**
     * Unwrap PromiseSettledResult into response format
     */
    unwrapResult(result, section) {
        if (result.status === 'fulfilled') {
            // Handle special case where fulfillment value is already a result object
            const value = result.value;
            if (value && typeof value === 'object' && 'available' in value) {
                return value;
            }
            return {
                available: true,
                data: result.value,
            };
        }
        else {
            console.error(`[DashboardBootstrapService] Section "${section}" failed:`, result.reason);
            return {
                available: false,
                error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            };
        }
    }
    /**
     * Get replay summary for bootstrap
     */
    async getReplaySummary() {
        try {
            // Get recent 3 replay events for dashboard preview
            const result = await this.viennaRuntime.queryReplay({
                limit: 3,
            });
            return {
                available: true,
                recentCount: result.total,
                latest: result.events,
            };
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get replay summary:', error);
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get audit summary for bootstrap
     */
    async getAuditSummary() {
        try {
            // Get recent 3 audit records for dashboard preview
            const result = await this.viennaRuntime.queryAudit({
                limit: 3,
            });
            return {
                available: true,
                recentCount: result.total,
                latest: result.records,
            };
        }
        catch (error) {
            console.error('[DashboardBootstrapService] Failed to get audit summary:', error);
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Get statistics about bootstrap performance
     */
    async getBootstrapStats() {
        // TODO: Track bootstrap timing and success rate
        return {
            avgResponseTimeMs: null,
            successRate: null,
            lastBootstrap: null,
        };
    }
}
//# sourceMappingURL=dashboardBootstrapService.js.map