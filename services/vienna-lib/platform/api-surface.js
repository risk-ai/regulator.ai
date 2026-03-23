/**
 * Vienna Platform API Surface (v1)
 * 
 * Public internal API for core Vienna primitives.
 * All platform consumers must use this surface, not direct module imports.
 */

const { getStateGraph } = require('../state/state-graph');
const { IntentClassifier } = require('../core/intent-classifier');
const { PlanGenerator } = require('../core/plan-generator');
const { ApprovalManager } = require('../core/approval-manager');
const { PlanExecutionEngine } = require('../core/plan-execution-engine');
const { VerificationEngine } = require('../core/verification-engine');
const { getExecutionLedger } = require('../state/execution-ledger');
const { DistributedLockManager } = require('../distributed/lock-manager');

/**
 * Vienna Platform API v1
 */
class ViennaPlatformAPI {
  constructor(config = {}) {
    this.version = '1.0.0';
    this.config = config;
    this.tenantId = config.tenantId || 'default';
    this.callerIdentity = config.callerIdentity || null;
    
    // Initialize core components
    this.stateGraph = getStateGraph();
    this.intentClassifier = new IntentClassifier();
    this.planGenerator = new PlanGenerator();
    this.approvalManager = new ApprovalManager();
    this.executionEngine = new PlanExecutionEngine();
    this.verificationEngine = new VerificationEngine();
    this.ledger = getExecutionLedger();
    this.lockManager = new DistributedLockManager();
  }

  /**
   * Intent API
   */
  async submitIntent(naturalLanguageInput, context = {}) {
    this._requirePermission('intent:submit');
    
    const intent = await this.intentClassifier.classify(naturalLanguageInput, {
      ...context,
      tenant_id: this.tenantId,
      caller: this.callerIdentity
    });

    return {
      intent_id: intent.intent_id,
      intent_type: intent.intent_type,
      confidence: intent.confidence,
      normalized_action: intent.normalized_action,
      entities: intent.entities,
      tenant_id: this.tenantId
    };
  }

  async getIntent(intentId) {
    this._requirePermission('intent:read');
    
    const intent = await this.stateGraph.getIntent(intentId);
    this._enforceTenantBoundary(intent);
    
    return intent;
  }

  async listIntents(filters = {}) {
    this._requirePermission('intent:list');
    
    const intents = await this.stateGraph.listIntents({
      ...filters,
      tenant_id: this.tenantId
    });

    return intents;
  }

  /**
   * Plan API
   */
  async createPlan(intentObject, options = {}) {
    this._requirePermission('plan:create');
    
    const plan = await this.planGenerator.generatePlan(intentObject, {
      ...options,
      tenant_id: this.tenantId,
      created_by: this.callerIdentity
    });

    return plan;
  }

  async getPlan(planId) {
    this._requirePermission('plan:read');
    
    const plan = await this.stateGraph.getPlan(planId);
    this._enforceTenantBoundary(plan);
    
    return plan;
  }

  async listPlans(filters = {}) {
    this._requirePermission('plan:list');
    
    const plans = await this.stateGraph.listPlans({
      ...filters,
      tenant_id: this.tenantId
    });

    return plans;
  }

  async updatePlanStatus(planId, newStatus, metadata = {}) {
    this._requirePermission('plan:update');
    
    const plan = await this.getPlan(planId);
    
    return await this.stateGraph.updatePlanStatus(planId, newStatus, {
      ...metadata,
      updated_by: this.callerIdentity
    });
  }

  /**
   * Approval API
   */
  async requestApproval(planId, approvalMetadata = {}) {
    this._requirePermission('approval:request');
    
    const plan = await this.getPlan(planId);
    
    return await this.approvalManager.createApprovalRequest({
      plan_id: planId,
      ...approvalMetadata,
      tenant_id: this.tenantId,
      requester: this.callerIdentity
    });
  }

  async getApproval(approvalId) {
    this._requirePermission('approval:read');
    
    const approval = await this.approvalManager.getApproval(approvalId);
    this._enforceTenantBoundary(approval);
    
    return approval;
  }

  async listPendingApprovals(filters = {}) {
    this._requirePermission('approval:list');
    
    return await this.approvalManager.listPendingApprovals({
      ...filters,
      tenant_id: this.tenantId
    });
  }

  async grantApproval(approvalId, decision = {}) {
    this._requirePermission('approval:grant');
    
    const approval = await this.getApproval(approvalId);
    
    return await this.approvalManager.approve(approvalId, {
      ...decision,
      reviewer: this.callerIdentity,
      reviewed_at: new Date().toISOString()
    });
  }

  async denyApproval(approvalId, reason, decision = {}) {
    this._requirePermission('approval:deny');
    
    const approval = await this.getApproval(approvalId);
    
    return await this.approvalManager.deny(approvalId, reason, {
      ...decision,
      reviewer: this.callerIdentity,
      reviewed_at: new Date().toISOString()
    });
  }

