/**
 * Plan Generator
 *
 * Converts IntentObject → Plan
 * Expands single actions into bounded workflows with verification steps.
 *
 * Architecture:
 *   IntentObject → Plan Generator → Plan → Vienna Core → Warrant → Execution
 */
const { createPlan, createSimplePlan } = require('./plan-schema');
const { buildVerificationSpec, getRecommendedTemplate } = require('./verification-templates');
/**
 * Action Registry
 * Maps canonical actions to plan templates
 */
const ACTION_TEMPLATES = {
    // T0 Read-Only Local Actions
    show_status: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains status fields']
    },
    show_services: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains service list']
    },
    show_providers: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains provider list']
    },
    show_incidents: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains incident list']
    },
    show_objectives: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains objective list']
    },
    show_endpoints: {
        executor: 'local',
        risk_tier: 'T0',
        timeout_ms: 5000,
        verification: ['result contains endpoint list']
    },
    // T0 Remote Query Actions
    query_openclaw_agent: {
        executor: 'openclaw',
        risk_tier: 'T0',
        timeout_ms: 10000,
        verification: ['answer provided', 'confidence >= 0.5']
    },
    query_status: {
        executor: 'openclaw',
        risk_tier: 'T0',
        timeout_ms: 10000,
        verification: ['status returned']
    },
    inspect_gateway: {
        executor: 'openclaw',
        risk_tier: 'T0',
        timeout_ms: 10000,
        verification: ['gateway info returned']
    },
    check_health: {
        executor: 'openclaw',
        risk_tier: 'T0',
        timeout_ms: 10000,
        verification: ['health status returned']
    },
    collect_logs: {
        executor: 'openclaw',
        risk_tier: 'T0',
        timeout_ms: 15000,
        verification: ['logs collected']
    },
    // T1 Side-Effect Actions
    restart_service: {
        executor: 'local',
        risk_tier: 'T1',
        timeout_ms: 30000,
        verification: ['service restarted', 'service healthy'],
        preconditions: ['service exists'],
        postconditions: ['service status is active']
    },
    run_recovery_workflow: {
        executor: 'local',
        risk_tier: 'T1',
        timeout_ms: 60000,
        verification: ['workflow completed'],
        preconditions: ['workflow exists'],
        postconditions: ['system healthy']
    },
    run_workflow: {
        executor: 'openclaw',
        risk_tier: 'T1',
        timeout_ms: 60000,
        verification: ['workflow completed'],
        preconditions: ['workflow exists']
    },
    recovery_action: {
        executor: 'openclaw',
        risk_tier: 'T1',
        timeout_ms: 30000,
        verification: ['recovery completed'],
        preconditions: ['recovery needed']
    }
};
/**
 * Generate plan from IntentObject
 *
 * @param {Object} intentObject - Parsed intent from classifier
 * @returns {Object} Plan object
 */
function generatePlan(intentObject) {
    const { intent_type, normalized_action, entities, confidence, governance_tier } = intentObject;
    // Handle unknown/informational intents
    if (intent_type === 'unknown' || !normalized_action) {
        return null; // No executable plan
    }
    // Handle informational intents (no execution)
    if (intent_type === 'informational') {
        return null; // Should return info directly, not execute
    }
    // Extract action_id from normalized_action (Phase 7.6 structure)
    const actionId = typeof normalized_action === 'object'
        ? normalized_action.action_id
        : normalized_action;
    // Get action template
    const template = ACTION_TEMPLATES[actionId];
    if (!template) {
        throw new Error(`No plan template for action: ${actionId}`);
    }
    // Build action arguments from entities and normalized_action
    const actionArgs = typeof normalized_action === 'object' && normalized_action.arguments
        ? normalized_action.arguments
        : {};
    const args = { ...buildActionArgs(actionId, entities), ...actionArgs };
    // Generate human-readable objective
    const objective = generateObjective(actionId, entities, intentObject.metadata || {});
    // Use governance_tier from intent if available, otherwise use template risk_tier
    const riskTier = governance_tier || template.risk_tier;
    // Build verification spec (Phase 8.2)
    const verificationTemplateName = getRecommendedTemplate(actionId);
    let verificationSpec = null;
    if (verificationTemplateName) {
        try {
            // Build context for verification template expansion
            const verificationContext = buildVerificationContext(actionId, args, entities);
            verificationSpec = buildVerificationSpec(verificationTemplateName, verificationContext);
        }
        catch (error) {
            // If verification spec building fails, continue without verification
            console.warn(`Failed to build verification spec for ${actionId}:`, error.message);
        }
    }
    // For now, all plans are simple single-step plans
    // Multi-step plan generation will be added in Phase 8.4
    const plan = createSimplePlan({
        action: actionId,
        description: objective,
        args,
        executor: template.executor,
        risk_tier: riskTier,
        objective,
        verification_spec: verificationSpec
    });
    // Add verification steps from template
    if (template.verification) {
        plan.steps[0].verification = template.verification;
    }
    // Add preconditions from template
    if (template.preconditions) {
        plan.preconditions = template.preconditions.map(pc => expandPrecondition(pc, entities));
    }
    // Add postconditions from template
    if (template.postconditions) {
        plan.postconditions = template.postconditions.map(pc => expandPostcondition(pc, entities));
    }
    // Override timeout if specified in template
    if (template.timeout_ms) {
        plan.steps[0].timeout_ms = template.timeout_ms;
        plan.estimated_duration_ms = template.timeout_ms;
    }
    // Store intent metadata
    plan.metadata.intent = intentObject;
    plan.metadata.confidence = confidence;
    return plan;
}
/**
 * Build action arguments from entities
 */
