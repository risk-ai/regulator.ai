const { requireAuth } = require("./_auth");
/**
 * Role-Based Access Control (RBAC) API
 * Manage roles, permissions, and access control
 */

const { pool } = require('../../database/client');

// Role definitions
const ROLES = {
  admin: {
    name: 'Administrator',
    permissions: ['*']
  },
  operator: {
    name: 'Operator',
    permissions: ['execute', 'approve', 'view_audit', 'manage_agents']
  },
  reviewer: {
    name: 'Reviewer',
    permissions: ['approve', 'view_audit']
  },
  viewer: {
    name: 'Viewer',
    permissions: ['view_audit']
  }
};

function hasPermission(userRole, requiredPermission) {
  const role = ROLES[userRole];
  if (!role) return false;
  
  // Admin has all permissions
  if (role.permissions.includes('*')) return true;
  
  return role.permissions.includes(requiredPermission);
}

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res); if (!user) return;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/rbac/, '');
  
  try {
    // Get available roles
    if (path === '/roles' && req.method === 'GET') {
      return res.json({
        success: true,
        data: Object.entries(ROLES).map(([key, value]) => ({
          id: key,
          ...value
        }))
      });
    }
    
    // Check permission
    if (path === '/check' && req.method === 'POST') {
      const { user_role, permission } = req.body;
      
      const allowed = hasPermission(user_role, permission);
      
      return res.json({
        success: true,
        data: {
          user_role,
          permission,
          allowed
        }
      });
    }
    
    // Assign role to user
    if (path === '/assign' && req.method === 'POST') {
      const { user_id, role } = req.body;
      
      if (!ROLES[role]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }
      
      await pool.query(
        'UPDATE public.users SET role = $1 WHERE id = $2',
        [role, user_id]
      );
      
      return res.json({
        success: true,
        data: {
          user_id,
          role,
          permissions: ROLES[role].permissions
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[rbac]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'RBAC_ERROR'
    });
  }
};

module.exports.hasPermission = hasPermission;
module.exports.ROLES = ROLES;
