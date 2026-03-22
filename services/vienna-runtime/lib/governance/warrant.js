/**
 * Vienna Warrant System
 * 
 * Root authorization primitive for governed executions.
 * Warrants bind truth → plan → approval → execution.
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class Warrant {
  constructor(adapter) {
    this.adapter = adapter;
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
      objective,
      riskTier,
      allowedActions,
      forbiddenActions = [],
      expiresInMinutes = 15
    } = options;
    
    // Validate required fields
    this._validateRequired({ truthSnapshotId, planId, objective, riskTier, allowedActions });
    
    // T2 requires approval
    if (riskTier === 'T2' && !approvalId) {
      throw new Error('T2 warrants require approvalId');
    }
    
    // Load and validate truth snapshot
    const truth = await this.adapter.loadTruthSnapshot(truthSnapshotId);
    await this._validateTruthFreshness(truth, riskTier);
    
    // Generate IDs
    const changeId = this._generateChangeId();
    const warrantId = `wrt_${changeId.split('_').slice(1).join('_')}`;
    
    // Create warrant
    const warrant = {
      change_id: changeId,
      warrant_id: warrantId,
      issued_by: 'vienna',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
      risk_tier: riskTier,
      
      truth_snapshot_id: truthSnapshotId,
      truth_snapshot_hash: truth.truth_snapshot_hash || this._hashObject(truth),
      plan_id: planId,
      approval_id: approvalId,
      
      objective,
      allowed_actions: allowedActions,
      forbidden_actions: forbiddenActions,
      
      trading_safety: this._assessTradingSafety(allowedActions),
      
      status: 'issued',
      invalidated_at: null,
      invalidation_reason: null
    };
    
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
      remaining_minutes: Math.floor((expires - now) / 60000)
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
