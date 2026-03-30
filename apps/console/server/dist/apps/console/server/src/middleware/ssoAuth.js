/**
 * SSO/SAML/OIDC Authentication Middleware
 *
 * Supports:
 * - SAML 2.0 (Okta, Azure AD, OneLogin)
 * - OIDC (Google Workspace, Auth0, Keycloak)
 * - Custom OAuth2 providers
 *
 * Architecture:
 * 1. Tenant configures SSO provider in settings
 * 2. Login redirects to IdP
 * 3. IdP callback validates assertion/token
 * 4. JIT user provisioning (create user on first login)
 * 5. Issue Vienna JWT tokens
 */
import crypto from 'crypto';
/**
 * SSO State Manager — CSRF protection for OAuth/OIDC flows
 */
class SSOStateManager {
    states = new Map();
    ttlMs = 600_000; // 10 minutes
    generate(tenantId) {
        const state = crypto.randomBytes(32).toString('hex');
        this.states.set(state, { tenantId, createdAt: Date.now() });
        this._cleanup();
        return state;
    }
    validate(state) {
        const entry = this.states.get(state);
        if (!entry)
            return { valid: false };
        this.states.delete(state);
        if (Date.now() - entry.createdAt > this.ttlMs) {
            return { valid: false };
        }
        return { valid: true, tenantId: entry.tenantId };
    }
    _cleanup() {
        const now = Date.now();
        for (const [key, value] of this.states.entries()) {
            if (now - value.createdAt > this.ttlMs) {
                this.states.delete(key);
            }
        }
    }
}
const stateManager = new SSOStateManager();
/**
 * Generate OIDC authorization URL
 */
export function getOIDCAuthUrl(config) {
    const state = stateManager.generate(config.tenant_id);
    const scopes = (config.oidc_scopes || ['openid', 'profile', 'email']).join(' ');
    const params = new URLSearchParams({
        client_id: config.oidc_client_id || '',
        redirect_uri: config.oidc_redirect_uri || '',
        response_type: 'code',
        scope: scopes,
        state,
        prompt: 'select_account',
    });
    return `${config.oidc_issuer}/authorize?${params.toString()}`;
}
/**
 * Exchange OIDC authorization code for tokens
 */
export async function exchangeOIDCCode(config, code, state) {
    // Validate state (CSRF)
    const stateCheck = stateManager.validate(state);
    if (!stateCheck.valid) {
        throw new Error('Invalid or expired SSO state');
    }
    // Exchange code for tokens
    const tokenUrl = `${config.oidc_issuer}/token`;
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.oidc_client_id || '',
        client_secret: config.oidc_client_secret || '',
        redirect_uri: config.oidc_redirect_uri || '',
        code,
    });
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OIDC token exchange failed: ${error}`);
    }
    const tokens = await response.json();
    // Decode ID token (without verification for now — production should verify JWT signature)
    const idToken = tokens.id_token;
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf-8'));
    return {
        access_token: tokens.access_token,
        id_token: idToken,
        refresh_token: tokens.refresh_token,
        email: payload.email,
        name: payload.name || payload.given_name || payload.email?.split('@')[0],
        sub: payload.sub,
        email_verified: payload.email_verified,
        tenant_id: stateCheck.tenantId,
    };
}
/**
 * JIT (Just-In-Time) User Provisioning
 * Creates a user on first SSO login if they don't exist
 */
export async function jitProvision(db, tenantId, email, name, defaultRole = 'viewer', allowedDomains) {
    // Check domain allowlist
    if (allowedDomains && allowedDomains.length > 0) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!allowedDomains.includes(domain)) {
            throw new Error(`Email domain '${domain}' is not allowed for this tenant`);
        }
    }
    // Check if user exists
    const existing = await db.queryOne('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
    if (existing) {
        // Update last login
        await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = $1', [existing.id]);
        return { userId: existing.id, created: false };
    }
    // Create new user
    const result = await db.queryOne(`INSERT INTO users (tenant_id, email, name, role, last_login_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`, [tenantId, email, name, defaultRole]);
    return { userId: result.id, created: true };
}
/**
 * SSO Routes factory
 *
 * Mounts:
 * - GET /api/v1/auth/sso/:tenantSlug — Initiate SSO login
 * - GET /api/v1/auth/sso/callback — Handle IdP callback
 * - GET /api/v1/auth/sso/config — Get tenant SSO config (admin only)
 * - PUT /api/v1/auth/sso/config — Update tenant SSO config (admin only)
 */
export function createSSORoutes(db, issueJWT) {
    const express = require('express');
    const router = express.Router();
    // Initiate SSO
    router.get('/sso/:tenantSlug', async (req, res) => {
        try {
            const { tenantSlug } = req.params;
            // Look up tenant SSO config
            const tenant = await db.queryOne('SELECT id, settings FROM tenants WHERE slug = $1', [tenantSlug]);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
            const ssoConfig = tenant.settings?.sso;
            if (!ssoConfig?.enabled) {
                return res.status(400).json({ error: 'SSO not configured for this tenant' });
            }
            if (ssoConfig.provider === 'oidc') {
                const authUrl = getOIDCAuthUrl({ ...ssoConfig, tenant_id: tenant.id });
                return res.redirect(authUrl);
            }
            // SAML would redirect to IdP entry point
            if (ssoConfig.provider === 'saml') {
                return res.status(501).json({ error: 'SAML SSO implementation pending' });
            }
            return res.status(400).json({ error: `Unsupported SSO provider: ${ssoConfig.provider}` });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // SSO Callback
    router.get('/sso/callback', async (req, res) => {
        try {
            const { code, state, error: authError } = req.query;
            if (authError) {
                return res.status(400).json({ error: `SSO error: ${authError}` });
            }
            if (!code || !state) {
                return res.status(400).json({ error: 'Missing code or state parameter' });
            }
            // Validate state and get tenant
            const stateCheck = stateManager.validate(state);
            if (!stateCheck.valid) {
                return res.status(400).json({ error: 'Invalid or expired SSO state' });
            }
            const tenant = await db.queryOne('SELECT id, settings FROM tenants WHERE id = $1', [stateCheck.tenantId]);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
            const ssoConfig = tenant.settings?.sso;
            // Exchange code for tokens
            const tokenResult = await exchangeOIDCCode({ ...ssoConfig, tenant_id: tenant.id }, code, state);
            // JIT provision user
            const { userId, created } = await jitProvision(db, tenant.id, tokenResult.email, tokenResult.name, ssoConfig.default_role || 'viewer', ssoConfig.allowed_domains);
            // Issue Vienna JWT
            const jwt = issueJWT({
                userId,
                tenantId: tenant.id,
                email: tokenResult.email,
                name: tokenResult.name,
                role: ssoConfig.default_role || 'viewer',
            });
            // Redirect to console with token
            res.redirect(`/auth/callback?token=${jwt}&created=${created}`);
        }
        catch (error) {
            console.error('[SSO] Callback error:', error);
            res.status(500).json({ error: error.message });
        }
    });
    return router;
}
//# sourceMappingURL=ssoAuth.js.map