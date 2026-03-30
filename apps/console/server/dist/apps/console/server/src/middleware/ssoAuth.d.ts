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
export interface SSOConfig {
    provider: 'saml' | 'oidc' | 'oauth2';
    tenant_id: string;
    enabled: boolean;
    saml_entry_point?: string;
    saml_issuer?: string;
    saml_cert?: string;
    saml_callback_url?: string;
    oidc_issuer?: string;
    oidc_client_id?: string;
    oidc_client_secret?: string;
    oidc_redirect_uri?: string;
    oidc_scopes?: string[];
    default_role?: string;
    allowed_domains?: string[];
    force_sso?: boolean;
}
/**
 * Generate OIDC authorization URL
 */
export declare function getOIDCAuthUrl(config: SSOConfig): string;
/**
 * Exchange OIDC authorization code for tokens
 */
export declare function exchangeOIDCCode(config: SSOConfig, code: string, state: string): Promise<OIDCTokenResult>;
export interface OIDCTokenResult {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    email: string;
    name: string;
    sub: string;
    email_verified: boolean;
    tenant_id: string;
}
/**
 * JIT (Just-In-Time) User Provisioning
 * Creates a user on first SSO login if they don't exist
 */
export declare function jitProvision(db: any, tenantId: string, email: string, name: string, defaultRole?: string, allowedDomains?: string[]): Promise<{
    userId: string;
    created: boolean;
}>;
/**
 * SSO Routes factory
 *
 * Mounts:
 * - GET /api/v1/auth/sso/:tenantSlug — Initiate SSO login
 * - GET /api/v1/auth/sso/callback — Handle IdP callback
 * - GET /api/v1/auth/sso/config — Get tenant SSO config (admin only)
 * - PUT /api/v1/auth/sso/config — Update tenant SSO config (admin only)
 */
export declare function createSSORoutes(db: any, issueJWT: (user: any) => string): any;
//# sourceMappingURL=ssoAuth.d.ts.map