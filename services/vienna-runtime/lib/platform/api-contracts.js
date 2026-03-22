/**
 * Vienna Platform API Contracts (v1)
 * 
 * Versioned schemas and compatibility rules.
 */

/**
 * API Version Registry
 */
const API_VERSIONS = {
  '1.0.0': {
    stable: true,
    deprecated: false,
    sunset_date: null,
    breaking_changes: []
  }
};

/**
 * Intent Contract (v1)
 */
const IntentContract_v1 = {
  version: '1.0.0',
  schema: {
    intent_id: { type: 'string', required: true },
    intent_type: { type: 'string', required: true, enum: ['informational', 'read_only_local', 'read_only_remote', 'side_effecting', 'multi_step_objective', 'unknown'] },
    natural_language_input: { type: 'string', required: true },
    confidence: { type: 'number', required: true, min: 0, max: 1 },
    normalized_action: { type: 'string', required: false },
    entities: { type: 'object', required: false },
    ambiguous: { type: 'boolean', required: false },
    suggestions: { type: 'array', required: false },
    tenant_id: { type: 'string', required: true },
    caller: { type: 'object', required: false },
    created_at: { type: 'string', required: true }
  }
};

/**
 * Plan Contract (v1)
 */
const PlanContract_v1 = {
  version: '1.0.0',
  schema: {
    plan_id: { type: 'string', required: true },
    intent_id: { type: 'string', required: false },
    objective: { type: 'string', required: true },
    risk_tier: { type: 'string', required: true, enum: ['T0', 'T1', 'T2'] },
    steps: { type: 'array', required: true },
    preconditions: { type: 'array', required: false },
    postconditions: { type: 'array', required: false },
    verification_spec: { type: 'object', required: false },
    status: { type: 'string', required: true, enum: ['pending', 'approved', 'executing', 'completed', 'failed', 'cancelled'] },
    tenant_id: { type: 'string', required: true },
    created_by: { type: 'string', required: false },
    created_at: { type: 'string', required: true }
  }
};

/**
 * Approval Contract (v1)
 */
const ApprovalContract_v1 = {
  version: '1.0.0',
  schema: {
    approval_id: { type: 'string', required: true },
    plan_id: { type: 'string', required: true },
    risk_tier: { type: 'string', required: true, enum: ['T1', 'T2'] },
    status: { type: 'string', required: true, enum: ['pending', 'approved', 'denied', 'expired', 'cancelled'] },
    requester: { type: 'string', required: false },
    reviewer: { type: 'string', required: false },
    decision_reason: { type: 'string', required: false },
    tenant_id: { type: 'string', required: true },
    created_at: { type: 'string', required: true },
    reviewed_at: { type: 'string', required: false },
    expires_at: { type: 'string', required: false }
  }
};

/**
 * Execution Contract (v1)
 */
const ExecutionContract_v1 = {
  version: '1.0.0',
  schema: {
    execution_id: { type: 'string', required: true },
    plan_id: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'] },
    started_at: { type: 'string', required: false },
    completed_at: { type: 'string', required: false },
    duration_ms: { type: 'number', required: false },
    executor: { type: 'string', required: false },
    tenant_id: { type: 'string', required: true },
    result: { type: 'object', required: false },
    error: { type: 'string', required: false }
  }
};

/**
 * Verification Contract (v1)
 */
const VerificationContract_v1 = {
  version: '1.0.0',
  schema: {
    verification_id: { type: 'string', required: true },
    execution_id: { type: 'string', required: true },
    plan_id: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['pending', 'running', 'passed', 'failed', 'inconclusive', 'skipped'] },
    objective_achieved: { type: 'boolean', required: false },
    checks_passed: { type: 'number', required: false },
    checks_failed: { type: 'number', required: false },
    tenant_id: { type: 'string', required: true },
    verified_at: { type: 'string', required: false }
  }
};

/**
 * Ledger Query Contract (v1)
 */
const LedgerQueryContract_v1 = {
  version: '1.0.0',
  schema: {
    tenant_id: { type: 'string', required: true },
    execution_id: { type: 'string', required: false },
    plan_id: { type: 'string', required: false },
    status: { type: 'string', required: false },
    risk_tier: { type: 'string', required: false },
    time_from: { type: 'string', required: false },
    time_to: { type: 'string', required: false },
    limit: { type: 'number', required: false, default: 100, max: 1000 },
    offset: { type: 'number', required: false, default: 0 }
  }
};

