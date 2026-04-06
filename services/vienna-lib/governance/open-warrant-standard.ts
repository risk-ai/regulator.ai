/**
 * Open Warrant Standard (OWS) — v1.0
 * 
 * A portable, interoperable format for AI agent execution warrants.
 * Like JWT for authentication, OWS is for execution authorization.
 * 
 * Design principles:
 * 1. SELF-CONTAINED: A warrant carries all authorization context
 * 2. VERIFIABLE: Any party with the public key can verify the warrant
 * 3. PORTABLE: Works across governance platforms, frameworks, languages
 * 4. HUMAN-READABLE: JSON format with clear field names
 * 5. EXTENSIBLE: Custom claims via the `x-` prefix convention
 * 
 * Format: Three parts, dot-separated (like JWT):
 *   <header>.<payload>.<signature>
 * 
 * Where each part is base64url-encoded JSON.
 * 
 * Header: { alg, typ, kid }
 * Payload: { wid, iss, sub, aud, iat, exp, tier, scope, ... }
 * Signature: HMAC-SHA256 or RS256 over header.payload
 * 
 * @module governance/open-warrant-standard
 */

import * as crypto from 'crypto';
import type { RiskTierLevel } from './risk-tier';

// ─── OWS Types ───

/** Supported signing algorithms */
export type OWSAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'ES256' | 'none';

/** OWS Header */
export interface OWSHeader {
  /** Algorithm used for signing */
  alg: OWSAlgorithm;
  /** Type — always "OWS" */
  typ: 'OWS';
  /** Key ID — identifies which key was used to sign */
  kid?: string;
  /** Chain hash — links this warrant to its position in a Merkle chain */
  chn?: string;
  /** Specification version */
  ver: '1.0';
}

/** OWS Payload — the warrant claims */
export interface OWSPayload {
  // ─── Required Claims (like JWT registered claims) ───
  
  /** Warrant ID (unique) */
  wid: string;
  /** Issuer — who issued this warrant (governance platform identifier) */
  iss: string;
  /** Subject — the agent this warrant authorizes */
  sub: string;
  /** Audience — the target system(s) this warrant is valid for */
  aud: string | string[];
  /** Issued At — Unix timestamp (seconds) */
  iat: number;
  /** Expires At — Unix timestamp (seconds) */
  exp: number;
  /** Not Before — Unix timestamp (earliest valid time) */
  nbf?: number;

  // ─── Warrant-Specific Claims ───
  
  /** Risk tier classification */
  tier: RiskTierLevel;
  /** Allowed actions (scoped permissions) */
  scope: string[];
  /** Explicitly forbidden actions */
  deny?: string[];
  /** Human-readable objective/purpose */
  obj: string;
  /** Plan ID this warrant was issued for */
  pid: string;
  /** Approval IDs that authorized this warrant */
  aid?: string[];
  /** Truth snapshot reference */
  tsr?: string;
  /** Constraints on action parameters */
  cst?: Record<string, OWSConstraint>;
  /** Justification (required for T3) */
  jst?: string;
  /** Rollback plan reference (required for T3) */
  rbk?: string;

  // ─── Integrity Claims ───
  
  /** Content hash of the warrant payload */
  hsh?: string;
  /** Previous warrant hash in chain */
  prv?: string;
  /** Merkle root at time of issuance */
  mrt?: string;

  // ─── Extensible Claims ───
  
  /** Custom claims (x- prefix convention) */
  [key: `x-${string}`]: unknown;
}

/** Parameter constraint */
export interface OWSConstraint {
  /** Maximum value */
  max?: number;
  /** Minimum value */
  min?: number;
  /** Allowed values */
  enum?: (string | number)[];
  /** Regex pattern */
  pattern?: string;
  /** Required field */
  required?: boolean;
}

/** A complete OWS token (parsed) */
export interface OWSToken {
  header: OWSHeader;
  payload: OWSPayload;
  signature: string;
  /** The raw compact serialization */
  raw: string;
}

/** Verification result */
export interface OWSVerifyResult {
  valid: boolean;
  reason?: string;
  payload?: OWSPayload;
  expired?: boolean;
  not_before_violation?: boolean;
  scope_valid?: boolean;
}

/** Key material for signing/verification */
export interface OWSKey {
  kid: string;
  alg: OWSAlgorithm;
  /** HMAC secret or RSA/EC private key (PEM) */
  secret?: string;
  /** RSA/EC public key (PEM) for verification */
  publicKey?: string;
}

// ─── Base64url Encoding ───

function base64urlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  return buf.toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

// ─── OWS Implementation ───

