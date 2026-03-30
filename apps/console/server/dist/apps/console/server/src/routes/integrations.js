/**
 * Integration Routes — Vienna OS
 *
 * CRUD for integrations, test connections, callbacks, and event logs.
 */
import { Router } from 'express';
import { query, queryOne, execute } from '../db/postgres.js';
import { getAdapter, getAllConfigSchemas, hasAdapter } from '../services/integrations/adapterRegistry.js';
import { dispatchEvent, getIntegrationStats, resetCircuitBreaker } from '../services/integrations/dispatcher.js';
import { verifyApprovalToken } from '../services/integrations/emailAdapter.js';
export function createIntegrationsRouter() {
    const router = Router();
    // ──────────────────────────────────────────────
    // GET /types — List available integration types
    // ──────────────────────────────────────────────
    router.get('/types', (_req, res) => {
        res.json({
            success: true,
            data: getAllConfigSchemas(),
            timestamp: new Date().toISOString(),
        });
    });
    // ──────────────────────────────────────────────
    // GET / — List all integrations
    // ──────────────────────────────────────────────
    router.get('/', async (_req, res) => {
        try {
            const integrations = await query(`SELECT i.*, 
          (SELECT COUNT(*) FROM integration_events ie WHERE ie.integration_id = i.id) as event_count,
          (SELECT COUNT(*) FROM integration_events ie WHERE ie.integration_id = i.id AND ie.success = true) as success_count
         FROM integrations i ORDER BY i.created_at DESC`);
            // Mask sensitive config fields
            const masked = integrations.map(maskConfig);
            res.json({
                success: true,
                data: masked,
                count: masked.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] List error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'INTEGRATION_LIST_ERROR',
                timestamp: new Date().toISOString(),
            });
        }
    });
    // ──────────────────────────────────────────────
    // GET /:id — Get integration with stats
    // ──────────────────────────────────────────────
    router.get('/:id', async (req, res) => {
        try {
            const integration = await queryOne(`SELECT i.*, 
          (SELECT COUNT(*) FROM integration_events ie WHERE ie.integration_id = i.id) as event_count
         FROM integrations i WHERE i.id = $1`, [req.params.id]);
            if (!integration) {
                res.status(404).json({ success: false, error: 'Integration not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
                return;
            }
            const stats = await getIntegrationStats(integration.id);
            res.json({
                success: true,
                data: { ...maskConfig(integration), stats },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Get error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_GET_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // POST / — Create integration
    // ──────────────────────────────────────────────
    router.post('/', async (req, res) => {
        try {
            const { type, name, description, config, event_types, filters } = req.body;
            if (!type || !name) {
                res.status(400).json({ success: false, error: 'type and name are required', code: 'INVALID_REQUEST', timestamp: new Date().toISOString() });
                return;
            }
            if (!hasAdapter(type)) {
                res.status(400).json({ success: false, error: `Unknown integration type: ${type}`, code: 'INVALID_TYPE', timestamp: new Date().toISOString() });
                return;
            }
            // Validate config
            const adapter = getAdapter(type);
            const validation = adapter.validateConfig(config || {});
            if (!validation.valid) {
                res.status(400).json({ success: false, error: validation.errors.join(', '), code: 'INVALID_CONFIG', timestamp: new Date().toISOString() });
                return;
            }
            const integration = await queryOne(`INSERT INTO integrations (type, name, description, config, event_types, filters)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [type, name, description || null, JSON.stringify(config || {}), JSON.stringify(event_types || ['approval_required']), JSON.stringify(filters || {})]);
            res.status(201).json({
                success: true,
                data: maskConfig(integration),
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Create error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_CREATE_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // PUT /:id — Update integration
    // ──────────────────────────────────────────────
    router.put('/:id', async (req, res) => {
        try {
            const existing = await queryOne('SELECT * FROM integrations WHERE id = $1', [req.params.id]);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Integration not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
                return;
            }
            const { name, description, config, event_types, filters, enabled } = req.body;
            const newConfig = config || existing.config;
            // Re-validate config if changed
            if (config) {
                const adapter = getAdapter(existing.type);
                const validation = adapter.validateConfig(newConfig);
                if (!validation.valid) {
                    res.status(400).json({ success: false, error: validation.errors.join(', '), code: 'INVALID_CONFIG', timestamp: new Date().toISOString() });
                    return;
                }
            }
            const updated = await queryOne(`UPDATE integrations SET 
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           config = $4,
           event_types = COALESCE($5, event_types),
           filters = COALESCE($6, filters),
           enabled = COALESCE($7, enabled),
           updated_at = NOW()
         WHERE id = $1 RETURNING *`, [
                req.params.id,
                name || null,
                description !== undefined ? description : null,
                JSON.stringify(newConfig),
                event_types ? JSON.stringify(event_types) : null,
                filters ? JSON.stringify(filters) : null,
                enabled !== undefined ? enabled : null,
            ]);
            res.json({
                success: true,
                data: maskConfig(updated),
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Update error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_UPDATE_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // DELETE /:id — Delete integration
    // ──────────────────────────────────────────────
    router.delete('/:id', async (req, res) => {
        try {
            const existing = await queryOne('SELECT id FROM integrations WHERE id = $1', [req.params.id]);
            if (!existing) {
                res.status(404).json({ success: false, error: 'Integration not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
                return;
            }
            await execute('DELETE FROM integrations WHERE id = $1', [req.params.id]);
            res.json({ success: true, data: { deleted: true }, timestamp: new Date().toISOString() });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Delete error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_DELETE_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // POST /:id/test — Test connection
    // ──────────────────────────────────────────────
    router.post('/:id/test', async (req, res) => {
        try {
            const integration = await queryOne('SELECT * FROM integrations WHERE id = $1', [req.params.id]);
            if (!integration) {
                res.status(404).json({ success: false, error: 'Integration not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
                return;
            }
            const adapter = getAdapter(integration.type);
            if (!adapter) {
                res.status(400).json({ success: false, error: `No adapter for type: ${integration.type}`, code: 'NO_ADAPTER', timestamp: new Date().toISOString() });
                return;
            }
            const result = await adapter.testConnection(integration.config);
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Test error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_TEST_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // POST /:id/toggle — Enable/disable
    // ──────────────────────────────────────────────
    router.post('/:id/toggle', async (req, res) => {
        try {
            const integration = await queryOne('SELECT * FROM integrations WHERE id = $1', [req.params.id]);
            if (!integration) {
                res.status(404).json({ success: false, error: 'Integration not found', code: 'NOT_FOUND', timestamp: new Date().toISOString() });
                return;
            }
            const updated = await queryOne(`UPDATE integrations SET enabled = NOT enabled, updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
            // Reset circuit breaker when re-enabling
            if (updated.enabled) {
                await resetCircuitBreaker(req.params.id);
            }
            res.json({
                success: true,
                data: maskConfig(updated),
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Toggle error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_TOGGLE_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // GET /:id/events — Event log
    // ──────────────────────────────────────────────
    router.get('/:id/events', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 50, 200);
            const offset = parseInt(req.query.offset) || 0;
            const events = await query(`SELECT * FROM integration_events WHERE integration_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [req.params.id, limit, offset]);
            const total = await queryOne('SELECT COUNT(*) as count FROM integration_events WHERE integration_id = $1', [req.params.id]);
            res.json({
                success: true,
                data: events,
                total: parseInt(total?.count || '0'),
                limit,
                offset,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Events error:', error);
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'INTEGRATION_EVENTS_ERROR', timestamp: new Date().toISOString() });
        }
    });
    // ──────────────────────────────────────────────
    // POST /callbacks/slack — Slack interaction callback
    // ──────────────────────────────────────────────
    router.post('/callbacks/slack', async (req, res) => {
        try {
            // Slack sends payload as form-encoded JSON string
            const payload = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
            const adapter = getAdapter('slack');
            if (!adapter?.handleCallback) {
                res.status(500).json({ error: 'Slack adapter not available' });
                return;
            }
            const result = await adapter.handleCallback(payload);
            if (result.action === 'approve' || result.action === 'deny') {
                // TODO: Wire to approval manager
                // For now, dispatch an approval_resolved event
                await dispatchEvent({
                    type: 'approval_resolved',
                    data: {
                        approval_id: result.data.approval_id,
                        summary: `${result.action === 'approve' ? 'Approved' : 'Denied'} by ${result.data.reviewed_by} via Slack`,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
            // Respond to Slack (200 = acknowledge)
            res.json({ text: `✅ Action ${result.action} recorded` });
        }
        catch (error) {
            console.error('[IntegrationsRoute] Slack callback error:', error);
            res.status(500).json({ error: 'Callback processing failed' });
        }
    });
    // ──────────────────────────────────────────────
    // GET /callbacks/email — Email approval callback
    // ──────────────────────────────────────────────
    router.get('/callbacks/email', async (req, res) => {
        try {
            const { token, action } = req.query;
            if (!token || !action) {
                res.status(400).send(renderCallbackPage('Invalid Request', 'Missing token or action parameter.', false));
                return;
            }
            // Find the signing secret from any email integration
            const emailIntegration = await queryOne(`SELECT * FROM integrations WHERE type = 'email' AND enabled = true LIMIT 1`);
            const secret = emailIntegration?.config?.signing_secret || emailIntegration?.config?.api_key || 'vienna-default-secret';
            const verification = verifyApprovalToken(token, secret);
            if (!verification.valid) {
                res.status(400).send(renderCallbackPage('Invalid Link', verification.error || 'Token verification failed.', false));
                return;
            }
            // TODO: Wire to approval manager
            await dispatchEvent({
                type: 'approval_resolved',
                data: {
                    approval_id: verification.payload.aid,
                    summary: `${verification.payload.act === 'approve' ? 'Approved' : 'Denied'} via email`,
                    timestamp: new Date().toISOString(),
                },
            });
            const actionLabel = verification.payload.act === 'approve' ? 'Approved' : 'Denied';
            res.send(renderCallbackPage(`${actionLabel}`, `The action has been ${actionLabel.toLowerCase()}.`, true));
        }
        catch (error) {
            console.error('[IntegrationsRoute] Email callback error:', error);
            res.status(500).send(renderCallbackPage('Error', 'Something went wrong processing your request.', false));
        }
    });
    return router;
}
// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const SENSITIVE_KEYS = ['token', 'api_key', 'secret', 'password', 'pass', 'webhook_url', 'smtp_pass', 'hmac_secret', 'auth_value', 'signing_secret'];
function maskConfig(integration) {
    if (!integration?.config)
        return integration;
    const masked = { ...integration, config: { ...integration.config } };
    for (const key of Object.keys(masked.config)) {
        if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
            const val = masked.config[key];
            if (typeof val === 'string' && val.length > 4) {
                masked.config[key] = val.slice(0, 4) + '•'.repeat(Math.min(val.length - 4, 20));
            }
        }
    }
    return masked;
}
function renderCallbackPage(title, message, success) {
    const color = success ? '#22c55e' : '#ef4444';
    const icon = success ? '✅' : '❌';
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Vienna OS - ${title}</title></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="text-align:center;padding:48px;background:#1f2937;border-radius:16px;border:1px solid ${color}33;max-width:400px;">
  <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
  <h1 style="color:${color};font-size:24px;margin:0 0 8px 0;">${title}</h1>
  <p style="color:#9ca3af;font-size:14px;margin:0;">${message}</p>
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can close this tab.</p>
</div>
</body></html>`;
}
//# sourceMappingURL=integrations.js.map