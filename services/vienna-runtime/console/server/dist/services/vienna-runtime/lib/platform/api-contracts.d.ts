/**
 * Vienna Platform API Contracts (v1)
 *
 * Versioned schemas and compatibility rules.
 */
/**
 * API Version Registry
 */
export const API_VERSIONS: {
    '1.0.0': {
        stable: boolean;
        deprecated: boolean;
        sunset_date: any;
        breaking_changes: any[];
    };
};
export namespace IntentContract_v1 {
    let version: string;
    namespace schema {
        namespace intent_id {
            let type: string;
            let required: boolean;
        }
        namespace intent_type {
            let type_1: string;
            export { type_1 as type };
            let required_1: boolean;
            export { required_1 as required };
            let _enum: string[];
            export { _enum as enum };
        }
        namespace natural_language_input {
            let type_2: string;
            export { type_2 as type };
            let required_2: boolean;
            export { required_2 as required };
        }
        namespace confidence {
            let type_3: string;
            export { type_3 as type };
            let required_3: boolean;
            export { required_3 as required };
            export let min: number;
            export let max: number;
        }
        namespace normalized_action {
            let type_4: string;
            export { type_4 as type };
            let required_4: boolean;
            export { required_4 as required };
        }
        namespace entities {
            let type_5: string;
            export { type_5 as type };
            let required_5: boolean;
            export { required_5 as required };
        }
        namespace ambiguous {
            let type_6: string;
            export { type_6 as type };
            let required_6: boolean;
            export { required_6 as required };
        }
        namespace suggestions {
            let type_7: string;
            export { type_7 as type };
            let required_7: boolean;
            export { required_7 as required };
        }
        namespace tenant_id {
            let type_8: string;
            export { type_8 as type };
            let required_8: boolean;
            export { required_8 as required };
        }
        namespace caller {
            let type_9: string;
            export { type_9 as type };
            let required_9: boolean;
            export { required_9 as required };
        }
        namespace created_at {
            let type_10: string;
            export { type_10 as type };
            let required_10: boolean;
            export { required_10 as required };
        }
    }
}
export namespace PlanContract_v1 {
    let version_1: string;
    export { version_1 as version };
    export namespace schema_1 {
        export namespace plan_id {
            let type_11: string;
            export { type_11 as type };
            let required_11: boolean;
            export { required_11 as required };
        }
        export namespace intent_id_1 {
            let type_12: string;
            export { type_12 as type };
            let required_12: boolean;
            export { required_12 as required };
        }
        export { intent_id_1 as intent_id };
        export namespace objective {
            let type_13: string;
            export { type_13 as type };
            let required_13: boolean;
            export { required_13 as required };
        }
        export namespace risk_tier {
            let type_14: string;
            export { type_14 as type };
            let required_14: boolean;
            export { required_14 as required };
            let _enum_1: string[];
            export { _enum_1 as enum };
        }
        export namespace steps {
            let type_15: string;
            export { type_15 as type };
            let required_15: boolean;
            export { required_15 as required };
        }
        export namespace preconditions {
            let type_16: string;
            export { type_16 as type };
            let required_16: boolean;
            export { required_16 as required };
        }
        export namespace postconditions {
            let type_17: string;
            export { type_17 as type };
            let required_17: boolean;
            export { required_17 as required };
        }
        export namespace verification_spec {
            let type_18: string;
            export { type_18 as type };
            let required_18: boolean;
            export { required_18 as required };
        }
        export namespace status {
            let type_19: string;
            export { type_19 as type };
            let required_19: boolean;
            export { required_19 as required };
            let _enum_2: string[];
            export { _enum_2 as enum };
        }
        export namespace tenant_id_1 {
            let type_20: string;
            export { type_20 as type };
            let required_20: boolean;
            export { required_20 as required };
        }
        export { tenant_id_1 as tenant_id };
        export namespace created_by {
            let type_21: string;
            export { type_21 as type };
            let required_21: boolean;
            export { required_21 as required };
        }
        export namespace created_at_1 {
            let type_22: string;
            export { type_22 as type };
            let required_22: boolean;
            export { required_22 as required };
        }
        export { created_at_1 as created_at };
    }
    export { schema_1 as schema };
}
export namespace ApprovalContract_v1 {
    let version_2: string;
    export { version_2 as version };
    export namespace schema_2 {
        export namespace approval_id {
            let type_23: string;
            export { type_23 as type };
            let required_23: boolean;
            export { required_23 as required };
        }
        export namespace plan_id_1 {
            let type_24: string;
            export { type_24 as type };
            let required_24: boolean;
            export { required_24 as required };
        }
        export { plan_id_1 as plan_id };
        export namespace risk_tier_1 {
            let type_25: string;
            export { type_25 as type };
            let required_25: boolean;
            export { required_25 as required };
            let _enum_3: string[];
            export { _enum_3 as enum };
        }
        export { risk_tier_1 as risk_tier };
        export namespace status_1 {
            let type_26: string;
            export { type_26 as type };
            let required_26: boolean;
            export { required_26 as required };
            let _enum_4: string[];
            export { _enum_4 as enum };
        }
        export { status_1 as status };
        export namespace requester {
            let type_27: string;
            export { type_27 as type };
            let required_27: boolean;
            export { required_27 as required };
        }
        export namespace reviewer {
            let type_28: string;
            export { type_28 as type };
            let required_28: boolean;
            export { required_28 as required };
        }
        export namespace decision_reason {
            let type_29: string;
            export { type_29 as type };
            let required_29: boolean;
            export { required_29 as required };
        }
        export namespace tenant_id_2 {
            let type_30: string;
            export { type_30 as type };
            let required_30: boolean;
            export { required_30 as required };
        }
        export { tenant_id_2 as tenant_id };
        export namespace created_at_2 {
            let type_31: string;
            export { type_31 as type };
            let required_31: boolean;
            export { required_31 as required };
        }
        export { created_at_2 as created_at };
        export namespace reviewed_at {
            let type_32: string;
            export { type_32 as type };
            let required_32: boolean;
            export { required_32 as required };
        }
        export namespace expires_at {
            let type_33: string;
            export { type_33 as type };
            let required_33: boolean;
            export { required_33 as required };
        }
    }
    export { schema_2 as schema };
}
export namespace ExecutionContract_v1 {
    let version_3: string;
    export { version_3 as version };
    export namespace schema_3 {
        export namespace execution_id {
            let type_34: string;
            export { type_34 as type };
            let required_34: boolean;
            export { required_34 as required };
        }
        export namespace plan_id_2 {
            let type_35: string;
            export { type_35 as type };
            let required_35: boolean;
            export { required_35 as required };
        }
        export { plan_id_2 as plan_id };
        export namespace status_2 {
            let type_36: string;
            export { type_36 as type };
            let required_36: boolean;
            export { required_36 as required };
            let _enum_5: string[];
            export { _enum_5 as enum };
        }
        export { status_2 as status };
        export namespace started_at {
            let type_37: string;
            export { type_37 as type };
            let required_37: boolean;
            export { required_37 as required };
        }
        export namespace completed_at {
            let type_38: string;
            export { type_38 as type };
            let required_38: boolean;
            export { required_38 as required };
        }
        export namespace duration_ms {
            let type_39: string;
            export { type_39 as type };
            let required_39: boolean;
            export { required_39 as required };
        }
        export namespace executor {
            let type_40: string;
            export { type_40 as type };
            let required_40: boolean;
            export { required_40 as required };
        }
        export namespace tenant_id_3 {
            let type_41: string;
            export { type_41 as type };
            let required_41: boolean;
            export { required_41 as required };
        }
        export { tenant_id_3 as tenant_id };
        export namespace result {
            let type_42: string;
            export { type_42 as type };
            let required_42: boolean;
            export { required_42 as required };
        }
        export namespace error {
            let type_43: string;
            export { type_43 as type };
            let required_43: boolean;
            export { required_43 as required };
        }
    }
    export { schema_3 as schema };
}
export namespace VerificationContract_v1 {
    let version_4: string;
    export { version_4 as version };
    export namespace schema_4 {
        export namespace verification_id {
            let type_44: string;
            export { type_44 as type };
            let required_44: boolean;
            export { required_44 as required };
        }
        export namespace execution_id_1 {
            let type_45: string;
            export { type_45 as type };
            let required_45: boolean;
            export { required_45 as required };
        }
        export { execution_id_1 as execution_id };
        export namespace plan_id_3 {
            let type_46: string;
            export { type_46 as type };
            let required_46: boolean;
            export { required_46 as required };
        }
        export { plan_id_3 as plan_id };
        export namespace status_3 {
            let type_47: string;
            export { type_47 as type };
            let required_47: boolean;
            export { required_47 as required };
            let _enum_6: string[];
            export { _enum_6 as enum };
        }
        export { status_3 as status };
        export namespace objective_achieved {
            let type_48: string;
            export { type_48 as type };
            let required_48: boolean;
            export { required_48 as required };
        }
        export namespace checks_passed {
            let type_49: string;
            export { type_49 as type };
            let required_49: boolean;
            export { required_49 as required };
        }
        export namespace checks_failed {
            let type_50: string;
            export { type_50 as type };
            let required_50: boolean;
            export { required_50 as required };
        }
        export namespace tenant_id_4 {
            let type_51: string;
            export { type_51 as type };
            let required_51: boolean;
            export { required_51 as required };
        }
        export { tenant_id_4 as tenant_id };
        export namespace verified_at {
            let type_52: string;
            export { type_52 as type };
            let required_52: boolean;
            export { required_52 as required };
        }
    }
    export { schema_4 as schema };
}
export namespace LedgerQueryContract_v1 {
    let version_5: string;
    export { version_5 as version };
    export namespace schema_5 {
        export namespace tenant_id_5 {
            let type_53: string;
            export { type_53 as type };
            let required_53: boolean;
            export { required_53 as required };
        }
        export { tenant_id_5 as tenant_id };
        export namespace execution_id_2 {
            let type_54: string;
            export { type_54 as type };
            let required_54: boolean;
            export { required_54 as required };
        }
        export { execution_id_2 as execution_id };
        export namespace plan_id_4 {
            let type_55: string;
            export { type_55 as type };
            let required_55: boolean;
            export { required_55 as required };
        }
        export { plan_id_4 as plan_id };
        export namespace status_4 {
            let type_56: string;
            export { type_56 as type };
            let required_56: boolean;
            export { required_56 as required };
        }
        export { status_4 as status };
        export namespace risk_tier_2 {
            let type_57: string;
            export { type_57 as type };
            let required_57: boolean;
            export { required_57 as required };
        }
        export { risk_tier_2 as risk_tier };
        export namespace time_from {
            let type_58: string;
            export { type_58 as type };
            let required_58: boolean;
            export { required_58 as required };
        }
        export namespace time_to {
            let type_59: string;
            export { type_59 as type };
            let required_59: boolean;
            export { required_59 as required };
        }
        export namespace limit {
            let type_60: string;
            export { type_60 as type };
            let required_60: boolean;
            export { required_60 as required };
            let _default: number;
            export { _default as default };
            let max_1: number;
            export { max_1 as max };
        }
        export namespace offset {
            let type_61: string;
            export { type_61 as type };
            let required_61: boolean;
            export { required_61 as required };
            let _default_1: number;
            export { _default_1 as default };
        }
    }
    export { schema_5 as schema };
}
export namespace NodeContract_v1 {
    let version_6: string;
    export { version_6 as version };
    export namespace schema_6 {
        export namespace node_id {
            let type_62: string;
            export { type_62 as type };
            let required_62: boolean;
            export { required_62 as required };
        }
        export namespace node_type {
            let type_63: string;
            export { type_63 as type };
            let required_63: boolean;
            export { required_63 as required };
            let _enum_7: string[];
            export { _enum_7 as enum };
        }
        export namespace capabilities {
            let type_64: string;
            export { type_64 as type };
            let required_64: boolean;
            export { required_64 as required };
        }
        export namespace status_5 {
            let type_65: string;
            export { type_65 as type };
            let required_65: boolean;
            export { required_65 as required };
            let _enum_8: string[];
            export { _enum_8 as enum };
        }
        export { status_5 as status };
        export namespace health_score {
            let type_66: string;
            export { type_66 as type };
            let required_66: boolean;
            export { required_66 as required };
            let min_1: number;
            export { min_1 as min };
            let max_2: number;
            export { max_2 as max };
        }
        export namespace tenant_id_6 {
            let type_67: string;
            export { type_67 as type };
            let required_67: boolean;
            export { required_67 as required };
        }
        export { tenant_id_6 as tenant_id };
        export namespace registered_at {
            let type_68: string;
            export { type_68 as type };
            let required_68: boolean;
            export { required_68 as required };
        }
        export namespace last_heartbeat {
            let type_69: string;
            export { type_69 as type };
            let required_69: boolean;
            export { required_69 as required };
        }
    }
    export { schema_6 as schema };
}
/**
 * Backward Compatibility Rules
 */
