export class IntentClassifier {
    intentPatterns: {
        informational: RegExp[];
        read_only_query_local: RegExp[];
        read_only_query_remote: RegExp[];
        side_effecting: RegExp[];
        multi_step_objective: RegExp[];
    };
    entityPatterns: {
        service: RegExp[];
        endpoint: RegExp[];
        timeframe: RegExp[];
        operation: RegExp[];
    };
    normalizationRules: ({
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            query: string;
            service_name?: undefined;
        };
    } | {
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            service_name: string;
            query?: undefined;
        };
    } | {
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            query?: undefined;
            service_name?: undefined;
        };
    })[];
    entityTable: EntityNormalizationTable;
    /**
     * Classify user input into intent + entities + normalized action
     *
     * @param {string} input - User input
     * @returns {Object} Classification result
     */
    classify(input: string): any;
    /**
     * Classify intent type
     */
    _classifyIntentType(input: any): string;
    /**
     * Extract entities from input
     */
    _extractEntities(input: any): {};
    /**
     * Normalize input to canonical action
     */
    _normalizeToAction(input: any, intentType: any, entities: any): {
        action_id: any;
        action_type: string;
        target_endpoint: string;
        arguments: {};
    };
    /**
     * Resolve action ID from template
     */
    _resolveActionId(template: any, match: any, entities: any): any;
    /**
     * Build arguments from entities and captures
     */
    _buildArguments(rule: any, entities: any, match: any, rawInput: any): {};
    /**
     * Determine governance tier
     */
    _determineGovernanceTier(normalizedAction: any): "T0" | "T1" | "unknown";
    /**
     * Check for ambiguity
     */
    _checkAmbiguity(input: any, intentType: any, entities: any, normalizedAction: any): {
        is_ambiguous: boolean;
        issues: ({
            type: string;
            message: string;
            entity?: undefined;
            value?: undefined;
        } | {
            type: string;
            entity: string;
            message: string;
            value?: undefined;
        } | {
            type: string;
            entity: string;
            value: any;
            message: string;
        })[];
        resolution: string;
    };
    /**
     * Check if service name is ambiguous
     */
    _isAmbiguousServiceName(serviceName: any): boolean;
    /**
     * Suggest resolution for ambiguity
     */
    _suggestResolution(issues: any): string;
    /**
     * Calculate confidence score
     */
    _calculateConfidence(intentType: any, entities: any, normalizedAction: any, ambiguity: any): number;
    /**
     * Build intent patterns
     */
    _buildIntentPatterns(): {
        informational: RegExp[];
        read_only_query_local: RegExp[];
        read_only_query_remote: RegExp[];
        side_effecting: RegExp[];
        multi_step_objective: RegExp[];
    };
    /**
     * Build entity patterns
     */
    _buildEntityPatterns(): {
        service: RegExp[];
        endpoint: RegExp[];
        timeframe: RegExp[];
        operation: RegExp[];
    };
    /**
     * Build normalization rules
     */
    _buildNormalizationRules(): ({
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            query: string;
            service_name?: undefined;
        };
    } | {
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            service_name: string;
            query?: undefined;
        };
    } | {
        pattern: RegExp;
        action_id: string;
        action_type: string;
        target_endpoint: string;
        arguments: {
            query?: undefined;
            service_name?: undefined;
        };
    })[];
}
import { EntityNormalizationTable } from "./entity-normalization-table.js";
//# sourceMappingURL=intent-classifier.d.ts.map