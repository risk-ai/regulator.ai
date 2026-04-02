/**
 * Fanout Executor
 *
 * Phase 3B: Failure isolation for fanout operations
 *
 * RESPONSIBILITIES:
 * - Expand fanout actions into per-item sub-envelopes
 * - Execute sub-envelopes with failure isolation
 * - Collect partial success results
 * - Create dead letters for failures
 * - Aggregate results for next action in chain
 *
 * DESIGN:
 * - Per-file failure containment (one file fails, others continue)
 * - Dead letter creation for failed items
 * - Partial success results (N succeeded, M failed)
 * - Continue-on-error policy (don't fail entire operation)
 */
class FanoutExecutor {
    constructor(actionExecutor, deadLetterQueue) {
        this.actionExecutor = actionExecutor;
        this.deadLetterQueue = deadLetterQueue;
    }
    /**
     * Execute fanout action with failure isolation
     *
     * @param {object} envelope - Fanout envelope
     * @param {array} items - Items to fan out over (from previous action output)
     * @returns {Promise<object>} Fanout execution result
     */
    async executeFanout(envelope, items) {
        if (!Array.isArray(items)) {
            throw new Error('Fanout requires array input from previous action');
        }
        console.log(`[FanoutExecutor] Executing fanout: ${envelope.action_type} over ${items.length} items`);
        const results = {
            total: items.length,
            succeeded: [],
            failed: [],
            outputs: [],
        };
        // Execute action for each item with failure isolation
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                const subEnvelope = this.createSubEnvelope(envelope, item, i);
                const result = await this.actionExecutor.execute(subEnvelope);
                if (result.success) {
                    results.succeeded.push({
                        index: i,
                        item,
                        result: result.output,
                        metadata: result.metadata,
                    });
                    // Collect output for next action in chain
                    results.outputs.push(result.output);
                }
                else {
                    // Action returned success:false (non-throwing failure)
                    await this.recordFailure(envelope, item, i, result.error || 'Action returned success:false');
                    results.failed.push({
                        index: i,
                        item,
                        error: result.error || 'Unknown error',
                    });
                }
            }
            catch (error) {
                // Action threw exception (throwing failure)
                console.error(`[FanoutExecutor] Failed item ${i}/${items.length}:`, error.message);
                await this.recordFailure(envelope, item, i, error.message);
                results.failed.push({
                    index: i,
                    item,
                    error: error.message,
                });
            }
        }
        console.log(`[FanoutExecutor] Fanout complete: ${results.succeeded.length}/${results.total} succeeded, ${results.failed.length} failed`);
        return {
            success: results.succeeded.length > 0, // Partial success if any items succeeded
            fanout: true,
            output: results.outputs, // Array of outputs for next action
            metadata: {
                total_items: results.total,
                succeeded_count: results.succeeded.length,
                failed_count: results.failed.length,
                success_rate: results.succeeded.length / results.total,
                succeeded_items: results.succeeded,
                failed_items: results.failed,
            },
        };
    }
    /**
     * Create sub-envelope for single fanout item
     */
    createSubEnvelope(parentEnvelope, item, index) {
        return {
            envelope_id: `${parentEnvelope.envelope_id}_fanout_${index}`,
            objective_id: parentEnvelope.objective_id,
            parent_envelope_id: parentEnvelope.envelope_id,
            action_type: parentEnvelope.action_type,
            target: item, // Use item as target (e.g., file path)
            params: parentEnvelope.params || {},
            input: parentEnvelope.input, // Pass through any input
            fanout_index: index,
            fanout_total: null, // Will be set by caller
        };
    }
    /**
     * Record fanout item failure as dead letter
     */
    async recordFailure(envelope, item, index, error) {
        if (!this.deadLetterQueue) {
            console.warn('[FanoutExecutor] No dead letter queue configured, skipping failure recording');
            return;
        }
        // Create sub-envelope for dead letter
        const subEnvelopeId = `${envelope.envelope_id}_fanout_${index}`;
        const subEnvelope = this.createSubEnvelope(envelope, item, index);
        try {
            await this.deadLetterQueue.deadLetter({
                envelope_id: subEnvelopeId,
                envelope: subEnvelope,
                objective_id: envelope.objective_id,
                agent_id: envelope.proposed_by || 'unknown',
                reason: 'PERMANENT_FAILURE',
                error,
                retry_count: 0,
                last_state: 'fanout_item_failed',
            });
            console.log(`[FanoutExecutor] Dead letter created for item ${index}: ${item}`);
        }
        catch (dlqError) {
            console.error('[FanoutExecutor] Failed to record dead letter:', dlqError);
        }
    }
    /**
     * Determine if failure is retryable
     */
    isRetryable(errorMessage) {
        const nonRetryablePatterns = [
            'outside workspace',
            'invalid path',
            'permission denied',
            'does not exist',
        ];
        const lowerError = errorMessage.toLowerCase();
        const isNonRetryable = nonRetryablePatterns.some(pattern => lowerError.includes(pattern));
        return !isNonRetryable; // Retryable if not explicitly non-retryable
    }
}
module.exports = { FanoutExecutor };
//# sourceMappingURL=fanout-executor.js.map