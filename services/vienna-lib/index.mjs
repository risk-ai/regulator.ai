/**
 * Vienna Governance Engine - ESM Entry Point
 * 
 * Re-exports CommonJS modules for ESM consumption
 */

import cjsModule from './index.js';

export const IntentGateway = cjsModule.IntentGateway;
export const PlanExecutionEngine = cjsModule.PlanExecutionEngine;
export const PlanGenerator = cjsModule.PlanGenerator;
export const ExecutionGraphBuilder = cjsModule.ExecutionGraphBuilder;
export const Warrant = cjsModule.Warrant;
export const PolicyEngine = cjsModule.PolicyEngine;
export const QuotaEnforcer = cjsModule.QuotaEnforcer;
export const getStateGraph = cjsModule.getStateGraph;
export const WorkspaceManager = cjsModule.WorkspaceManager;
export const Executor = cjsModule.Executor;
export const VerificationEngine = cjsModule.VerificationEngine;
export const AttestationEngine = cjsModule.AttestationEngine;
export const CostTracker = cjsModule.CostTracker;
export const CostModel = cjsModule.CostModel;
export const ApprovalManager = cjsModule.ApprovalManager;
export const LearningCoordinator = cjsModule.LearningCoordinator;
export const DistributedLockManager = cjsModule.DistributedLockManager;
export const Simulator = cjsModule.Simulator;
export const Federation = cjsModule.Federation;

export default cjsModule.default;
