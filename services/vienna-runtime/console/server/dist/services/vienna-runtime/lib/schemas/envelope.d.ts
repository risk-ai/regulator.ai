/**
 * Generate idempotency key for envelope
 *
 * @param {string} objectiveId - Objective identifier
 * @param {array} actions - Array of actions
 * @returns {string} Deterministic hash
 */
export function generateIdempotencyKey(objectiveId: string, actions: any[]): string;
/**
 * Generate envelope ID
 *
 * @returns {string} Unique envelope identifier
 */
export function generateEnvelopeId(): string;
/**
 * Generate objective ID
 *
 * @returns {string} Unique objective identifier
 */
export function generateObjectiveId(): string;
/**
 * Generate trigger ID
 *
 * @returns {string} Unique trigger identifier
 */
export function generateTriggerId(): string;
/**
 * Validate envelope structure
 *
 * @param {object} envelope - Envelope to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateEnvelope(envelope: object): object;
/**
 * Create envelope with required metadata
 *
 * @param {object} params - Envelope parameters
 * @returns {object} Complete envelope
 */
export function createEnvelope(params: object): object;
/**
 * Create retry envelope from failed envelope
 *
 * Retries reuse same envelope_id and increment attempt counter.
 * Do NOT consume descendant budget.
 *
 * @param {object} originalEnvelope - Failed envelope
 * @returns {object} Retry envelope
 */
export function createRetryEnvelope(originalEnvelope: object): object;
/**
 * Create descendant envelope from parent
 *
 * Descendants create new envelope_id and consume budget.
 *
 * @param {object} parentEnvelope - Parent envelope
 * @param {object} params - New envelope parameters
 * @returns {object} Descendant envelope
 */
export function createDescendantEnvelope(parentEnvelope: object, params: object): object;
//# sourceMappingURL=envelope.d.ts.map