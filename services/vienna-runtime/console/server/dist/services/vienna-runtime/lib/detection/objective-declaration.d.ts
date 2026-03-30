export class ObjectiveDeclarationEngine {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Declare objective from anomaly
     *
     * @param {object} anomaly - Anomaly object
     * @returns {Promise<object|null>} - Created objective or null if no rule
     */
    declareFromAnomaly(anomaly: object): Promise<object | null>;
    /**
     * Find declaration rule for anomaly
     *
     * @param {object} anomaly - Anomaly object
     * @returns {object|null} - Declaration rule or null
     */
    findRule(anomaly: object): object | null;
    /**
     * Infer anomaly subtype
     *
     * @param {object} anomaly - Anomaly object
     * @returns {string} - Subtype identifier
     */
    inferSubtype(anomaly: object): string;
    /**
     * Build objective specification
     *
     * @param {object} anomaly - Anomaly object
     * @param {object} rule - Declaration rule
     * @returns {object} - Objective specification
     */
    buildObjectiveSpec(anomaly: object, rule: object): object;
    /**
     * Interpolate template string
     *
     * @param {string} template - Template with {placeholders}
     * @param {object} anomaly - Anomaly object for values
     * @returns {string} - Interpolated string
     */
    interpolate(template: string, anomaly: object): string;
    /**
     * Find existing objective for anomaly
     *
     * @param {object} anomaly - Anomaly object
     * @returns {Promise<object|null>} - Existing objective or null
     */
    findExistingObjective(anomaly: object): Promise<object | null>;
    /**
     * Generate objective ID
     *
     * @returns {string} - Objective ID
     */
    generateObjectiveId(): string;
}
/**
 * Declaration Rules
 *
 * Maps anomaly type + subtype → objective specification
 */
export const DECLARATION_RULES: {
    [AnomalyType.STATE]: {
        service_unhealthy: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                status: string;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
    };
    [AnomalyType.BEHAVIORAL]: {
        objective_stalled: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                status: string;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
        execution_repeated_failure: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                failure_rate: string;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
    };
    [AnomalyType.POLICY]: {
        repeated_denials: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                policy_effectiveness: string;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
    };
    [AnomalyType.TEMPORAL]: {
        verification_overdue: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                verification_status: string;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
    };
    [AnomalyType.GRAPH]: {
        broken_linkage: {
            objective_type: string;
            objective_name_template: string;
            desired_state: {
                graph_consistent: boolean;
            };
            verification_strength: string;
            evaluation_interval: number;
        };
    };
};
import { AnomalyType } from "../core/anomaly-schema.js";
//# sourceMappingURL=objective-declaration.d.ts.map