/**
 * Intent Classifier
 * Phase 7.6 - Intent Interpretation Layer
 *
 * Natural language → normalized execution candidate
 *
 * Design:
 * - Rule-based classification (Stage 1)
 * - Strict governance constraints
 * - Safe defaults for ambiguity
 * - No freeform LLM action invention
 * - Central entity normalization table
 */
const { EntityNormalizationTable } = require('./entity-normalization-table.js');
class IntentClassifier {
    constructor() {
        this.intentPatterns = this._buildIntentPatterns();
        this.entityPatterns = this._buildEntityPatterns();
        this.normalizationRules = this._buildNormalizationRules();
        this.entityTable = new EntityNormalizationTable();
    }
    /**
     * Classify user input into intent + entities + normalized action
     *
     * @param {string} input - User input
     * @returns {Object} Classification result
     */
    classify(input) {
        const lower = input.toLowerCase().trim();
        // 1. Classify intent type
        const intentType = this._classifyIntentType(lower);
        // 2. Extract entities
        const entities = this._extractEntities(lower);
        // 3. Normalize to canonical action
        const normalizedAction = this._normalizeToAction(lower, intentType, entities);
        // 4. Determine governance tier
        const governanceTier = this._determineGovernanceTier(normalizedAction);
        // 5. Ambiguity check
        const ambiguity = this._checkAmbiguity(lower, intentType, entities, normalizedAction);
        return {
            raw_input: input,
            intent_type: intentType,
            entities,
            normalized_action: normalizedAction,
            governance_tier: governanceTier,
            ambiguity,
            confidence: this._calculateConfidence(intentType, entities, normalizedAction, ambiguity)
        };
    }
    /**
     * Classify intent type
     */
    _classifyIntentType(input) {
        // Check multi-step objectives first (highest priority)
        if (this.intentPatterns.multi_step_objective) {
            if (this.intentPatterns.multi_step_objective.some(pattern => pattern.test(input))) {
                return 'multi_step_objective';
            }
        }
        // Then check other intents
        for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
            if (intentType === 'multi_step_objective')
                continue; // Already checked
            if (patterns.some(pattern => pattern.test(input))) {
                return intentType;
            }
        }
        return 'unknown';
    }
    /**
     * Extract entities from input
     */
    _extractEntities(input) {
        const entities = {};
        for (const [entityType, patterns] of Object.entries(this.entityPatterns)) {
            for (const pattern of patterns) {
                const match = input.match(pattern);
                if (match) {
                    const rawValue = match[1] || match[0];
                    // Normalize using central entity table
                    entities[entityType] = this.entityTable.normalize(entityType, rawValue);
                    entities[`${entityType}_raw`] = rawValue; // Keep raw value for ambiguity detection
                    break;
                }
            }
        }
        return entities;
    }
    /**
     * Normalize input to canonical action
     */
    _normalizeToAction(input, intentType, entities) {
        // Check intent type first for special cases
        switch (intentType) {
            case 'multi_step_objective':
                return null; // Multi-step workflows not yet implemented (Stage 2)
            case 'side_effecting_action':
                // For side effects, require explicit normalization
                break;
            default:
                // Continue to normalization rules
                break;
        }
        // Check normalization rules
        for (const rule of this.normalizationRules) {
            const match = input.match(rule.pattern);
            if (match) {
                return {
                    action_id: this._resolveActionId(rule.action_id, match, entities),
                    action_type: rule.action_type,
                    target_endpoint: rule.target_endpoint,
                    arguments: this._buildArguments(rule, entities, match, input)
                };
            }
        }
        // Default based on intent type
        switch (intentType) {
            case 'informational_architecture':
                return {
                    action_id: 'show_status',
                    action_type: 'local_query',
                    target_endpoint: 'local',
                    arguments: {}
                };
            case 'read_only_query_local':
                return {
                    action_id: 'show_status',
                    action_type: 'local_query',
                    target_endpoint: 'local',
                    arguments: {}
                };
            case 'read_only_query_remote':
                return {
                    action_id: 'query_openclaw_agent',
                    action_type: 'remote_query',
                    target_endpoint: 'openclaw',
                    arguments: { query: input }
                };
            case 'side_effecting_action':
                return null; // Require explicit normalization for side-effecting actions
            case 'multi_step_objective':
                return null; // Multi-step workflows not yet implemented (Stage 2)
            default:
                return null;
        }
    }
    /**
     * Resolve action ID from template
     */
    _resolveActionId(template, match, entities) {
        // Handle $1 style capture group references
        if (template.includes('$')) {
            return template.replace(/\$(\d+)/g, (_, n) => {
                const index = parseInt(n);
                if (match[index]) {
                    return match[index];
                }
                return '';
            });
        }
        return template;
    }
    /**
     * Build arguments from entities and captures
     */
    _buildArguments(rule, entities, match, rawInput) {
        const args = {};
        if (rule.arguments) {
            for (const [key, value] of Object.entries(rule.arguments)) {
                if (typeof value === 'string') {
                    // String may contain $N references
                    let resolved = value;
                    // Replace $entity references
                    resolved = resolved.replace(/\$([a-z_]+)/gi, (_, entityKey) => {
                        if (entityKey === 'raw_input') {
                            return rawInput;
                        }
                        return entities[entityKey] || '';
                    });
                    // Replace $N capture group references
                    resolved = resolved.replace(/\$(\d+)/g, (_, n) => {
                        const index = parseInt(n);
                        return match[index] || '';
                    });
                    args[key] = resolved;
                }
                else {
                    args[key] = value;
                }
            }
        }
        return args;
    }
    /**
     * Determine governance tier
     */
    _determineGovernanceTier(normalizedAction) {
        if (!normalizedAction) {
            return 'unknown';
        }
        const { action_id, action_type } = normalizedAction;
        // T0 actions
        const t0Actions = [
            'show_status',
            'show_services',
            'show_providers',
            'show_incidents',
            'show_objectives',
            'show_endpoints',
            'query_openclaw_agent'
        ];
        if (t0Actions.includes(action_id) || action_type === 'local_query' || action_type === 'remote_query') {
            return 'T0';
        }
        // T1 actions
        const t1Actions = [
            'restart_service',
            'run_recovery_workflow'
        ];
        if (t1Actions.includes(action_id)) {
            return 'T1';
        }
        return 'unknown';
    }
    /**
     * Check for ambiguity
     */
    _checkAmbiguity(input, intentType, entities, normalizedAction) {
        const issues = [];
        // Unknown intent
        if (intentType === 'unknown') {
            issues.push({
                type: 'unknown_intent',
                message: 'Could not classify request intent'
            });
        }
        // Missing required entities
        if (normalizedAction && normalizedAction.action_id === 'restart_service' && !entities.service) {
            issues.push({
                type: 'missing_entity',
                entity: 'service',
                message: 'Service name required for restart action'
            });
        }
        // Ambiguous service reference
        if (entities.service && this._isAmbiguousServiceName(entities.service)) {
            issues.push({
                type: 'ambiguous_entity',
                entity: 'service',
                value: entities.service,
                message: `Service name "${entities.service}" is ambiguous`
            });
        }
        // No normalized action
        if (!normalizedAction && intentType !== 'unknown') {
            issues.push({
                type: 'normalization_failed',
                message: 'Could not normalize request to executable action'
            });
        }
        return {
            is_ambiguous: issues.length > 0,
            issues,
            resolution: this._suggestResolution(issues)
        };
    }
    /**
     * Check if service name is ambiguous
     */
    _isAmbiguousServiceName(serviceName) {
        return this.entityTable.isAmbiguous('service', serviceName);
    }
    /**
     * Suggest resolution for ambiguity
     */
    _suggestResolution(issues) {
        if (issues.length === 0) {
            return null;
        }
        const suggestions = [];
        for (const issue of issues) {
            switch (issue.type) {
                case 'unknown_intent':
                    suggestions.push('Try a more specific request, like "show status" or "ask openclaw what time it is"');
                    break;
                case 'missing_entity':
                    suggestions.push(`Specify the ${issue.entity}, e.g., "restart openclaw-gateway"`);
                    break;
                case 'ambiguous_entity':
                    if (issue.entity === 'service' && issue.value) {
                        const serviceSuggestions = this.entityTable.getSuggestions('service', issue.value);
                        if (serviceSuggestions.length > 0) {
                            suggestions.push(`Did you mean ${serviceSuggestions.map(s => `"${s}"`).join(' or ')}?`);
                        }
                    }
                    else {
                        suggestions.push(`Entity "${issue.entity}" is ambiguous`);
                    }
                    break;
                case 'normalization_failed':
                    suggestions.push('Request not recognized. Try "show status", "ask openclaw [question]", or "restart [service]"');
                    break;
            }
        }
        return suggestions.length > 0 ? suggestions.join(' ') : null;
    }
    /**
     * Calculate confidence score
     */
    _calculateConfidence(intentType, entities, normalizedAction, ambiguity) {
        let confidence = 1.0;
        // Penalize unknown intent
        if (intentType === 'unknown') {
            confidence -= 0.5;
        }
        // Penalize missing normalization
        if (!normalizedAction) {
            confidence -= 0.3;
        }
        // Penalize ambiguity
        if (ambiguity.is_ambiguous) {
            confidence -= 0.2 * ambiguity.issues.length;
        }
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    /**
     * Build intent patterns
     */
    _buildIntentPatterns() {
        return {
            // Informational - architecture/state explanation
            informational: [
                /^what (is|are) (the )?(current )?(phase|status|state)/i,
                /^(explain|describe|tell me about) (the )?(system|architecture|vienna)/i,
                /^how (does|do) (the )?(system|vienna) work/i,
                /^what('s| is) (wrong|happening)/i
            ],
            // Read-only query - local
            read_only_query_local: [
                /^(show|list|display) (status|services|providers|incidents|objectives|endpoints)/i,
                /^what (services|providers|incidents|objectives) (are|do we have)/i,
                /^(get|fetch) (the )?(status|services|providers)/i
            ],
            // Read-only query - remote
            read_only_query_remote: [
                /^ask openclaw /i,
                /^query openclaw /i,
                /^check (with )?openclaw /i,
                /^(is|check|verify) .*(gateway|openclaw).*(healthy|up|running|ok)/i,
                /^(what'?s? |is )?(the )?(gateway|openclaw) (status|health)/i,
                /^(show|what) (recent|latest) (instructions|activity)/i,
                /^what (changed|happened)/i
            ],
            // Side-effecting action
            side_effecting: [
                /^restart /i,
                /^stop /i,
                /^start /i,
                /^run /i,
                /^execute /i
            ],
            // Multi-step objective (future)
            multi_step_objective: [
                /^if .* then /i,
                /^when .* do /i,
                / unless /i,
                / if /i,
                / when /i
            ]
        };
    }
    /**
     * Build entity patterns
     */
    _buildEntityPatterns() {
        return {
            service: [
                /restart\s+(openclaw-gateway|openclaw-node|openclaw-api)/i,
                /restart\s+the\s+(openclaw-gateway|openclaw-node|openclaw-api)/i,
                /restart\s+(openclaw\s+gateway|openclaw\s+node|openclaw\s+api)/i,
                /restart\s+the\s+(gateway|node|api)/i,
                /restart\s+([a-z0-9-]+)/i,
                /the\s+(openclaw-gateway|openclaw-node|openclaw-api)/i,
                /the\s+(gateway|node|api)\b/i
            ],
            endpoint: [
                /ask\s+(openclaw|local|vienna)/i,
                /query\s+(openclaw|local|vienna)/i
            ],
            timeframe: [
                /in the (last|past) (hour|day|week)/i,
                /(recent|recently|latest)/i,
                /since (\d+) (minutes?|hours?|days?) ago/i
            ],
            operation: [
                /^(restart|stop|start|run|execute|check|show|list|query)/i
            ]
        };
    }
    /**
     * Build normalization rules
     */
    _buildNormalizationRules() {
        return [
            // Health checks
            {
                pattern: /^(is|check|verify) .*(gateway|openclaw).*(healthy|up|running|ok)/i,
                action_id: 'query_openclaw_agent',
                action_type: 'remote_query',
                target_endpoint: 'openclaw',
                arguments: { query: '$raw_input' }
            },
            {
                pattern: /^(what'?s? |is )?(the )?(gateway|openclaw) (status|health)/i,
                action_id: 'query_openclaw_agent',
                action_type: 'remote_query',
                target_endpoint: 'openclaw',
                arguments: { query: 'is the gateway healthy' }
            },
            // Service restarts
            {
                pattern: /^restart (the )?(openclaw[- ])?(gateway|node|api)\b/i,
                action_id: 'restart_service',
                action_type: 'side_effect',
                target_endpoint: 'local',
                arguments: { service_name: 'openclaw-$3' }
            },
            {
                pattern: /^restart (openclaw-gateway|openclaw-node|openclaw-api)/i,
                action_id: 'restart_service',
                action_type: 'side_effect',
                target_endpoint: 'local',
                arguments: { service_name: '$1' }
            },
            {
                pattern: /^restart\s+(.+)$/i,
                action_id: 'restart_service',
                action_type: 'side_effect',
                target_endpoint: 'local',
                arguments: { service_name: '$1' }
            },
            // Status queries
            {
                pattern: /^(show|display|get) (me )?(the )?(system )?status/i,
                action_id: 'show_status',
                action_type: 'local_query',
                target_endpoint: 'local',
                arguments: {}
            },
            {
                pattern: /^(show|list) (all )?(the )?services/i,
                action_id: 'show_services',
                action_type: 'local_query',
                target_endpoint: 'local',
                arguments: {}
            },
            {
                pattern: /^(show|list) (all )?(the )?providers/i,
                action_id: 'show_providers',
                action_type: 'local_query',
                target_endpoint: 'local',
                arguments: {}
            },
            // Recent activity
            {
                pattern: /^(show|what) (recent|latest) (instructions|activity|changes)/i,
                action_id: 'query_openclaw_agent',
                action_type: 'remote_query',
                target_endpoint: 'openclaw',
                arguments: { query: 'what instructions were processed recently' }
            },
            // Time queries
            {
                pattern: /^(what|tell me) (the )?(current )?(time|date|year)/i,
                action_id: 'query_openclaw_agent',
                action_type: 'remote_query',
                target_endpoint: 'openclaw',
                arguments: { query: '$raw_input' }
            },
            // Generic "ask openclaw" passthrough
            {
                pattern: /^ask openclaw (.+)/i,
                action_id: 'query_openclaw_agent',
                action_type: 'remote_query',
                target_endpoint: 'openclaw',
                arguments: { query: '$1' }
            }
        ];
    }
}
module.exports = { IntentClassifier };
//# sourceMappingURL=intent-classifier.js.map