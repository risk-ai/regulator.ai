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
interface SimulationStats {
    running: boolean;
    startedAt: string | null;
    actionsGenerated: number;
    alertsGenerated: number;
    tickCount: number;
    lastTickAt: string | null;
}
declare class SimulationService {
    private intervalId;
    private stats;
    private cachedPolicyRules;
    private lastPolicyRefresh;
    private readonly POLICY_REFRESH_INTERVAL;
    private readonly TICK_INTERVAL;
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(): SimulationStats;
    seed(): Promise<{
        actions: number;
        alerts: number;
    }>;
    reset(): Promise<void>;
    private tick;
    private generateAction;
    private evaluateAgainstPolicies;
    private evaluateCondition;
    private determineOutcome;
    private adjustTrustScore;
    private generateAlert;
    private trackActionTypeUsage;
    private broadcastEvent;
    private refreshPolicyRules;
    private seedPolicyRules;
}
export declare const simulationService: SimulationService;
export {};
//# sourceMappingURL=simulationService.d.ts.map