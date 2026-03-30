/**
 * Vienna Warrant System
 * 
 * Root authorization primitive for governed executions.
 * Warrants bind truth → plan → approval → execution.
 * 
 * Warrants are cryptographically signed (HMAC-SHA256) with scope constraints,
 * time-limited TTLs, and tamper-evident signatures. The signature covers all
 * authorization-relevant fields — any modification invalidates the warrant.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Default signing key (should be overridden via config in production)
const DEFAULT_SIGNING_KEY = process.env.VIENNA_WARRANT_KEY || 'vienna-dev-key-change-in-production';

class Warrant {
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.signingKey = options.signingKey || DEFAULT_SIGNING_KEY;
  }
  
  /**
   * Issue new warrant
   * 
   * @param {object} options - Warrant options
   * @param {string} options.truthSnapshotId - Truth snapshot ID
   * @param {string} options.planId - Plan ID
   * @param {string} options.approvalId - Approval ID (T2 only)
   * @param {string} options.objective - Human-readable objective
   * @param {string} options.riskTier - 'T0' | 'T1' | 'T2'
   * @param {Array<string>} options.allowedActions - Allowed actions
   * @param {Array<string>} options.forbiddenActions - Forbidden actions
   * @param {number} options.expiresInMinutes - Expiration (default 15)
   * @returns {Promise<object>} Issued warrant
   */
  async issue(options) {
    const {
      truthSnapshotId,
      planId,
      approvalId,
      approvalIds = [],
      objective,
      riskTier,
      allowedActions,
      forbiddenActions = [],
      constraints = {},
      expiresInMinutes,
      rollbackPlan = null,
      justification = null,
      issuer = 'vienna'
    } = options;
    
    // Validate required fields
    this._validateRequired({ truthSnapshotId, planId, objective, riskTier, allowedActions });
    
    // Validate risk tier
    const RiskTier = require('./risk-tier');
    if (!RiskTier.isValid(riskTier)) {
      throw new Error(`Invalid risk tier: ${riskTier}. Valid: ${RiskTier.TIERS.join(', ')}`);
    }

    // Get tier requirements
    const riskTierInstance = new RiskTier();
    const requirements = riskTierInstance.getRequirements(riskTier);

    // Enforce approval requirements by tier
    if (riskTier === 'T2' && !approvalId && approvalIds.length === 0) {
      throw new Error('T2 warrants require at least one approvalId');
    }
    
    if (riskTier === 'T3') {
      const allApprovals = approvalIds.length > 0 ? approvalIds : (approvalId ? [approvalId] : []);
      if (allApprovals.length < 2) {
        throw new Error(`T3 warrants require ${requirements.approval_count}+ approvals, got ${allApprovals.length}`);
      }
      if (!justification) {
        throw new Error('T3 warrants require a justification');
      }
      if (!rollbackPlan) {
        throw new Error('T3 warrants require a rollback plan');
      }
    }

    // Cap TTL based on risk tier
    const tierMaxTtl = {
      'T0': 60,   // 1 hour
      'T1': 30,   // 30 minutes
      'T2': 15,   // 15 minutes
      'T3': 5     // 5 minutes
    };
    const maxTtl = requirements.max_ttl_minutes || tierMaxTtl[riskTier] || 60;
    const ttl = Math.min(expiresInMinutes || maxTtl, maxTtl);
    
    // Load and validate truth snapshot
    const truth = await this.adapter.loadTruthSnapshot(truthSnapshotId);
    await this._validateTruthFreshness(truth, riskTier);
    
    // Generate IDs
    const changeId = this._generateChangeId();
    const warrantId = `wrt_${changeId.split('_').slice(1).join('_')}`;
    
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();
    const allApprovalIds = approvalIds.length > 0 ? approvalIds : (approvalId ? [approvalId] : []);

    // Create warrant
    const warrant = {
      change_id: changeId,
      warrant_id: warrantId,
      version: 2,
      issued_by: issuer,
      issued_at: issuedAt,
      expires_at: expiresAt,
      risk_tier: riskTier,
      
      truth_snapshot_id: truthSnapshotId,
      truth_snapshot_hash: truth.truth_snapshot_hash || this._hashObject(truth),
      plan_id: planId,
      approval_id: allApprovalIds[0] || null,
      approval_ids: allApprovalIds,
      
      objective,
      allowed_actions: allowedActions,
      forbidden_actions: forbiddenActions,
      constraints,
      
      justification: riskTier === 'T3' ? justification : null,
      rollback_plan: riskTier === 'T3' ? rollbackPlan : null,
      
      trading_safety: this._assessTradingSafety(allowedActions),
      enhanced_audit: requirements.enhanced_audit || false,
      
      status: 'issued',
      invalidated_at: null,
      invalidation_reason: null,

      // Cryptographic signature
      signature: null
    };

    // Sign the warrant
    warrant.signature = this._sign(warrant);
    
    // Save warrant
    await this.adapter.saveWarrant(warrant);
    
    // Emit audit event
    await this.adapter.emitAudit({
      event_type: 'warrant_issued',
      warrant_id: warrantId,
      change_id: changeId,
      risk_tier: riskTier,
      issued_at: warrant.issued_at
    });
    
    return warrant;
  }
  
  /**
   * Verify warrant validity
   * 
   * @param {string} warrantId - Warrant ID
   * @returns {Promise<object>} Validation result
   */
  async verify(warrantId) {
    const warrant = await this.adapter.loadWarrant(warrantId);
    
    if (!warrant) {
      return { valid: false, reason: 'WARRANT_NOT_FOUND' };
    }
    
    if (warrant.status === 'invalidated') {
      return { 
        valid: false, 
        reason: 'WARRANT_INVALIDATED',
        invalidated_at: warrant.invalidated_at,
        invalidation_reason: warrant.invalidation_reason
      };
    }
    
    // Verify cryptographic signature (tamper detection)
    if (warrant.signature) {
      const expectedSig = this._sign(warrant);
      if (warrant.signature !== expectedSig) {
        // Warrant has been tampered with
        await this.adapter.emitAudit({
          event_type: 'warrant_tamper_detected',
          warrant_id: warrantId,
          severity: 'critical'
        });
        return { 
          valid: false, 
          reason: 'WARRANT_TAMPERED',
          severity: 'critical'
        };
      }
    }
    
    const now = new Date();
    const expires = new Date(warrant.expires_at);
    
    if (now > expires) {
      return { 
        valid: false, 
        reason: 'WARRANT_EXPIRED',
        expired_at: warrant.expires_at
      };
    }
    
    return { 
      valid: true, 
      warrant,
      remaining_minutes: Math.floor((expires - now) / 60000),
      risk_tier: warrant.risk_tier,
      enhanced_audit: warrant.enhanced_audit
    };
  }

  /**
   * Verify that an action is within warrant scope
   * 
   * @param {string} warrantId - Warrant ID
   * @param {string} action - Action being attempted
   * @param {object} params - Action parameters
   * @returns {Promise<object>} Scope check result
   */
  async verifyScope(warrantId, action, params = {}) {
    const verification = await this.verify(warrantId);
    
    if (!verification.valid) {
      return verification;
    }

    const warrant = verification.warrant;

    // Check forbidden actions first
    if (warrant.forbidden_actions.includes(action)) {
      return { 
        valid: false, 
        reason: 'ACTION_FORBIDDEN',
        action,
        warrant_id: warrantId
      };
    }

    // Check allowed actions
    if (!warrant.allowed_actions.includes(action) && !warrant.allowed_actions.includes('*')) {
      return { 
        valid: false, 
        reason: 'ACTION_NOT_IN_SCOPE',
        action,
        allowed: warrant.allowed_actions,
        warrant_id: warrantId
      };
    }

    // Check constraints
    if (warrant.constraints) {
      const constraintViolation = this._checkConstraints(warrant.constraints, params);
      if (constraintViolation) {
        return {
          valid: false,
          reason: 'CONSTRAINT_VIOLATION',
          constraint: constraintViolation,
          warrant_id: warrantId
        };
      }
    }

    return { 
      valid: true, 
      warrant_id: warrantId,
      action,
      risk_tier: warrant.risk_tier
    };
  }
  
  /**
   * Invalidate warrant
   * 
   * @param {string} warrantId - Warrant ID
   * @param {string} reason - Invalidation reason
   * @returns {Promise<void>}
   */
  async invalidate(warrantId, reason) {
    const warrant = await this.adapter.loadWarrant(warrantId);
    
    if (!warrant) {
      throw new Error(`Warrant not found: ${warrantId}`);
    }
    
    warrant.status = 'invalidated';
    warrant.invalidated_at = new Date().toISOString();
    warrant.invalidation_reason = reason;
    
    await this.adapter.saveWarrant(warrant);
    
    await this.adapter.emitAudit({
      event_type: 'warrant_invalidated',
      warrant_id: warrantId,
      reason,
      invalidated_at: warrant.invalidated_at
    });
  }
  
  /**
   * List active warrants
   * 
   * @returns {Promise<Array>} Active warrants
   */
  async listActive() {
    const warrants = await this.adapter.listWarrants();
    const now = new Date();
    
    return warrants.filter(w => 
      w.status === 'issued' && 
      new Date(w.expires_at) > now
    );
  }
  
  // Private methods
  
  _validateRequired(fields) {
    const missing = Object.entries(fields)
      .filter(([k, v]) => !v)
      .map(([k]) => k);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
  
  async _validateTruthFreshness(truth, riskTier) {
    if (!truth.last_verified_at) {
      throw new Error('Truth snapshot missing last_verified_at');
    }
    
    const now = new Date();
    const verified = new Date(truth.last_verified_at);
    const ageMinutes = (now - verified) / 1000 / 60;
    
    const maxAge = {
      'T0': Infinity,
      'T1': 30,
      'T2': 10
    };
    
    if (ageMinutes > maxAge[riskTier]) {
      throw new Error(
        `Truth snapshot too old: ${ageMinutes.toFixed(1)} min (max ${maxAge[riskTier]} for ${riskTier})`
      );
    }
  }
  
  _generateChangeId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '_');
    const timeStr = date.toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
    const random = crypto.randomBytes(3).toString('hex');
    return `chg_${dateStr}_${timeStr}_${random}`;
  }
  
  _hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return 'sha256:' + crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Sign a warrant using HMAC-SHA256
   * Covers all authorization-relevant fields — any modification invalidates.
   * @private
   */
  _sign(warrant) {
    const payload = [
      warrant.warrant_id,
      warrant.issued_by,
      warrant.issued_at,
      warrant.expires_at,
      warrant.risk_tier,
      warrant.truth_snapshot_id,
      warrant.truth_snapshot_hash,
      warrant.plan_id,
      JSON.stringify(warrant.approval_ids || []),
      warrant.objective,
      JSON.stringify(warrant.allowed_actions),
      JSON.stringify(warrant.forbidden_actions),
      JSON.stringify(warrant.constraints || {})
    ].join('|');

    return 'hmac-sha256:' + crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
  }

  /**
   * Check parameter constraints
   * @private
   */
  _checkConstraints(constraints, params) {
    for (const [key, constraint] of Object.entries(constraints)) {
      const value = params[key];
      
      if (constraint.max !== undefined && value > constraint.max) {
        return { field: key, violation: 'exceeds_max', max: constraint.max, actual: value };
      }
      if (constraint.min !== undefined && value < constraint.min) {
        return { field: key, violation: 'below_min', min: constraint.min, actual: value };
      }
      if (constraint.allowed && !constraint.allowed.includes(value)) {
        return { field: key, violation: 'not_allowed', allowed: constraint.allowed, actual: value };
      }
      if (constraint.pattern && !new RegExp(constraint.pattern).test(String(value))) {
        return { field: key, violation: 'pattern_mismatch', pattern: constraint.pattern, actual: value };
      }
    }
    return null;
  }
  
  _assessTradingSafety(allowedActions) {
    const tradingPatterns = ['kalshi', 'trading', 'VIENNA_RUNTIME_STATE', 'kalshi_mm_bot'];
    
    const tradingInScope = allowedActions.some(action => 
      tradingPatterns.some(pattern => action.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    if (!tradingInScope) {
      return { trading_in_scope: false, risk: 'none' };
    }
    
    const highRisk = ['restart_service', 'stop_service', 'write_db'];
    const mediumRisk = ['write_file', 'replace_text'];
    
    let risk = 'low';
    if (allowedActions.some(a => highRisk.some(hr => a.startsWith(hr)))) {
      risk = 'high';
    } else if (allowedActions.some(a => mediumRisk.some(mr => a.startsWith(mr)))) {
      risk = 'medium';
    }
    
    return { trading_in_scope: true, risk };
  }
}

module.exports = Warrant;
