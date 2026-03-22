/**
 * Objective Declaration Engine — Phase 15 Stage 3
 * 
 * Maps anomalies to objectives using deterministic rules.
 */

const { AnomalyType } = require('../core/anomaly-schema.js');

/**
 * Declaration Rules
 * 
 * Maps anomaly type + subtype → objective specification
 */
const DECLARATION_RULES = {
  [AnomalyType.STATE]: {
    service_unhealthy: {
      objective_type: 'service_health',
      objective_name_template: 'restore_{entity_id}_health',
      desired_state: { status: 'healthy' },
      verification_strength: 'strong',
      evaluation_interval: 300  // 5 minutes
    }
  },
  [AnomalyType.BEHAVIORAL]: {
    objective_stalled: {
      objective_type: 'objective_recovery',
      objective_name_template: 'investigate_{entity_id}_stall',
      desired_state: { status: 'monitoring' },
      verification_strength: 'moderate',
      evaluation_interval: 600
    },
    execution_repeated_failure: {
      objective_type: 'execution_stability',
      objective_name_template: 'stabilize_{entity_id}_execution',
      desired_state: { failure_rate: '<10%' },
      verification_strength: 'strong',
      evaluation_interval: 300
    }
  },
  [AnomalyType.POLICY]: {
    repeated_denials: {
      objective_type: 'policy_review',
      objective_name_template: 'review_policy_{entity_id}',
      desired_state: { policy_effectiveness: 'verified' },
      verification_strength: 'moderate',
      evaluation_interval: 1800  // 30 minutes
    }
  },
  [AnomalyType.TEMPORAL]: {
    verification_overdue: {
      objective_type: 'verification_completion',
      objective_name_template: 'complete_verification_{entity_id}',
      desired_state: { verification_status: 'completed' },
      verification_strength: 'strong',
      evaluation_interval: 300
    }
  },
  [AnomalyType.GRAPH]: {
    broken_linkage: {
      objective_type: 'graph_integrity',
      objective_name_template: 'repair_linkage_{entity_id}',
      desired_state: { graph_consistent: true },
      verification_strength: 'weak',
      evaluation_interval: 3600
    }
  }
};

class ObjectiveDeclarationEngine {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Declare objective from anomaly
   * 
   * @param {object} anomaly - Anomaly object
   * @returns {Promise<object|null>} - Created objective or null if no rule
   */
  async declareFromAnomaly(anomaly) {
    const rule = this.findRule(anomaly);
    if (!rule) {
      console.log(`[ObjectiveDeclaration] No rule for anomaly ${anomaly.anomaly_id}`);
      return null;
    }

    // Check for existing objective
    const existing = await this.findExistingObjective(anomaly);
    if (existing) {
      console.log(`[ObjectiveDeclaration] Objective already exists for anomaly ${anomaly.anomaly_id}`);
      return existing;
    }

    const objectiveSpec = this.buildObjectiveSpec(anomaly, rule);
    
    // Create managed objective (Phase 9 schema)
    const objective = this.stateGraph.query(`
      INSERT INTO managed_objectives (
        objective_id, objective_name, objective_type, target_type, target_id,
        desired_state, verification_strength, evaluation_interval,
        status, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [
      this.generateObjectiveId(),
      objectiveSpec.objective_name,
      objectiveSpec.objective_type,
      objectiveSpec.target_type,
      objectiveSpec.target_id,
      JSON.stringify(objectiveSpec.desired_state),
      objectiveSpec.verification_strength,
      objectiveSpec.evaluation_interval,
      'declared',
      JSON.stringify(objectiveSpec.metadata),
      new Date().toISOString()
    ])[0];

    // Link anomaly to objective
    await this.stateGraph.linkAnomalyToObjective(anomaly.anomaly_id, objective.objective_id);

    console.log(`[ObjectiveDeclaration] Declared objective ${objective.objective_id} from anomaly ${anomaly.anomaly_id}`);

    return objective;
  }

  /**
   * Find declaration rule for anomaly
   * 
   * @param {object} anomaly - Anomaly object
   * @returns {object|null} - Declaration rule or null
   */
  findRule(anomaly) {
    const typeRules = DECLARATION_RULES[anomaly.anomaly_type];
    if (!typeRules) return null;

    // Determine subtype from evidence or entity_type
    const subtype = this.inferSubtype(anomaly);
    return typeRules[subtype] || null;
  }

  /**
   * Infer anomaly subtype
   * 
   * @param {object} anomaly - Anomaly object
   * @returns {string} - Subtype identifier
   */
  inferSubtype(anomaly) {
    if (anomaly.anomaly_type === AnomalyType.STATE && anomaly.entity_type === 'service') {
      return 'service_unhealthy';
    }
    if (anomaly.anomaly_type === AnomalyType.BEHAVIORAL && anomaly.entity_type === 'objective') {
      return 'objective_stalled';
    }
    if (anomaly.anomaly_type === AnomalyType.BEHAVIORAL && anomaly.entity_type === 'execution') {
      return 'execution_repeated_failure';
    }
    if (anomaly.anomaly_type === AnomalyType.POLICY) {
      return 'repeated_denials';
    }
    if (anomaly.anomaly_type === AnomalyType.TEMPORAL && anomaly.entity_type === 'verification') {
      return 'verification_overdue';
    }
    if (anomaly.anomaly_type === AnomalyType.GRAPH) {
      return 'broken_linkage';
    }
    return 'unknown';
  }

  /**
   * Build objective specification
   * 
   * @param {object} anomaly - Anomaly object
   * @param {object} rule - Declaration rule
   * @returns {object} - Objective specification
   */
  buildObjectiveSpec(anomaly, rule) {
    const objective_name = this.interpolate(rule.objective_name_template, anomaly);

    return {
      objective_name,
      objective_type: rule.objective_type,
      target_type: anomaly.entity_type,
      target_id: anomaly.entity_id,
      desired_state: rule.desired_state,
      verification_strength: rule.verification_strength,
      evaluation_interval: rule.evaluation_interval,
      metadata: {
        declared_from_anomaly: anomaly.anomaly_id,
        anomaly_type: anomaly.anomaly_type,
        anomaly_severity: anomaly.severity,
        anomaly_confidence: anomaly.confidence,
        auto_declared: true,
        declared_at: new Date().toISOString()
      }
    };
  }

  /**
   * Interpolate template string
   * 
   * @param {string} template - Template with {placeholders}
   * @param {object} anomaly - Anomaly object for values
   * @returns {string} - Interpolated string
   */
  interpolate(template, anomaly) {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return anomaly[key] || key;
    });
  }

  /**
   * Find existing objective for anomaly
   * 
   * @param {object} anomaly - Anomaly object
   * @returns {Promise<object|null>} - Existing objective or null
   */
  async findExistingObjective(anomaly) {
    const objectives = this.stateGraph.query(`
      SELECT * FROM managed_objectives
      WHERE target_type = ?
      AND target_id = ?
      AND status NOT IN ('resolved', 'failed', 'archived')
      AND json_extract(metadata, '$.declared_from_anomaly') = ?
      LIMIT 1
    `, [anomaly.entity_type, anomaly.entity_id, anomaly.anomaly_id]);

    return objectives[0] || null;
  }

  /**
   * Generate objective ID
   * 
   * @returns {string} - Objective ID
   */
  generateObjectiveId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `obj_${timestamp}_${random}`;
  }
}

module.exports = {
  ObjectiveDeclarationEngine,
  DECLARATION_RULES
};
