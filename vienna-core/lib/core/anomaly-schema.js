/**
 * Anomaly Schema — Phase 15
 * 
 * Detection layer entity representing system anomalies that may trigger
 * objective declaration and intent proposals.
 * 
 * Core Invariant: Detection is NOT authority.
 * Anomalies can create proposals, but cannot execute directly.
 */

/**
 * Anomaly Types
 */
const AnomalyType = {
  STATE: 'state',
  BEHAVIORAL: 'behavioral',
  POLICY: 'policy',
  TEMPORAL: 'temporal',
  GRAPH: 'graph'
};

/**
 * Anomaly Severity
 */
const AnomalySeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Anomaly Status
 */
const AnomalyStatus = {
  NEW: 'new',
  REVIEWING: 'reviewing',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive'
};

/**
 * Entity Type
 */
const EntityType = {
  SERVICE: 'service',
  PROVIDER: 'provider',
  OBJECTIVE: 'objective',
  INTENT: 'intent',
  EXECUTION: 'execution',
  PLAN: 'plan',
  POLICY: 'policy',
  ENDPOINT: 'endpoint',
  VERIFICATION: 'verification',
  INVESTIGATION: 'investigation',
  INCIDENT: 'incident'
};

/**
 * Valid Status Transitions
 */
const VALID_TRANSITIONS = {
  new: ['reviewing', 'acknowledged', 'false_positive'],
  reviewing: ['acknowledged', 'resolved', 'false_positive'],
  acknowledged: ['resolved'],
  resolved: [],
  false_positive: []
};

/**
 * Validate anomaly type
 */
function isValidAnomalyType(type) {
  return Object.values(AnomalyType).includes(type);
}

/**
 * Validate severity
 */
function isValidSeverity(severity) {
  return Object.values(AnomalySeverity).includes(severity);
}

/**
 * Validate status
 */
function isValidStatus(status) {
  return Object.values(AnomalyStatus).includes(status);
}

/**
 * Validate entity type
 */
function isValidEntityType(type) {
  return Object.values(EntityType).includes(type);
}

/**
 * Validate anomaly object
 */
