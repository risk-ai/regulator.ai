var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var warrant_delegation_exports = {};
__export(warrant_delegation_exports, {
  InMemoryDelegationStore: () => InMemoryDelegationStore,
  WarrantDelegation: () => WarrantDelegation,
  default: () => warrant_delegation_default
});
module.exports = __toCommonJS(warrant_delegation_exports);
var crypto = __toESM(require("crypto"));
const MAX_DELEGATION_DEPTH = 5;
const TIER_ORDER = { T0: 0, T1: 1, T2: 2, T3: 3 };
class WarrantDelegation {
  store;
  signingKey;
  constructor(store, options) {
    this.store = store;
    this.signingKey = options?.signingKey || process.env.VIENNA_WARRANT_KEY || "vienna-delegation-key";
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
  async delegate(parentWarrant, request) {
    const parentDepth = parentWarrant.delegation_depth || 0;
    if (parentDepth >= MAX_DELEGATION_DEPTH) {
      throw new Error(
        `Maximum delegation depth (${MAX_DELEGATION_DEPTH}) reached. Cannot delegate from depth ${parentDepth}.`
      );
    }
    const parentScope = new Set(parentWarrant.allowed_actions);
    const hasWildcard = parentScope.has("*");
    for (const action of request.delegated_scope) {
      if (!hasWildcard && !parentScope.has(action)) {
        throw new Error(
          `Scope violation: "${action}" is not in parent warrant scope. Delegated scope must be a subset of parent scope.`
        );
      }
    }
    if (request.delegated_scope.length === 0) {
      throw new Error("Delegated scope cannot be empty");
    }
    const parentExpires = new Date(parentWarrant.expires_at).getTime();
    const now = Date.now();
    const parentRemainingMs = parentExpires - now;
    if (parentRemainingMs <= 0) {
      throw new Error("Parent warrant has expired \u2014 cannot delegate");
    }
    const requestedTtlMs = request.ttl_minutes ? request.ttl_minutes * 60 * 1e3 : parentRemainingMs;
    if (requestedTtlMs > parentRemainingMs) {
      throw new Error(
        `TTL violation: requested ${request.ttl_minutes} minutes but parent only has ${Math.floor(parentRemainingMs / 6e4)} minutes remaining`
      );
    }
    const childExpiresAt = new Date(now + Math.min(requestedTtlMs, parentRemainingMs)).toISOString();
    if (request.constraints) {
      this._validateConstraintStrictness(
        parentWarrant.constraints || {},
        request.constraints
      );
    }
    const warrantId = `dwrt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const rootWarrantId = parentWarrant.root_warrant_id || parentWarrant.warrant_id;
    const deny = [.../* @__PURE__ */ new Set([
      ...parentWarrant.forbidden_actions || []
    ])];
    const mergedConstraints = {
      ...parentWarrant.constraints || {},
      ...request.constraints || {}
    };
    if (parentWarrant.constraints && request.constraints) {
      for (const [key, parentC] of Object.entries(parentWarrant.constraints)) {
        const childC = request.constraints[key];
        if (childC) {
          mergedConstraints[key] = this._stricterConstraint(parentC, childC);
        }
      }
    }
    const delegated = {
      warrant_id: warrantId,
      parent_warrant_id: parentWarrant.warrant_id,
      root_warrant_id: rootWarrantId,
      delegation_depth: parentDepth + 1,
      delegator_agent_id: parentWarrant.issued_by || "unknown",
      delegate_agent_id: request.delegate_agent_id,
      scope: request.delegated_scope,
      deny,
      constraints: mergedConstraints,
      risk_tier: parentWarrant.risk_tier,
      objective: request.reason,
      issued_at: (/* @__PURE__ */ new Date()).toISOString(),
      expires_at: childExpiresAt,
      chain_signature: this._signDelegation(warrantId, parentWarrant.warrant_id, rootWarrantId),
      status: "active"
    };
    await this.store.save(delegated);
    return delegated;
  }
  /**
   * Verify a delegated warrant — walks the entire delegation chain.
   */
  async verify(warrantId) {
    const warrant = await this.store.load(warrantId);
    if (!warrant) {
      return { valid: false, reason: "Delegated warrant not found" };
    }
    if (warrant.status === "revoked" || warrant.status === "parent_revoked") {
      return { valid: false, reason: `Warrant ${warrant.status}` };
    }
    if (new Date(warrant.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "Delegated warrant expired" };
    }
    const expectedSig = this._signDelegation(
      warrant.warrant_id,
      warrant.parent_warrant_id,
      warrant.root_warrant_id
    );
    if (warrant.chain_signature !== expectedSig) {
      return { valid: false, reason: "Delegation chain signature invalid \u2014 tampered" };
    }
    const chain = await this._walkChain(warrantId);
    if (!chain.valid) {
      return { valid: false, reason: "Delegation chain broken", chain };
    }
    return {
      valid: true,
      delegation_depth: warrant.delegation_depth,
      effective_scope: chain.effective_scope,
      remaining_ttl_seconds: chain.remaining_ttl_seconds,
      chain
    };
  }
  /**
   * Revoke a warrant and all its children (cascade).
   */
  async revoke(warrantId) {
    const warrant = await this.store.load(warrantId);
    if (!warrant) {
      throw new Error(`Warrant ${warrantId} not found`);
    }
    warrant.status = "revoked";
    await this.store.save(warrant);
    const childrenRevoked = await this.store.revokeByParent(warrantId);
    return { revoked: 1 + childrenRevoked };
  }
  /**
   * Check if an action is authorized by a delegated warrant.
   */
  async checkScope(warrantId, action, params) {
    const verification = await this.verify(warrantId);
    if (!verification.valid) {
      return { authorized: false, reason: verification.reason || "Invalid warrant" };
    }
    const chain = verification.chain;
    if (!chain.effective_scope.includes(action) && !chain.effective_scope.includes("*")) {
      return { authorized: false, reason: `Action "${action}" not in effective scope` };
    }
    if (params && chain.effective_constraints) {
      for (const [key, constraint] of Object.entries(chain.effective_constraints)) {
        const value = params[key];
        if (constraint.max !== void 0 && typeof value === "number" && value > constraint.max) {
          return { authorized: false, reason: `${key}: ${value} exceeds max ${constraint.max}` };
        }
        if (constraint.min !== void 0 && typeof value === "number" && value < constraint.min) {
          return { authorized: false, reason: `${key}: ${value} below min ${constraint.min}` };
        }
        if (constraint.enum && !constraint.enum.includes(value)) {
          return { authorized: false, reason: `${key}: ${value} not in allowed values` };
        }
      }
    }
    return { authorized: true, reason: "Authorized via delegation chain" };
  }
  // ─── Private: Chain Walking ───
  async _walkChain(warrantId) {
    const chain = [];
    let current = await this.store.load(warrantId);
    const visited = /* @__PURE__ */ new Set();
    while (current) {
      if (visited.has(current.warrant_id)) {
        return { chain, valid: false, effective_scope: [], effective_constraints: {}, remaining_ttl_seconds: 0 };
      }
      visited.add(current.warrant_id);
      chain.unshift(current);
      if (current.delegation_depth === 0 || !current.parent_warrant_id) {
        break;
      }
      current = await this.store.load(current.parent_warrant_id);
    }
    let effectiveScope = chain[0]?.scope || [];
    for (let i = 1; i < chain.length; i++) {
      const childScope = new Set(chain[i].scope);
      effectiveScope = effectiveScope.filter((a) => childScope.has(a) || childScope.has("*"));
    }
    const effectiveConstraints = {};
    for (const warrant of chain) {
      for (const [key, constraint] of Object.entries(warrant.constraints)) {
        if (!effectiveConstraints[key]) {
          effectiveConstraints[key] = { ...constraint };
        } else {
          effectiveConstraints[key] = this._stricterConstraint(effectiveConstraints[key], constraint);
        }
      }
    }
    const now = Date.now();
    const remainingTtls = chain.map(
      (w) => Math.max(0, (new Date(w.expires_at).getTime() - now) / 1e3)
    );
    const remainingTtl = Math.min(...remainingTtls);
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].parent_warrant_id !== chain[i - 1].warrant_id) {
        return { chain, valid: false, effective_scope: effectiveScope, effective_constraints: effectiveConstraints, remaining_ttl_seconds: remainingTtl };
      }
      const parentScope = new Set(chain[i - 1].scope);
      const hasWildcard = parentScope.has("*");
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
      remaining_ttl_seconds: remainingTtl
    };
  }
  // ─── Private: Constraint Merging ───
  _validateConstraintStrictness(parentConstraints, childConstraints) {
    for (const [key, childC] of Object.entries(childConstraints)) {
      const parentC = parentConstraints[key];
      if (!parentC) continue;
      if (childC.max !== void 0 && parentC.max !== void 0 && childC.max > parentC.max) {
        throw new Error(
          `Constraint "${key}": child max (${childC.max}) cannot exceed parent max (${parentC.max})`
        );
      }
      if (childC.min !== void 0 && parentC.min !== void 0 && childC.min < parentC.min) {
        throw new Error(
          `Constraint "${key}": child min (${childC.min}) cannot be below parent min (${parentC.min})`
        );
      }
      if (childC.enum && parentC.enum) {
        const parentSet = new Set(parentC.enum);
        const invalid = childC.enum.filter((v) => !parentSet.has(v));
        if (invalid.length > 0) {
          throw new Error(
            `Constraint "${key}": child enum contains values not in parent: ${invalid.join(", ")}`
          );
        }
      }
    }
  }
  _stricterConstraint(a, b) {
    const result = { ...a };
    if (b.max !== void 0) {
      result.max = a.max !== void 0 ? Math.min(a.max, b.max) : b.max;
    }
    if (b.min !== void 0) {
      result.min = a.min !== void 0 ? Math.max(a.min, b.min) : b.min;
    }
    if (b.enum) {
      if (a.enum) {
        const aSet = new Set(a.enum);
        result.enum = b.enum.filter((v) => aSet.has(v));
      } else {
        result.enum = b.enum;
      }
    }
    if (b.pattern && a.pattern && b.pattern !== a.pattern) {
      result.pattern = `(?=${a.pattern})(?=${b.pattern})`;
    } else if (b.pattern) {
      result.pattern = b.pattern;
    }
    return result;
  }
  // ─── Private: Signing ───
  _signDelegation(warrantId, parentId, rootId) {
    const payload = `${warrantId}|${parentId}|${rootId}`;
    return "hmac-sha256:" + crypto.createHmac("sha256", this.signingKey).update(payload).digest("hex");
  }
}
class InMemoryDelegationStore {
  warrants = /* @__PURE__ */ new Map();
  async save(warrant) {
    this.warrants.set(warrant.warrant_id, { ...warrant });
  }
  async load(warrantId) {
    return this.warrants.get(warrantId) || null;
  }
  async loadByParent(parentWarrantId) {
    return Array.from(this.warrants.values()).filter((w) => w.parent_warrant_id === parentWarrantId);
  }
  async loadChain(warrantId) {
    const chain = [];
    let current = this.warrants.get(warrantId);
    while (current) {
      chain.unshift(current);
      current = this.warrants.get(current.parent_warrant_id) || void 0;
    }
    return chain;
  }
  async revokeByParent(parentWarrantId) {
    let count = 0;
    const children = await this.loadByParent(parentWarrantId);
    for (const child of children) {
      child.status = "parent_revoked";
      this.warrants.set(child.warrant_id, child);
      count++;
      count += await this.revokeByParent(child.warrant_id);
    }
    return count;
  }
  clear() {
    this.warrants.clear();
  }
}
var warrant_delegation_default = WarrantDelegation;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemoryDelegationStore,
  WarrantDelegation
});
