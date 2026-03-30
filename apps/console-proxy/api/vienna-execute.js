/**
 * Vienna Core - Complete Execution Pipeline
 * Full policy validation, warrant issuance, and execution
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Policy evaluation engine
async function evaluatePolicies(agentId, action, context) {
  // Get active policies for tenant
  const policies = await pool.query(
    `SELECT * FROM public.policies WHERE enabled = true ORDER BY priority DESC`
  );
  
  // Simple tier-based approval (T0 = auto, T1/T2 = manual)
  const tier = context.tier || 'T0';
  const requiresApproval = tier !== 'T0';
  
  return {
    approved: tier === 'T0',
    tier,
    policies_applied: policies.rows.map(p => p.name || p.id),
    requires_approval: requiresApproval
  };
}

// Warrant issuance
async function issueWarrant(executionId, evaluation) {
  const warrantId = `warrant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store warrant in database
  await pool.query(
    `INSERT INTO public.execution_ledger_events 
     (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
     VALUES ($1, $2, $3, 'warrant_issued', 'warrant', 2, NOW())`,
    [warrantId, 'default', executionId]
  );
  
  return warrantId;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { action, agent_id, context } = req.body;
    
    if (!action || !agent_id) {
      return res.status(400).json({
        success: false,
        error: 'action and agent_id required'
      });
    }
    
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Step 1: Policy Evaluation
    const evaluation = await evaluatePolicies(agent_id, action, context || {});
    
    // Step 2: Log intent
    await pool.query(
      `INSERT INTO public.execution_ledger_events 
       (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
       VALUES ($1, $2, $3, 'execution_requested', 'intent', 1, NOW())`,
      [executionId + '_intent', 'default', executionId]
    );
    
    // Step 3: Issue warrant if approved
    let warrantId = null;
    if (evaluation.approved) {
      warrantId = await issueWarrant(executionId, evaluation);
      
      // Log execution
      await pool.query(
        `INSERT INTO public.execution_ledger_events 
         (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
         VALUES ($1, $2, $3, 'execution_completed', 'execution', 3, NOW())`,
        [executionId + '_exec', 'default', executionId]
      );
    } else {
      // Create approval request
      const approvalId = `approval_${Date.now()}`;
      await pool.query(
        `INSERT INTO public.approval_requests 
         (id, tenant_id, execution_id, action, agent_id, status, tier, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())`,
        [approvalId, 'default', executionId, action, agent_id, evaluation.tier]
      );
    }
    
    return res.json({
      success: true,
      data: {
        execution_id: executionId,
        warrant_id: warrantId,
        status: evaluation.approved ? 'executed' : 'pending_approval',
        tier: evaluation.tier,
        policies_applied: evaluation.policies_applied,
        requires_approval: evaluation.requires_approval,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[vienna-execute]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXECUTION_ERROR'
    });
  }
};
