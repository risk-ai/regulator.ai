/**
 * Onboarding API
 * 
 * Tracks onboarding progress for new Vienna OS console users.
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/onboarding/, '');

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // Get onboarding status
    if (req.method === 'GET' && (path === '/status' || path === '/status/')) {
      try {
        const result = await pool.query(
          'SELECT completed, current_step, completed_at, created_at FROM onboarding_status WHERE tenant_id = $1',
          [tenantId]
        );
        
        if (result.rows.length === 0) {
          // No record exists, return default status
          return res.json({
            success: true,
            data: {
              completed: false,
              current_step: 1,
              completed_at: null,
              created_at: null
            }
          });
        }
        
        return res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (dbError) {
        // If table doesn't exist or other DB error, return default status
        console.warn('[onboarding] Database error, returning default status:', dbError.message);
        return res.json({
          success: true,
          data: {
            completed: false,
            current_step: 1,
            completed_at: null,
            created_at: null
          }
        });
      }
    }
    
    // Mark onboarding as completed
    if (req.method === 'POST' && (path === '/complete' || path === '/complete/')) {
      const now = new Date();
      
      try {
        // Use INSERT ... ON CONFLICT to handle both new and existing records
        const result = await pool.query(`
          INSERT INTO onboarding_status (tenant_id, completed, current_step, completed_at, created_at, updated_at)
          VALUES ($1, true, 4, $2, $2, $2)
          ON CONFLICT (tenant_id) 
          DO UPDATE SET 
            completed = true,
            current_step = 4,
            completed_at = $2,
            updated_at = $2
          RETURNING *
        `, [tenantId, now]);
        
        return res.json({
          success: true,
          data: result.rows[0],
          message: 'Onboarding completed successfully'
        });
      } catch (dbError) {
        // If table doesn't exist, just return success (onboarding will be tracked in localStorage)
        console.warn('[onboarding] Database error during completion, returning success anyway:', dbError.message);
        return res.json({
          success: true,
          data: {
            completed: true,
            current_step: 4,
            completed_at: now,
            tenant_id: tenantId
          },
          message: 'Onboarding completed successfully (client-side tracking)'
        });
      }
    }
    
    // Update current step
    if (req.method === 'POST' && (path === '/step' || path === '/step/')) {
      const { step } = req.body;
      
      if (!step || typeof step !== 'number' || step < 1 || step > 4) {
        return res.status(400).json({
          success: false,
          error: 'Invalid step number (must be 1-4)'
        });
      }
      
      const now = new Date();
      
      try {
        // Use INSERT ... ON CONFLICT to handle both new and existing records
        const result = await pool.query(`
          INSERT INTO onboarding_status (tenant_id, completed, current_step, created_at, updated_at)
          VALUES ($1, false, $2, $3, $3)
          ON CONFLICT (tenant_id) 
          DO UPDATE SET 
            current_step = $2,
            updated_at = $3
          RETURNING *
        `, [tenantId, step, now]);
        
        return res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (dbError) {
        // If table doesn't exist, just return success
        console.warn('[onboarding] Database error during step update:', dbError.message);
        return res.json({
          success: true,
          data: {
            completed: false,
            current_step: step,
            tenant_id: tenantId,
            updated_at: now
          }
        });
      }
    }
    
    // Reset onboarding (for testing)
    if (req.method === 'DELETE' && (path === '' || path === '/')) {
      try {
        await pool.query('DELETE FROM onboarding_status WHERE tenant_id = $1', [tenantId]);
      } catch (dbError) {
        console.warn('[onboarding] Database error during reset:', dbError.message);
      }
      
      return res.json({
        success: true,
        message: 'Onboarding status reset'
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('Onboarding API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};