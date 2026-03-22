/**
 * Intent structure (canonical)
 */
export type Intent = {
    /**
     * - Unique intent identifier
     */
    intent_id: string;
    /**
     * - One of: restore_objective, investigate_objective, set_safe_mode
     */
    intent_type: string;
    /**
     * - { type: 'operator'|'agent'|'system', id: string }
     */
    source: any;
    /**
     * - Intent-specific payload
     */
    payload: any;
    /**
     * - ISO timestamp
     */
    submitted_at: string;
};
/**
 * Intent response (canonical)
 */
export type IntentResponse = {
    /**
     * - Same as submitted intent
     */
    intent_id: string;
    /**
     * - Whether intent was accepted
     */
    accepted: boolean;
    /**
     * - Action taken (if accepted)
     */
    action?: string;
    /**
     * - Human-readable message
     */
    message?: string;
    /**
     * - Error reason (if not accepted)
     */
    error?: string;
    /**
     * - Additional response data
     */
    metadata?: any;
};
/**
 * Intent structure (canonical)
 *
 * @typedef {Object} Intent
 * @property {string} intent_id - Unique intent identifier
 * @property {string} intent_type - One of: restore_objective, investigate_objective, set_safe_mode
 * @property {Object} source - { type: 'operator'|'agent'|'system', id: string }
 * @property {Object} payload - Intent-specific payload
 * @property {string} submitted_at - ISO timestamp
 */
/**
 * Intent response (canonical)
 *
 * @typedef {Object} IntentResponse
 * @property {string} intent_id - Same as submitted intent
 * @property {boolean} accepted - Whether intent was accepted
 * @property {string} [action] - Action taken (if accepted)
 * @property {string} [message] - Human-readable message
 * @property {string} [error] - Error reason (if not accepted)
 * @property {Object} [metadata] - Additional response data
 */
export class IntentGateway {
    constructor(stateGraph: any, options?: {});
    stateGraph: any;
    options: {
        supported_intent_types: string[];
    };
    tracer: import("./intent-tracing").IntentTracer;
    /**
     * Submit intent to Vienna OS
     *
     * @param {Intent} intent - Intent object
     * @returns {IntentResponse} Response with acceptance status
     */
    submitIntent(intent: Intent): IntentResponse;
    /**
     * Validate intent structure
     *
     * @param {Intent} intent - Intent to validate
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateIntent(intent: Intent): any;
    /**
     * Normalize intent to canonical form
     *
     * @param {Intent} intent - Raw intent
     * @returns {Intent} Normalized intent
     */
    normalizeIntent(intent: Intent): Intent;
    /**
     * Resolve intent (dispatch to handler)
     *
     * @param {Intent} intent - Normalized intent
     * @returns {Promise<Object>} Resolution result
     */
    resolveIntent(intent: Intent): Promise<any>;
    /**
     * Get handler for intent type
     *
     * @private
     * @param {string} intentType
     * @returns {Function|null} Handler function
     */
    private _getHandler;
    /**
     * Validate intent type-specific requirements
     *
     * @private
     * @param {Intent} intent
     * @returns {Object} { valid: boolean, error?: string }
     */
    private _validateIntentType;
    /**
     * Handle restore_objective intent
     *
     * Action: Submit reconciliation admission request
     *
     * @private
     * @param {Intent} intent
     * @returns {Promise<Object>} Response
     */
    private _handleRestoreObjective;
    /**
     * Handle investigate_objective intent
     *
     * Action: Return State Graph summary (no execution)
     *
     * @private
     * @param {Intent} intent
     * @returns {Promise<Object>} Response
     */
    private _handleInvestigateObjective;
    /**
     * Handle set_safe_mode intent
     *
     * Action: Call safe mode runtime control
     *
     * @private
     * @param {Intent} intent
     * @returns {Promise<Object>} Response
     */
    private _handleSetSafeMode;
    /**
     * Emit intent lifecycle event
     * @private
     * @param {string} eventType - Event type (intent.submitted, intent.validated, etc.)
     * @param {Intent} intent - Intent object
     * @param {Object} metadata - Event metadata
     */
    private _emitLifecycleEvent;
}
//# sourceMappingURL=intent-gateway.d.ts.map