function validateAnomaly(anomaly) {
  const errors = [];

  // Required fields
  if (!anomaly.anomaly_id || typeof anomaly.anomaly_id !== 'string') {
    errors.push('anomaly_id is required and must be a string');
  } else if (!/^ano_\d+_[a-z0-9]+$/.test(anomaly.anomaly_id)) {
    errors.push('anomaly_id must match pattern: ano_<timestamp>_<random>');
  }

  if (!isValidAnomalyType(anomaly.anomaly_type)) {
    errors.push(`anomaly_type must be one of: ${Object.values(AnomalyType).join(', ')}`);
  }

  if (!isValidSeverity(anomaly.severity)) {
    errors.push(`severity must be one of: ${Object.values(AnomalySeverity).join(', ')}`);
  }

  if (!anomaly.source || typeof anomaly.source !== 'string') {
    errors.push('source is required and must be non-empty string');
  }

  if (!anomaly.evidence || typeof anomaly.evidence !== 'object') {
    errors.push('evidence is required and must be an object');
  } else if (Object.keys(anomaly.evidence).length === 0) {
    errors.push('evidence must contain at least one field');
  }

  if (typeof anomaly.confidence !== 'number' || anomaly.confidence < 0 || anomaly.confidence > 1) {
    errors.push('confidence must be a number between 0.0 and 1.0');
  }

  if (!anomaly.detected_at || typeof anomaly.detected_at !== 'string') {
    errors.push('detected_at is required and must be ISO 8601 datetime');
  }

  if (!isValidStatus(anomaly.status)) {
    errors.push(`status must be one of: ${Object.values(AnomalyStatus).join(', ')}`);
  }

  // Optional fields with constraints
  if (anomaly.entity_id && !anomaly.entity_type) {
    errors.push('entity_type is required when entity_id is provided');
  }

  if (anomaly.entity_type && !isValidEntityType(anomaly.entity_type)) {
    errors.push(`entity_type must be one of: ${Object.values(EntityType).join(', ')}`);
  }

  if (anomaly.status !== 'new' && (!anomaly.reviewed_by || !anomaly.reviewed_at)) {
    errors.push('reviewed_by and reviewed_at required for non-new status');
  }

  if (errors.length > 0) {
    throw new Error(`Anomaly validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Validate anomaly creation input
 */
function validateAnomalyCreate(input) {
  const errors = [];

  if (!isValidAnomalyType(input.anomaly_type)) {
    errors.push(`anomaly_type must be one of: ${Object.values(AnomalyType).join(', ')}`);
  }

  if (!isValidSeverity(input.severity)) {
    errors.push(`severity must be one of: ${Object.values(AnomalySeverity).join(', ')}`);
  }

  if (!input.source || typeof input.source !== 'string') {
    errors.push('source is required and must be non-empty string');
  }

  if (!input.evidence || typeof input.evidence !== 'object') {
    errors.push('evidence is required and must be an object');
  } else if (Object.keys(input.evidence).length === 0) {
    errors.push('evidence must contain at least one field');
  }

  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
    errors.push('confidence must be a number between 0.0 and 1.0');
  }

  if (input.entity_id && !input.entity_type) {
    errors.push('entity_type is required when entity_id is provided');
  }

  if (input.entity_type && !isValidEntityType(input.entity_type)) {
    errors.push(`entity_type must be one of: ${Object.values(EntityType).join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Anomaly creation validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Validate status transition
 */
function isValidTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return true;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
}

/**
 * Generate anomaly ID
 */
function generateAnomalyId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `ano_${timestamp}_${random}`;
}

/**
 * Create Anomaly Object
 */
function createAnomaly(input) {
  validateAnomalyCreate(input);

  const anomaly = {
    ...input,
    anomaly_id: generateAnomalyId(),
    detected_at: new Date().toISOString(),
    status: 'new'
  };

  validateAnomaly(anomaly);
  return anomaly;
}

/**
 * Validate Anomaly Update
 */
function validateAnomalyUpdate(currentAnomaly, updates) {
  const errors = [];

  if (updates.status) {
    if (!isValidStatus(updates.status)) {
      errors.push(`status must be one of: ${Object.values(AnomalyStatus).join(', ')}`);
    } else if (!isValidTransition(currentAnomaly.status, updates.status)) {
      errors.push(
        `Invalid status transition: ${currentAnomaly.status} → ${updates.status}. ` +
        `Allowed: ${VALID_TRANSITIONS[currentAnomaly.status].join(', ')}`
      );
    }
  }

  if (updates.status && updates.status !== 'new' && !updates.reviewed_by && !currentAnomaly.reviewed_by) {
    errors.push('reviewed_by required when setting non-new status');
  }

  if (errors.length > 0) {
    throw new Error(`Anomaly update validation failed:\n${errors.join('\n')}`);
  }

  // Add reviewed_at if not provided
  if (updates.status && updates.status !== 'new' && !updates.reviewed_at) {
    updates.reviewed_at = new Date().toISOString();
  }

  return updates;
}

/**
 * Check if anomaly is terminal
 */
function isTerminal(anomaly) {
  return anomaly.status === 'resolved' || anomaly.status === 'false_positive';
}

/**
 * Check if anomaly is actionable
 */
function isActionable(anomaly) {
  if (isTerminal(anomaly)) return false;
  if (anomaly.status === 'acknowledged') return false;

  const actionableSeverities = ['medium', 'high', 'critical'];
  return actionableSeverities.includes(anomaly.severity);
}

/**
 * Get anomaly priority score
 */
function getPriorityScore(anomaly) {
  const severityScores = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  const confidenceBoost = anomaly.confidence * 2;
  return severityScores[anomaly.severity] + confidenceBoost;
}

/**
 * Format anomaly summary
 */
function formatSummary(anomaly) {
  const parts = [
    `[${anomaly.severity.toUpperCase()}]`,
    `${anomaly.anomaly_type} anomaly`
  ];

  if (anomaly.entity_type && anomaly.entity_id) {
    parts.push(`in ${anomaly.entity_type} ${anomaly.entity_id}`);
  }

  parts.push(`(confidence: ${(anomaly.confidence * 100).toFixed(0)}%)`);

  return parts.join(' ');
}

module.exports = {
  // Enums
  AnomalyType,
  AnomalySeverity,
  AnomalyStatus,
  EntityType,

  // State machine
  VALID_TRANSITIONS,
  isValidTransition,

  // Validation
  validateAnomaly,
  validateAnomalyCreate,
  validateAnomalyUpdate,

  // Helpers
  generateAnomalyId,
  createAnomaly,
  isTerminal,
  isActionable,
  getPriorityScore,
  formatSummary
};