/**
 * Node Contract (v1)
 */
const NodeContract_v1 = {
  version: '1.0.0',
  schema: {
    node_id: { type: 'string', required: true },
    node_type: { type: 'string', required: true, enum: ['local', 'remote', 'distributed'] },
    capabilities: { type: 'array', required: false },
    status: { type: 'string', required: true, enum: ['active', 'degraded', 'offline'] },
    health_score: { type: 'number', required: false, min: 0, max: 1 },
    tenant_id: { type: 'string', required: true },
    registered_at: { type: 'string', required: true },
    last_heartbeat: { type: 'string', required: false }
  }
};

/**
 * Backward Compatibility Rules
 */
const COMPATIBILITY_RULES = {
  '1.0.0': {
    // No backward compatibility needed for initial version
    breaking_changes: [],
    deprecated_fields: [],
    field_mappings: {}
  }
};

/**
 * Deprecation Policy
 */
const DEPRECATION_POLICY = {
  min_notice_days: 90,
  sunset_grace_period_days: 180,
  supported_versions: ['1.0.0'],
  deprecated_versions: []
};

/**
 * Contract Validator
 */
class ContractValidator {
  static validate(data, contract) {
    const errors = [];
    const schema = contract.schema;

    // Check required fields
    for (const [field, spec] of Object.entries(schema)) {
      if (spec.required && !(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }

      if (field in data) {
        const value = data[field];

        // Type check
        if (spec.type && typeof value !== spec.type && value !== null) {
          errors.push(`Invalid type for ${field}: expected ${spec.type}, got ${typeof value}`);
        }

        // Enum check
        if (spec.enum && !spec.enum.includes(value)) {
          errors.push(`Invalid value for ${field}: must be one of [${spec.enum.join(', ')}]`);
        }

        // Min/max check
        if (typeof value === 'number') {
          if (spec.min !== undefined && value < spec.min) {
            errors.push(`Value for ${field} below minimum: ${value} < ${spec.min}`);
          }
          if (spec.max !== undefined && value > spec.max) {
            errors.push(`Value for ${field} above maximum: ${value} > ${spec.max}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateIntent(intent) {
    return this.validate(intent, IntentContract_v1);
  }

  static validatePlan(plan) {
    return this.validate(plan, PlanContract_v1);
  }

  static validateApproval(approval) {
    return this.validate(approval, ApprovalContract_v1);
  }

  static validateExecution(execution) {
    return this.validate(execution, ExecutionContract_v1);
  }

  static validateVerification(verification) {
    return this.validate(verification, VerificationContract_v1);
  }

  static validateLedgerQuery(query) {
    return this.validate(query, LedgerQueryContract_v1);
  }

  static validateNode(node) {
    return this.validate(node, NodeContract_v1);
  }
}

/**
 * Version Compatibility Checker
 */
class VersionCompatibilityChecker {
  static isSupported(version) {
    return DEPRECATION_POLICY.supported_versions.includes(version);
  }

  static isDeprecated(version) {
    return DEPRECATION_POLICY.deprecated_versions.includes(version);
  }

  static getSunsetDate(version) {
    const versionInfo = API_VERSIONS[version];
    return versionInfo ? versionInfo.sunset_date : null;
  }

  static getBreakingChanges(fromVersion, toVersion) {
    const from = API_VERSIONS[fromVersion];
    const to = API_VERSIONS[toVersion];
    
    if (!from || !to) {
      throw new Error(`Unknown version: ${fromVersion} or ${toVersion}`);
    }

    return to.breaking_changes;
  }
}

module.exports = {
  API_VERSIONS,
  IntentContract_v1,
  PlanContract_v1,
  ApprovalContract_v1,
  ExecutionContract_v1,
  VerificationContract_v1,
  LedgerQueryContract_v1,
  NodeContract_v1,
  COMPATIBILITY_RULES,
  DEPRECATION_POLICY,
  ContractValidator,
  VersionCompatibilityChecker
};
