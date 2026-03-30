/**
 * Simulation Service — Vienna OS
 *
 * Generates realistic governance traffic for demo/dev environments.
 * Makes dashboards feel alive from the moment an operator logs in.
 *
 * - 8 agent behavior profiles with distinct patterns
 * - Respects actual policy_rules from the DB
 * - Generates activity, evaluations, alerts, trust drift
 * - 24h backfill seed for first-load experience
 * - SSE integration for real-time dashboard updates
 */
import { query, queryOne, execute } from '../db/postgres.js';
import { eventStream } from '../sse/eventStream.js';
// ============================================================================
// Agent Behavior Profiles
// ============================================================================
const AGENT_PROFILES = [
    {
        agentId: 'billing-bot',
        description: 'Financial transactions and invoicing',
        actionsPerDay: [30, 50],
        actionTypes: [
            { type: 'financial_transaction', riskTier: 'T1', weight: 0.5 },
            { type: 'send_email', riskTier: 'T0', weight: 0.3 },
            { type: 'data_export', riskTier: 'T1', weight: 0.2 },
        ],
    },
    {
        agentId: 'deploy-agent',
        description: 'CI/CD pipeline automation',
        actionsPerDay: [10, 20],
        burstPattern: true,
        actionTypes: [
            { type: 'deploy', riskTier: 'T1', weight: 0.4 },
            { type: 'config_change', riskTier: 'T1', weight: 0.35 },
            { type: 'database_migration', riskTier: 'T2', weight: 0.25 },
        ],
    },
    {
        agentId: 'customer-support-ai',
        description: 'Customer ticket triage and response',
        actionsPerDay: [80, 120],
        actionTypes: [
            { type: 'send_email', riskTier: 'T0', weight: 0.45 },
            { type: 'api_call', riskTier: 'T1', weight: 0.35 },
            { type: 'file_access', riskTier: 'T0', weight: 0.2 },
        ],
    },
    {
        agentId: 'data-analyst',
        description: 'Report generation and data pipelines',
        actionsPerDay: [5, 15],
        actionTypes: [
            { type: 'data_export', riskTier: 'T1', weight: 0.6 },
            { type: 'api_call', riskTier: 'T1', weight: 0.4 },
        ],
    },
    {
        agentId: 'security-scanner',
        description: 'Security scanning and vulnerability assessment',
        actionsPerDay: [20, 30],
        burstPattern: true,
        actionTypes: [
            { type: 'api_call', riskTier: 'T1', weight: 0.6 },
            { type: 'config_change', riskTier: 'T1', weight: 0.4 },
        ],
    },
    {
        agentId: 'content-moderator',
        description: 'AI-powered content moderation',
        actionsPerDay: [100, 140],
        actionTypes: [
            { type: 'api_call', riskTier: 'T0', weight: 0.6 },
            { type: 'user_notification', riskTier: 'T0', weight: 0.4 },
        ],
    },
    {
        agentId: 'inventory-manager',
        description: 'Warehouse inventory tracking',
        actionsPerDay: [0, 0],
        suspended: true,
        actionTypes: [
            { type: 'api_call', riskTier: 'T1', weight: 0.5 },
            { type: 'data_export', riskTier: 'T1', weight: 0.5 },
        ],
    },
    {
        agentId: 'compliance-checker',
        description: 'Regulatory compliance monitoring',
        actionsPerDay: [10, 20],
        actionTypes: [
            { type: 'data_export', riskTier: 'T1', weight: 0.5 },
            { type: 'send_email', riskTier: 'T0', weight: 0.5 },
        ],
    },
];
// ============================================================================
// Demo Policy Rules (seeded if none exist)
// ============================================================================
const DEMO_POLICY_RULES = [
    {
        name: 'High-Value Transaction Gate',
        description: 'Financial transactions over $10,000 require T2 multi-party approval',
        conditions: [
            { field: 'action_type', operator: 'equals', value: 'financial_transaction' },
            { field: 'amount', operator: 'greater_than', value: 10000 },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T2',
        priority: 200,
    },
    {
        name: 'Production Deploy Gate',
        description: 'Production deployments require single-operator approval',
        conditions: [
            { field: 'action_type', operator: 'equals', value: 'deploy' },
            { field: 'environment', operator: 'equals', value: 'production' },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        priority: 190,
    },
    {
        name: 'After-Hours Escalation',
        description: 'Actions between 18:00-06:00 UTC escalate to T1 approval',
        conditions: [
            { field: 'time_of_day', operator: 'between', value: [18, 6] },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        priority: 50,
    },
    {
        name: 'Data Export Audit',
        description: 'All data exports are flagged for review',
        conditions: [
            { field: 'action_type', operator: 'equals', value: 'data_export' },
        ],
        action_on_match: 'flag_for_review',
        approval_tier: null,
        priority: 100,
    },
    {
        name: 'New Agent Probation',
        description: 'Agents with trust score below 50 require approval for all actions',
        conditions: [
            { field: 'trust_score', operator: 'less_than', value: 50 },
        ],
        action_on_match: 'require_approval',
        approval_tier: 'T1',
        priority: 180,
    },
    {
        name: 'Rate Limit Guard',
        description: 'Rate limit agents exceeding 100 actions per hour',
        conditions: [
            { field: 'rate', operator: 'greater_than', value: 100 },
        ],
        action_on_match: 'rate_limit',
        approval_tier: null,
        priority: 170,
    },
    {
        name: 'Bulk Operations Block',
        description: 'Block any bulk or mass operations by default',
        conditions: [
            { field: 'action_type', operator: 'contains', value: 'bulk' },
        ],
        action_on_match: 'deny',
        approval_tier: null,
        priority: 250,
    },
];
// ============================================================================
// Alert Templates
// ============================================================================
const ALERT_TEMPLATES = [
    {
        type: 'policy_violation',
        severity: 'warning',
        messageTemplate: (agentId, actionType) => `Agent ${agentId} attempted ${actionType} action outside permitted scope`,
    },
    {
        type: 'rate_limit',
        severity: 'warning',
        messageTemplate: (agentId, _actionType) => `Agent ${agentId} approaching rate limit threshold (${80 + Math.floor(Math.random() * 18)}% of hourly limit)`,
    },
    {
        type: 'anomaly',
        severity: 'info',
        messageTemplate: (agentId, _actionType) => `Unusual activity pattern detected for ${agentId}: volume ${(2 + Math.random() * 3).toFixed(1)}x above baseline`,
    },
    {
        type: 'trust_decay',
        severity: 'critical',
        messageTemplate: (agentId, _actionType) => `Trust score for ${agentId} declining due to elevated error rate`,
    },
];
// ============================================================================
// Utility Functions
// ============================================================================
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
}
function weightedRandom(items) {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let r = Math.random() * total;
    for (const { item, weight } of items) {
        r -= weight;
        if (r <= 0)
            return item;
    }
    return items[items.length - 1].item;
}
/** Business hours multiplier (UTC). Peak at 14:00 and 18:00 UTC (10AM/2PM ET) */
function businessHoursMultiplier(hour) {
    // Model: low at night (0-6 UTC), ramp up, peak at 14-18 UTC, wind down
    const curve = {
        0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.08, 5: 0.12,
        6: 0.2, 7: 0.3, 8: 0.5, 9: 0.7, 10: 0.85, 11: 0.9,
        12: 0.95, 13: 1.0, 14: 1.0, 15: 0.95, 16: 0.9, 17: 0.85,
        18: 0.75, 19: 0.6, 20: 0.45, 21: 0.3, 22: 0.2, 23: 0.15,
    };
    return curve[hour] ?? 0.5;
}
function generateLatency(riskTier) {
    switch (riskTier) {
        case 'T0': return randomInt(10, 50);
        case 'T1': return randomInt(100, 500);
        case 'T2': return randomInt(500, 2000);
        default: return randomInt(50, 200);
    }
}
function generateActionContext(actionType, riskTier) {
    const ctx = { source: 'simulation' };
    switch (actionType) {
        case 'financial_transaction': {
            // 10% chance of high-value (>$10K) to trigger T2 policy
            const highValue = Math.random() < 0.1;
            ctx.amount = highValue ? randomInt(10001, 75000) : randomInt(50, 9999);
            ctx.currency = 'USD';
            ctx.recipient = `vendor-${randomInt(100, 999)}`;
            if (highValue)
                ctx.risk_tier_override = 'T2';
            break;
        }
        case 'deploy': {
            const envs = ['production', 'staging', 'development'];
            ctx.environment = envs[Math.random() < 0.3 ? 0 : randomInt(1, 2)];
            ctx.version = `v${randomInt(1, 5)}.${randomInt(0, 20)}.${randomInt(0, 99)}`;
            ctx.service = ['api', 'web', 'worker', 'scheduler'][randomInt(0, 3)];
            break;
        }
        case 'data_export': {
            ctx.format = ['csv', 'json', 'parquet'][randomInt(0, 2)];
            ctx.row_count = randomInt(100, 500000);
            ctx.destination = ['s3', 'gcs', 'local'][randomInt(0, 2)];
            break;
        }
        case 'api_call': {
            ctx.endpoint = [`/api/v${randomInt(1, 3)}/${['users', 'orders', 'analytics', 'reports'][randomInt(0, 3)]}`];
            ctx.method = ['GET', 'POST', 'PUT'][randomInt(0, 2)];
            break;
        }
        case 'config_change': {
            ctx.key = ['feature_flags.beta', 'rate_limits.default', 'cache.ttl', 'logging.level'][randomInt(0, 3)];
            ctx.old_value = `${randomInt(1, 100)}`;
            ctx.new_value = `${randomInt(1, 100)}`;
            break;
        }
        case 'send_email': {
            ctx.to = `user-${randomInt(1000, 9999)}@example.com`;
            ctx.template = ['invoice', 'notification', 'alert', 'summary'][randomInt(0, 3)];
            break;
        }
        case 'database_migration': {
            ctx.migration_id = `m_${Date.now()}_${randomInt(100, 999)}`;
            ctx.direction = Math.random() < 0.9 ? 'up' : 'down';
            ctx.tables_affected = randomInt(1, 5);
            break;
        }
        case 'file_access': {
            ctx.path = `/data/${['reports', 'logs', 'exports', 'uploads'][randomInt(0, 3)]}/file_${randomInt(1, 999)}`;
            ctx.operation = Math.random() < 0.7 ? 'read' : 'write';
            break;
        }
        case 'user_notification': {
            ctx.channel = ['email', 'sms', 'push', 'in-app'][randomInt(0, 3)];
            ctx.priority = ['low', 'normal', 'high'][randomInt(0, 2)];
            break;
        }
    }
    return ctx;
}
// ============================================================================
// Simulation Service
// ============================================================================
class SimulationService {
    intervalId = null;
    stats = {
        running: false,
        startedAt: null,
        actionsGenerated: 0,
        alertsGenerated: 0,
        tickCount: 0,
        lastTickAt: null,
    };
    cachedPolicyRules = [];
    lastPolicyRefresh = 0;
    POLICY_REFRESH_INTERVAL = 60000; // Refresh rules every 60s
    TICK_INTERVAL = 30000; // 30 seconds
    // ---- Public API ----
    async start() {
        if (this.stats.running)
            return;
        console.log('[simulation] Starting simulation engine...');
        // Seed demo policy rules if none exist
        await this.seedPolicyRules();
        // Refresh policy cache
        await this.refreshPolicyRules();
        this.stats = {
            running: true,
            startedAt: new Date().toISOString(),
            actionsGenerated: 0,
            alertsGenerated: 0,
            tickCount: 0,
            lastTickAt: null,
        };
        this.intervalId = setInterval(() => this.tick(), this.TICK_INTERVAL);
        console.log('[simulation] Engine started — tick every 30s');
    }
    async stop() {
        if (!this.stats.running)
            return;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.stats.running = false;
        console.log('[simulation] Engine stopped');
    }
    getStatus() {
        return { ...this.stats };
    }
    async seed() {
        console.log('[simulation] Seeding 24h backfill data...');
        await this.seedPolicyRules();
        const now = Date.now();
        let totalActions = 0;
        let totalAlerts = 0;
        // Generate 24 hours of backfill
        for (let hoursAgo = 24; hoursAgo >= 0; hoursAgo--) {
            const hourTimestamp = now - hoursAgo * 3600000;
            const hour = new Date(hourTimestamp).getUTCHours();
            const multiplier = businessHoursMultiplier(hour);
            for (const profile of AGENT_PROFILES) {
                if (profile.suspended)
                    continue;
                // Actions per hour based on daily rate and business hours
                const dailyRate = randomBetween(profile.actionsPerDay[0], profile.actionsPerDay[1]);
                const hourlyRate = (dailyRate / 24) * multiplier;
                const actionsThisHour = Math.round(hourlyRate + randomBetween(-1, 1));
                for (let i = 0; i < actionsThisHour; i++) {
                    const minuteOffset = randomInt(0, 59);
                    const secondOffset = randomInt(0, 59);
                    const actionTimestamp = new Date(hourTimestamp + minuteOffset * 60000 + secondOffset * 1000);
                    const actionDef = weightedRandom(profile.actionTypes.map(a => ({ item: a, weight: a.weight })));
                    const context = generateActionContext(actionDef.type, actionDef.riskTier);
                    const riskTier = context.risk_tier_override || actionDef.riskTier;
                    const result = this.determineOutcome();
                    const latency = generateLatency(riskTier);
                    try {
                        await execute(`INSERT INTO agent_activity (agent_id, action_type, result, latency_ms, risk_tier, context, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`, [profile.agentId, actionDef.type, result, latency, riskTier, JSON.stringify(context), actionTimestamp.toISOString()]);
                        totalActions++;
                        // Track action type usage
                        await this.trackActionTypeUsage(actionDef.type, profile.agentId, result, actionTimestamp);
                        // 2% chance of alert for historical data
                        if (Math.random() < 0.02) {
                            const template = ALERT_TEMPLATES[randomInt(0, ALERT_TEMPLATES.length - 1)];
                            const resolved = Math.random() < 0.6; // 60% of historical alerts resolved
                            await execute(`INSERT INTO agent_alerts (agent_id, alert_type, severity, message, context, resolved, resolved_by, resolved_at, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                                profile.agentId,
                                template.type,
                                template.severity,
                                template.messageTemplate(profile.agentId, actionDef.type),
                                JSON.stringify({ action_type: actionDef.type, source: 'simulation_seed' }),
                                resolved,
                                resolved ? 'operator' : null,
                                resolved ? new Date(actionTimestamp.getTime() + randomInt(300, 7200) * 1000).toISOString() : null,
                                actionTimestamp.toISOString(),
                            ]);
                            totalAlerts++;
                        }
                    }
                    catch (err) {
                        // Skip individual insert errors (e.g., constraint violations)
                    }
                }
            }
        }
        // Update last_heartbeat for all active agents
        for (const profile of AGENT_PROFILES) {
            if (profile.suspended)
                continue;
            const minutesAgo = randomInt(0, 5);
            await execute(`UPDATE agent_registry SET last_heartbeat = NOW() - INTERVAL '${minutesAgo} minutes' WHERE agent_id = $1`, [profile.agentId]).catch(() => { });
        }
        console.log(`[simulation] Seed complete: ${totalActions} actions, ${totalAlerts} alerts`);
        return { actions: totalActions, alerts: totalAlerts };
    }
    async reset() {
        console.log('[simulation] Resetting all simulated data...');
        // Delete activity with simulation context
        await execute(`DELETE FROM agent_activity WHERE context->>'source' = 'simulation' OR context->>'source' = 'simulation_seed'`).catch(() => { });
        // Delete all activity for simulation agents (broader cleanup)
        const agentIds = AGENT_PROFILES.map(p => p.agentId);
        await execute(`DELETE FROM agent_activity WHERE agent_id = ANY($1)`, [agentIds]).catch(() => { });
        // Delete alerts for simulation agents
        await execute(`DELETE FROM agent_alerts WHERE context->>'source' IN ('simulation', 'simulation_seed')`, []).catch(() => { });
        await execute(`DELETE FROM agent_alerts WHERE agent_id = ANY($1)`, [agentIds]).catch(() => { });
        // Delete policy evaluations from simulation
        await execute(`DELETE FROM policy_evaluations WHERE context_snapshot->>'source' = 'simulation'`).catch(() => { });
        // Delete action type usage from simulation agents
        await execute(`DELETE FROM action_type_usage WHERE agent_id = ANY($1)`, [agentIds]).catch(() => { });
        // Reset trust scores to defaults
        const defaults = {
            'billing-bot': 78, 'deploy-agent': 85, 'customer-support-ai': 62,
            'data-analyst': 91, 'security-scanner': 95, 'content-moderator': 71,
            'inventory-manager': 45, 'compliance-checker': 88,
        };
        for (const [agentId, score] of Object.entries(defaults)) {
            await execute(`UPDATE agent_registry SET trust_score = $1, updated_at = NOW() WHERE agent_id = $2`, [score, agentId]).catch(() => { });
        }
        this.stats.actionsGenerated = 0;
        this.stats.alertsGenerated = 0;
        console.log('[simulation] Reset complete');
    }
    // ---- Internal ----
    async tick() {
        try {
            this.stats.tickCount++;
            this.stats.lastTickAt = new Date().toISOString();
            // Refresh policy rules periodically
            if (Date.now() - this.lastPolicyRefresh > this.POLICY_REFRESH_INTERVAL) {
                await this.refreshPolicyRules();
            }
            const now = new Date();
            const hour = now.getUTCHours();
            const multiplier = businessHoursMultiplier(hour);
            for (const profile of AGENT_PROFILES) {
                if (profile.suspended)
                    continue;
                // How many actions this tick? Scale from daily rate
                // 30s tick = 2880 ticks/day
                const dailyRate = randomBetween(profile.actionsPerDay[0], profile.actionsPerDay[1]);
                const tickRate = (dailyRate / 2880) * multiplier;
                // Burst pattern: occasionally generate more
                const burstMultiplier = profile.burstPattern && Math.random() < 0.1 ? randomBetween(2, 4) : 1;
                const actionsThisTick = Math.min(Math.round(tickRate * burstMultiplier + (Math.random() < tickRate % 1 ? 1 : 0)), 3 // Cap at 3 per tick per agent
                );
                for (let i = 0; i < actionsThisTick; i++) {
                    await this.generateAction(profile, now);
                }
                // Update heartbeat
                if (actionsThisTick > 0 || Math.random() < 0.3) {
                    await execute(`UPDATE agent_registry SET last_heartbeat = NOW() WHERE agent_id = $1`, [profile.agentId]).catch(() => { });
                }
            }
        }
        catch (err) {
            console.error('[simulation] Tick error:', err);
        }
    }
    async generateAction(profile, timestamp) {
        const actionDef = weightedRandom(profile.actionTypes.map(a => ({ item: a, weight: a.weight })));
        const context = generateActionContext(actionDef.type, actionDef.riskTier);
        context.source = 'simulation';
        const riskTier = context.risk_tier_override || actionDef.riskTier;
        // Evaluate against policy rules
        const policyResult = this.evaluateAgainstPolicies(profile.agentId, actionDef.type, context, riskTier);
        const result = policyResult.outcome;
        const latency = generateLatency(riskTier);
        // Insert activity
        try {
            await execute(`INSERT INTO agent_activity (agent_id, action_type, result, latency_ms, risk_tier, error_message, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                profile.agentId,
                actionDef.type,
                result,
                latency,
                riskTier,
                result === 'failed' ? 'Simulated execution failure' : null,
                JSON.stringify(context),
                timestamp.toISOString(),
            ]);
            this.stats.actionsGenerated++;
            // Track action type usage
            await this.trackActionTypeUsage(actionDef.type, profile.agentId, result, timestamp);
            // Insert policy evaluation
            if (policyResult.matchedRuleId) {
                await execute(`INSERT INTO policy_evaluations (rule_id, agent_id, action_type, result, action_taken, context_snapshot, evaluated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    policyResult.matchedRuleId,
                    profile.agentId,
                    actionDef.type,
                    result === 'denied' ? 'denied' : result === 'failed' ? 'failed' : 'matched',
                    policyResult.actionTaken || 'allow',
                    JSON.stringify({ ...context, source: 'simulation' }),
                    timestamp.toISOString(),
                ]).catch(() => { });
            }
            // Adjust trust score
            await this.adjustTrustScore(profile.agentId, result);
            // 2% chance of alert
            if (Math.random() < 0.02) {
                await this.generateAlert(profile.agentId, actionDef.type, timestamp);
            }
            // Broadcast SSE event for real-time updates
            this.broadcastEvent(profile.agentId, actionDef.type, result, riskTier, latency);
        }
        catch (err) {
            // Silently skip individual action errors
        }
    }
    evaluateAgainstPolicies(agentId, actionType, context, riskTier) {
        // Check cached policy rules
        for (const rule of this.cachedPolicyRules) {
            if (!rule.enabled)
                continue;
            const conditions = Array.isArray(rule.conditions)
                ? rule.conditions
                : (typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : []);
            let matched = true;
            for (const cond of conditions) {
                if (!this.evaluateCondition(cond, { agentId, actionType, ...context, risk_tier: riskTier })) {
                    matched = false;
                    break;
                }
            }
            if (matched && conditions.length > 0) {
                // Policy matched — determine outcome based on action
                switch (rule.action_on_match) {
                    case 'deny':
                        return { outcome: 'denied', matchedRuleId: rule.id, actionTaken: 'deny' };
                    case 'rate_limit':
                        return { outcome: Math.random() < 0.3 ? 'denied' : 'executed', matchedRuleId: rule.id, actionTaken: 'rate_limit' };
                    case 'require_approval':
                        // Simulate approval process: mostly approved, some denied
                        return {
                            outcome: Math.random() < 0.8 ? 'executed' : 'denied',
                            matchedRuleId: rule.id,
                            actionTaken: 'require_approval',
                        };
                    case 'flag_for_review':
                        return { outcome: 'executed', matchedRuleId: rule.id, actionTaken: 'flag_for_review' };
                    case 'escalate':
                        return { outcome: 'executed', matchedRuleId: rule.id, actionTaken: 'escalate' };
                    default:
                        return { outcome: 'executed', matchedRuleId: rule.id, actionTaken: rule.action_on_match };
                }
            }
        }
        // No policy matched — use default probabilities
        return { outcome: this.determineOutcome(), matchedRuleId: null, actionTaken: null };
    }
    evaluateCondition(condition, context) {
        const { field, operator, value } = condition;
        const actual = context[field];
        switch (operator) {
            case 'equals':
                return actual === value;
            case 'not_equals':
                return actual !== value;
            case 'greater_than':
                return typeof actual === 'number' && actual > value;
            case 'less_than':
                return typeof actual === 'number' && actual < value;
            case 'contains':
                return typeof actual === 'string' && actual.includes(value);
            case 'between':
                if (Array.isArray(value) && typeof actual === 'number') {
                    return actual >= value[0] && actual <= value[1];
                }
                return false;
            case 'in':
                return Array.isArray(value) && value.includes(actual);
            default:
                return false;
        }
    }
    determineOutcome() {
        const r = Math.random();
        if (r < 0.85)
            return 'executed';
        if (r < 0.95)
            return 'denied';
        return 'failed';
    }
    async adjustTrustScore(agentId, result) {
        let delta = 0;
        if (result === 'executed')
            delta = 1;
        else if (result === 'denied')
            delta = -2;
        else if (result === 'failed')
            delta = -5;
        if (delta === 0)
            return;
        // Clamp between 10 and 99
        await execute(`UPDATE agent_registry
       SET trust_score = GREATEST(10, LEAST(99, trust_score + $1)),
           updated_at = NOW()
       WHERE agent_id = $2`, [delta, agentId]).catch(() => { });
    }
    async generateAlert(agentId, actionType, timestamp) {
        const template = ALERT_TEMPLATES[randomInt(0, ALERT_TEMPLATES.length - 1)];
        try {
            await execute(`INSERT INTO agent_alerts (agent_id, alert_type, severity, message, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                agentId,
                template.type,
                template.severity,
                template.messageTemplate(agentId, actionType),
                JSON.stringify({ action_type: actionType, source: 'simulation' }),
                timestamp.toISOString(),
            ]);
            this.stats.alertsGenerated++;
            // Broadcast alert via SSE
            eventStream.publish({
                type: 'alert.created',
                timestamp: timestamp.toISOString(),
                payload: {
                    agent_id: agentId,
                    alert_type: template.type,
                    severity: template.severity,
                    message: template.messageTemplate(agentId, actionType),
                },
            });
        }
        catch (err) {
            // Skip
        }
    }
    async trackActionTypeUsage(actionType, agentId, status, timestamp) {
        try {
            const at = await queryOne(`SELECT id FROM action_types WHERE action_type = $1`, [actionType]);
            if (at) {
                await execute(`INSERT INTO action_type_usage (action_type_id, agent_id, status, executed_at)
           VALUES ($1, $2, $3, $4)`, [at.id, agentId, status, timestamp.toISOString()]);
            }
        }
        catch {
            // Skip — non-critical
        }
    }
    broadcastEvent(agentId, actionType, result, riskTier, latencyMs) {
        eventStream.publish({
            type: 'fleet.activity',
            timestamp: new Date().toISOString(),
            payload: {
                agent_id: agentId,
                action_type: actionType,
                result,
                risk_tier: riskTier,
                latency_ms: latencyMs,
                source: 'simulation',
            },
        });
    }
    async refreshPolicyRules() {
        try {
            this.cachedPolicyRules = await query(`SELECT id, name, conditions, action_on_match, approval_tier, enabled, priority
         FROM policy_rules WHERE enabled = true ORDER BY priority DESC`);
            this.lastPolicyRefresh = Date.now();
        }
        catch {
            // Keep cached rules
        }
    }
    async seedPolicyRules() {
        try {
            const existing = await queryOne(`SELECT COUNT(*)::text as count FROM policy_rules`);
            if (existing && parseInt(existing.count) > 0)
                return;
            console.log('[simulation] Seeding demo policy rules...');
            for (const rule of DEMO_POLICY_RULES) {
                await execute(`INSERT INTO policy_rules (name, description, conditions, action_on_match, approval_tier, priority, enabled, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, true, 'simulation')`, [
                    rule.name,
                    rule.description,
                    JSON.stringify(rule.conditions),
                    rule.action_on_match,
                    rule.approval_tier,
                    rule.priority,
                ]).catch(() => { });
            }
            console.log(`[simulation] Seeded ${DEMO_POLICY_RULES.length} demo policy rules`);
        }
        catch (err) {
            console.error('[simulation] Failed to seed policy rules:', err);
        }
    }
}
// Singleton
export const simulationService = new SimulationService();
//# sourceMappingURL=simulationService.js.map