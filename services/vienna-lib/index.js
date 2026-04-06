/**
 * Vienna Governance Engine - Main Entry Point
 * 
 * Exports core governance components for monorepo consumption
 */

module.exports = {
  // Core execution
  IntentGateway: require('./core/intent-gateway').IntentGateway,
  PlanExecutionEngine: require('./core/plan-execution-engine').PlanExecutionEngine || require('./core/plan-execution-engine'),
  PlanGenerator: require('./core/plan-generator').PlanGenerator || require('./core/plan-generator'),
  ExecutionGraphBuilder: require('./core/execution-graph').ExecutionGraphBuilder || require('./core/execution-graph'),
  
  // Agent Integration
  AgentIntentBridge: require('./core/agent-intent-bridge').AgentIntentBridge,
  OpenClawBridge: require('./core/openclaw-bridge').OpenClawBridge,
  
  // Governance
  Warrant: require('./governance/warrant'),
  PolicyEngine: require('./core/policy-engine'),
  QuotaEnforcer: require('./governance/quota-enforcer'),
  
  // State management (Postgres version for Vercel)
  // Use SQLite for Phase 1 (portable, no external DB required)
  StateGraph: require('./state/state-graph').StateGraph,
  getStateGraph: require('./state/state-graph').getStateGraph,
  
  // Workspace
  WorkspaceManager: require('./workspace/workspace-manager').WorkspaceManager,
  
  // Execution
  Executor: require('./execution/executor').Executor,
  
  // Verification & Attestation
  VerificationEngine: require('./core/verification-engine'),
  AttestationEngine: require('./attestation/attestation-engine'),
  
  // Cost & Accounting
  CostTracker: require('./accounting/cost-tracker'),
  CostModel: require('./economic/cost-model'),
  
  // Approval workflow
  ApprovalManager: require('./core/approval-manager'),
  
  // Learning
  LearningCoordinator: require('./learning/learning-coordinator'),
  
  // Distributed execution
  DistributedLockManager: require('./distributed/lock-manager'),
  
  // Simulation
  Simulator: require('./simulation/simulator'),
  
  // Federation
  Federation: require('./federation/federation'),
  
  // Merkle Warrant Chain
  MerkleWarrantChain: require('./governance/warrant-chain'),
  InMemoryWarrantChainStore: require('./governance/warrant-chain-store').InMemoryWarrantChainStore,
  PostgresWarrantChainStore: require('./governance/warrant-chain-store').PostgresWarrantChainStore,
  
  // Open Warrant Standard
  OpenWarrantStandard: require('./governance/open-warrant-standard'),
  
  // Policy Simulation
  PolicySimulator: require('./governance/policy-simulator'),
  
  // Warrant Delegation
  WarrantDelegation: require('./governance/warrant-delegation'),
  
  // Agent Trust Scoring
  AgentTrustEngine: require('./governance/agent-trust-score'),
  
  // Natural Language Policy Builder
  NaturalLanguagePolicyBuilder: require('./governance/natural-language-policy-builder'),
  
  // Compliance Reports
  ComplianceReportGenerator: require('./compliance/report-generator'),
  
  // Runtime stub for console compatibility
  default: require('./runtime-stub')
  
  // Note: ProviderManager is ESM-only, import directly via @vienna/lib/providers/manager
};
