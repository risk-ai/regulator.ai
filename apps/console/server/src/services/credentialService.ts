/**
 * Credential Service — Phase 4A
 * 
 * CRUD + resolve for adapter_configs with encrypted credentials.
 * 
 * SECURITY INVARIANT:
 * - `resolve()` is the ONLY method that returns decrypted credentials
 * - `resolve()` is called ONLY by the execution adapter layer
 * - All other methods return redacted configs (encrypted_credentials = null)
 * - API routes NEVER call resolve()
 */

import { query, queryOne, execute } from '../db/postgres.js';
import { encryptCredential, decryptCredential, isCredentialKeyConfigured } from './credentialCrypto.js';

// ---- Types ----

export interface AdapterConfigInput {
  adapter_type: string;
  name: string;
  endpoint_url: string;
  headers?: Record<string, string>;
  auth_type?: string;
  auth_mode?: 'bearer' | 'api_key_header' | 'basic' | 'hmac';
  credential_alias?: string;
  credentials: string;  // plaintext — will be encrypted before storage
}

export interface AdapterConfigRedacted {
  id: string;
  tenant_id: string;
  adapter_type: string;
  name: string;
  endpoint_url: string;
  headers: Record<string, string> | null;
  auth_type: string | null;
  auth_mode: string;
  credential_alias: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
  disabled_reason: string | null;
  has_credentials: boolean;  // true if encrypted_credentials is non-null
}

export interface ResolvedCredentials {
  config_id: string;
  auth_mode: string;
  endpoint_url: string;
  headers: Record<string, string>;
  /** Decrypted credential material — MEMORY ONLY, never persist */
  secret: string;
}

// ---- Service ----

/**
 * Create a new adapter config with encrypted credentials.
 */
export async function createAdapterConfig(
  tenantId: string,
  input: AdapterConfigInput,
): Promise<AdapterConfigRedacted> {
  if (!isCredentialKeyConfigured()) {
    throw new Error('VIENNA_CREDENTIAL_KEY not configured. Cannot store credentials.');
  }

  const encrypted = encryptCredential(input.credentials);

  const rows = await query<any>(
    `INSERT INTO regulator.adapter_configs 
     (tenant_id, adapter_type, name, endpoint_url, headers, auth_type, auth_mode, 
      credential_alias, encrypted_credentials, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
     RETURNING *`,
    [
      tenantId,
      input.adapter_type,
      input.name,
      input.endpoint_url,
      input.headers ? JSON.stringify(input.headers) : null,
      input.auth_type || input.auth_mode || 'bearer',
      input.auth_mode || 'bearer',
      input.credential_alias || null,
      encrypted,
    ],
  );

  return toRedacted(rows[0]);
}

/**
 * Get adapter config by ID (redacted — no credentials).
 */
export async function getAdapterConfig(
  tenantId: string,
  id: string,
): Promise<AdapterConfigRedacted | null> {
  const row = await queryOne<any>(
    `SELECT * FROM regulator.adapter_configs WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  return row ? toRedacted(row) : null;
}

/**
 * Get adapter config by alias (redacted).
 */
export async function getAdapterConfigByAlias(
  tenantId: string,
  alias: string,
): Promise<AdapterConfigRedacted | null> {
  const row = await queryOne<any>(
    `SELECT * FROM regulator.adapter_configs 
     WHERE credential_alias = $1 AND tenant_id = $2 AND enabled = true`,
    [alias, tenantId],
  );
  return row ? toRedacted(row) : null;
}

/**
 * RESOLVE: Decrypt credentials for execution use ONLY.
 * 
 * ⚠️  This is the only function that returns plaintext secrets.
 * ⚠️  Call this ONLY from the execution adapter layer.
 * ⚠️  Never call from API routes, SSE, or any external-facing code.
 */
export async function resolveCredentials(
  tenantId: string,
  configId: string,
): Promise<ResolvedCredentials> {
  const row = await queryOne<any>(
    `SELECT * FROM regulator.adapter_configs 
     WHERE id = $1 AND tenant_id = $2 AND enabled = true`,
    [configId, tenantId],
  );

  if (!row) {
    throw new Error(`Adapter config ${configId} not found or disabled for tenant ${tenantId}`);
  }

  if (!row.encrypted_credentials) {
    throw new Error(`Adapter config ${configId} has no stored credentials`);
  }

  if (row.disabled_at) {
    throw new Error(`Adapter config ${configId} is disabled: ${row.disabled_reason || 'no reason'}`);
  }

  const secret = decryptCredential(row.encrypted_credentials);

  return {
    config_id: row.id,
    auth_mode: row.auth_mode || row.auth_type || 'bearer',
    endpoint_url: row.endpoint_url,
    headers: typeof row.headers === 'string' ? JSON.parse(row.headers) : (row.headers || {}),
    secret,
  };
}

/**
 * Rotate credentials (re-encrypt with new value).
 */
export async function rotateCredentials(
  tenantId: string,
  configId: string,
  newCredentials: string,
): Promise<void> {
  if (!isCredentialKeyConfigured()) {
    throw new Error('VIENNA_CREDENTIAL_KEY not configured.');
  }

  const encrypted = encryptCredential(newCredentials);

  const result = await execute(
    `UPDATE regulator.adapter_configs 
     SET encrypted_credentials = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [encrypted, configId, tenantId],
  );

  if (!result) {
    throw new Error(`Adapter config ${configId} not found for tenant ${tenantId}`);
  }
}

/**
 * Disable an adapter config (soft delete).
 */
export async function disableAdapterConfig(
  tenantId: string,
  configId: string,
  reason: string,
): Promise<void> {
  await execute(
    `UPDATE regulator.adapter_configs 
     SET enabled = false, disabled_at = NOW(), disabled_reason = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [reason, configId, tenantId],
  );
}

/**
 * List adapter configs for a tenant (all redacted).
 */
export async function listAdapterConfigs(
  tenantId: string,
): Promise<AdapterConfigRedacted[]> {
  const rows = await query<any>(
    `SELECT * FROM regulator.adapter_configs 
     WHERE tenant_id = $1 
     ORDER BY created_at DESC`,
    [tenantId],
  );

  return rows.map(toRedacted);
}

// ---- Helpers ----

function toRedacted(row: any): AdapterConfigRedacted {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    adapter_type: row.adapter_type,
    name: row.name,
    endpoint_url: row.endpoint_url,
    headers: typeof row.headers === 'string' ? JSON.parse(row.headers) : row.headers,
    auth_type: row.auth_type,
    auth_mode: row.auth_mode || 'bearer',
    credential_alias: row.credential_alias,
    enabled: row.enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
    disabled_at: row.disabled_at,
    disabled_reason: row.disabled_reason,
    has_credentials: !!row.encrypted_credentials,
    // NOTE: encrypted_credentials deliberately excluded
  };
}
