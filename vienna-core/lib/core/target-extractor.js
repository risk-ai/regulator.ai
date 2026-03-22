/**
 * Target Extractor
 * 
 * Deterministic mapping from plan step → target IDs for lock acquisition.
 * 
 * Core principle:
 * If two steps could conflict, they must resolve to the same target ID.
 * 
 * Target ID format:
 * - service: "target:service:<service_id>"
 * - endpoint: "target:endpoint:<endpoint_id>"
 * - provider: "target:provider:<provider_id>"
 * - resource: "target:resource:<resource_id>"
 * - objective: "target:objective:<objective_id>"
 */

/**
 * Extract targets from a plan step
 * 
 * @param {Object} step - Plan step
 * @returns {Array<Object>} - [{ target_type, target_id }]
 */
function extractTargets(step) {
  const targets = [];

  // Primary target (from step definition)
  if (step.target_type && step.target_id) {
    targets.push({
      target_type: step.target_type,
      target_id: buildTargetId(step.target_type, step.target_id)
    });
  }

  // Secondary targets (from action parameters)
  if (step.action && step.parameters) {
    const actionTargets = extractTargetsFromAction(step.action, step.parameters);
    targets.push(...actionTargets);
  }

  // Ensure uniqueness
  return deduplicateTargets(targets);
}

/**
 * Extract targets from action parameters
 * 
 * @param {string} action - Action type
 * @param {Object} parameters - Action parameters
 * @returns {Array<Object>}
 */
function extractTargetsFromAction(action, parameters) {
  const targets = [];

  // Service actions
  if (action.includes('service')) {
    if (parameters.service_id) {
      targets.push({
        target_type: 'service',
        target_id: buildTargetId('service', parameters.service_id)
      });
    }
  }

  // Endpoint actions
  if (action.includes('endpoint')) {
    if (parameters.endpoint_id) {
      targets.push({
        target_type: 'endpoint',
        target_id: buildTargetId('endpoint', parameters.endpoint_id)
      });
    }
  }

  // Provider actions
  if (action.includes('provider')) {
    if (parameters.provider_id) {
      targets.push({
        target_type: 'provider',
        target_id: buildTargetId('provider', parameters.provider_id)
      });
    }
  }

  // Resource actions
  if (action.includes('resource') || action.includes('disk') || action.includes('memory')) {
    if (parameters.resource_id) {
      targets.push({
        target_type: 'resource',
        target_id: buildTargetId('resource', parameters.resource_id)
      });
    }
  }

  // Objective actions
  if (action.includes('objective')) {
    if (parameters.objective_id) {
      targets.push({
        target_type: 'objective',
        target_id: buildTargetId('objective', parameters.objective_id)
      });
    }
  }

  return targets;
}

/**
 * Build canonical target ID
 * 
 * @param {string} targetType
 * @param {string} rawId
 * @returns {string}
 */
function buildTargetId(targetType, rawId) {
  return `target:${targetType}:${rawId}`;
}

/**
 * Parse target ID into components
 * 
 * @param {string} targetId - "target:service:auth-api"
 * @returns {Object} { target_type, raw_id }
 */
function parseTargetId(targetId) {
  const parts = targetId.split(':');
  if (parts.length !== 3 || parts[0] !== 'target') {
    throw new Error(`INVALID_TARGET_ID: ${targetId}`);
  }

  return {
    target_type: parts[1],
    raw_id: parts[2]
  };
}

/**
 * Deduplicate targets
 * 
 * @param {Array<Object>} targets
 * @returns {Array<Object>}
 */
function deduplicateTargets(targets) {
  const seen = new Set();
  const unique = [];

  for (const target of targets) {
    const key = `${target.target_type}:${target.target_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(target);
    }
  }

  return unique;
}

/**
 * Extract all targets from plan (all steps)
 * 
 * @param {Object} plan
 * @returns {Array<Object>}
 */
function extractPlanTargets(plan) {
  const allTargets = [];

  for (const step of plan.steps) {
    const stepTargets = extractTargets(step);
    allTargets.push(...stepTargets);
  }

  return deduplicateTargets(allTargets);
}

module.exports = {
  extractTargets,
  extractPlanTargets,
  buildTargetId,
  parseTargetId
};
