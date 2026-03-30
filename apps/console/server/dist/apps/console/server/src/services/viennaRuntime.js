/**
 * Vienna Runtime Service
 *
 * Interface layer between console server and Vienna Core.
 * All console operations route through this service.
 *
 * AUTHORITY BOUNDARY:
 * - Console server calls methods here
 * - This service calls Vienna Core runtime
 * - Vienna Core calls Executor/Validator/Adapters
 * - Never bypass this chain
 */
export class ViennaRuntimeService {
    viennaCore; // Vienna Core instance (CommonJS)
    providerManager; // ProviderManagerBridge instance
    replayService; // ReplayService instance (lazy loaded)
    deadLetterQueue; // Dead Letter Queue instance
    constructor(viennaCore, providerManager, deadLetterQueue) {
        this.viennaCore = viennaCore;
        this.providerManager = providerManager;
        this.replayService = null;
        this.deadLetterQueue = deadLetterQueue || viennaCore?.deadLetterQueue;
    }
    async getReplayService() {
        if (!this.replayService) {
            // Lazy load ReplayService to avoid circular deps (ESM dynamic import)
            const module = await import('./replayService.js');
            this.replayService = new module.ReplayService(this.viennaCore);
        }
        return this.replayService;
    }
    // ==========================================================================
    // System Status & Diagnostics
    // ==========================================================================
    async getDiagnostics() {
        const diagnostics = {
            provider_state: {},
            executor_state: {},
            queue_state: {},
            replay_state: {},
            audit_state: {},
        };
        // Provider state
        try {
            if (this.providerManager) {
                const statuses = await this.providerManager.getAllStatuses();
                diagnostics.provider_state = {
                    available: true,
                    primary: this.providerManager.getPrimaryProvider(),
                    providers: statuses,
                };
            }
            else {
                diagnostics.provider_state = {
                    available: false,
                    error: 'Provider manager not initialized',
                };
            }
        }
        catch (error) {
            diagnostics.provider_state = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        // Executor state
        try {
            const health = this.viennaCore.queuedExecutor.getHealth();
            const controlState = this.viennaCore.queuedExecutor.getExecutionControlState();
            diagnostics.executor_state = {
                available: true,
                health: health.state,
                paused: controlState.paused,
                pause_reason: controlState.reason,
                executor_ready: health.executor_ready,
                queue_healthy: health.queue_healthy,
            };
        }
        catch (error) {
            diagnostics.executor_state = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        // Queue state
        try {
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            diagnostics.queue_state = {
                available: true,
                queued: queueState.queued || 0,
                executing: queueState.executing || 0,
                completed: queueState.completed || 0,
                failed: queueState.failed || 0,
                blocked: queueState.blocked || 0,
                total: queueState.total || 0,
            };
        }
        catch (error) {
            diagnostics.queue_state = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        // Replay state
        try {
            const replayService = await this.getReplayService();
            const stats = await replayService.getStats();
            diagnostics.replay_state = {
                available: true,
                event_count: stats.event_count || 0,
                log_size_mb: stats.log_size_mb || 0,
            };
        }
        catch (error) {
            diagnostics.replay_state = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        // Audit state
        try {
            const replayService = await this.getReplayService();
            const auditStats = await replayService.getAuditStats();
            diagnostics.audit_state = {
                available: true,
                record_count: auditStats.record_count || 0,
                db_size_mb: auditStats.db_size_mb || 0,
            };
        }
        catch (error) {
            diagnostics.audit_state = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        return diagnostics;
    }
    /**
     * Get unified system truth snapshot (Phase 7.3)
     *
     * @returns {Promise<Object>} System snapshot from State Graph
     */
    async getSystemSnapshot() {
        try {
            return await this.viennaCore.getSystemSnapshot();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getSystemSnapshot error:', error);
            throw new Error(`Failed to get system snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getSystemStatus() {
        try {
            // Actual API shapes from Vienna Core:
            // - health: { state: 'HEALTHY'|'WARNING'|'CRITICAL', checks, metrics, timestamp }
            // - queueState: { queued, executing, completed, failed, blocked, total }
            // - controlState: { paused, reason, paused_by, paused_at, resumed_at }
            const health = this.viennaCore.queuedExecutor.getHealth();
            const controlState = this.viennaCore.queuedExecutor.getExecutionControlState();
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            // Get trading guard state if available
            let tradingState = {
                guard_active: false,
                autonomous_window: false
            };
            if (this.viennaCore.tradingGuard && typeof this.viennaCore.tradingGuard.getState === 'function') {
                try {
                    tradingState = this.viennaCore.tradingGuard.getState();
                }
                catch (err) {
                    console.warn('Failed to get trading guard state:', err);
                }
            }
            // Map Vienna Core health state to SystemStatus
            const healthStateMap = {
                'HEALTHY': 'healthy',
                'WARNING': 'degraded',
                'CRITICAL': 'critical'
            };
            const systemState = healthStateMap[health.state] || 'degraded';
            const executorState = controlState.paused ? 'paused' : 'running';
            // Phase 5E: Get real DLQ stats and objective tracker stats
            let dlqStats = { total: 0 };
            let objectiveStats = { total_objectives: 0, by_status: {} };
            try {
                dlqStats = this.viennaCore.queuedExecutor.getDeadLetterStats();
            }
            catch (err) {
                console.warn('[ViennaRuntimeService] Failed to get DLQ stats:', err);
            }
            try {
                if (this.viennaCore.queuedExecutor.objectiveTracker) {
                    objectiveStats = this.viennaCore.queuedExecutor.getObjectiveStats();
                }
            }
            catch (err) {
                console.warn('[ViennaRuntimeService] Failed to get objective stats:', err);
            }
            return {
                system_state: systemState,
                executor_state: executorState,
                paused: controlState.paused || false,
                pause_reason: controlState.reason || undefined,
                pauseReason: controlState.reason || undefined, // For Phase 5E compatibility
                queue_depth: queueState.queued || 0,
                active_envelopes: queueState.executing || 0,
                blocked_envelopes: queueState.blocked || 0,
                dead_letter_count: dlqStats.total || 0, // Phase 5E: Real DLQ count
                deadLetterCount: dlqStats.total || 0, // Alias for Phase 5E
                activeObjectives: objectiveStats.total_objectives || 0, // Phase 5E: Real objective count
                blocked: queueState.blocked || 0, // Phase 5E: Blocked envelope count
                integrity_state: 'ok',
                trading_guard_state: (tradingState.guard_active ? 'active' : 'disabled'),
                health: {
                    state: healthStateMap[health.state] || 'degraded',
                    latency_ms_avg: health.metrics?.avg_latency_ms || 0,
                    stalled_executions: health.metrics?.executing || 0,
                    last_check: health.timestamp || new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Failed to get system status:', error);
            throw new Error(`Failed to get system status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ==========================================================================
    // Objectives
    // ==========================================================================
    async getObjectives(params) {
        try {
            // Query State Graph for managed objectives
            const stateGraph = this.viennaCore?.stateGraph;
            if (!stateGraph || !stateGraph.listObjectives) {
                console.warn('[ViennaRuntimeService] State Graph not available');
                return [];
            }
            // Build filters
            const filters = {};
            if (params?.status) {
                filters.status = params.status;
            }
            // Get objectives from State Graph
            const objectives = stateGraph.listObjectives(filters);
            // Apply search filter if provided
            let filtered = objectives;
            if (params?.search) {
                const searchLower = params.search.toLowerCase();
                filtered = objectives.filter((obj) => obj.objective_id?.toLowerCase().includes(searchLower) ||
                    obj.target_id?.toLowerCase().includes(searchLower) ||
                    obj.target_type?.toLowerCase().includes(searchLower));
            }
            // Apply limit
            if (params?.limit) {
                filtered = filtered.slice(0, params.limit);
            }
            // Map to ObjectiveSummary format
            return filtered.map((obj) => ({
                objective_id: obj.objective_id,
                title: obj.target_id || obj.objective_id,
                status: this._mapObjectiveStatus(obj.status),
                risk_tier: this._inferRiskTier(obj),
                trigger_id: 'system',
                trigger_type: 'system',
                envelope_count: 0,
                active_count: 0,
                blocked_count: 0,
                dead_letter_count: 0,
                completed_count: 0,
                current_step: obj.reconciliation_status || 'idle',
                started_at: obj.created_at || new Date().toISOString(),
                updated_at: obj.updated_at || obj.created_at || new Date().toISOString(),
                completed_at: obj.status === 'completed' ? obj.updated_at : undefined
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getObjectives error:', error);
            return [];
        }
    }
    _mapObjectiveStatus(status) {
        const statusMap = {
            'pending': 'pending',
            'active': 'executing',
            'executing': 'executing',
            'blocked': 'blocked',
            'completed': 'completed',
            'failed': 'failed',
            'cancelled': 'cancelled'
        };
        return statusMap[status] || 'pending';
    }
    _inferRiskTier(objective) {
        // Infer risk tier from objective properties
        if (objective.verification_strength === 'high' || objective.priority < 50) {
            return 'T2';
        }
        else if (objective.verification_strength === 'medium' || objective.priority < 100) {
            return 'T1';
        }
        return 'T0';
    }
    async getObjective(objectiveId) {
        try {
            // Try to get objective from Vienna Core if available
            if (this.viennaCore.objectives && typeof this.viennaCore.objectives.get === 'function') {
                const objective = await this.viennaCore.objectives.get(objectiveId);
                if (objective) {
                    return this.normalizeObjectiveDetail(objective);
                }
            }
            // Fallback: Try to reconstruct from queue state
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            // Check if any queued/executing envelopes match this objective
            const allEnvelopes = [
                ...(queueState.queued_envelopes || []),
                ...(queueState.executing_envelopes || []),
                ...(queueState.blocked_envelopes || []),
            ];
            const matchingEnvelopes = allEnvelopes.filter((e) => e.objective_id === objectiveId);
            if (matchingEnvelopes.length === 0) {
                // No matching envelopes found
                return null;
            }
            // Reconstruct partial objective detail from envelope data
            const firstEnvelope = matchingEnvelopes[0];
            return {
                objective_id: objectiveId,
                title: firstEnvelope.description || `Objective ${objectiveId}`,
                status: this.inferObjectiveStatus(matchingEnvelopes),
                risk_tier: firstEnvelope.risk_tier || 'T0',
                trigger_id: 'unknown',
                trigger_type: 'system',
                envelope_count: matchingEnvelopes.length,
                active_count: matchingEnvelopes.filter((e) => e.state === 'executing').length,
                blocked_count: matchingEnvelopes.filter((e) => e.state === 'blocked').length,
                dead_letter_count: 0,
                completed_count: 0,
                current_step: firstEnvelope.description || undefined,
                current_envelope_id: matchingEnvelopes.find((e) => e.state === 'executing')?.envelope_id,
                started_at: firstEnvelope.queued_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                description: firstEnvelope.description,
                constraints: [],
                preconditions: [],
                approval_required: firstEnvelope.risk_tier === 'T2',
                retry_count: 0,
            };
        }
        catch (error) {
            console.error(`[ViennaRuntimeService] Failed to get objective ${objectiveId}:`, error);
            return null;
        }
    }
    normalizeObjectiveDetail(raw) {
        return {
            objective_id: raw.objective_id || raw.id,
            title: raw.title || raw.name || 'Untitled objective',
            status: raw.status || 'pending',
            risk_tier: raw.risk_tier || 'T0',
            trigger_id: raw.trigger_id || 'unknown',
            trigger_type: raw.trigger_type || 'system',
            envelope_count: raw.envelope_count || 0,
            active_count: raw.active_count || 0,
            blocked_count: raw.blocked_count || 0,
            dead_letter_count: raw.dead_letter_count || 0,
            completed_count: raw.completed_count || 0,
            current_step: raw.current_step,
            current_envelope_id: raw.current_envelope_id,
            started_at: raw.started_at || raw.created_at || new Date().toISOString(),
            updated_at: raw.updated_at || new Date().toISOString(),
            completed_at: raw.completed_at,
            description: raw.description,
            constraints: raw.constraints || [],
            preconditions: raw.preconditions || [],
            warrant_id: raw.warrant_id,
            approval_required: raw.approval_required || false,
            approved_by: raw.approved_by,
            approved_at: raw.approved_at,
            error_summary: raw.error_summary,
            retry_count: raw.retry_count || 0,
        };
    }
    inferObjectiveStatus(envelopes) {
        if (envelopes.some((e) => e.state === 'failed' || e.state === 'dead_letter')) {
            return 'failed';
        }
        if (envelopes.some((e) => e.state === 'blocked')) {
            return 'blocked';
        }
        if (envelopes.every((e) => e.state === 'completed')) {
            return 'completed';
        }
        if (envelopes.some((e) => e.state === 'executing')) {
            return 'executing';
        }
        return 'pending';
    }
    async getObjectiveEnvelopes(objectiveId) {
        // TODO: fetch all envelopes for objective
        // - filter queue entries
        // - filter active executions
        // - filter dead letters
        // - filter completed (from replay)
        throw new Error('Not implemented');
    }
    async getObjectiveCausalChain(objectiveId) {
        // TODO: build causal chain from envelope ancestry
        // - trace parent_envelope_id relationships
        // - build tree structure
        throw new Error('Not implemented');
    }
    async getObjectiveWarrant(objectiveId) {
        // TODO: fetch warrant for objective
        // - warrantService.getWarrantForObjective(objectiveId)
        throw new Error('Not implemented');
    }
    // ==========================================================================
    // Objectives Progress & Lineage (Phase 3D/3E)
    // ==========================================================================
    /**
     * Get objective progress (Phase 3D)
     *
     * Real-time envelope state tracking per objective.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Progress data
     */
    async getObjectiveProgress(objectiveId) {
        try {
            if (!this.viennaCore?.queuedExecutor?.objectiveTracker) {
                console.warn('[ViennaRuntime] ObjectiveTracker not initialized');
                return null;
            }
            return this.viennaCore.queuedExecutor.getObjectiveProgress(objectiveId);
        }
        catch (error) {
            console.error('[ViennaRuntime] Failed to get objective progress:', error);
            throw new Error(`Failed to get objective progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get objective tracker statistics (Phase 3D)
     *
     * Summary stats across all objectives.
     *
     * @returns {Promise<object>} Stats summary
     */
    async getObjectiveTrackerStats() {
        try {
            if (!this.viennaCore?.queuedExecutor?.objectiveTracker) {
                return {
                    total_objectives: 0,
                    by_status: {},
                    envelope_totals: {
                        total: 0,
                        queued: 0,
                        executing: 0,
                        verified: 0,
                        failed: 0,
                    },
                };
            }
            return this.viennaCore.queuedExecutor.getObjectiveStats();
        }
        catch (error) {
            console.error('[ViennaRuntime] Failed to get objective tracker stats:', error);
            throw error;
        }
    }
    /**
     * Get envelope lineage chain (Phase 3E)
     *
     * Returns lineage from root to target envelope.
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {Promise<array>} Lineage chain
     */
    async getEnvelopeLineage(envelopeId) {
        try {
            if (!this.viennaCore?.queuedExecutor?.lineageValidator) {
                console.warn('[ViennaRuntime] LineageValidator not initialized');
                return [];
            }
            return this.viennaCore.queuedExecutor.getEnvelopeLineage(envelopeId);
        }
        catch (error) {
            console.error('[ViennaRuntime] Failed to get envelope lineage:', error);
            throw new Error(`Failed to get envelope lineage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get objective fanout tree (Phase 3E)
     *
     * Hierarchical tree structure of envelope relationships.
     *
     * @param {string} objectiveId - Objective ID
     * @returns {Promise<object|null>} Tree structure
     */
    async getObjectiveTree(objectiveId) {
        try {
            if (!this.viennaCore?.queuedExecutor?.lineageValidator) {
                console.warn('[ViennaRuntime] LineageValidator not initialized');
                return null;
            }
            return this.viennaCore.queuedExecutor.getObjectiveTree(objectiveId);
        }
        catch (error) {
            console.error('[ViennaRuntime] Failed to get objective tree:', error);
            throw new Error(`Failed to get objective tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Validate lineage integrity (Phase 3E)
     *
     * Check for orphaned envelopes, cycles, and fanout index issues.
     *
     * @returns {Promise<object>} Validation report
     */
    async validateLineage() {
        try {
            if (!this.viennaCore?.queuedExecutor?.lineageValidator) {
                return {
                    valid: true,
                    issues: [],
                    message: 'Lineage validation disabled (validator not initialized)'
                };
            }
            return this.viennaCore.queuedExecutor.validateLineage();
        }
        catch (error) {
            console.error('[ViennaRuntime] Failed to validate lineage:', error);
            throw error;
        }
    }
    async cancelObjective(objectiveId, request) {
        try {
            console.log('[ViennaRuntimeService] cancelObjective:', { objectiveId, operator: request.operator });
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    action: 'objective_cancel_requested',
                    operator: request.operator,
                    result: 'requested',
                    objective_id: objectiveId,
                    metadata: {
                        reason: request.reason,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            // Try to cancel through Vienna Core if available
            if (this.viennaCore.objectives && typeof this.viennaCore.objectives.cancel === 'function') {
                const result = await this.viennaCore.objectives.cancel(objectiveId, {
                    operator: request.operator,
                    reason: request.reason,
                });
                return {
                    cancelled_at: result.cancelled_at || new Date().toISOString(),
                    envelopes_cancelled: result.envelopes_cancelled || 0,
                };
            }
            // Fallback: Manual cancellation through executor
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            const allEnvelopes = [
                ...(queueState.queued_envelopes || []),
                ...(queueState.executing_envelopes || []),
                ...(queueState.blocked_envelopes || []),
            ];
            const matchingEnvelopes = allEnvelopes.filter((e) => e.objective_id === objectiveId);
            // Attempt to cancel each envelope
            let cancelledCount = 0;
            for (const envelope of matchingEnvelopes) {
                try {
                    if (this.viennaCore.queuedExecutor.cancelEnvelope) {
                        await this.viennaCore.queuedExecutor.cancelEnvelope(envelope.envelope_id);
                        cancelledCount++;
                    }
                }
                catch (err) {
                    console.warn(`Failed to cancel envelope ${envelope.envelope_id}:`, err);
                }
            }
            return {
                cancelled_at: new Date().toISOString(),
                envelopes_cancelled: cancelledCount,
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to cancel objective:', error);
            throw error;
        }
    }
    // ==========================================================================
    // Execution
    // ==========================================================================
    async getActiveEnvelopes() {
        // For Phase 5E: return currently executing envelopes
        try {
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            // Return empty for now - full implementation would query executor
            return [];
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get active envelopes:', error);
            return [];
        }
    }
    /**
     * Get currently executing envelopes (Phase 5E)
     */
    async getExecutingEnvelopes() {
        try {
            // Query Vienna Core execution queue for EXECUTING state envelopes
            const executor = this.viennaCore?.queuedExecutor;
            if (!executor || !executor.queue) {
                console.warn('[ViennaRuntimeService] Executor or queue not available');
                return [];
            }
            // Get EXECUTING entries from queue
            const QueueState = { EXECUTING: 'executing' }; // Match execution-queue.js states
            const executingEntries = executor.queue.getEntriesByState(QueueState.EXECUTING);
            // Transform to ExecutingEnvelope format for Phase 5E
            return executingEntries.map((entry) => ({
                objectiveId: entry.envelope?.objective_id || entry.objective_id || 'unknown',
                objectiveName: entry.envelope?.description || entry.objective_id || 'unknown',
                envelopeId: entry.envelope_id,
                provider: entry.envelope?.provider || entry.provider,
                adapter: entry.envelope?.adapter || entry.adapter,
                state: entry.state,
                attempt: entry.attempt || 1,
                maxAttempts: entry.max_attempts || 3,
                queuedAt: entry.queued_at,
                startedAt: entry.started_at || entry.queued_at,
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get executing envelopes:', error);
            return [];
        }
    }
    /**
     * Get recent failures (Phase 5E)
     */
    async getRecentFailures(limit = 20) {
        try {
            // Query Vienna Core dead letter queue for recent failures
            const executor = this.viennaCore?.queuedExecutor;
            if (!executor || !executor.deadLetterQueue) {
                console.warn('[ViennaRuntimeService] Dead letter queue not available');
                return [];
            }
            // Get recent DLQ entries (already sorted by most recent)
            const DLQState = { DEAD_LETTERED: 'dead_lettered' }; // Match dead-letter-queue.js states
            const dlqEntries = executor.deadLetterQueue.getEntries({
                state: DLQState.DEAD_LETTERED,
                limit
            });
            // Transform to FailureRecord format for Phase 5E
            return dlqEntries.map((entry) => ({
                envelopeId: entry.envelope_id,
                objectiveId: entry.objective_id || 'unknown',
                error: entry.error || 'Unknown error',
                failedAt: entry.dead_lettered_at,
                attempt: entry.retry_count || 0,
                reason: entry.reason,
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get recent failures:', error);
            return [];
        }
    }
    async getQueueState() {
        try {
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            return {
                queued: queueState.queued || 0,
                executing: queueState.executing || 0,
                completed: queueState.completed || 0,
                failed: queueState.failed || 0,
                blocked: queueState.blocked || 0,
                total: queueState.total || 0,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get queue state:', error);
            throw error;
        }
    }
    async getBlockedEnvelopes() {
        // TODO: filter blocked envelopes
        // - recursion blocked
        // - budget blocked
        // - rate limited
        // - safety blocked
        throw new Error('Not implemented');
    }
    async getExecutionMetrics() {
        // TODO: call executor.getExecutionMetrics()
        throw new Error('Not implemented');
    }
    async getHealth() {
        // TODO: call executor.getHealth()
        throw new Error('Not implemented');
    }
    async checkIntegrity(operator) {
        // TODO: call executor.checkIntegrity()
        // - emit audit event
        throw new Error('Not implemented');
    }
    async pauseExecution(request) {
        try {
            // Pause execution through Vienna Core
            const result = this.viennaCore.queuedExecutor.pauseExecution(request.reason, request.operator);
            // Get current queue state to report paused envelope count
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    event_type: 'execution_paused',
                    operator: request.operator,
                    reason: request.reason,
                    queued_envelopes: queueState.queued + queueState.active,
                    timestamp: result.paused_at
                });
            }
            return {
                paused_at: result.paused_at,
                queued_envelopes_paused: (queueState.queued || 0) + (queueState.executing || 0)
            };
        }
        catch (error) {
            console.error('Failed to pause execution:', error);
            throw new Error(`Failed to pause execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async resumeExecution(request) {
        try {
            // Resume execution through Vienna Core
            const result = this.viennaCore.queuedExecutor.resumeExecution();
            // Get current queue state to report resumed envelope count
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    event_type: 'execution_resumed',
                    operator: request.operator,
                    queued_envelopes: queueState.queued + queueState.active,
                    timestamp: result.resumed_at
                });
            }
            return {
                resumed_at: result.resumed_at || new Date().toISOString(),
                envelopes_resumed: (queueState.queued || 0) + (queueState.executing || 0)
            };
        }
        catch (error) {
            console.error('Failed to resume execution:', error);
            throw new Error(`Failed to resume execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async activateEmergencyOverride(request) {
        // TODO: validate Metternich approval
        // - check duration <= 60 minutes
        // - call tradingGuard.activateEmergencyOverride()
        // - emit critical audit event
        // - schedule auto-expiration
        throw new Error('Not implemented');
    }
    // ==========================================================================
    // Decisions (Operator Inbox)
    // ==========================================================================
    async getDecisions() {
        try {
            // Query approval workflow for pending decisions
            const stateGraph = this.viennaCore?.stateGraph;
            if (!stateGraph || !stateGraph.db) {
                console.warn('[ViennaRuntimeService] State Graph not available for decisions');
                return [];
            }
            // Check if approval_requirements table exists
            const tableCheck = stateGraph.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_requirements'").get();
            if (!tableCheck) {
                // Approval workflow not deployed yet
                return [];
            }
            // Query pending approvals
            const pendingApprovals = stateGraph.db.prepare(`
        SELECT 
          approval_id,
          execution_id,
          tenant_id,
          risk_tier,
          action_type,
          created_at,
          expires_at,
          metadata
        FROM approval_requirements
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 50
      `).all();
            return pendingApprovals.map((approval) => ({
                decision_id: approval.approval_id,
                decision_type: 'approval_required',
                objective_id: approval.execution_id,
                envelope_id: approval.execution_id,
                action_type: approval.action_type || 'unknown',
                risk_tier: (approval.risk_tier || 'T1'),
                requested_by: 'system',
                requested_at: approval.created_at,
                expires_at: approval.expires_at,
                context: approval.metadata ? JSON.parse(approval.metadata) : {}
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getDecisions error:', error);
            return [];
        }
    }
    // ==========================================================================
    // Dead Letters
    // ==========================================================================
    async getDeadLetters(params) {
        try {
            if (!this.deadLetterQueue) {
                console.warn('[ViennaRuntimeService] Dead letter queue not available');
                return [];
            }
            // Get entries from dead letter queue with filters
            const entries = this.deadLetterQueue.getEntries({
                state: params?.state,
                objective_id: params?.objective_id,
                limit: params?.limit || 100,
            });
            // Map to DeadLetterItem format
            return entries.map((entry) => ({
                envelope_id: entry.envelope_id,
                objective_id: entry.objective_id,
                reason: entry.reason,
                failed_at: entry.dead_lettered_at,
                state: entry.state,
                retry_count: entry.retry_count || 0,
                error: entry.error,
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get dead letters:', error);
            return [];
        }
    }
    async getDeadLetterStats() {
        try {
            if (!this.deadLetterQueue) {
                return {
                    total: 0,
                    by_state: {},
                    by_reason: {},
                };
            }
            return this.deadLetterQueue.getStats();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get dead letter stats:', error);
            return {
                total: 0,
                by_state: {},
                by_reason: {},
            };
        }
    }
    async retryDeadLetter(envelopeId, request) {
        try {
            console.log('[ViennaRuntimeService] retryDeadLetter:', { envelopeId, operator: request.operator });
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    event_type: 'dead_letter_retry_requested',
                    envelope_id: envelopeId,
                    operator: request.operator,
                    reason: request.reason,
                    result: 'requested',
                    timestamp: new Date().toISOString(),
                });
            }
            // Try to requeue through Vienna Core if available
            if (this.viennaCore.deadLetters && typeof this.viennaCore.deadLetters.requeue === 'function') {
                const result = await this.viennaCore.deadLetters.requeue(envelopeId, {
                    operator: request.operator,
                    reason: request.reason,
                });
                return {
                    requeued_at: result.requeued_at || new Date().toISOString(),
                };
            }
            // Fallback: Try executor requeue if available
            if (this.viennaCore.queuedExecutor.requeueDeadLetter) {
                await this.viennaCore.queuedExecutor.requeueDeadLetter(envelopeId);
                return {
                    requeued_at: new Date().toISOString(),
                };
            }
            // No requeue mechanism available - throw error
            throw new Error('Dead letter requeue not supported by Vienna Core');
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to retry dead letter:', error);
            throw new Error(`Failed to retry dead letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async cancelDeadLetter(envelopeId, request) {
        try {
            if (!this.deadLetterQueue) {
                throw new Error('Dead letter queue not available');
            }
            console.log('[ViennaRuntimeService] cancelDeadLetter:', { envelopeId, operator: request.operator });
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    event_type: 'dead_letter_cancelled',
                    envelope_id: envelopeId,
                    operator: request.operator,
                    reason: request.reason || 'No reason provided',
                    timestamp: new Date().toISOString(),
                });
            }
            // Cancel the dead letter
            const result = await this.deadLetterQueue.cancel(envelopeId);
            return {
                cancelled_at: result.cancelled_at || new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to cancel dead letter:', error);
            throw new Error(`Failed to cancel dead letter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ==========================================================================
    // Agents
    // ==========================================================================
    async getAgents() {
        try {
            // Query State Graph for agent registry (if available)
            const stateGraph = this.viennaCore?.stateGraph;
            if (!stateGraph || !stateGraph.db) {
                console.warn('[ViennaRuntimeService] State Graph not available for agents');
                return [];
            }
            // Check if agents table exists
            const tableCheck = stateGraph.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'").get();
            if (!tableCheck) {
                // Agent registry not deployed yet - return empty
                return [];
            }
            // Query registered agents
            const agents = stateGraph.db.prepare(`
        SELECT 
          agent_id,
          agent_name,
          agent_type,
          status,
          last_seen_at,
          created_at,
          metadata
        FROM agents
        WHERE environment = ?
        ORDER BY last_seen_at DESC
        LIMIT 100
      `).all(stateGraph.environment || 'prod');
            return agents.map((agent) => ({
                agent_id: agent.agent_id,
                agent_name: agent.agent_name || agent.agent_id,
                agent_type: agent.agent_type || 'unknown',
                status: agent.status || 'unknown',
                last_active: agent.last_seen_at,
                total_actions: 0, // TODO: query execution history
                failed_actions: 0, // TODO: query failure history
                trust_score: 1.0, // TODO: compute from history
                registered_at: agent.created_at
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAgents error:', error);
            return [];
        }
    }
    async requestAgentReasoning(agentId, request) {
        // TODO: spawn agent session via Vienna
        // - NOT direct agent execution
        // - route through Vienna's agent coordination
        // - return session_id for tracking
        throw new Error('Not implemented');
    }
    // ==========================================================================
    // Replay
    // ==========================================================================
    async queryReplay(params) {
        const replayService = await this.getReplayService();
        return await replayService.queryReplay(params);
    }
    async getEnvelopeReplay(envelopeId) {
        const replayService = await this.getReplayService();
        return await replayService.getEnvelopeReplay(envelopeId);
    }
    async queryAudit(params) {
        try {
            // Phase 6.10: Query from audit log storage
            if (this.viennaCore.auditLog && typeof this.viennaCore.auditLog.query === 'function') {
                const result = this.viennaCore.auditLog.query(params);
                return result;
            }
            // Fallback to replay service
            const replayService = await this.getReplayService();
            return await replayService.queryAudit(params);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] queryAudit error:', error);
            // Graceful degradation
            return {
                records: [],
                total: 0,
                has_more: false,
            };
        }
    }
    async getAuditRecord(auditId) {
        try {
            // Phase 6.10: Get from audit log storage
            if (this.viennaCore.auditLog && typeof this.viennaCore.auditLog.get === 'function') {
                return this.viennaCore.auditLog.get(auditId);
            }
            // Fallback to replay service
            const replayService = await this.getReplayService();
            return await replayService.getAuditRecord(auditId);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAuditRecord error:', error);
            return null;
        }
    }
    // ==========================================================================
    // Directives
    // ==========================================================================
    async submitDirective(request) {
        // TODO: create Vienna directive
        // - emit directive event
        // - route to appropriate handler
        // - return tracking ids
        throw new Error('Not implemented');
    }
    // ==========================================================================
    // Providers (Day 3)
    // ==========================================================================
    async getProviders() {
        // If provider manager is unavailable, return honest empty state
        if (!this.providerManager) {
            console.warn('[ViennaRuntimeService] Provider manager not available');
            return {
                primary: 'anthropic',
                fallback: ['anthropic', 'openclaw'],
                providers: {}
            };
        }
        try {
            // Get all provider statuses from ProviderManagerBridge
            const statuses = await this.providerManager.getAllStatuses();
            // Transform to response format
            const providers = {};
            for (const [name, health] of Object.entries(statuses)) {
                providers[name] = {
                    name: health.provider,
                    status: health.status,
                    lastCheckedAt: health.lastCheckedAt,
                    latencyMs: health.latencyMs,
                    cooldownUntil: health.cooldownUntil,
                    consecutiveFailures: health.consecutiveFailures
                };
            }
            return {
                primary: this.providerManager.getPrimaryProvider(),
                fallback: this.providerManager.getFallbackOrder(),
                providers
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] Failed to get providers:', error);
            // Return empty providers on error rather than failing
            return {
                primary: 'anthropic',
                fallback: ['anthropic', 'openclaw'],
                providers: {}
            };
        }
    }
    // ==========================================================================
    // Services (Day 3)
    // ==========================================================================
    async getServices() {
        try {
            // Phase 7.3: Use StateAwareDiagnostics for state-aware reads (with live fallback)
            if (this.viennaCore.stateAwareDiagnostics) {
                const serviceStatuses = await this.viennaCore.stateAwareDiagnostics.getAllServices();
                // Transform to expected format
                return serviceStatuses.map((s) => ({
                    service: s.service_id,
                    status: s.status,
                    lastHeartbeatAt: s.last_check_at,
                    connectivity: s.metadata?.connectivity,
                    restartable: s.service_id !== 'vienna-executor', // Executor cannot be restarted
                }));
            }
            // Phase 7.2 Stage 4: Fallback to ServiceManager for service status
            if (this.viennaCore.serviceManager) {
                const serviceStatuses = await this.viennaCore.serviceManager.getServices();
                // Transform to expected format
                return serviceStatuses.map((s) => ({
                    service: s.service_id,
                    status: s.status,
                    lastHeartbeatAt: s.last_check_at,
                    connectivity: s.metadata?.connectivity,
                    restartable: s.service_id !== 'vienna-executor', // Executor cannot be restarted
                }));
            }
            // Fallback: Legacy inline checks
            const services = [];
            // Check OpenClaw Gateway
            try {
                // Try to connect to OpenClaw gateway
                const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || '18789';
                const response = await fetch(`http://localhost:${gatewayPort}/health`, {
                    signal: AbortSignal.timeout(2000) // 2 second timeout
                });
                const healthy = response.ok;
                services.push({
                    service: 'openclaw-gateway',
                    status: (healthy ? 'running' : 'degraded'),
                    lastHeartbeatAt: new Date().toISOString(),
                    connectivity: (healthy ? 'healthy' : 'degraded'),
                    restartable: true
                });
            }
            catch (error) {
                // Gateway not responding
                services.push({
                    service: 'openclaw-gateway',
                    status: 'stopped',
                    lastHeartbeatAt: undefined,
                    connectivity: 'offline',
                    restartable: true
                });
            }
            // Vienna Core Executor
            try {
                const health = this.viennaCore.queuedExecutor.getHealth();
                services.push({
                    service: 'vienna-executor',
                    status: (health.executor_ready ? 'running' : 'degraded'),
                    lastHeartbeatAt: new Date().toISOString(),
                    connectivity: (health.queue_healthy ? 'healthy' : 'degraded'),
                    restartable: false // Cannot restart executor directly
                });
            }
            catch (error) {
                services.push({
                    service: 'vienna-executor',
                    status: 'unknown',
                    lastHeartbeatAt: undefined,
                    connectivity: 'offline',
                    restartable: false
                });
            }
            return services;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getServices error:', error);
            return [];
        }
    }
    async restartService(serviceName, operator) {
        try {
            // Phase 7.2 Stage 4: Use ServiceManager for restart
            if (this.viennaCore.serviceManager) {
                const result = await this.viennaCore.serviceManager.restartService(serviceName, operator);
                return {
                    objective_id: result.objective_id || '',
                    status: result.status,
                    message: result.message
                };
            }
            // Fallback: Legacy preview message
            if (serviceName === 'openclaw-gateway') {
                return {
                    objective_id: '', // Empty until recovery system wired
                    status: 'preview',
                    message: `Restart ${serviceName} requires governance approval. Recovery objectives not yet implemented. Manual restart: 'openclaw gateway restart'`
                };
            }
            if (serviceName === 'vienna-executor') {
                return {
                    objective_id: '',
                    status: 'failed',
                    message: `Cannot restart ${serviceName}. Executor restart requires full Vienna Core reinitialization.`
                };
            }
            return {
                objective_id: '',
                status: 'failed',
                message: `Unknown service: ${serviceName}`
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] restartService error:', error);
            return {
                objective_id: '',
                status: 'failed',
                message: `Failed to restart service: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    // ==========================================================================
    // Files Operations (Phase 1A)
    // ==========================================================================
    async listFiles(request) {
        try {
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const fullPath = pathModule.resolve(workspace, request.path.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspace)) {
                throw new Error('Path outside workspace not allowed');
            }
            // List directory
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const files = await Promise.all(entries.map(async (entry) => {
                const entryPath = pathModule.join(fullPath, entry.name);
                const stats = await fs.stat(entryPath);
                return {
                    name: entry.name,
                    path: pathModule.relative(workspace, entryPath),
                    type: (entry.isDirectory() ? 'directory' : 'file'),
                    size: entry.isFile() ? stats.size : undefined,
                    modified: stats.mtime.toISOString(),
                };
            }));
            return {
                path: request.path,
                files: files.sort((a, b) => {
                    // Directories first, then alphabetical
                    if (a.type !== b.type) {
                        return a.type === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                }),
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] listFiles error:', error);
            throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async readFile(request) {
        try {
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const fullPath = pathModule.resolve(workspace, request.path.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspace)) {
                throw new Error('Path outside workspace not allowed');
            }
            // Read file
            const content = await fs.readFile(fullPath, 'utf-8');
            const stats = await fs.stat(fullPath);
            return {
                path: request.path,
                content,
                size: stats.size,
                modified: stats.mtime.toISOString(),
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] readFile error:', error);
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async writeFile(request) {
        try {
            // Create envelope for file write operation
            const envelopeId = `env_file_write_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const objectiveId = `obj_file_write_${Date.now()}`;
            // For Phase 1A, execute directly (envelope creation for visualization)
            // In Phase 1B, this will route through Vienna Core executor
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const fullPath = pathModule.resolve(workspace, request.path.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspace)) {
                throw new Error('Path outside workspace not allowed');
            }
            // Check if file exists
            let exists = false;
            try {
                await fs.access(fullPath);
                exists = true;
            }
            catch {
                exists = false;
            }
            if (request.createOnly && exists) {
                throw new Error('File already exists');
            }
            // Ensure parent directory exists
            await fs.mkdir(pathModule.dirname(fullPath), { recursive: true });
            // Write file
            await fs.writeFile(fullPath, request.content, 'utf-8');
            // Emit replay event
            if (this.viennaCore.replay && typeof this.viennaCore.replay.emit === 'function') {
                await this.viennaCore.replay.emit({
                    event_type: 'file.written',
                    envelope_id: envelopeId,
                    objective_id: objectiveId,
                    actor: request.operator,
                    payload: {
                        path: request.path,
                        size: request.content.length,
                        created: !exists,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    action: 'file_write',
                    operator: request.operator,
                    result: 'completed',
                    envelope_id: envelopeId,
                    objective_id: objectiveId,
                    metadata: {
                        path: request.path,
                        size: request.content.length,
                        created: !exists,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                envelope_id: envelopeId,
                objective_id: objectiveId,
                status: 'completed',
                path: request.path,
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] writeFile error:', error);
            throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteFile(request) {
        try {
            // Create envelope for file delete operation
            const envelopeId = `env_file_delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const objectiveId = `obj_file_delete_${Date.now()}`;
            // For Phase 1A, execute directly (envelope creation for visualization)
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const fullPath = pathModule.resolve(workspace, request.path.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspace)) {
                throw new Error('Path outside workspace not allowed');
            }
            // Delete file
            await fs.unlink(fullPath);
            // Emit replay event
            if (this.viennaCore.replay && typeof this.viennaCore.replay.emit === 'function') {
                await this.viennaCore.replay.emit({
                    event_type: 'file.deleted',
                    envelope_id: envelopeId,
                    objective_id: objectiveId,
                    actor: request.operator,
                    payload: {
                        path: request.path,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            // Emit audit event
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    action: 'file_delete',
                    operator: request.operator,
                    result: 'completed',
                    envelope_id: envelopeId,
                    objective_id: objectiveId,
                    metadata: {
                        path: request.path,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                envelope_id: envelopeId,
                objective_id: objectiveId,
                status: 'completed',
                path: request.path,
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] deleteFile error:', error);
            throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async uploadFiles(request) {
        try {
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve target path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const targetDir = pathModule.resolve(workspace, request.targetPath.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!targetDir.startsWith(workspace)) {
                throw new Error('Target path outside workspace not allowed');
            }
            // Ensure target directory exists
            await fs.mkdir(targetDir, { recursive: true });
            const results = [];
            // Process each file
            for (const file of request.files) {
                const envelopeId = `env_file_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                try {
                    // Sanitize filename: remove path traversal attempts, special chars
                    const sanitized = file.originalname
                        .replace(/\.\./g, '')
                        .replace(/[^a-zA-Z0-9._-]/g, '_');
                    const filePath = pathModule.join(targetDir, sanitized);
                    const relativePath = pathModule.relative(workspace, filePath);
                    // Write file
                    await fs.writeFile(filePath, file.buffer);
                    // Verify write
                    const stats = await fs.stat(filePath);
                    const verified = stats.size === file.size;
                    if (!verified) {
                        throw new Error(`Size mismatch: expected ${file.size}, got ${stats.size}`);
                    }
                    // Emit replay event
                    if (this.viennaCore.replay && typeof this.viennaCore.replay.emit === 'function') {
                        await this.viennaCore.replay.emit({
                            event_type: 'file.uploaded',
                            envelope_id: envelopeId,
                            actor: request.operator,
                            payload: {
                                original_name: file.originalname,
                                path: `/${relativePath}`,
                                size: file.size,
                                mimetype: file.mimetype,
                            },
                            timestamp: new Date().toISOString(),
                        });
                    }
                    // Emit audit event
                    if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                        await this.viennaCore.audit.emit({
                            action: 'file_upload',
                            operator: request.operator,
                            result: 'completed',
                            envelope_id: envelopeId,
                            metadata: {
                                original_name: file.originalname,
                                path: `/${relativePath}`,
                                size: file.size,
                                mimetype: file.mimetype,
                            },
                            timestamp: new Date().toISOString(),
                        });
                    }
                    results.push({
                        name: sanitized,
                        path: `/${relativePath}`,
                        size: file.size,
                        envelope_id: envelopeId,
                        status: 'verified',
                    });
                }
                catch (error) {
                    console.error('[ViennaRuntimeService] Upload error for file:', file.originalname, error);
                    results.push({
                        name: file.originalname,
                        path: '',
                        size: file.size,
                        envelope_id: envelopeId,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
            return { files: results };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] uploadFiles error:', error);
            throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async searchFiles(request) {
        try {
            const fs = await import('fs/promises');
            const pathModule = await import('path');
            // Resolve path relative to workspace
            const workspace = process.env.OPENCLAW_WORKSPACE || pathModule.join(process.env.HOME || '~', '.openclaw', 'workspace');
            const fullPath = pathModule.resolve(workspace, request.path.replace(/^\//, ''));
            // Security: ensure path is within workspace
            if (!fullPath.startsWith(workspace)) {
                throw new Error('Path outside workspace not allowed');
            }
            const results = [];
            // Recursive search function
            async function searchDir(dir) {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const entryPath = pathModule.join(dir, entry.name);
                    const relativePath = pathModule.relative(workspace, entryPath);
                    // Name match
                    if (entry.name.toLowerCase().includes(request.query.toLowerCase())) {
                        results.push({
                            path: relativePath,
                            name: entry.name,
                            type: entry.isDirectory() ? 'directory' : 'file',
                            match: 'name',
                        });
                    }
                    // Content search (files only)
                    if (request.contentSearch && entry.isFile()) {
                        try {
                            const content = await fs.readFile(entryPath, 'utf-8');
                            const lowerContent = content.toLowerCase();
                            const lowerQuery = request.query.toLowerCase();
                            if (lowerContent.includes(lowerQuery)) {
                                // Find snippet around match
                                const index = lowerContent.indexOf(lowerQuery);
                                const start = Math.max(0, index - 50);
                                const end = Math.min(content.length, index + request.query.length + 50);
                                const snippet = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
                                // Avoid duplicate if already matched by name
                                if (!results.some(r => r.path === relativePath)) {
                                    results.push({
                                        path: relativePath,
                                        name: entry.name,
                                        type: 'file',
                                        match: 'content',
                                        snippet,
                                    });
                                }
                            }
                        }
                        catch {
                            // Ignore files that can't be read as text
                        }
                    }
                    // Recurse into directories
                    if (entry.isDirectory()) {
                        await searchDir(entryPath);
                    }
                }
            }
            await searchDir(fullPath);
            return {
                query: request.query,
                path: request.path,
                results: results.slice(0, 100), // Limit to 100 results
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] searchFiles error:', error);
            throw new Error(`Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ==========================================================================
    // Command Submission (Phase 2B - Attachments)
    // ==========================================================================
    async submitCommand(request) {
        try {
            // Generate objective ID
            const objectiveId = `obj_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log('[ViennaRuntimeService] Command submission:', {
                objectiveId,
                command: request.command,
                attachments: request.attachments,
                operator: request.operator,
            });
            // Emit audit event for command submission
            if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                await this.viennaCore.audit.emit({
                    action: 'command_submitted',
                    operator: request.operator,
                    result: 'pending',
                    objective_id: objectiveId,
                    metadata: {
                        command: request.command,
                        attachments: request.attachments,
                        attachment_count: request.attachments.length,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            // Phase 2C: Generate execution plan
            const { PlannerService } = await import('./plannerService.js');
            const planner = new PlannerService();
            let plan;
            try {
                plan = await planner.planCommand({
                    objective_id: objectiveId,
                    command: request.command,
                    attachments: request.attachments,
                    operator: request.operator,
                });
                console.log('[ViennaRuntimeService] Plan generated:', {
                    planId: plan.plan_id,
                    commandType: plan.command_type,
                    actionCount: plan.actions.length,
                });
            }
            catch (planError) {
                console.error('[ViennaRuntimeService] Planning failed:', planError);
                // Emit audit failure
                if (this.viennaCore.audit && typeof this.viennaCore.audit.emit === 'function') {
                    await this.viennaCore.audit.emit({
                        action: 'command_planning_failed',
                        operator: request.operator,
                        result: 'failed',
                        objective_id: objectiveId,
                        metadata: {
                            error: planError instanceof Error ? planError.message : 'Unknown error',
                        },
                        timestamp: new Date().toISOString(),
                    });
                }
                throw planError;
            }
            // Phase 2C: Generate envelopes from plan
            const envelopes = await this.generateEnvelopesFromPlan(plan, request.operator);
            console.log('[ViennaRuntimeService] Envelopes generated:', {
                count: envelopes.length,
                objectiveId,
            });
            // Phase 2C: Submit envelopes for execution
            for (const envelope of envelopes) {
                if (this.viennaCore.queuedExecutor && typeof this.viennaCore.queuedExecutor.submit === 'function') {
                    try {
                        await this.viennaCore.queuedExecutor.submit(envelope);
                    }
                    catch (submitError) {
                        console.error('[ViennaRuntimeService] Envelope submission failed:', submitError);
                        // Continue with remaining envelopes
                    }
                }
                else {
                    console.warn('[ViennaRuntimeService] No queued executor available, envelopes not executed');
                }
            }
            return {
                objective_id: objectiveId,
                status: 'executing',
                command: request.command,
                attachments: request.attachments,
                message: `Command executed: ${plan.command_type} with ${envelopes.length} envelope(s)`,
                plan_id: plan.plan_id,
                envelope_count: envelopes.length,
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] submitCommand error:', error);
            throw new Error(`Failed to submit command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate envelopes from execution plan
     */
    async generateEnvelopesFromPlan(plan, operator) {
        const envelopes = [];
        let previousEnvelopeId;
        for (const action of plan.actions) {
            const envelopeId = `env_${plan.objective_id}_${envelopes.length}`;
            const envelope = {
                envelope_id: envelopeId,
                objective_id: plan.objective_id,
                parent_envelope_id: previousEnvelopeId,
                action_type: action.type,
                target: action.target,
                params: action.params || {},
                fanout: action.fanout || false,
                operator,
                queued_at: new Date().toISOString(),
            };
            envelopes.push(envelope);
            previousEnvelopeId = envelopeId;
        }
        return envelopes;
    }
    // ==========================================================================
    // Runtime Envelope Visibility (Phase 1A - Envelope Visualizer)
    // ==========================================================================
    async getRuntimeEnvelopes(params) {
        try {
            // Get envelopes from Vienna Core queue state
            const queueState = this.viennaCore.queuedExecutor.getQueueState();
            let envelopes = [
                ...(queueState.queued_envelopes || []),
                ...(queueState.executing_envelopes || []),
                ...(queueState.completed_envelopes || []).slice(-20), // Recent completions
                ...(queueState.failed_envelopes || []).slice(-20), // Recent failures
                ...(queueState.blocked_envelopes || []),
            ];
            // Filter by status if provided
            if (params.status) {
                envelopes = envelopes.filter(e => e.state === params.status);
            }
            // Filter by objectiveId if provided
            if (params.objectiveId) {
                envelopes = envelopes.filter(e => e.objective_id === params.objectiveId);
            }
            // Limit results
            const limit = params.limit || 50;
            envelopes = envelopes.slice(0, limit);
            // Normalize to runtime envelope format
            return envelopes.map(e => ({
                envelope_id: e.envelope_id || e.id || 'unknown',
                objective_id: e.objective_id || 'unknown',
                parent_envelope_id: e.parent_envelope_id,
                action_type: e.action_type || e.type || 'unknown',
                target: e.target || e.description || '',
                state: e.state || 'unknown',
                warrant_id: e.warrant_id,
                verification_status: e.verification_status,
                retry_count: e.retry_count || 0,
                dead_letter: e.state === 'dead_letter',
                queued_at: e.queued_at || e.created_at || new Date().toISOString(),
                started_at: e.started_at,
                completed_at: e.completed_at,
                error: e.error,
            }));
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getRuntimeEnvelopes error:', error);
            // Graceful degradation - return empty array
            return [];
        }
    }
    async getRuntimeEnvelope(envelopeId) {
        try {
            // Get all envelopes
            const envelopes = await this.getRuntimeEnvelopes({ limit: 1000 });
            // Find matching envelope
            const envelope = envelopes.find(e => e.envelope_id === envelopeId);
            if (!envelope) {
                return null;
            }
            // Get full envelope detail from Vienna Core if available
            if (this.viennaCore.queuedExecutor.getEnvelope) {
                try {
                    const fullEnvelope = await this.viennaCore.queuedExecutor.getEnvelope(envelopeId);
                    if (fullEnvelope) {
                        return {
                            ...envelope,
                            payload: fullEnvelope.payload || fullEnvelope.data,
                        };
                    }
                }
                catch (err) {
                    // Fall back to basic envelope data
                }
            }
            return envelope;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getRuntimeEnvelope error:', error);
            return null;
        }
    }
    async getObjectiveExecution(objectiveId) {
        try {
            // Get objective detail
            const objective = await this.getObjective(objectiveId);
            if (!objective) {
                return null;
            }
            // Get all envelopes for this objective
            const envelopes = await this.getRuntimeEnvelopes({
                objectiveId,
                limit: 1000,
            });
            // Build execution tree
            const tree = [];
            // Find root envelopes (no parent)
            const roots = envelopes.filter(e => !e.parent_envelope_id);
            // Build tree recursively
            function buildTree(parentId, depth) {
                const children = envelopes
                    .filter(e => e.parent_envelope_id === parentId)
                    .map(e => e.envelope_id);
                tree.push({
                    envelope_id: parentId,
                    children,
                    depth,
                });
                children.forEach(childId => buildTree(childId, depth + 1));
            }
            roots.forEach(root => buildTree(root.envelope_id, 0));
            return {
                objective_id: objectiveId,
                title: objective.title,
                status: objective.status,
                envelopes: envelopes.map(e => ({
                    envelope_id: e.envelope_id,
                    parent_envelope_id: e.parent_envelope_id,
                    action_type: e.action_type,
                    target: e.target,
                    state: e.state,
                    warrant_id: e.warrant_id,
                    verification_status: e.verification_status,
                    retry_count: e.retry_count,
                    queued_at: e.queued_at,
                    started_at: e.started_at,
                    completed_at: e.completed_at,
                })),
                execution_tree: tree,
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getObjectiveExecution error:', error);
            return null;
        }
    }
    // ==========================================================================
    // Dashboard Bootstrap
    // ==========================================================================
    async bootstrapDashboard() {
        // Aggregate initial dashboard state from real Vienna Core data
        const now = new Date().toISOString();
        try {
            // Gather all dashboard data in parallel where possible
            const [systemStatus, objectives, activeEnvelopes, queueState, decisions, deadLetters, agents, health] = await Promise.allSettled([
                this.getSystemStatus(),
                this.getObjectives(),
                this.getActiveEnvelopes(),
                this.getQueueState(),
                this.getDecisions(),
                this.getDeadLetters(),
                this.getAgents(),
                this.getHealth().catch(() => ({
                    state: 'healthy',
                    latency_ms_avg: 0,
                    stalled_executions: 0,
                    queue_healthy: true,
                    replay_log_writable: true,
                    adapters_responsive: true,
                    last_check: now,
                    issues: []
                }))
            ]);
            // Build metrics from execution data
            const metrics = {
                total_executed: 0,
                total_failed: 0,
                total_retried: 0,
                success_rate: 0,
                avg_latency_ms: 0,
                p95_latency_ms: 0,
                throughput_per_minute: 0,
                by_risk_tier: {
                    T0: { executed: 0, failed: 0 },
                    T1: { executed: 0, failed: 0 },
                    T2: { executed: 0, failed: 0 }
                },
                time_window_start: now,
                time_window_end: now
            };
            // Build integrity snapshot
            const integrity = {
                state: 'ok',
                issues: [],
                warnings: [],
                violations: [],
                checked_at: now,
                next_check_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                checks_performed: []
            };
            return {
                status: systemStatus.status === 'fulfilled' ? systemStatus.value : this._getDefaultSystemStatus(),
                objectives: objectives.status === 'fulfilled' ? objectives.value : [],
                active_execution: activeEnvelopes.status === 'fulfilled' ? activeEnvelopes.value : [],
                queue_state: queueState.status === 'fulfilled' ? queueState.value : this._getDefaultQueueState(),
                decisions: decisions.status === 'fulfilled' ? decisions.value : [],
                dead_letters: deadLetters.status === 'fulfilled' ? deadLetters.value : [],
                agents: agents.status === 'fulfilled' ? agents.value : [],
                metrics,
                health: health.status === 'fulfilled' ? health.value : this._getDefaultHealth(),
                integrity,
                bootstrapped_at: now
            };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] bootstrapDashboard error:', error);
            // Return minimal safe state on error
            return {
                status: this._getDefaultSystemStatus(),
                objectives: [],
                active_execution: [],
                queue_state: this._getDefaultQueueState(),
                decisions: [],
                dead_letters: [],
                agents: [],
                metrics: {
                    total_executed: 0,
                    total_failed: 0,
                    total_retried: 0,
                    success_rate: 0,
                    avg_latency_ms: 0,
                    p95_latency_ms: 0,
                    throughput_per_minute: 0,
                    by_risk_tier: {
                        T0: { executed: 0, failed: 0 },
                        T1: { executed: 0, failed: 0 },
                        T2: { executed: 0, failed: 0 }
                    },
                    time_window_start: now,
                    time_window_end: now
                },
                health: this._getDefaultHealth(),
                integrity: {
                    state: 'ok',
                    issues: [],
                    warnings: [],
                    violations: [],
                    checked_at: now,
                    next_check_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                    checks_performed: []
                },
                bootstrapped_at: now
            };
        }
    }
    _getDefaultSystemStatus() {
        const now = new Date().toISOString();
        return {
            system_state: 'healthy',
            executor_state: 'running',
            paused: false,
            queue_depth: 0,
            active_envelopes: 0,
            blocked_envelopes: 0,
            dead_letter_count: 0,
            integrity_state: 'ok',
            trading_guard_state: 'disabled',
            health: {
                state: 'healthy',
                latency_ms_avg: 0,
                stalled_executions: 0,
                last_check: now
            },
            timestamp: now
        };
    }
    _getDefaultQueueState() {
        return {
            total: 0,
            queued: 0,
            executing: 0,
            retry_wait: 0,
            blocked: 0,
            paused_backlog: 0
        };
    }
    _getDefaultHealth() {
        const now = new Date().toISOString();
        return {
            state: 'healthy',
            latency_ms_avg: 0,
            stalled_executions: 0,
            queue_healthy: true,
            replay_log_writable: true,
            adapters_responsive: true,
            last_check: now,
            issues: []
        };
    }
    // ==========================================================================
    // Recovery Copilot (Phase 6.5)
    // ==========================================================================
    /**
     * Process recovery intent
     *
     * @param message - Recovery command ("diagnose system", "show failures", etc.)
     * @returns Recovery response (markdown-formatted)
     */
    async processRecoveryIntent(message) {
        try {
            if (!this.viennaCore.processRecoveryIntent) {
                return 'Recovery copilot not available (Phase 6.5 not initialized)';
            }
            const response = await this.viennaCore.processRecoveryIntent(message);
            return response;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] processRecoveryIntent error:', error);
            throw new Error(`Failed to process recovery intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get current runtime mode state
     *
     * @returns Runtime mode state
     */
    async getRuntimeMode() {
        try {
            if (!this.viennaCore.getRuntimeModeState) {
                return {
                    mode: 'unknown',
                    reasons: ['Phase 6.5 not initialized'],
                    enteredAt: new Date().toISOString(),
                    previousMode: null,
                    fallbackProvidersActive: [],
                    availableCapabilities: [],
                };
            }
            const state = this.viennaCore.getRuntimeModeState();
            return state;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getRuntimeMode error:', error);
            throw new Error(`Failed to get runtime mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Force runtime mode transition (operator override)
     *
     * @param mode - Target mode
     * @param reason - Reason for override
     * @returns Transition record
     */
    async forceRuntimeMode(mode, reason) {
        try {
            if (!this.viennaCore.forceRuntimeMode) {
                throw new Error('Phase 6.5 not initialized');
            }
            const transition = await this.viennaCore.forceRuntimeMode(mode, reason);
            return transition;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] forceRuntimeMode error:', error);
            throw new Error(`Failed to force runtime mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get provider health (for recovery diagnostics)
     *
     * @returns Provider health map
     */
    async getProviderHealth() {
        try {
            if (!this.viennaCore.getProviderHealth) {
                return {};
            }
            const healthMap = this.viennaCore.getProviderHealth();
            // Convert Map to plain object for JSON serialization
            const healthObject = {};
            for (const [name, health] of healthMap.entries()) {
                healthObject[name] = health;
            }
            return healthObject;
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getProviderHealth error:', error);
            throw new Error(`Failed to get provider health: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // ==========================================================================
    // Chat & LLM Provider Integration (Phase 6.6)
    // ==========================================================================
    /**
     * Process chat message (Phase 6.6)
     *
     * Routes message to appropriate handler:
     * - Recovery intents → recovery API
     * - General chat → active LLM provider
     *
     * @param message - User message
     * @param context - Conversation context
     * @returns Chat response
     */
    async processChatMessage(message, context) {
        try {
            // Classify intent
            const intent = this.viennaCore.classifyChatIntent?.(message) || 'general';
            if (intent === 'recovery') {
                // Route to recovery API
                return await this.processRecoveryIntent(message);
            }
            // Route to general chat LLM
            if (!this.viennaCore.processChatMessage) {
                return 'Chat provider not available (Phase 6.6 not initialized)';
            }
            return await this.viennaCore.processChatMessage(message, context);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] processChatMessage error:', error);
            throw new Error(`Failed to process chat message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Classify chat intent (Phase 6.6)
     *
     * @param message - User message
     * @returns 'recovery' or 'general'
     */
    classifyChatIntent(message) {
        if (!this.viennaCore.classifyChatIntent) {
            return 'general';
        }
        return this.viennaCore.classifyChatIntent(message);
    }
    // ==========================================================================
    // Workflow Engine (Phase 6.11)
    // ==========================================================================
    /**
     * Get available built-in workflows
     */
    getAvailableWorkflows() {
        try {
            if (!this.viennaCore.workflowEngine) {
                return [];
            }
            return this.viennaCore.workflowEngine.getAvailableWorkflows();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAvailableWorkflows error:', error);
            return [];
        }
    }
    /**
     * Create workflow instance from template
     */
    createWorkflow(templateId, context = {}) {
        try {
            if (!this.viennaCore.workflowEngine) {
                throw new Error('Phase 6.11 not initialized');
            }
            return this.viennaCore.workflowEngine.createWorkflow(templateId, context);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] createWorkflow error:', error);
            throw error;
        }
    }
    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId) {
        try {
            if (!this.viennaCore.workflowEngine) {
                return null;
            }
            return this.viennaCore.workflowEngine.getWorkflow(workflowId);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getWorkflow error:', error);
            return null;
        }
    }
    /**
     * Get all workflows
     */
    getAllWorkflows() {
        try {
            if (!this.viennaCore.workflowEngine) {
                return [];
            }
            return this.viennaCore.workflowEngine.getAllWorkflows();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAllWorkflows error:', error);
            return [];
        }
    }
    /**
     * Approve workflow for execution
     */
    approveWorkflow(workflowId, operator) {
        try {
            if (!this.viennaCore.workflowEngine) {
                throw new Error('Phase 6.11 not initialized');
            }
            return this.viennaCore.workflowEngine.approveWorkflow(workflowId, operator);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] approveWorkflow error:', error);
            throw error;
        }
    }
    /**
     * Execute workflow
     */
    async executeWorkflow(workflowId) {
        try {
            if (!this.viennaCore.workflowEngine) {
                throw new Error('Phase 6.11 not initialized');
            }
            return await this.viennaCore.workflowEngine.executeWorkflow(workflowId);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] executeWorkflow error:', error);
            throw error;
        }
    }
    /**
     * Cancel workflow
     */
    cancelWorkflow(workflowId, operator) {
        try {
            if (!this.viennaCore.workflowEngine) {
                throw new Error('Phase 6.11 not initialized');
            }
            return this.viennaCore.workflowEngine.cancelWorkflow(workflowId, operator);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] cancelWorkflow error:', error);
            throw error;
        }
    }
    // ==========================================================================
    // Model Control Layer (Phase 6.12)
    // ==========================================================================
    /**
     * Get all models from registry
     */
    getAllModelsFromRegistry() {
        try {
            if (!this.viennaCore.modelRegistry) {
                return [];
            }
            return this.viennaCore.modelRegistry.getAllModels();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAllModelsFromRegistry error:', error);
            return [];
        }
    }
    /**
     * Get enabled models
     */
    getEnabledModels() {
        try {
            if (!this.viennaCore.modelRegistry) {
                return [];
            }
            return this.viennaCore.modelRegistry.getEnabledModels();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getEnabledModels error:', error);
            return [];
        }
    }
    /**
     * Update model status
     */
    updateModelStatus(modelId, status) {
        try {
            if (!this.viennaCore.modelRegistry) {
                throw new Error('Phase 6.12 not initialized');
            }
            return this.viennaCore.modelRegistry.updateModelStatus(modelId, status);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] updateModelStatus error:', error);
            throw error;
        }
    }
    /**
     * Set operator model preference
     */
    setOperatorModelPreference(operator, taskType, modelId) {
        try {
            if (!this.viennaCore.modelRegistry) {
                throw new Error('Phase 6.12 not initialized');
            }
            this.viennaCore.modelRegistry.setOperatorPreference(operator, taskType, modelId);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] setOperatorModelPreference error:', error);
            throw error;
        }
    }
    /**
     * Get operator model preferences
     */
    getOperatorModelPreferences(operator) {
        try {
            if (!this.viennaCore.modelRegistry) {
                return [];
            }
            return this.viennaCore.modelRegistry.getAllOperatorPreferences(operator);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getOperatorModelPreferences error:', error);
            return [];
        }
    }
    /**
     * Clear operator model preference
     */
    clearOperatorModelPreference(operator, taskType) {
        try {
            if (!this.viennaCore.modelRegistry) {
                throw new Error('Phase 6.12 not initialized');
            }
            this.viennaCore.modelRegistry.clearOperatorPreference(operator, taskType);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] clearOperatorModelPreference error:', error);
            throw error;
        }
    }
    /**
     * Route task to appropriate model
     */
    routeTaskToModel(request) {
        try {
            if (!this.viennaCore.modelRouter) {
                throw new Error('Phase 6.12 not initialized');
            }
            return this.viennaCore.modelRouter.route(request);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] routeTaskToModel error:', error);
            throw error;
        }
    }
    /**
     * Get model routing statistics
     */
    getModelRoutingStats() {
        try {
            if (!this.viennaCore.modelRouter) {
                return {
                    total_models: 0,
                    enabled_models: 0,
                    by_provider: {},
                    by_cost_class: {},
                };
            }
            return this.viennaCore.modelRouter.getStats();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getModelRoutingStats error:', error);
            return {
                total_models: 0,
                enabled_models: 0,
                by_provider: {},
                by_cost_class: {},
            };
        }
    }
    /**
     * Test model routing
     */
    testModelRouting(taskType, operator) {
        try {
            if (!this.viennaCore.modelRouter) {
                throw new Error('Phase 6.12 not initialized');
            }
            return this.viennaCore.modelRouter.testRoute(taskType, operator);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] testModelRouting error:', error);
            throw error;
        }
    }
    // ==========================================================================
    // System Command Execution (Phase 6.7)
    // ==========================================================================
    /**
     * Get available system commands
     *
     * @param category - Optional category filter
     * @returns Available commands
     */
    getAvailableCommands(category) {
        try {
            if (!this.viennaCore.getAvailableCommands) {
                return [];
            }
            return this.viennaCore.getAvailableCommands(category);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] getAvailableCommands error:', error);
            return [];
        }
    }
    /**
     * Propose a system command for execution
     *
     * @param commandName - Command template name
     * @param args - Command arguments
     * @param context - Execution context
     * @returns Command proposal
     */
    proposeSystemCommand(commandName, args = [], context = {}) {
        try {
            if (!this.viennaCore.proposeSystemCommand) {
                throw new Error('Phase 6.7 not initialized');
            }
            return this.viennaCore.proposeSystemCommand(commandName, args, context);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] proposeSystemCommand error:', error);
            throw new Error(`Failed to propose command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Execute a system command (with governance)
     *
     * @param commandName - Command template name
     * @param args - Command arguments
     * @param context - Execution context (operator, warrant, etc.)
     * @returns Execution result
     */
    async executeSystemCommand(commandName, args = [], context = {}) {
        try {
            if (!this.viennaCore.executeSystemCommand) {
                throw new Error('Phase 6.7 not initialized');
            }
            return await this.viennaCore.executeSystemCommand(commandName, args, context);
        }
        catch (error) {
            console.error('[ViennaRuntimeService] executeSystemCommand error:', error);
            throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Diagnose system issues and propose fixes
     *
     * @returns Diagnosis with proposed actions
     */
    async diagnoseAndProposeFixes() {
        try {
            if (!this.viennaCore.diagnoseAndProposeFixes) {
                throw new Error('Phase 6.7 not initialized');
            }
            return await this.viennaCore.diagnoseAndProposeFixes();
        }
        catch (error) {
            console.error('[ViennaRuntimeService] diagnoseAndProposeFixes error:', error);
            throw new Error(`Failed to diagnose: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Approve and execute T1 action (Phase 7.5e)
     */
    async approveAndExecuteT1(action, approver) {
        const crypto = require('crypto');
        try {
            const truth = await this.viennaCore.getSystemSnapshot();
            const truthSnapshotId = `truth_${Date.now()}`;
            await this.viennaCore.adapter.saveTruthSnapshot({
                truth_snapshot_id: truthSnapshotId,
                truth_snapshot_hash: crypto.createHash('sha256').update(JSON.stringify(truth)).digest('hex'),
                truth: JSON.stringify(truth),
                timestamp: new Date().toISOString()
            });
            const planId = `plan_${Date.now()}`;
            await this.viennaCore.adapter.savePlan({
                plan_id: planId,
                action_type: action.instruction_type,
                target: action.args,
                risk_tier: 'T1',
                timestamp: new Date().toISOString()
            });
            const warrant = await this.viennaCore.warrant.issue({
                truthSnapshotId,
                planId,
                objective: `Execute ${action.instruction_type}`,
                riskTier: 'T1',
                allowedActions: [action.instruction_type],
                expiresInMinutes: 5
            });
            const result = await this.viennaCore.sendOpenClawDirection(action.instruction_type, action.args, { warrant_id: warrant.warrant_id });
            return { warrant, result, approved_by: approver, timestamp: new Date().toISOString() };
        }
        catch (error) {
            console.error('[ViennaRuntimeService] T1 approval failed:', error);
            throw error;
        }
    }
    async denyT1Action(action, reason) {
        console.log(`[ViennaRuntimeService] T1 denied: ${action.instruction_type}, reason: ${reason}`);
        await this.viennaCore.audit.emit({
            event_type: 't1_action_denied',
            instruction_type: action.instruction_type,
            args: action.args,
            reason,
            timestamp: new Date().toISOString()
        });
    }
}
//# sourceMappingURL=viennaRuntime.js.map