/**
 * Policy Templates API — Marketplace v1 (YAML-in-repo)
 *
 * GET  /api/v1/policy-templates        — list all curated templates
 * GET  /api/v1/policy-templates/:id    — get single template
 * POST /api/v1/policy-templates/:id/use — instantiate template as tenant policy
 */

const { requireAuth } = require('./_auth');
const { captureException } = require('../../lib/sentry');
const fs = require('fs');
const path = require('path');

// yamljs is a dependency in package.json (yamljs.load accepts a file path)
const yaml = require('yamljs');

const TEMPLATES_DIR = path.join(__dirname, '../../policy-templates');

/**
 * Parse YAML file → template object with derived display fields
 */
// Icon mapping for categories (used by UI)
const CATEGORY_ICONS = {
  regulatory: '⚖️',
  privacy: '🔒',
  financial: '💰',
  operations: '⚙️',
  security: '🛡️',
  general: '📋',
};

function loadTemplate(filePath) {
  const tpl = yaml.load(filePath); // yamljs.load takes a filename
  const category = tpl.category || 'general';
  return {
    id: tpl.id,
    name: tpl.name,
    description: (tpl.description || '').trim(),
    category,
    icon: CATEGORY_ICONS[category] || '📋',
    tags: tpl.tags || [],
    version: tpl.version || '1.0',
    author: tpl.author || 'Vienna OS',
    rule_count: (tpl.rules || []).length,
    rules: tpl.rules || [],
    policy_settings: tpl.policy_settings || {},
    use_count: 0, // populated from DB below when available
    priority: tpl.policy_settings?.default_priority || 0,
  };
}

/**
 * Load all templates from disk
 */
function loadAllTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map(f => {
    try {
      return loadTemplate(path.join(TEMPLATES_DIR, f));
    } catch (err) {
      console.error('[policy-templates] Failed to load', f, err.message);
      return null;
    }
  }).filter(Boolean);
}

/**
 * CATEGORY_META — display labels + hero colors for UI
 */
const CATEGORY_META = {
  regulatory: { label: 'Regulatory', color: '#6366f1', icon: '⚖️' },
  privacy:    { label: 'Privacy',    color: '#ec4899', icon: '🔒' },
  financial:  { label: 'Financial',  color: '#f59e0b', icon: '💰' },
  operations: { label: 'Operations', color: '#10b981', icon: '⚙️' },
  security:   { label: 'Security',   color: '#ef4444', icon: '🛡️' },
  general:    { label: 'General',    color: '#6b7280', icon: '📋' },
};

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const url = new URL(req.url, `https://${req.headers.host}`);
  const subPath = url.pathname.replace(/^\/api\/v1\/policy-templates\/?/, '');
  const parts = subPath.split('/').filter(Boolean);

  const tenantId = user.tenant_id;

  try {
    // ── GET /api/v1/policy-templates ───────────────────────────────
    if (req.method === 'GET' && parts.length === 0) {
      const templates = loadAllTemplates();
      const { category } = Object.fromEntries(url.searchParams);

      const filtered = category
        ? templates.filter(t => t.category === category)
        : templates;

      // Sort: regulatory first, then alpha
      const CATEGORY_ORDER = ['regulatory', 'financial', 'privacy', 'security', 'operations', 'general'];
      filtered.sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });

      return res.json({
        success: true,
        data: filtered.map(t => ({
          ...t,
          category_meta: CATEGORY_META[t.category] || CATEGORY_META.general,
        })),
        categories: Object.entries(CATEGORY_META).map(([id, meta]) => ({
          id,
          ...meta,
          count: templates.filter(t => t.category === id).length,
        })),
      });
    }

    // ── GET /api/v1/policy-templates/:id ──────────────────────────
    if (req.method === 'GET' && parts.length === 1) {
      const id = parts[0];
      const templates = loadAllTemplates();
      const tpl = templates.find(t => t.id === id);
      if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });
      return res.json({ success: true, data: { ...tpl, category_meta: CATEGORY_META[tpl.category] || CATEGORY_META.general } });
    }

    // ── POST /api/v1/policy-templates/:id/use (or /instantiate) ──
    // Instantiate template → tenant-scoped policy
    if (req.method === 'POST' && parts.length === 2 && (parts[1] === 'use' || parts[1] === 'instantiate')) {
      const id = parts[0];
      const templates = loadAllTemplates();
      const tpl = templates.find(t => t.id === id);
      if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });

      const body = await parseBody(req);
      const policyName = body.name || tpl.name;

      // Build policy object from template
      const { pool } = require('./_auth');
      const policyId = require('crypto').randomUUID();

      // Build conditions/actions from template rules
      const conditions = {};
      const actions = {};
      for (const rule of tpl.rules) {
        if (rule.condition) conditions[rule.id] = rule.condition;
        if (rule.action) actions[rule.id] = rule.action;
      }

      const result = await pool.query(
        `INSERT INTO regulator.policies
           (id, name, description, tenant_id, conditions, actions, priority, enabled, tags, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING id, name, description, enabled, created_at`,
        [
          policyId,
          policyName,
          tpl.description,
          tenantId,
          JSON.stringify(conditions),
          JSON.stringify(actions),
          tpl.policy_settings?.default_priority || 0,
          true,
          JSON.stringify(tpl.tags),
        ]
      );

      return res.status(201).json({
        success: true,
        data: {
          policy: result.rows[0],
          template_id: id,
          message: `Policy "${policyName}" created from template "${tpl.name}"`,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'policy-templates' } });
    console.error('[policy-templates]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}
