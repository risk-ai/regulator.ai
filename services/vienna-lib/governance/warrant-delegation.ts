/**
 * Warrant Delegation — Vienna OS
 * 
 * Enables agents to delegate scoped subsets of their warrant authority
 * to other agents, creating a tree of authorization with cryptographic
 * proof of the delegation chain.
 * 
 * Use case: Agent A has a warrant for [deploy.staging, deploy.test].
 * Agent A delegates a child warrant to Agent B for [deploy.test] only,
 * with TTL ≤ parent TTL. Agent B's authorization is provably derived
 * from Agent A's warrant.
 * 
 * Properties:
 * 1. SCOPE REDUCTION: Child scope ⊆ parent scope (can only narrow, never widen)
 * 2. TTL REDUCTION: Child expires ≤ parent expires (can only shorten)
 * 3. TIER PRESERVATION: Child tier ≥ parent tier (can only increase, never decrease)
 * 4. CHAIN LINKED: Child warrant references parent warrant ID
 * 5. REVOCATION CASCADE: Revoking parent invalidates all children
 * 6. DEPTH LIMITED: Maximum delegation depth prevents unbounded chains
 * 7. INDEPENDENTLY VERIFIABLE: Can verify the entire delegation chain
 */

import * as crypto from 'crypto';
import type { RiskTierLevel } from './risk-tier';

// ─── Types ───

export interface DelegationRequest {
  /** Parent warrant ID (the delegating warrant) */
  parent_warrant_id: string;
  /** Agent receiving the delegated authority */
  delegate_agent_id: string;
  /** Delegated scope (must be subset of parent scope) */
  delegated_scope: string[];
  /** Optional: further constraints (must be stricter than parent) */
  constraints?: Record<string, DelegationConstraint>;
  /** Optional: override TTL (must be ≤ parent remaining TTL) */
  ttl_minutes?: number;
  /** Reason for delegation */
  reason: string;
}

export interface DelegationConstraint {
  max?: number;
  min?: number;
  enum?: (string | number)[];
  pattern?: string;
}

export interface DelegatedWarrant {
  /** Delegated warrant ID */
  warrant_id: string;
  /** Parent warrant ID */
  parent_warrant_id: string;
  /** Root warrant ID (original in the chain) */
  root_warrant_id: string;
  /** Delegation depth (0 = original, 1 = first delegation, ...) */
  delegation_depth: number;
  /** Delegating agent */
  delegator_agent_id: string;
  /** Receiving agent */
  delegate_agent_id: string;
  /** Delegated scope (⊆ parent scope) */
  scope: string[];
  /** Denied actions (⊇ parent denied) */
  deny: string[];
  /** Constraints (⊇ parent constraints, stricter) */
  constraints: Record<string, DelegationConstraint>;
  /** Risk tier (≥ parent tier) */
  risk_tier: RiskTierLevel;
  /** Objective/reason */
  objective: string;
  /** Timestamps */
  issued_at: string;
  expires_at: string;
  /** Delegation chain signature */
  chain_signature: string;
  /** Status */
  status: 'active' | 'expired' | 'revoked' | 'parent_revoked';
}

export interface DelegationChain {
  /** All warrants in the chain from root to leaf */
  chain: DelegatedWarrant[];
  /** Chain is valid (all links verified) */
  valid: boolean;
  /** Effective scope (intersection of all scopes in chain) */
  effective_scope: string[];
  /** Effective constraints (strictest of all in chain) */
  effective_constraints: Record<string, DelegationConstraint>;
  /** Remaining TTL (minimum of all in chain) */
  remaining_ttl_seconds: number;
}

export interface DelegationVerifyResult {
  valid: boolean;
  reason?: string;
  delegation_depth?: number;
  effective_scope?: string[];
  remaining_ttl_seconds?: number;
  chain?: DelegationChain;
}

/** Storage interface for delegated warrants */
export interface DelegationStore {
  save(warrant: DelegatedWarrant): Promise<void>;
  load(warrantId: string): Promise<DelegatedWarrant | null>;
  loadByParent(parentWarrantId: string): Promise<DelegatedWarrant[]>;
  loadChain(warrantId: string): Promise<DelegatedWarrant[]>;
  revokeByParent(parentWarrantId: string): Promise<number>;
}

// ─── Configuration ───

const MAX_DELEGATION_DEPTH = 5;
const TIER_ORDER: Record<RiskTierLevel, number> = { T0: 0, T1: 1, T2: 2, T3: 3 };

// ─── Warrant Delegation Engine ───

export class WarrantDelegation {
  private store: DelegationStore;
  private signingKey: string;

  constructor(store: DelegationStore, options?: { signingKey?: string }) {
    this.store = store;
    this.signingKey = options?.signingKey || process.env.VIENNA_WARRANT_KEY || 'vienna-delegation-key';
  }

