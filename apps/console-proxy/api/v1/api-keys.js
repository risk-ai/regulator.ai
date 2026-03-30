/**
 * API Key Management
 * Generate, revoke, and manage API keys for programmatic access
 */

const { requireAuth } = require('./_auth');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

function generateApiKey() {
  return 'vos_' + crypto.randomBytes(32).toString('hex');
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/api-keys/, '');
  
  try {
    // List API keys (hashed)
    if (path === '' || path === '/' && req.method === 'GET') {
      const keys = await pool.query(
        `SELECT id, name, key_hash as key_prefix, created_at, last_used_at, expires_at, revoked
         FROM public.api_keys
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        ['default'] // Replace with actual tenant from auth
      );
      
      return res.json({
        success: true,
        data: keys.rows.map(k => ({
          ...k,
          key_prefix: k.key_prefix ? k.key_prefix.substring(0, 12) + '...' : null
        }))
      });
    }
    
    // Generate new API key
    if (path === '' || path === '/' && req.method === 'POST') {
      const { name, expires_in_days = 90 } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'name required'
        });
      }
      
      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const keyId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
      
      await pool.query(
        `INSERT INTO public.api_keys (id, tenant_id, name, key_hash, created_at, expires_at, revoked)
         VALUES ($1, $2, $3, $4, NOW(), $5, false)`,
        [keyId, 'default', name, keyHash, expiresAt]
      );
      
      return res.json({
        success: true,
        data: {
          id: keyId,
          name,
          api_key: apiKey, // Only returned once!
          expires_at: expiresAt,
          warning: 'Store this key securely. It will not be shown again.'
        }
      });
    }
    
    // Revoke API key
    if (path.startsWith('/') && path.endsWith('/revoke') && req.method === 'POST') {
      const keyId = path.split('/')[1];
      
      await pool.query(
        'UPDATE public.api_keys SET revoked = true WHERE id = $1 AND tenant_id = $2',
        [keyId, 'default']
      );
      
      return res.json({
        success: true,
        data: {
          id: keyId,
          revoked: true
        }
      });
    }
    
    // Verify API key
    if (path === '/verify' && req.method === 'POST') {
      const { api_key } = req.body;
      
      if (!api_key) {
        return res.status(400).json({
          success: false,
          error: 'api_key required'
        });
      }
      
      const keyHash = hashApiKey(api_key);
      
      const result = await pool.query(
        `SELECT id, name, expires_at, revoked, last_used_at
         FROM public.api_keys
         WHERE key_hash = $1`,
        [keyHash]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          valid: false
        });
      }
      
      const key = result.rows[0];
      
      if (key.revoked) {
        return res.status(401).json({
          success: false,
          error: 'API key revoked',
          valid: false
        });
      }
      
      if (new Date(key.expires_at) < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'API key expired',
          valid: false
        });
      }
      
      // Update last used
      await pool.query(
        'UPDATE public.api_keys SET last_used_at = NOW() WHERE id = $1',
        [key.id]
      );
      
      return res.json({
        success: true,
        valid: true,
        data: {
          id: key.id,
          name: key.name,
          last_used_at: new Date()
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[api-keys]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'API_KEY_ERROR'
    });
  }
};