  /**
   * Execution API
   */
  async executePlan(planId, executionContext = {}) {
    this._requirePermission('execution:execute');
    
    const plan = await this.getPlan(planId);
    
    // Enforce approval requirement
    if (plan.risk_tier === 'T1' || plan.risk_tier === 'T2') {
      const approval = await this.approvalManager.getApprovalForPlan(planId);
      if (!approval || approval.status !== 'approved') {
        throw new Error('APPROVAL_REQUIRED: Cannot execute without approval');
      }
    }

    return await this.executionEngine.executePlan(plan, {
      ...executionContext,
      tenant_id: this.tenantId,
      executor: this.callerIdentity
    });
  }

  async getExecution(executionId) {
    this._requirePermission('execution:read');
    
    const execution = await this.ledger.getExecution(executionId);
    this._enforceTenantBoundary(execution);
    
    return execution;
  }

  async listExecutions(filters = {}) {
    this._requirePermission('execution:list');
    
    return await this.ledger.listExecutions({
      ...filters,
      tenant_id: this.tenantId
    });
  }

  async cancelExecution(executionId, reason) {
    this._requirePermission('execution:cancel');
    
    const execution = await this.getExecution(executionId);
    
    return await this.executionEngine.cancelExecution(executionId, {
      reason,
      cancelled_by: this.callerIdentity
    });
  }

  /**
   * Verification API
   */
  async getVerification(verificationId) {
    this._requirePermission('verification:read');
    
    const verification = await this.stateGraph.getVerification(verificationId);
    this._enforceTenantBoundary(verification);
    
    return verification;
  }

  async listVerifications(filters = {}) {
    this._requirePermission('verification:list');
    
    return await this.stateGraph.listVerifications({
      ...filters,
      tenant_id: this.tenantId
    });
  }

  /**
   * Ledger API
   */
  async queryLedger(query = {}) {
    this._requirePermission('ledger:query');
    
    return await this.ledger.query({
      ...query,
      tenant_id: this.tenantId
    });
  }

  async getExecutionTimeline(executionId) {
    this._requirePermission('ledger:read');
    
    const execution = await this.getExecution(executionId);
    
    return await this.ledger.getTimeline(executionId);
  }

  async exportLedger(filters = {}, format = 'json') {
    this._requirePermission('ledger:export');
    
    return await this.ledger.export({
      ...filters,
      tenant_id: this.tenantId
    }, format);
  }

  /**
   * Node API (for distributed execution)
   */
  async registerNode(nodeMetadata) {
    this._requirePermission('node:register');
    
    return await this.stateGraph.registerNode({
      ...nodeMetadata,
      tenant_id: this.tenantId,
      registered_by: this.callerIdentity
    });
  }

  async getNode(nodeId) {
    this._requirePermission('node:read');
    
    const node = await this.stateGraph.getNode(nodeId);
    this._enforceTenantBoundary(node);
    
    return node;
  }

  async listNodes(filters = {}) {
    this._requirePermission('node:list');
    
    return await this.stateGraph.listNodes({
      ...filters,
      tenant_id: this.tenantId
    });
  }

  async updateNodeStatus(nodeId, status, metadata = {}) {
    this._requirePermission('node:update');
    
    const node = await this.getNode(nodeId);
    
    return await this.stateGraph.updateNodeStatus(nodeId, status, {
      ...metadata,
      updated_by: this.callerIdentity
    });
  }

  /**
   * Lock API
   */
  async acquireLock(resourceId, executionId, ttlSeconds = 300) {
    this._requirePermission('lock:acquire');
    
    return await this.lockManager.acquireLock(resourceId, executionId, {
      ttl_seconds: ttlSeconds,
      tenant_id: this.tenantId,
      holder: this.callerIdentity
    });
  }

  async releaseLock(resourceId, executionId) {
    this._requirePermission('lock:release');
    
    return await this.lockManager.releaseLock(resourceId, executionId);
  }

  async getLockStatus(resourceId) {
    this._requirePermission('lock:read');
    
    return await this.lockManager.getLockStatus(resourceId);
  }

  /**
   * Permission enforcement
   */
  _requirePermission(permission) {
    if (!this.callerIdentity) {
      throw new Error('AUTHENTICATION_REQUIRED: Caller identity required');
    }

    if (!this.callerIdentity.permissions) {
      throw new Error('AUTHORIZATION_FAILED: No permissions configured');
    }

    const hasPermission = this.callerIdentity.permissions.includes(permission) ||
                          this.callerIdentity.permissions.includes('*') ||
                          this.callerIdentity.permissions.includes(permission.split(':')[0] + ':*');

    if (!hasPermission) {
      throw new Error(`PERMISSION_DENIED: ${permission} not granted to ${this.callerIdentity.id}`);
    }
  }

  /**
   * Tenant boundary enforcement
   */
  _enforceTenantBoundary(entity) {
    if (!entity) {
      throw new Error('ENTITY_NOT_FOUND');
    }

    if (entity.tenant_id && entity.tenant_id !== this.tenantId) {
      throw new Error('TENANT_BOUNDARY_VIOLATION: Entity belongs to different tenant');
    }
  }
}

/**
 * Factory function for platform API
 */
function createPlatformAPI(config) {
  return new ViennaPlatformAPI(config);
}

module.exports = {
  ViennaPlatformAPI,
  createPlatformAPI
};