  /**
   * Delegate a subset of a warrant's authority to another agent.
   * 
   * Enforces:
   * - Delegated scope ⊆ parent scope
   * - Delegated TTL ≤ parent remaining TTL
   * - Delegated tier ≥ parent tier
   * - Delegation depth ≤ MAX_DELEGATION_DEPTH
   * - Constraints can only be made stricter
   */
  async delegate(
    parentWarrant: {
      warrant_id: string;
      allowed_actions: string[];
      forbidden_actions?: string[];
      constraints?: Record<string, any>;
      risk_tier: RiskTierLevel;
      expires_at: string;
      issued_by?: string;
      objective?: string;
      delegation_depth?: number;
      root_warrant_id?: string;
    },
    request: DelegationRequest
  ): Promise<DelegatedWarrant> {
    
    // ─── Validate delegation depth ───
    const parentDepth = parentWarrant.delegation_depth || 0;
    if (parentDepth >= MAX_DELEGATION_DEPTH) {
      throw new Error(
        `Maximum delegation depth (${MAX_DELEGATION_DEPTH}) reached. ` +
        `Cannot delegate from depth ${parentDepth}.`
      );
    }

    // ─── Validate scope reduction ───
    const parentScope = new Set(parentWarrant.allowed_actions);
    const hasWildcard = parentScope.has('*');

    for (const action of request.delegated_scope) {
      if (!hasWildcard && !parentScope.has(action)) {
        throw new Error(
          `Scope violation: "${action}" is not in parent warrant scope. ` +
          `Delegated scope must be a subset of parent scope.`
        );
      }
    }

    if (request.delegated_scope.length === 0) {
      throw new Error('Delegated scope cannot be empty');
    }

    // ─── Validate TTL reduction ───
    const parentExpires = new Date(parentWarrant.expires_at).getTime();
    const now = Date.now();
    const parentRemainingMs = parentExpires - now;

    if (parentRemainingMs <= 0) {
      throw new Error('Parent warrant has expired — cannot delegate');
    }

    const requestedTtlMs = request.ttl_minutes
      ? request.ttl_minutes * 60 * 1000
      : parentRemainingMs;

    if (requestedTtlMs > parentRemainingMs) {
      throw new Error(
        `TTL violation: requested ${request.ttl_minutes} minutes but parent only has ` +
        `${Math.floor(parentRemainingMs / 60000)} minutes remaining`
      );
    }

    const childExpiresAt = new Date(now + Math.min(requestedTtlMs, parentRemainingMs)).toISOString();

    // ─── Validate constraint strictness ───
    if (request.constraints) {
      this._validateConstraintStrictness(
        parentWarrant.constraints || {},
        request.constraints
      );
    }

    // ─── Build delegated warrant ───
    const warrantId = `dwrt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const rootWarrantId = parentWarrant.root_warrant_id || parentWarrant.warrant_id;

    // Merge deny lists (child inherits parent denials + can add more)
    const deny = [...new Set([
      ...(parentWarrant.forbidden_actions || []),
    ])];

    // Merge constraints (child inherits parent constraints, can add stricter)
    const mergedConstraints: Record<string, DelegationConstraint> = {
      ...(parentWarrant.constraints || {}),
      ...(request.constraints || {}),
    };

    // For overlapping constraints, take the stricter value
    if (parentWarrant.constraints && request.constraints) {
      for (const [key, parentC] of Object.entries(parentWarrant.constraints)) {
        const childC = request.constraints[key];
        if (childC) {
          mergedConstraints[key] = this._stricterConstraint(parentC, childC);
        }
      }
    }

    const delegated: DelegatedWarrant = {
      warrant_id: warrantId,
      parent_warrant_id: parentWarrant.warrant_id,
      root_warrant_id: rootWarrantId,
      delegation_depth: parentDepth + 1,
      delegator_agent_id: parentWarrant.issued_by || 'unknown',
      delegate_agent_id: request.delegate_agent_id,
      scope: request.delegated_scope,
      deny,
      constraints: mergedConstraints,
      risk_tier: parentWarrant.risk_tier,
      objective: request.reason,
      issued_at: new Date().toISOString(),
      expires_at: childExpiresAt,
      chain_signature: this._signDelegation(warrantId, parentWarrant.warrant_id, rootWarrantId),
      status: 'active',
    };

    await this.store.save(delegated);
    return delegated;
  }

  /**
   * Verify a delegated warrant — walks the entire delegation chain.
   */
  async verify(warrantId: string): Promise<DelegationVerifyResult> {
    const warrant = await this.store.load(warrantId);
    if (!warrant) {
      return { valid: false, reason: 'Delegated warrant not found' };
    }

    // Check status
    if (warrant.status === 'revoked' || warrant.status === 'parent_revoked') {
      return { valid: false, reason: `Warrant ${warrant.status}` };
    }

    // Check expiration
    if (new Date(warrant.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: 'Delegated warrant expired' };
    }

    // Verify chain signature
    const expectedSig = this._signDelegation(
      warrant.warrant_id,
      warrant.parent_warrant_id,
      warrant.root_warrant_id
    );
    if (warrant.chain_signature !== expectedSig) {
      return { valid: false, reason: 'Delegation chain signature invalid — tampered' };
    }

    // Walk the full chain
    const chain = await this._walkChain(warrantId);
    if (!chain.valid) {
      return { valid: false, reason: 'Delegation chain broken', chain };
    }

    return {
      valid: true,
      delegation_depth: warrant.delegation_depth,
      effective_scope: chain.effective_scope,
      remaining_ttl_seconds: chain.remaining_ttl_seconds,
      chain,
    };
  }

  /**
   * Revoke a warrant and all its children (cascade).
   */
  async revoke(warrantId: string): Promise<{ revoked: number }> {
    const warrant = await this.store.load(warrantId);
    if (!warrant) {
      throw new Error(`Warrant ${warrantId} not found`);
    }

    warrant.status = 'revoked';
    await this.store.save(warrant);

    // Cascade: revoke all children
    const childrenRevoked = await this.store.revokeByParent(warrantId);

    return { revoked: 1 + childrenRevoked };
  }

  /**
   * Check if an action is authorized by a delegated warrant.
   */
  async checkScope(
    warrantId: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<{ authorized: boolean; reason: string }> {
    const verification = await this.verify(warrantId);
    if (!verification.valid) {
      return { authorized: false, reason: verification.reason || 'Invalid warrant' };
    }

    const chain = verification.chain!;

    // Check effective scope
    if (!chain.effective_scope.includes(action) && !chain.effective_scope.includes('*')) {
      return { authorized: false, reason: `Action "${action}" not in effective scope` };
    }

    // Check constraints
    if (params && chain.effective_constraints) {
      for (const [key, constraint] of Object.entries(chain.effective_constraints)) {
        const value = params[key];
        if (constraint.max !== undefined && typeof value === 'number' && value > constraint.max) {
          return { authorized: false, reason: `${key}: ${value} exceeds max ${constraint.max}` };
        }
        if (constraint.min !== undefined && typeof value === 'number' && value < constraint.min) {
          return { authorized: false, reason: `${key}: ${value} below min ${constraint.min}` };
        }
        if (constraint.enum && !constraint.enum.includes(value as string | number)) {
          return { authorized: false, reason: `${key}: ${value} not in allowed values` };
        }
      }
    }

    return { authorized: true, reason: 'Authorized via delegation chain' };
  }

  // ─── Private: Chain Walking ───

  private async _walkChain(warrantId: string): Promise<DelegationChain> {
    const chain: DelegatedWarrant[] = [];
    let current = await this.store.load(warrantId);
    const visited = new Set<string>();

    // Walk up from leaf to root
    while (current) {
      if (visited.has(current.warrant_id)) {
        return { chain, valid: false, effective_scope: [], effective_constraints: {}, remaining_ttl_seconds: 0 };
      }
      visited.add(current.warrant_id);
      chain.unshift(current); // Prepend to maintain root→leaf order

      if (current.delegation_depth === 0 || !current.parent_warrant_id) {
        break; // Reached root
      }

      // Check if parent is also a delegated warrant
      current = await this.store.load(current.parent_warrant_id);
    }

    // Compute effective scope (intersection of all scopes)
    let effectiveScope = chain[0]?.scope || [];
    for (let i = 1; i < chain.length; i++) {
      const childScope = new Set(chain[i].scope);
      effectiveScope = effectiveScope.filter(a => childScope.has(a) || childScope.has('*'));
    }

    // Compute effective constraints (strictest of all)
    const effectiveConstraints: Record<string, DelegationConstraint> = {};
    for (const warrant of chain) {
      for (const [key, constraint] of Object.entries(warrant.constraints)) {
        if (!effectiveConstraints[key]) {
          effectiveConstraints[key] = { ...constraint };
        } else {
          effectiveConstraints[key] = this._stricterConstraint(effectiveConstraints[key], constraint);
        }
      }
    }

    // Minimum remaining TTL
    const now = Date.now();
    const remainingTtls = chain.map(w => 
      Math.max(0, (new Date(w.expires_at).getTime() - now) / 1000)
    );
    const remainingTtl = Math.min(...remainingTtls);

    // Check all links are valid
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].parent_warrant_id !== chain[i - 1].warrant_id) {
        return { chain, valid: false, effective_scope: effectiveScope, effective_constraints: effectiveConstraints, remaining_ttl_seconds: remainingTtl };
      }
      // Check scope subset
      const parentScope = new Set(chain[i - 1].scope);
      const hasWildcard = parentScope.has('*');
      for (const action of chain[i].scope) {
        if (!hasWildcard && !parentScope.has(action)) {
          return { chain, valid: false, effective_scope: effectiveScope, effective_constraints: effectiveConstraints, remaining_ttl_seconds: remainingTtl };
        }
      }
    }

    return {
      chain,
      valid: true,
      effective_scope: effectiveScope,
      effective_constraints: effectiveConstraints,
      remaining_ttl_seconds: remainingTtl,
    };
  }

  // ─── Private: Constraint Merging ───

  private _validateConstraintStrictness(
    parentConstraints: Record<string, any>,
    childConstraints: Record<string, DelegationConstraint>
  ): void {
    for (const [key, childC] of Object.entries(childConstraints)) {
      const parentC = parentConstraints[key];
      if (!parentC) continue; // New constraint is always fine (makes it stricter)

      // Child max must be ≤ parent max
      if (childC.max !== undefined && parentC.max !== undefined && childC.max > parentC.max) {
        throw new Error(
          `Constraint "${key}": child max (${childC.max}) cannot exceed parent max (${parentC.max})`
        );
      }

      // Child min must be ≥ parent min
      if (childC.min !== undefined && parentC.min !== undefined && childC.min < parentC.min) {
        throw new Error(
          `Constraint "${key}": child min (${childC.min}) cannot be below parent min (${parentC.min})`
        );
      }

      // Child enum must be ⊆ parent enum
      if (childC.enum && parentC.enum) {
        const parentSet = new Set(parentC.enum);
        const invalid = childC.enum.filter((v: string | number) => !parentSet.has(v));
        if (invalid.length > 0) {
          throw new Error(
            `Constraint "${key}": child enum contains values not in parent: ${invalid.join(', ')}`
          );
        }
      }
    }
  }

  private _stricterConstraint(a: DelegationConstraint, b: DelegationConstraint): DelegationConstraint {
    const result: DelegationConstraint = { ...a };

    // Stricter max = smaller
    if (b.max !== undefined) {
      result.max = a.max !== undefined ? Math.min(a.max, b.max) : b.max;
    }

    // Stricter min = larger
    if (b.min !== undefined) {
      result.min = a.min !== undefined ? Math.max(a.min, b.min) : b.min;
    }

    // Stricter enum = intersection
    if (b.enum) {
      if (a.enum) {
        const aSet = new Set(a.enum);
        result.enum = b.enum.filter(v => aSet.has(v));
      } else {
        result.enum = b.enum;
      }
    }

    // Stricter pattern = both must match (combine with AND)
    if (b.pattern && a.pattern && b.pattern !== a.pattern) {
      result.pattern = `(?=${a.pattern})(?=${b.pattern})`;
    } else if (b.pattern) {
      result.pattern = b.pattern;
    }

    return result;
  }

  // ─── Private: Signing ───

  private _signDelegation(warrantId: string, parentId: string, rootId: string): string {
    const payload = `${warrantId}|${parentId}|${rootId}`;
    return 'hmac-sha256:' + crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
  }
}

// ─── In-Memory Store (for testing) ───

export class InMemoryDelegationStore implements DelegationStore {
  private warrants: Map<string, DelegatedWarrant> = new Map();

  async save(warrant: DelegatedWarrant): Promise<void> {
    this.warrants.set(warrant.warrant_id, { ...warrant });
  }

  async load(warrantId: string): Promise<DelegatedWarrant | null> {
    return this.warrants.get(warrantId) || null;
  }

  async loadByParent(parentWarrantId: string): Promise<DelegatedWarrant[]> {
    return Array.from(this.warrants.values())
      .filter(w => w.parent_warrant_id === parentWarrantId);
  }

  async loadChain(warrantId: string): Promise<DelegatedWarrant[]> {
    const chain: DelegatedWarrant[] = [];
    let current = this.warrants.get(warrantId);
    while (current) {
      chain.unshift(current);
      current = this.warrants.get(current.parent_warrant_id) || undefined;
    }
    return chain;
  }

  async revokeByParent(parentWarrantId: string): Promise<number> {
    let count = 0;
    const children = await this.loadByParent(parentWarrantId);
    for (const child of children) {
      child.status = 'parent_revoked';
      this.warrants.set(child.warrant_id, child);
      count++;
      // Recursive cascade
      count += await this.revokeByParent(child.warrant_id);
    }
    return count;
  }

  clear(): void {
    this.warrants.clear();
  }
}

export default WarrantDelegation;