function buildActionArgs(action, entities) {
    const args = {};
    // Map entities to action-specific arguments
    switch (action) {
        case 'restart_service':
            if (entities.service) {
                args.service_name = entities.service;
            }
            break;
        case 'query_openclaw_agent':
            if (entities.query) {
                args.query = entities.query;
            }
            break;
        case 'run_workflow':
        case 'run_recovery_workflow':
            if (entities.workflow) {
                args.workflow_id = entities.workflow;
            }
            break;
        case 'collect_logs':
            if (entities.timeframe) {
                args.timeframe = entities.timeframe;
            }
            if (entities.service) {
                args.service = entities.service;
            }
            break;
        default:
            // Pass through any additional entities
            Object.assign(args, entities);
    }
    return args;
}
/**
 * Generate human-readable objective
 */
function generateObjective(action, entities, metadata) {
    const templates = {
        show_status: 'Show Vienna OS system status',
        show_services: 'Show registered services',
        show_providers: 'Show LLM providers',
        show_incidents: 'Show incident history',
        show_objectives: 'Show active objectives',
        show_endpoints: 'Show execution endpoints',
        query_openclaw_agent: `Query OpenClaw agent: "${entities.query || 'unknown'}"`,
        query_status: 'Query OpenClaw runtime status',
        inspect_gateway: 'Inspect OpenClaw gateway',
        check_health: 'Check OpenClaw health',
        collect_logs: `Collect logs${entities.timeframe ? ` (${entities.timeframe})` : ''}`,
        restart_service: `Restart service: ${entities.service || 'unknown'}`,
        run_recovery_workflow: `Run recovery workflow: ${entities.workflow || 'unknown'}`,
        run_workflow: `Run workflow: ${entities.workflow || 'unknown'}`,
        recovery_action: 'Execute recovery action'
    };
    return templates[action] || `Execute action: ${action}`;
}
/**
 * Expand precondition template with entities
 */
function expandPrecondition(template, entities) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return entities[key] || match;
    });
}
/**
 * Expand postcondition template with entities
 */
function expandPostcondition(template, entities) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return entities[key] || match;
    });
}
/**
 * Build verification context for template expansion
 */
function buildVerificationContext(action, args, entities) {
    const context = {};
    switch (action) {
        case 'restart_service':
            context.service = args.service_name || entities.service || 'openclaw-gateway';
            // Map service to port (could be enhanced with service registry lookup)
            const servicePortMap = {
                'openclaw-gateway': 18789,
                'vienna-backend': 3100,
                'vienna-frontend': 5174,
                'ollama': 11434
            };
            context.port = servicePortMap[context.service];
            if (context.port) {
                context.health_url = `http://127.0.0.1:${context.port}/health`;
            }
            break;
        case 'check_health':
        case 'inspect_gateway':
            context.health_url = args.url || 'http://127.0.0.1:18789/health';
            break;
        case 'query_status':
        case 'query_openclaw_agent':
            // Query actions use procedural verification
            break;
        default:
            // Pass through any entities
            Object.assign(context, entities);
    }
    return context;
}
module.exports = {
    generatePlan,
    ACTION_TEMPLATES
};
//# sourceMappingURL=plan-generator.js.map