export class OpenWarrantStandard {
  private keys: Map<string, OWSKey> = new Map();
  private defaultKeyId: string | null = null;

  constructor() {}

  /** Register a signing/verification key */
  registerKey(key: OWSKey): void {
    this.keys.set(key.kid, key);
    if (!this.defaultKeyId) {
      this.defaultKeyId = key.kid;
    }
  }

  /** Set the default signing key */
  setDefaultKey(kid: string): void {
    if (!this.keys.has(kid)) {
      throw new Error(`Key ${kid} not registered`);
    }
    this.defaultKeyId = kid;
  }

  /**
   * Issue an OWS token (compact serialization).
   * Returns a string in the format: header.payload.signature
   */
  issue(claims: Omit<OWSPayload, 'iat'> & { iat?: number }, options?: {
    kid?: string;
    chainHash?: string;
  }): string {
    const kid = options?.kid || this.defaultKeyId;
    if (!kid) throw new Error('No signing key available');

    const key = this.keys.get(kid);
    if (!key) throw new Error(`Key ${kid} not found`);

    // Build header
    const header: OWSHeader = {
      alg: key.alg,
      typ: 'OWS',
      kid,
      ver: '1.0',
    };

    if (options?.chainHash) {
      header.chn = options.chainHash;
    }

    // Build payload with defaults
    const now = Math.floor(Date.now() / 1000);
    const payload: OWSPayload = {
      iat: now,
      ...claims,
    };

    // Validate required claims
    this._validateClaims(payload);

    // Compute content hash
    payload.hsh = this._hashPayload(payload);

    // Encode
    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;

    // Sign
    const signature = this._sign(signingInput, key);
    const signatureB64 = base64urlEncode(Buffer.from(signature, 'hex'));

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  /**
   * Parse an OWS token string into its components.
   * Does NOT verify the signature — call verify() for that.
   */
  parse(token: string): OWSToken {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid OWS token format: expected 3 dot-separated parts');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    const header: OWSHeader = JSON.parse(base64urlDecode(headerB64));
    const payload: OWSPayload = JSON.parse(base64urlDecode(payloadB64));

    if (header.typ !== 'OWS') {
      throw new Error(`Invalid token type: ${header.typ} (expected OWS)`);
    }

    return {
      header,
      payload,
      signature: signatureB64,
      raw: token,
    };
  }

  /**
   * Verify an OWS token — checks signature, expiration, and not-before.
   * This can be done by ANY party with the verification key.
   */
  verify(token: string, options?: {
    /** Action to check against scope */
    action?: string;
    /** Parameters to check against constraints */
    params?: Record<string, unknown>;
    /** Clock skew tolerance in seconds */
    clockSkewSeconds?: number;
  }): OWSVerifyResult {
    try {
      const parsed = this.parse(token);
      const { header, payload } = parsed;
      const clockSkew = options?.clockSkewSeconds || 30;
      const now = Math.floor(Date.now() / 1000);

      // Find the verification key
      const key = header.kid ? this.keys.get(header.kid) : null;
      if (!key && header.alg !== 'none') {
        return { valid: false, reason: `Verification key ${header.kid} not found` };
      }

      // Verify signature
      if (header.alg !== 'none' && key) {
        const [headerB64, payloadB64] = token.split('.');
        const signingInput = `${headerB64}.${payloadB64}`;
        const expectedSig = base64urlEncode(Buffer.from(this._sign(signingInput, key), 'hex'));
        
        if (parsed.signature !== expectedSig) {
          return { valid: false, reason: 'SIGNATURE_INVALID' };
        }
      }

      // Check expiration
      if (payload.exp && now > payload.exp + clockSkew) {
        return { valid: false, reason: 'TOKEN_EXPIRED', expired: true, payload };
      }

      // Check not-before
      if (payload.nbf && now < payload.nbf - clockSkew) {
        return { valid: false, reason: 'TOKEN_NOT_YET_VALID', not_before_violation: true, payload };
      }

      // Check scope (if action provided)
      if (options?.action) {
        // Check deny list first
        if (payload.deny?.includes(options.action)) {
          return { valid: false, reason: 'ACTION_DENIED', scope_valid: false, payload };
        }

        // Check allow list
        if (!payload.scope.includes(options.action) && !payload.scope.includes('*')) {
          return { valid: false, reason: 'ACTION_NOT_IN_SCOPE', scope_valid: false, payload };
        }
      }

      // Check constraints (if params provided)
      if (options?.params && payload.cst) {
        const violation = this._checkConstraints(payload.cst, options.params);
        if (violation) {
          return { valid: false, reason: `CONSTRAINT_VIOLATION: ${violation}`, payload };
        }
      }

      return { valid: true, payload, scope_valid: true };
    } catch (error) {
      return { valid: false, reason: `PARSE_ERROR: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Convert a Vienna OS internal warrant to OWS format.
   * Bridge between Vienna's internal format and the open standard.
   */
  fromViennaWarrant(warrant: {
    warrant_id: string;
    issued_by: string;
    issued_at: string;
    expires_at: string;
    risk_tier: RiskTierLevel;
    plan_id: string;
    approval_ids?: string[];
    objective: string;
    allowed_actions: string[];
    forbidden_actions?: string[];
    constraints?: Record<string, unknown>;
    truth_snapshot_id?: string;
    justification?: string | null;
    rollback_plan?: string | null;
    signature?: string;
    [key: string]: unknown;
  }, options?: { agentId?: string; audience?: string | string[] }): string {
    const iat = Math.floor(new Date(warrant.issued_at).getTime() / 1000);
    const exp = Math.floor(new Date(warrant.expires_at).getTime() / 1000);

    const claims: Omit<OWSPayload, 'iat'> & { iat?: number } = {
      wid: warrant.warrant_id,
      iss: warrant.issued_by || 'vienna-os',
      sub: options?.agentId || warrant.issued_by || 'agent',
      aud: options?.audience || 'vienna-os',
      iat,
      exp,
      tier: warrant.risk_tier,
      scope: warrant.allowed_actions,
      deny: warrant.forbidden_actions?.length ? warrant.forbidden_actions : undefined,
      obj: warrant.objective,
      pid: warrant.plan_id,
      aid: warrant.approval_ids?.length ? warrant.approval_ids : undefined,
      tsr: warrant.truth_snapshot_id,
      cst: warrant.constraints as Record<string, OWSConstraint> | undefined,
      jst: warrant.justification || undefined,
      rbk: warrant.rollback_plan || undefined,
    };

    return this.issue(claims);
  }

  /**
   * Export the OWS specification as a JSON Schema document.
   * This is what other governance platforms would implement against.
   */
  static getSpecification(): object {
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://regulator.ai/schemas/ows/v1.0',
      title: 'Open Warrant Standard (OWS) v1.0',
      description: 'A portable, interoperable format for AI agent execution warrants. Like JWT for authentication, OWS is for execution authorization.',
      version: '1.0',
      specification_url: 'https://regulator.ai/docs/ows',
      reference_implementation: 'https://github.com/risk-ai/vienna-os',

      format: {
        description: 'Three base64url-encoded JSON parts, dot-separated: header.payload.signature',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ik9XUyJ9.eyJ3aWQiOiJ3cnRfMTIzIn0.signature',
      },

      header: {
        type: 'object',
        required: ['alg', 'typ', 'ver'],
        properties: {
          alg: { type: 'string', enum: ['HS256', 'HS384', 'HS512', 'RS256', 'ES256', 'none'], description: 'Signing algorithm' },
          typ: { type: 'string', const: 'OWS', description: 'Token type (always OWS)' },
          kid: { type: 'string', description: 'Key identifier' },
          chn: { type: 'string', description: 'Merkle chain hash (links to warrant chain)' },
          ver: { type: 'string', const: '1.0', description: 'Specification version' },
        },
      },

      payload: {
        type: 'object',
        required: ['wid', 'iss', 'sub', 'aud', 'iat', 'exp', 'tier', 'scope', 'obj', 'pid'],
        properties: {
          wid: { type: 'string', description: 'Warrant ID (unique)' },
          iss: { type: 'string', description: 'Issuer (governance platform)' },
          sub: { type: 'string', description: 'Subject (agent being authorized)' },
          aud: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: 'Audience (target system)' },
          iat: { type: 'integer', description: 'Issued at (Unix timestamp, seconds)' },
          exp: { type: 'integer', description: 'Expires at (Unix timestamp, seconds)' },
          nbf: { type: 'integer', description: 'Not before (Unix timestamp, seconds)' },
          tier: { type: 'string', enum: ['T0', 'T1', 'T2', 'T3'], description: 'Risk tier' },
          scope: { type: 'array', items: { type: 'string' }, description: 'Allowed actions' },
          deny: { type: 'array', items: { type: 'string' }, description: 'Explicitly denied actions' },
          obj: { type: 'string', description: 'Human-readable objective' },
          pid: { type: 'string', description: 'Plan ID' },
          aid: { type: 'array', items: { type: 'string' }, description: 'Approval IDs' },
          tsr: { type: 'string', description: 'Truth snapshot reference' },
          cst: { type: 'object', description: 'Parameter constraints', additionalProperties: {
            type: 'object',
            properties: {
              max: { type: 'number' },
              min: { type: 'number' },
              enum: { type: 'array' },
              pattern: { type: 'string' },
              required: { type: 'boolean' },
            },
          }},
          jst: { type: 'string', description: 'Justification (T3 required)' },
          rbk: { type: 'string', description: 'Rollback plan reference (T3 required)' },
          hsh: { type: 'string', description: 'Content hash of payload' },
          prv: { type: 'string', description: 'Previous warrant hash in chain' },
          mrt: { type: 'string', description: 'Merkle root at issuance' },
        },
        patternProperties: {
          '^x-': { description: 'Custom extension claims' },
        },
      },

      risk_tiers: {
        T0: { label: 'Informational', approval: 'none', max_ttl: '60m', description: 'Auto-approved, no warrant required' },
        T1: { label: 'Low Risk', approval: 'none', max_ttl: '30m', description: 'Policy auto-approved, warrant required' },
        T2: { label: 'Medium Risk', approval: 'single', max_ttl: '15m', description: 'Single human approval required' },
        T3: { label: 'High Risk', approval: 'multi-party (2+)', max_ttl: '5m', description: 'Multi-party approval + justification + rollback plan' },
      },
    };
  }

  // ─── Private Methods ───

  private _validateClaims(payload: OWSPayload): void {
    if (!payload.wid) throw new Error('wid (warrant ID) is required');
    if (!payload.iss) throw new Error('iss (issuer) is required');
    if (!payload.sub) throw new Error('sub (subject/agent) is required');
    if (!payload.aud) throw new Error('aud (audience) is required');
    if (!payload.exp) throw new Error('exp (expiration) is required');
    if (!payload.tier) throw new Error('tier (risk tier) is required');
    if (!payload.scope || payload.scope.length === 0) throw new Error('scope (allowed actions) is required');
    if (!payload.obj) throw new Error('obj (objective) is required');
    if (!payload.pid) throw new Error('pid (plan ID) is required');

    const validTiers = ['T0', 'T1', 'T2', 'T3'];
    if (!validTiers.includes(payload.tier)) {
      throw new Error(`Invalid tier: ${payload.tier}`);
    }

    // T3 requires justification and rollback
    if (payload.tier === 'T3') {
      if (!payload.jst) throw new Error('T3 warrants require jst (justification)');
      if (!payload.rbk) throw new Error('T3 warrants require rbk (rollback plan)');
      if (!payload.aid || payload.aid.length < 2) {
        throw new Error('T3 warrants require aid with 2+ approval IDs');
      }
    }

    // T2 requires approval
    if (payload.tier === 'T2') {
      if (!payload.aid || payload.aid.length < 1) {
        throw new Error('T2 warrants require aid with 1+ approval ID');
      }
    }
  }

  private _hashPayload(payload: OWSPayload): string {
    // Exclude hsh from the hash computation
    const { hsh, ...rest } = payload;
    const canonical = JSON.stringify(rest, Object.keys(rest).sort());
    return 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
  }

  private _sign(input: string, key: OWSKey): string {
    if (key.alg === 'none') return '';

    const hmacAlg: Record<string, string> = {
      'HS256': 'sha256',
      'HS384': 'sha384',
      'HS512': 'sha512',
    };

    const alg = hmacAlg[key.alg];
    if (!alg) throw new Error(`Unsupported algorithm: ${key.alg}. Currently supported: HS256, HS384, HS512`);

    if (!key.secret) throw new Error(`Key ${key.kid} has no secret for HMAC signing`);

    return crypto.createHmac(alg, key.secret).update(input).digest('hex');
  }

  private _checkConstraints(
    constraints: Record<string, OWSConstraint>,
    params: Record<string, unknown>
  ): string | null {
    for (const [field, constraint] of Object.entries(constraints)) {
      const value = params[field];

      if (constraint.required && (value === undefined || value === null)) {
        return `${field}: required but missing`;
      }

      if (value === undefined || value === null) continue;

      if (constraint.max !== undefined && typeof value === 'number' && value > constraint.max) {
        return `${field}: ${value} exceeds max ${constraint.max}`;
      }

      if (constraint.min !== undefined && typeof value === 'number' && value < constraint.min) {
        return `${field}: ${value} below min ${constraint.min}`;
      }

      if (constraint.enum && !constraint.enum.includes(value as string | number)) {
        return `${field}: ${value} not in allowed values`;
      }

      if (constraint.pattern && !new RegExp(constraint.pattern).test(String(value))) {
        return `${field}: ${value} does not match pattern ${constraint.pattern}`;
      }
    }

    return null;
  }
}

export default OpenWarrantStandard;
