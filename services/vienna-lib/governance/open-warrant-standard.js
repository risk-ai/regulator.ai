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
var open_warrant_standard_exports = {};
__export(open_warrant_standard_exports, {
  OpenWarrantStandard: () => OpenWarrantStandard,
  default: () => open_warrant_standard_default
});
module.exports = __toCommonJS(open_warrant_standard_exports);
var crypto = __toESM(require("crypto"));
function base64urlEncode(data) {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  return buf.toString("base64url");
}
function base64urlDecode(str) {
  return Buffer.from(str, "base64url").toString("utf-8");
}
class OpenWarrantStandard {
  keys = /* @__PURE__ */ new Map();
  defaultKeyId = null;
  constructor() {
  }
  /** Register a signing/verification key */
  registerKey(key) {
    this.keys.set(key.kid, key);
    if (!this.defaultKeyId) {
      this.defaultKeyId = key.kid;
    }
  }
  /** Set the default signing key */
  setDefaultKey(kid) {
    if (!this.keys.has(kid)) {
      throw new Error(`Key ${kid} not registered`);
    }
    this.defaultKeyId = kid;
  }
  /**
   * Issue an OWS token (compact serialization).
   * Returns a string in the format: header.payload.signature
   */
  issue(claims, options) {
    const kid = options?.kid || this.defaultKeyId;
    if (!kid) throw new Error("No signing key available");
    const key = this.keys.get(kid);
    if (!key) throw new Error(`Key ${kid} not found`);
    const header = {
      alg: key.alg,
      typ: "OWS",
      kid,
      ver: "1.0"
    };
    if (options?.chainHash) {
      header.chn = options.chainHash;
    }
    const now = Math.floor(Date.now() / 1e3);
    const payload = {
      iat: now,
      ...claims
    };
    this._validateClaims(payload);
    payload.hsh = this._hashPayload(payload);
    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = this._sign(signingInput, key);
    const signatureB64 = base64urlEncode(Buffer.from(signature, "hex"));
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }
  /**
   * Parse an OWS token string into its components.
   * Does NOT verify the signature — call verify() for that.
   */
  parse(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid OWS token format: expected 3 dot-separated parts");
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(base64urlDecode(headerB64));
    const payload = JSON.parse(base64urlDecode(payloadB64));
    if (header.typ !== "OWS") {
      throw new Error(`Invalid token type: ${header.typ} (expected OWS)`);
    }
    return {
      header,
      payload,
      signature: signatureB64,
      raw: token
    };
  }
  /**
   * Verify an OWS token — checks signature, expiration, and not-before.
   * This can be done by ANY party with the verification key.
   */
  verify(token, options) {
    try {
      const parsed = this.parse(token);
      const { header, payload } = parsed;
      const clockSkew = options?.clockSkewSeconds || 30;
      const now = Math.floor(Date.now() / 1e3);
      const key = header.kid ? this.keys.get(header.kid) : null;
      if (!key && header.alg !== "none") {
        return { valid: false, reason: `Verification key ${header.kid} not found` };
      }
      if (header.alg !== "none" && key) {
        const [headerB64, payloadB64] = token.split(".");
        const signingInput = `${headerB64}.${payloadB64}`;
        const expectedSig = base64urlEncode(Buffer.from(this._sign(signingInput, key), "hex"));
        if (parsed.signature !== expectedSig) {
          return { valid: false, reason: "SIGNATURE_INVALID" };
        }
      }
      if (payload.exp && now > payload.exp + clockSkew) {
        return { valid: false, reason: "TOKEN_EXPIRED", expired: true, payload };
      }
      if (payload.nbf && now < payload.nbf - clockSkew) {
        return { valid: false, reason: "TOKEN_NOT_YET_VALID", not_before_violation: true, payload };
      }
      if (options?.action) {
        if (payload.deny?.includes(options.action)) {
          return { valid: false, reason: "ACTION_DENIED", scope_valid: false, payload };
        }
        if (!payload.scope.includes(options.action) && !payload.scope.includes("*")) {
          return { valid: false, reason: "ACTION_NOT_IN_SCOPE", scope_valid: false, payload };
        }
      }
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
  fromViennaWarrant(warrant, options) {
    const iat = Math.floor(new Date(warrant.issued_at).getTime() / 1e3);
    const exp = Math.floor(new Date(warrant.expires_at).getTime() / 1e3);
    const claims = {
      wid: warrant.warrant_id,
      iss: warrant.issued_by || "vienna-os",
      sub: options?.agentId || warrant.issued_by || "agent",
      aud: options?.audience || "vienna-os",
      iat,
      exp,
      tier: warrant.risk_tier,
      scope: warrant.allowed_actions,
      deny: warrant.forbidden_actions?.length ? warrant.forbidden_actions : void 0,
      obj: warrant.objective,
      pid: warrant.plan_id,
      aid: warrant.approval_ids?.length ? warrant.approval_ids : void 0,
      tsr: warrant.truth_snapshot_id,
      cst: warrant.constraints,
      jst: warrant.justification || void 0,
      rbk: warrant.rollback_plan || void 0
    };
    return this.issue(claims);
  }
  /**
   * Export the OWS specification as a JSON Schema document.
   * This is what other governance platforms would implement against.
   */
  static getSpecification() {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://regulator.ai/schemas/ows/v1.0",
      title: "Open Warrant Standard (OWS) v1.0",
      description: "A portable, interoperable format for AI agent execution warrants. Like JWT for authentication, OWS is for execution authorization.",
      version: "1.0",
      specification_url: "https://regulator.ai/docs/ows",
      reference_implementation: "https://github.com/risk-ai/vienna-os",
      format: {
        description: "Three base64url-encoded JSON parts, dot-separated: header.payload.signature",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik9XUyJ9.eyJ3aWQiOiJ3cnRfMTIzIn0.signature"
      },
      header: {
        type: "object",
        required: ["alg", "typ", "ver"],
        properties: {
          alg: { type: "string", enum: ["HS256", "HS384", "HS512", "RS256", "ES256", "none"], description: "Signing algorithm" },
          typ: { type: "string", const: "OWS", description: "Token type (always OWS)" },
          kid: { type: "string", description: "Key identifier" },
          chn: { type: "string", description: "Merkle chain hash (links to warrant chain)" },
          ver: { type: "string", const: "1.0", description: "Specification version" }
        }
      },
      payload: {
        type: "object",
        required: ["wid", "iss", "sub", "aud", "iat", "exp", "tier", "scope", "obj", "pid"],
        properties: {
          wid: { type: "string", description: "Warrant ID (unique)" },
          iss: { type: "string", description: "Issuer (governance platform)" },
          sub: { type: "string", description: "Subject (agent being authorized)" },
          aud: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }], description: "Audience (target system)" },
          iat: { type: "integer", description: "Issued at (Unix timestamp, seconds)" },
          exp: { type: "integer", description: "Expires at (Unix timestamp, seconds)" },
          nbf: { type: "integer", description: "Not before (Unix timestamp, seconds)" },
          tier: { type: "string", enum: ["T0", "T1", "T2", "T3"], description: "Risk tier" },
          scope: { type: "array", items: { type: "string" }, description: "Allowed actions" },
          deny: { type: "array", items: { type: "string" }, description: "Explicitly denied actions" },
          obj: { type: "string", description: "Human-readable objective" },
          pid: { type: "string", description: "Plan ID" },
          aid: { type: "array", items: { type: "string" }, description: "Approval IDs" },
          tsr: { type: "string", description: "Truth snapshot reference" },
          cst: { type: "object", description: "Parameter constraints", additionalProperties: {
            type: "object",
            properties: {
              max: { type: "number" },
              min: { type: "number" },
              enum: { type: "array" },
              pattern: { type: "string" },
              required: { type: "boolean" }
            }
          } },
          jst: { type: "string", description: "Justification (T3 required)" },
          rbk: { type: "string", description: "Rollback plan reference (T3 required)" },
          hsh: { type: "string", description: "Content hash of payload" },
          prv: { type: "string", description: "Previous warrant hash in chain" },
          mrt: { type: "string", description: "Merkle root at issuance" }
        },
        patternProperties: {
          "^x-": { description: "Custom extension claims" }
        }
      },
      risk_tiers: {
        T0: { label: "Informational", approval: "none", max_ttl: "60m", description: "Auto-approved, no warrant required" },
        T1: { label: "Low Risk", approval: "none", max_ttl: "30m", description: "Policy auto-approved, warrant required" },
        T2: { label: "Medium Risk", approval: "single", max_ttl: "15m", description: "Single human approval required" },
        T3: { label: "High Risk", approval: "multi-party (2+)", max_ttl: "5m", description: "Multi-party approval + justification + rollback plan" }
      }
    };
  }
  // ─── Private Methods ───
  _validateClaims(payload) {
    if (!payload.wid) throw new Error("wid (warrant ID) is required");
    if (!payload.iss) throw new Error("iss (issuer) is required");
    if (!payload.sub) throw new Error("sub (subject/agent) is required");
    if (!payload.aud) throw new Error("aud (audience) is required");
    if (!payload.exp) throw new Error("exp (expiration) is required");
    if (!payload.tier) throw new Error("tier (risk tier) is required");
    if (!payload.scope || payload.scope.length === 0) throw new Error("scope (allowed actions) is required");
    if (!payload.obj) throw new Error("obj (objective) is required");
    if (!payload.pid) throw new Error("pid (plan ID) is required");
    const validTiers = ["T0", "T1", "T2", "T3"];
    if (!validTiers.includes(payload.tier)) {
      throw new Error(`Invalid tier: ${payload.tier}`);
    }
    if (payload.tier === "T3") {
      if (!payload.jst) throw new Error("T3 warrants require jst (justification)");
      if (!payload.rbk) throw new Error("T3 warrants require rbk (rollback plan)");
      if (!payload.aid || payload.aid.length < 2) {
        throw new Error("T3 warrants require aid with 2+ approval IDs");
      }
    }
    if (payload.tier === "T2") {
      if (!payload.aid || payload.aid.length < 1) {
        throw new Error("T2 warrants require aid with 1+ approval ID");
      }
    }
  }
  _hashPayload(payload) {
    const { hsh, ...rest } = payload;
    const canonical = JSON.stringify(rest, Object.keys(rest).sort());
    return "sha256:" + crypto.createHash("sha256").update(canonical).digest("hex");
  }
  _sign(input, key) {
    if (key.alg === "none") return "";
    const hmacAlg = {
      "HS256": "sha256",
      "HS384": "sha384",
      "HS512": "sha512"
    };
    const alg = hmacAlg[key.alg];
    if (!alg) throw new Error(`Unsupported algorithm: ${key.alg}. Currently supported: HS256, HS384, HS512`);
    if (!key.secret) throw new Error(`Key ${key.kid} has no secret for HMAC signing`);
    return crypto.createHmac(alg, key.secret).update(input).digest("hex");
  }
  _checkConstraints(constraints, params) {
    for (const [field, constraint] of Object.entries(constraints)) {
      const value = params[field];
      if (constraint.required && (value === void 0 || value === null)) {
        return `${field}: required but missing`;
      }
      if (value === void 0 || value === null) continue;
      if (constraint.max !== void 0 && typeof value === "number" && value > constraint.max) {
        return `${field}: ${value} exceeds max ${constraint.max}`;
      }
      if (constraint.min !== void 0 && typeof value === "number" && value < constraint.min) {
        return `${field}: ${value} below min ${constraint.min}`;
      }
      if (constraint.enum && !constraint.enum.includes(value)) {
        return `${field}: ${value} not in allowed values`;
      }
      if (constraint.pattern && !new RegExp(constraint.pattern).test(String(value))) {
        return `${field}: ${value} does not match pattern ${constraint.pattern}`;
      }
    }
    return null;
  }
}
var open_warrant_standard_default = OpenWarrantStandard;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OpenWarrantStandard
});
