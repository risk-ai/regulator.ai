/**
 * Simple Chat Service (Day 5 + History)
 *
 * Simplified chat service that handles basic commands without complex classification.
 * Routes messages through ViennaRuntimeService.
 * Persists chat history via ChatHistoryService.
 */
export class ChatService {
    vienna;
    history;
    providerManager;
    constructor(vienna, history, providerManager // Optional for Day 5
    ) {
        this.vienna = vienna;
        this.history = history;
        this.providerManager = providerManager;
        console.log('[ChatService] Initialized (simple mode + persistence)');
    }
    /**
     * Handle message with simple command matching + persistence
     */
    async handleMessage(request) {
        // Persist user message
        const userMessageRecord = this.history.createMessage({
            threadId: request.threadId,
            role: 'user',
            content: request.message,
            status: 'complete',
            currentPage: request.context?.page,
            selectedObjectiveId: request.context?.selectedObjectiveId,
            selectedFileIds: request.context?.selectedFileIds,
            selectedService: request.context?.selectedService,
        });
        const message = request.message.trim().toLowerCase();
        let response;
        // Simple command matching
        if (message === 'pause execution' || message === 'pause') {
            response = await this.handlePauseExecution(request, userMessageRecord.thread.threadId);
        }
        else if (message === 'resume execution' || message === 'resume') {
            response = await this.handleResumeExecution(request, userMessageRecord.thread.threadId);
        }
        else if (message.startsWith('show status') || message === 'status') {
            response = await this.handleShowStatus(request, userMessageRecord.thread.threadId);
        }
        else if (message.startsWith('show services') || message === 'services') {
            response = await this.handleShowServices(request, userMessageRecord.thread.threadId);
        }
        else if (message.startsWith('show providers') || message === 'providers') {
            response = await this.handleShowProviders(request, userMessageRecord.thread.threadId);
        }
        else {
            // Default: informational
            response = {
                messageId: `msg-${Date.now()}`,
                threadId: userMessageRecord.thread.threadId,
                classification: 'informational',
                provider: {
                    name: 'vienna',
                    mode: 'deterministic',
                },
                status: 'answered',
                content: {
                    text: `Command not recognized: "${request.message}"\n\nAvailable commands:\n• pause execution\n• resume execution\n• show status\n• show services\n• show providers`,
                },
                timestamp: new Date().toISOString(),
            };
        }
        // Persist assistant response
        this.history.createMessage({
            threadId: userMessageRecord.thread.threadId,
            role: 'assistant',
            content: response.content.text,
            classification: response.classification,
            provider: response.provider.name,
            providerMode: response.provider.mode,
            status: response.status === 'answered' ? 'complete' :
                response.status === 'failed' ? 'error' : 'pending',
            linkedObjectiveId: response.linkedEntities?.objectiveId,
            linkedEnvelopeId: response.linkedEntities?.envelopeId,
            linkedDecisionId: response.linkedEntities?.decisionId,
            linkedServiceId: response.linkedEntities?.service,
            auditRef: response.auditRef,
            actionTaken: response.actionTaken ?
                `${response.actionTaken.action}: ${response.actionTaken.result}` : undefined,
            currentPage: request.context?.page,
        });
        return response;
    }
    async handlePauseExecution(request, threadId) {
        try {
            const result = await this.vienna.pauseExecution({
                reason: 'Operator requested via chat',
                operator: request.operator,
            });
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'command',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'executing',
                content: {
                    text: `✓ Execution paused successfully at ${result.paused_at}\n${result.queued_envelopes_paused} envelopes paused.`,
                },
                actionTaken: {
                    action: 'pause_execution',
                    result: 'success',
                },
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'command',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'failed',
                content: {
                    text: `Failed to pause execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
    async handleResumeExecution(request, threadId) {
        try {
            const result = await this.vienna.resumeExecution({
                operator: request.operator,
            });
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'command',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'executing',
                content: {
                    text: `✓ Execution resumed successfully at ${result.resumed_at}\n${result.envelopes_resumed} envelopes resumed.`,
                },
                actionTaken: {
                    action: 'resume_execution',
                    result: 'success',
                },
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'command',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'failed',
                content: {
                    text: `Failed to resume execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
    async handleShowStatus(request, threadId) {
        try {
            const status = await this.vienna.getSystemStatus();
            const text = `**System Status:**

• State: ${status.system_state}
• Executor: ${status.executor_state}${status.paused ? ` (paused: ${status.pause_reason})` : ''}
• Queue depth: ${status.queue_depth}
• Active envelopes: ${status.active_envelopes}
• Blocked envelopes: ${status.blocked_envelopes}
• Dead letters: ${status.dead_letter_count}
• Trading guard: ${status.trading_guard_state}
• Integrity: ${status.integrity_state}`;
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'answered',
                content: { text },
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'failed',
                content: {
                    text: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
    async handleShowServices(request, threadId) {
        try {
            const services = await this.vienna.getServices();
            let text = `**Services:**\n\n`;
            for (const service of services) {
                const statusIcon = service.status === 'running' ? '✓' :
                    service.status === 'degraded' ? '⚠' : '✗';
                text += `${statusIcon} **${service.service}**: ${service.status}`;
                if (service.connectivity) {
                    text += ` (connectivity: ${service.connectivity})`;
                }
                if (service.restartable) {
                    text += ` [restartable]`;
                }
                text += `\n`;
            }
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'answered',
                content: { text },
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'failed',
                content: {
                    text: `Failed to get services: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
    async handleShowProviders(request, threadId) {
        try {
            const providers = await this.vienna.getProviders();
            let text = `**Model Providers:**\n\n`;
            text += `Primary: ${providers.primary}\n`;
            text += `Fallback: ${providers.fallback.join(', ')}\n\n`;
            for (const [name, health] of Object.entries(providers.providers)) {
                const statusIcon = health.status === 'healthy' ? '✓' :
                    health.status === 'degraded' ? '⚠' : '✗';
                text += `${statusIcon} **${name}**: ${health.status}`;
                if (health.latencyMs) {
                    text += ` (${health.latencyMs}ms)`;
                }
                if (health.cooldownUntil) {
                    text += ` [cooldown until ${health.cooldownUntil}]`;
                }
                text += `\n`;
            }
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'answered',
                content: { text },
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                messageId: `msg-${Date.now()}`,
                threadId,
                classification: 'informational',
                provider: { name: 'vienna', mode: 'deterministic' },
                status: 'failed',
                content: {
                    text: `Failed to get providers: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
    async getHistory(params) {
        try {
            if (!params?.threadId) {
                // No threadId: return empty (could return recent messages from all threads)
                return [];
            }
            // Get messages from history service
            const messages = this.history.getThreadMessages(params.threadId, {
                limit: params.limit,
                before: params.before,
            });
            // Convert to ChatMessage format
            return messages.map(msg => ({
                messageId: msg.messageId,
                threadId: msg.threadId,
                classification: msg.classification || 'informational',
                provider: {
                    name: msg.provider || 'vienna',
                    mode: msg.providerMode || 'deterministic',
                },
                status: msg.status === 'complete' ? 'answered' :
                    msg.status === 'error' ? 'failed' : 'preview',
                content: {
                    text: msg.content,
                },
                linkedEntities: {
                    objectiveId: msg.linkedObjectiveId || undefined,
                    envelopeId: msg.linkedEnvelopeId || undefined,
                    decisionId: msg.linkedDecisionId || undefined,
                    service: msg.linkedServiceId || undefined,
                },
                actionTaken: msg.actionTaken ? {
                    action: msg.actionTaken.split(':')[0] || 'unknown',
                    result: msg.actionTaken.split(':')[1]?.trim() || 'unknown',
                } : undefined,
                auditRef: msg.auditRef || undefined,
                timestamp: msg.timestamp,
            }));
        }
        catch (error) {
            console.error('[ChatService] Failed to get history:', error);
            // Graceful degradation: return empty array
            return [];
        }
    }
    /**
     * Get list of threads
     */
    async getThreads(options) {
        try {
            const threads = this.history.listThreads(options);
            return threads.map(t => ({
                threadId: t.threadId,
                title: t.title,
                messageCount: t.messageCount,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                status: t.status,
            }));
        }
        catch (error) {
            console.error('[ChatService] Failed to get threads:', error);
            return [];
        }
    }
}
//# sourceMappingURL=chatServiceSimple.js.map