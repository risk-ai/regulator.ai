/**
 * Validate plan structure
 */
export function validatePlan(plan: any): boolean;
/**
 * Agent Proposal Schema — Phase 16 Stage 1
 *
 * Agent-generated proposals with plan structure.
 *
 * Core Invariant: Agent proposals flow through Phase 15 proposal system.
 */
/**
 * Plan Step
 *
 * Single step in a multi-step plan
 */
export function validatePlanStep(step: any, index: any): boolean;
/**
 * Validate agent proposal
 */
export function validateAgentProposal(proposal: any): boolean;
/**
 * Generate agent proposal ID
 */
export function generateAgentProposalId(): string;
/**
 * Generate plan ID
 */
export function generatePlanId(): string;
/**
 * Generate step ID
 */
export function generateStepId(planId: any, stepIndex: any): string;
/**
 * Create agent proposal
 */
export function createAgentProposal(input: any): {
    agent_proposal_id: string;
    agent_id: any;
    plan: {
        plan_id: any;
        objective_id: any;
        steps: any;
        reasoning: any;
        expected_outcomes: any;
        risk_assessment: any;
        metadata: any;
    };
    context: any;
    created_at: string;
    status: string;
    expires_at: any;
};
/**
 * Check if agent proposal is expired
 */
export function isExpired(agentProposal: any): boolean;
/**
 * Get highest risk tier in plan
 */
export function getMaxRiskTier(plan: any): "T0" | "T1" | "T2";
//# sourceMappingURL=agent-proposal-schema.d.ts.map