/**
 * Envelope Schema with Phase 7.3 Causal Chain Extensions
 * 
 * Defines envelope structure with recursion control metadata.
 */

const crypto = require('crypto');

/**
 * Generate idempotency key for envelope
 * 
 * @param {string} objectiveId - Objective identifier
 * @param {array} actions - Array of actions
 * @returns {string} Deterministic hash
 */
function generateIdempotencyKey(objectiveId, actions) {
  const normalized = actions.map(a => {
    // Normalize payload by sorting keys
    const payload = a.payload || {};
    const sortedPayload = {};
    Object.keys(payload).sort().forEach(key => {
      sortedPayload[key] = payload[key];
    });
    
    return {
      type: a.type,
      target: a.target,
      payload: sortedPayload
    };
  });
  
  const content = `${objectiveId}:${JSON.stringify(normalized)}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate envelope ID
 * 
 * @returns {string} Unique envelope identifier
 */
function generateEnvelopeId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `env_${timestamp}_${random}`;
}

/**
 * Generate objective ID
 * 
 * @returns {string} Unique objective identifier
 */
function generateObjectiveId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `obj_${timestamp}_${random}`;
}

/**
 * Generate trigger ID
 * 
 * @returns {string} Unique trigger identifier
 */
function generateTriggerId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `trig_${timestamp}_${random}`;
}

/**
 * Validate envelope structure
 * 
 * @param {object} envelope - Envelope to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateEnvelope(envelope) {
  const errors = [];
  
  // Phase 7.2 fields (existing)
  if (!envelope.envelope_id) errors.push('Missing envelope_id');
  if (!envelope.warrant_id) errors.push('Missing warrant_id');
  if (!envelope.actions || !Array.isArray(envelope.actions)) {
    errors.push('Missing or invalid actions array');
  } else if (envelope.actions.length === 0) {
    errors.push('Envelope must have at least one action');
  }
  
  // Phase 7.3 causal chain fields (new)
  if (!envelope.objective_id) errors.push('Missing objective_id');
  if (!envelope.trigger_id) errors.push('Missing trigger_id');
  if (!envelope.origin_type) errors.push('Missing origin_type');
  if (!envelope.origin_id) errors.push('Missing origin_id');
  if (!envelope.trigger_type) errors.push('Missing trigger_type');
  
  // parent_envelope_id is null for root, required otherwise
  if (envelope.causal_depth > 0 && !envelope.parent_envelope_id) {
    errors.push('Non-root envelope missing parent_envelope_id');
  }
  
  if (typeof envelope.causal_depth !== 'number' || envelope.causal_depth < 0) {
    errors.push('Invalid causal_depth (must be non-negative number)');
  }
  
  if (typeof envelope.attempt !== 'number' || envelope.attempt < 0) {
    errors.push('Invalid attempt (must be non-negative number)');
  }
  
  if (typeof envelope.loop_budget_remaining !== 'number' || envelope.loop_budget_remaining < 0) {
    errors.push('Invalid loop_budget_remaining (must be non-negative number)');
  }
  
  if (!envelope.idempotency_key) errors.push('Missing idempotency_key');
  
  // Validate actions
  if (Array.isArray(envelope.actions)) {
    envelope.actions.forEach((action, idx) => {
      if (!action.type) errors.push(`Action ${idx}: missing type`);
      if (!action.target) errors.push(`Action ${idx}: missing target`);
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create envelope with required metadata
 * 
 * @param {object} params - Envelope parameters
 * @returns {object} Complete envelope
 */
function createEnvelope(params) {
  const {
    actions,
    warrant_id,
    objective_id = generateObjectiveId(),
    trigger_id = generateTriggerId(),
    parent_envelope_id = null,
    causal_depth = 0,
    attempt = 0,
    loop_budget_remaining = 5, // Default from Phase 7.3 directive
    origin_type = 'agent',
    origin_id,
    trigger_type = 'operator_directive',
    proposed_by,
    fail_fast = true,
    rollback_plan = null,
    preconditions = []
  } = params;
  
  if (!actions || actions.length === 0) {
    throw new Error('Envelope must have at least one action');
  }
  
  if (!warrant_id) {
    throw new Error('Envelope must have warrant_id');
  }
  
  if (!origin_id) {
    throw new Error('Envelope must have origin_id (agent or operator identifier)');
  }
  
  const envelope_id = generateEnvelopeId();
  const idempotency_key = generateIdempotencyKey(objective_id, actions);
  
  const envelope = {
    // Phase 7.2 fields
    envelope_id,
    warrant_id,
    actions,
    fail_fast,
    rollback_plan,
    preconditions,
    
    // Phase 7.3 causal chain fields
    objective_id,
    trigger_id,
    parent_envelope_id,
    causal_depth,
    attempt,
    loop_budget_remaining,
    origin_type,
    origin_id,
    trigger_type,
    idempotency_key,
    
    // Metadata
    proposed_by,
    created_at: new Date().toISOString()
  };
  
  const validation = validateEnvelope(envelope);
  if (!validation.valid) {
    throw new Error(`Invalid envelope: ${validation.errors.join(', ')}`);
  }
  
  return envelope;
}

/**
 * Create retry envelope from failed envelope
 * 
 * Retries reuse same envelope_id and increment attempt counter.
 * Do NOT consume descendant budget.
 * 
 * @param {object} originalEnvelope - Failed envelope
 * @returns {object} Retry envelope
 */
function createRetryEnvelope(originalEnvelope) {
  if (originalEnvelope.attempt >= 2) { // max_retries_per_envelope = 2
    throw new Error('Maximum retry attempts exceeded');
  }
  
  // Same envelope_id, incremented attempt
  return {
    ...originalEnvelope,
    attempt: originalEnvelope.attempt + 1,
    created_at: new Date().toISOString()
  };
}

/**
 * Create descendant envelope from parent
 * 
 * Descendants create new envelope_id and consume budget.
 * 
 * @param {object} parentEnvelope - Parent envelope
 * @param {object} params - New envelope parameters
 * @returns {object} Descendant envelope
 */
function createDescendantEnvelope(parentEnvelope, params) {
  if (parentEnvelope.loop_budget_remaining <= 0) {
    throw new Error('Parent envelope has exhausted descendant budget');
  }
  
  const {
    actions,
    warrant_id,
    origin_id,
    proposed_by
  } = params;
  
  return createEnvelope({
    actions,
    warrant_id,
    objective_id: parentEnvelope.objective_id, // Inherit objective
    trigger_id: parentEnvelope.trigger_id, // Inherit root trigger
    parent_envelope_id: parentEnvelope.envelope_id,
    causal_depth: parentEnvelope.causal_depth + 1,
    attempt: 0,
    loop_budget_remaining: parentEnvelope.loop_budget_remaining - 1,
    origin_type: parentEnvelope.origin_type,
    origin_id,
    trigger_type: parentEnvelope.trigger_type,
    proposed_by
  });
}

module.exports = {
  generateIdempotencyKey,
  generateEnvelopeId,
  generateObjectiveId,
  generateTriggerId,
  validateEnvelope,
  createEnvelope,
  createRetryEnvelope,
  createDescendantEnvelope
};
