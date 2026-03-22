/**
 * Approval Coordinator
 * 
 * Cross-node approval workflow coordination
 * Phase 20 — Distributed Governance
 */

const crypto = require('crypto');

class ApprovalCoordinator {
  constructor(stateGraph, approvalManager) {
    this.stateGraph = stateGraph;
    this.approvalManager = approvalManager;
  }

  /**
   * Request cross-node approval
   */
  async requestApproval(executionId, requestingNodeId, plan, context) {
    const approvalId = this._generateId('xappr');

    // Create cross-node approval record
    await this.stateGraph.run(
      `INSERT INTO cross_node_approvals (
        approval_id, execution_id, requesting_node_id,
        plan, context, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalId,
        executionId,
        requestingNodeId,
        JSON.stringify(plan),
        JSON.stringify(context),
        'pending',
        new Date().toISOString()
      ]
    );

    // Forward to approval manager
    const approval = await this.approvalManager.createApproval({
      execution_id: executionId,
      plan,
      context,
      risk_tier: plan.risk_tier || 'T1'
    });

    return {
      approval_id: approvalId,
      internal_approval_id: approval.approval_id
    };
  }

  /**
   * Resolve cross-node approval
   */
  async resolveApproval(approvalId, decision, operator) {
    const approval = await this.getApproval(approvalId);

    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    // Update cross-node approval
    const updates = {
      status: decision === 'approved' ? 'approved' : 'denied',
      resolved_at: new Date().toISOString()
    };

    if (decision === 'approved') {
      updates.approved_by = operator;
    } else {
      updates.denied_by = operator;
    }

    await this._updateApproval(approvalId, updates);

    // Notify requesting node
    await this._notifyNode(approval.requesting_node_id, {
      approval_id: approvalId,
      decision,
      operator
    });

    return { resolved: true, decision };
  }

  /**
   * Get approval
   */
  async getApproval(approvalId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM cross_node_approvals WHERE approval_id = ?`,
      [approvalId]
    );

    if (!row) return null;

    return {
      approval_id: row.approval_id,
      execution_id: row.execution_id,
      requesting_node_id: row.requesting_node_id,
      plan: JSON.parse(row.plan || '{}'),
      context: JSON.parse(row.context || '{}'),
      status: row.status,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      approved_by: row.approved_by,
      denied_by: row.denied_by
    };
  }

  /**
   * List pending approvals
   */
  async listPendingApprovals() {
    const rows = await this.stateGraph.all(
      `SELECT * FROM cross_node_approvals 
       WHERE status = 'pending' 
       ORDER BY created_at ASC`
    );

    return rows.map(r => ({
      approval_id: r.approval_id,
      execution_id: r.execution_id,
      requesting_node_id: r.requesting_node_id,
      created_at: r.created_at
    }));
  }

  // Helper methods

  async _updateApproval(approvalId, updates) {
    const fields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      params.push(value);
    });

    params.push(approvalId);

    await this.stateGraph.run(
      `UPDATE cross_node_approvals 
       SET ${fields.join(', ')} 
       WHERE approval_id = ?`,
      params
    );
  }

  async _notifyNode(nodeId, notification) {
    // Mock implementation - would make HTTP POST to node
    return { notified: true };
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = ApprovalCoordinator;
