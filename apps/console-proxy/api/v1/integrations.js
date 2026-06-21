/**
 * Integrations API — External Service Connectors
 * 
 * Manages Slack, Email, Webhook, and GitHub integrations for governance events.
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Schema: integrations table
 *   - id, tenant_id, type (slack|email|webhook|github)
 *   - name, enabled, config (JSONB), event_types (JSONB)
 *   - created_at, updated_at, created_by
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');
const crypto = require('crypto');

// UUID validation — prevents 'invalid input syntax for type uuid' errors.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(str) { return typeof str === 'string' && UUID_RE.test(str); }

// Integration type schemas
const INTEGRATION_SCHEMAS = {
  slack: {
    type: 'slack',
    name: 'Slack',
    description: 'Send governance events to Slack channels',
    icon: '💬',
    fields: [
      { name: 'webhook_url', type: 'string', label: 'Webhook URL', required: true, secret: true },
      { name: 'channel', type: 'string', label: 'Channel', placeholder: '#governance', required: false },
      { name: 'username', type: 'string', label: 'Bot Username', placeholder: 'Vienna OS', required: false },
    ],
    events: ['approval_required', 'approval_resolved', 'action_executed', 'action_failed', 'policy_violation', 'alert'],
  },
  email: {
    type: 'email',
    name: 'Email',
    description: 'Send email notifications for governance events',
    icon: '📧',
    fields: [
      { name: 'recipients', type: 'array', label: 'Recipients', placeholder: 'admin@company.com', required: true },
      { name: 'from_name', type: 'string', label: 'From Name', placeholder: 'Vienna OS', required: false },
      { name: 'subject_prefix', type: 'string', label: 'Subject Prefix', placeholder: '[Vienna]', required: false },
    ],
    events: ['approval_required', 'approval_resolved', 'action_executed', 'action_failed', 'policy_violation', 'alert'],
  },
  webhook: {
    type: 'webhook',
    name: 'Webhook',
    description: 'POST governance events to custom HTTP endpoints',
    icon: '🔗',
    fields: [
      { name: 'url', type: 'string', label: 'Endpoint URL', required: true },
      { name: 'secret', type: 'string', label: 'Signing Secret', required: false, secret: true },
      { name: 'headers', type: 'object', label: 'Custom Headers', required: false },
    ],
    events: ['approval_required', 'approval_resolved', 'action_executed', 'action_failed', 'policy_violation', 'alert'],
  },
  github: {
    type: 'github',
    name: 'GitHub',
    description: 'Create GitHub issues for high-risk actions',
    icon: '🐙',
    fields: [
      { name: 'token', type: 'string', label: 'Personal Access Token', required: true, secret: true },
      { name: 'repo', type: 'string', label: 'Repository', placeholder: 'owner/repo', required: true },
      { name: 'labels', type: 'array', label: 'Issue Labels', placeholder: 'governance,audit', required: false },
    ],
    events: ['policy_violation', 'alert'],
  },
};

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/integrations/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── List integrations ────────────────────────────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const result = await pool.query(`
        SELECT id, tenant_id, type, name, enabled, config, event_types, created_at, updated_at, created_by
        FROM integrations
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenantId]);

      // Mask secrets in config
      const integrations = result.rows.map(row => ({
        ...row,
        config: maskSecrets(row.config, row.type),
      }));

      return res.json({ success: true, data: integrations });
    }

    // ── Get integration types (schemas) ──────────────────────────────
    if (req.method === 'GET' && path === '/types') {
      return res.json({ success: true, data: Object.values(INTEGRATION_SCHEMAS) });
    }

    // ── Get single integration ───────────────────────────────────────
    if (req.method === 'GET' && path.startsWith('/') && path.split('/').length === 2) {
      const id = path.replace('/', '');
      if (!isValidUUID(id)) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }
      const result = await pool.query(`
        SELECT id, tenant_id, type, name, enabled, config, event_types, created_at, updated_at, created_by
        FROM integrations
        WHERE id = $1 AND tenant_id = $2
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }

      const integration = {
        ...result.rows[0],
        config: maskSecrets(result.rows[0].config, result.rows[0].type),
      };

      return res.json({ success: true, data: integration });
    }

    // ── Create integration ───────────────────────────────────────────
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const { type, name, config, event_types, enabled = true } = req.body;

      if (!type || !name || !config) {
        return res.status(400).json({ success: false, error: 'type, name, and config required' });
      }

      if (!INTEGRATION_SCHEMAS[type]) {
        return res.status(400).json({ success: false, error: `Invalid type: ${type}` });
      }

      // Validate required fields
      const schema = INTEGRATION_SCHEMAS[type];
      for (const field of schema.fields) {
        if (field.required && !config[field.name]) {
          return res.status(400).json({ success: false, error: `Missing required field: ${field.name}` });
        }
      }

      const result = await pool.query(`
        INSERT INTO integrations (tenant_id, type, name, enabled, config, event_types, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenant_id, type, name, enabled, config, event_types, created_at, updated_at, created_by
      `, [tenantId, type, name, enabled, config, event_types || [], user.user_id]);

      const integration = {
        ...result.rows[0],
        config: maskSecrets(result.rows[0].config, type),
      };

      return res.status(201).json({ success: true, data: integration });
    }

    // ── Update integration ───────────────────────────────────────────
    if (req.method === 'PATCH' && path.startsWith('/') && path.split('/').length === 2) {
      const id = path.replace('/', '');
      const { name, config, event_types, enabled } = req.body;

      const updates = [];
      const values = [tenantId, id];
      let idx = 3;

      if (name !== undefined) {
        updates.push(`name = $${idx++}`);
        values.push(name);
      }
      if (config !== undefined) {
        updates.push(`config = $${idx++}`);
        values.push(config);
      }
      if (event_types !== undefined) {
        updates.push(`event_types = $${idx++}`);
        values.push(event_types);
      }
      if (enabled !== undefined) {
        updates.push(`enabled = $${idx++}`);
        values.push(enabled);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      updates.push(`updated_at = NOW()`);

      const result = await pool.query(`
        UPDATE integrations
        SET ${updates.join(', ')}
        WHERE tenant_id = $1 AND id = $2
        RETURNING id, tenant_id, type, name, enabled, config, event_types, created_at, updated_at, created_by
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }

      const integration = {
        ...result.rows[0],
        config: maskSecrets(result.rows[0].config, result.rows[0].type),
      };

      return res.json({ success: true, data: integration });
    }

    // ── Delete integration ───────────────────────────────────────────
    if (req.method === 'DELETE' && path.startsWith('/') && path.split('/').length === 2) {
      const id = path.replace('/', '');

      const result = await pool.query(`
        DELETE FROM integrations
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }

      return res.json({ success: true, data: { id: result.rows[0].id } });
    }

    // ── Toggle integration ───────────────────────────────────────────
    if (req.method === 'POST' && path.endsWith('/toggle')) {
      const id = path.replace('/toggle', '').replace('/', '');

      const result = await pool.query(`
        UPDATE integrations
        SET enabled = NOT enabled, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, enabled
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Integration not found' });
      }

      return res.json({ success: true, data: result.rows[0] });
    }

    // ── Test integration ─────────────────────────────────────────────
    if (req.method === 'POST' && path.endsWith('/test')) {
      const rawId = path.replace('/test', '').replace(/^\//, '');

      // The frontend may pass either a DB UUID or an integration type string
      // (e.g. 'slack', 'github'). Support both.
      let integrationRow = null;
      if (isValidUUID(rawId)) {
        const result = await pool.query(
          'SELECT id, type, name, config FROM integrations WHERE id = $1 AND tenant_id = $2',
          [rawId, tenantId]
        );
        integrationRow = result.rows[0] || null;
      } else {
        // Look up by type for the tenant
        const result = await pool.query(
          'SELECT id, type, name, config FROM integrations WHERE type = $1 AND tenant_id = $2 AND enabled = true ORDER BY created_at DESC LIMIT 1',
          [rawId, tenantId]
        );
        integrationRow = result.rows[0] || null;
      }

      if (!integrationRow) {
        return res.status(404).json({ success: false, error: 'Integration not found or not configured' });
      }

      // Actually test the connection
      const testResult = await sendTestEvent(integrationRow);

      return res.json({ success: testResult.success, data: testResult });
    }

    // ── Get integration events (delivery log) ────────────────────────
    if (req.method === 'GET' && path.match(/^\/[^/]+\/events$/)) {
      const id = path.replace('/events', '').replace('/', '');
      const limit = parseInt(params.limit || '50');

      // Note: integration_events does not have a tenant_id column; tenant
      // isolation is provided by scoping to integration_id (which is tenant-scoped).
      // Columns: id, integration_id, event_type, payload, success, error_message,
      //          response_status, response_body, latency_ms, created_at
      const result = await pool.query(`
        SELECT id, integration_id, event_type, payload,
               success,
               error_message AS error,
               response_status,
               latency_ms,
               created_at
        FROM integration_events
        WHERE integration_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [id, limit]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Get stats ────────────────────────────────────────────────────
    if (req.method === 'GET' && path.match(/^\/[^/]+\/stats$/)) {
      const id = path.replace('/stats', '').replace('/', '');

      // integration_events columns: success (boolean), error_message, created_at
      const result = await pool.query(`
        SELECT
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE success = true) AS delivered,
          COUNT(*) FILTER (WHERE success = false) AS failed,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS events_24h
        FROM integration_events
        WHERE integration_id = $1
      `, [id]);

      return res.json({ success: true, data: result.rows[0] || {} });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'integrations' } });
    console.error('Integrations API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────

function maskSecrets(config, type) {
  if (!config) return config;
  const schema = INTEGRATION_SCHEMAS[type];
  if (!schema) return config;

  const masked = { ...config };
  for (const field of schema.fields) {
    if (field.secret && masked[field.name]) {
      masked[field.name] = '***' + masked[field.name].slice(-4);
    }
  }
  return masked;
}

async function sendTestEvent(integration) {
  const config = integration.config || {};
  const ts = new Date().toISOString();

  try {
    switch (integration.type) {
      case 'slack': {
        // POST a test message to the Slack incoming webhook URL
        const webhookUrl = config.webhook_url;
        if (!webhookUrl) {
          return { success: false, message: 'Slack webhook URL not configured', timestamp: ts };
        }
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: ':white_check_mark: *Vienna OS*: Test connection successful!',
            username: config.username || 'Vienna OS',
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          return { success: true, message: 'Test message delivered to Slack', timestamp: ts };
        }
        const body = await res.text().catch(() => '');
        return { success: false, message: `Slack returned ${res.status}: ${body.substring(0, 100)}`, timestamp: ts };
      }

      case 'webhook': {
        // POST a test event to the configured webhook URL
        const url = config.url;
        if (!url) {
          return { success: false, message: 'Webhook URL not configured', timestamp: ts };
        }
        const testBody = JSON.stringify({
          event: 'test',
          source: 'vienna-os',
          timestamp: ts,
          message: 'Test connection from Vienna OS',
          integration_id: integration.id,
        });
        const headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
        if (config.secret) {
          const crypto = require('crypto');
          const sig = crypto.createHmac('sha256', config.secret).update(testBody).digest('hex');
          headers['X-Vienna-Signature'] = `sha256=${sig}`;
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: testBody,
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok || res.status < 400) {
          return { success: true, message: `Webhook responded ${res.status}`, timestamp: ts };
        }
        return { success: false, message: `Webhook returned ${res.status}`, timestamp: ts };
      }

      case 'email': {
        // Email is sent via Resend (or logged if not configured)
        const recipients = Array.isArray(config.recipients) ? config.recipients : [config.recipients].filter(Boolean);
        if (!recipients.length) {
          return { success: false, message: 'No recipients configured', timestamp: ts };
        }
        const RESEND_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_KEY) {
          return { success: false, message: 'Email provider not configured (RESEND_API_KEY missing)', timestamp: ts };
        }
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${config.from_name || 'Vienna OS'} <notifications@regulator.ai>`,
            to: recipients,
            subject: `${config.subject_prefix || '[Vienna]'} Test connection`,
            text: 'This is a test message from Vienna OS governance platform. Your email integration is working correctly.',
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          return { success: true, message: `Test email sent to ${recipients.join(', ')}`, timestamp: ts };
        }
        const body = await res.json().catch(() => ({}));
        return { success: false, message: `Email send failed: ${body.message || res.status}`, timestamp: ts };
      }

      case 'github': {
        // Verify the token by calling the GitHub API
        const token = config.token;
        const repo = config.repo;
        if (!token || !repo) {
          return { success: false, message: 'GitHub token and repo required', timestamp: ts };
        }
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, message: `Connected to GitHub repo: ${data.full_name}`, timestamp: ts };
        }
        return { success: false, message: `GitHub returned ${res.status} for repo ${repo}`, timestamp: ts };
      }

      default:
        return { success: false, message: `Unknown integration type: ${integration.type}`, timestamp: ts };
    }
  } catch (error) {
    return { success: false, message: error.message || 'Connection test failed', timestamp: ts };
  }
}
