/**
 * Batch Intent Operations
 * Submit multiple intents in a single request
 */

const { requireAuth, pool } = require('./_auth');

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { intents } = req.body;

    if (!Array.isArray(intents) || intents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'intents array required (max 100)'
      });
    }

    if (intents.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 intents per batch'
      });
    }

    // Validate each intent has required fields
    for (let i = 0; i < intents.length; i++) {
      const intent = intents[i];
      if (!intent.agent_id || !intent.action) {
        return res.status(400).json({
          success: false,
          error: `Intent at index ${i} missing agent_id or action`
        });
      }
    }

    const results = [];
    const errors = [];

    // Process each intent
    for (let i = 0; i < intents.length; i++) {
      const intent = intents[i];
      
      try {
        // Create intent ID
        const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert intent
        await pool.query(
          `INSERT INTO public.intents (
            id, agent_id, action, payload, metadata, status, 
            risk_tier, tenant_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, NOW())`,
          [
            intentId,
            intent.agent_id,
            intent.action,
            JSON.stringify(intent.payload || {}),
            JSON.stringify(intent.metadata || {}),
            intent.risk_tier || 'T0',
            tenantId
          ]
        );

        results.push({
          index: i,
          success: true,
          intent_id: intentId,
          agent_id: intent.agent_id,
          action: intent.action,
          status: 'submitted'
        });
      } catch (error) {
        console.error(`[batch-intents] Error processing intent ${i}:`, error);
        errors.push({
          index: i,
          success: false,
          error: error.message,
          agent_id: intent.agent_id,
          action: intent.action
        });
      }
    }

    return res.json({
      success: errors.length === 0,
      total: intents.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('[batch-intents]', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