export const COMPATIBILITY_RULES: {
    '1.0.0': {
        breaking_changes: any[];
        deprecated_fields: any[];
        field_mappings: {};
    };
};
export namespace DEPRECATION_POLICY {
    let min_notice_days: number;
    let sunset_grace_period_days: number;
    let supported_versions: string[];
    let deprecated_versions: any[];
}
/**
 * Contract Validator
 */
export class ContractValidator {
    static validate(data: any, contract: any): {
        valid: boolean;
        errors: string[];
    };
    static validateIntent(intent: any): {
        valid: boolean;
        errors: string[];
    };
    static validatePlan(plan: any): {
        valid: boolean;
        errors: string[];
    };
    static validateApproval(approval: any): {
        valid: boolean;
        errors: string[];
    };
    static validateExecution(execution: any): {
        valid: boolean;
        errors: string[];
    };
    static validateVerification(verification: any): {
        valid: boolean;
        errors: string[];
    };
    static validateLedgerQuery(query: any): {
        valid: boolean;
        errors: string[];
    };
    static validateNode(node: any): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Version Compatibility Checker
 */
export class VersionCompatibilityChecker {
    static isSupported(version: any): boolean;
    static isDeprecated(version: any): boolean;
    static getSunsetDate(version: any): any;
    static getBreakingChanges(fromVersion: any, toVersion: any): any;
}
//# sourceMappingURL=api-contracts.d.ts.map