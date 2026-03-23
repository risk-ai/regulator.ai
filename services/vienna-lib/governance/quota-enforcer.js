/**
 * Quota Enforcer
 * Phase 22: Quota Enforcement
 * 
 * Enforces per-tenant quota limits before execution.
 */

class QuotaEnforcer {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Check if tenant has available quota
   * 
   * @param {string} tenantId - Tenant identifier
   * @param {Object} intent - Intent object (for cost estimation)
   * @returns {Promise<Object>} { allowed, used, limit, available, utilization, reason }
   */
  async checkQuota(tenantId, intent) {
    // Query tenant quota from State Graph
    let tenant = null;
    
    // Try to get tenant if method exists
    if (typeof this.stateGraph.getTenant === 'function') {
      tenant = this.stateGraph.getTenant(tenantId);
    }
    
    if (!tenant) {
      // Default quota for unknown tenants
      return {
        allowed: true,
        used: 0,
        limit: 100,
        available: 100,
        utilization: 0,
        reason: 'default_quota'
      };
    }

    const used = tenant.quota_used || 0;
    const limit = tenant.quota_limit || 100;
    const available = Math.max(0, limit - used);
    const utilization = limit > 0 ? used / limit : 0;

    const allowed = used < limit;

    return {
      allowed,
      used,
      limit,
      available,
      utilization,
      reason: allowed ? null : 'quota_exceeded'
    };
  }

  /**
   * Reserve quota for upcoming execution
   * 
   * @param {string} tenantId
   * @param {number} amount
   * @returns {Promise<Object>} Reservation result
   */
  async reserveQuota(tenantId, amount) {
    // Create quota reservation in State Graph
    const reservationId = `qres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.stateGraph.createQuotaReservation(
      reservationId,
      tenantId,
      amount,
      'reserved',
      new Date().toISOString()
    );

    return {
      reservation_id: reservationId,
      tenant_id: tenantId,
      amount,
      status: 'reserved'
    };
  }

  /**
   * Commit (finalize) quota reservation
   * 
   * @param {string} reservationId
   * @returns {Promise<void>}
   */
  async commitQuota(reservationId) {
    this.stateGraph.updateQuotaReservation(reservationId, {
      status: 'committed',
      committed_at: new Date().toISOString()
    });
  }

  /**
   * Release (cancel) quota reservation
   * 
   * @param {string} reservationId
   * @returns {Promise<void>}
   */
  async releaseQuota(reservationId) {
    this.stateGraph.updateQuotaReservation(reservationId, {
      status: 'released',
      released_at: new Date().toISOString()
    });
  }
}

module.exports = { QuotaEnforcer };
