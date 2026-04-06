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
var warrant_chain_exports = {};
__export(warrant_chain_exports, {
  MerkleWarrantChain: () => MerkleWarrantChain,
  default: () => warrant_chain_default
});
module.exports = __toCommonJS(warrant_chain_exports);
var crypto = __toESM(require("crypto"));
class MerkleWarrantChain {
  store;
  constructor(store) {
    this.store = store;
  }
  /**
   * Append a warrant to the chain.
   * This is the ONLY way to add warrants — ensures chain integrity.
   */
  async append(tenantId, warrantData) {
    const latest = await this.store.getLatest(tenantId);
    const prevHash = latest?.chain_hash || null;
    const chainIndex = latest ? latest.chain_index + 1 : 0;
    const contentHash = this.hashWarrantContent(warrantData);
    const chainHash = this.computeChainHash(contentHash, prevHash);
    const chainedWarrant = {
      warrant_id: warrantData.warrant_id,
      chain_index: chainIndex,
      tenant_id: tenantId,
      content_hash: contentHash,
      prev_hash: prevHash,
      chain_hash: chainHash,
      warrant_data: warrantData,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.store.appendWarrant(chainedWarrant);
    return chainedWarrant;
  }
  /**
   * Verify the integrity of the entire warrant chain.
   * This can be done by a third-party auditor with NO trust in Vienna OS.
   * 
   * Verification checks:
   * 1. Genesis warrant has prev_hash = null
   * 2. Each warrant's content_hash matches its warrant_data
   * 3. Each warrant's prev_hash matches the previous warrant's chain_hash
   * 4. Each warrant's chain_hash = H(content_hash || prev_hash)
   * 5. Chain indices are sequential with no gaps
   */
  async verifyChain(tenantId) {
    const startTime = Date.now();
    const chain = await this.store.getChain(tenantId);
    if (chain.length === 0) {
      return {
        valid: true,
        warrants_verified: 0,
        chain_root: "",
        merkle_root: "",
        verified_at: (/* @__PURE__ */ new Date()).toISOString(),
        verification_time_ms: Date.now() - startTime
      };
    }
    if (chain[0].prev_hash !== null) {
      return this._failResult(0, "Genesis warrant must have prev_hash = null", chain, startTime);
    }
    if (chain[0].chain_index !== 0) {
      return this._failResult(0, "Genesis warrant must have chain_index = 0", chain, startTime);
    }
    for (let i = 0; i < chain.length; i++) {
      const warrant = chain[i];
      if (warrant.chain_index !== i) {
        return this._failResult(i, `Expected chain_index ${i}, got ${warrant.chain_index}`, chain, startTime);
      }
      const expectedContentHash = this.hashWarrantContent(warrant.warrant_data);
      if (warrant.content_hash !== expectedContentHash) {
        return this._failResult(i, `Content hash mismatch \u2014 warrant data has been tampered with`, chain, startTime);
      }
      if (i > 0) {
        const prevWarrant = chain[i - 1];
        if (warrant.prev_hash !== prevWarrant.chain_hash) {
          return this._failResult(i, `prev_hash does not match previous warrant's chain_hash \u2014 chain broken`, chain, startTime);
        }
      }
      const expectedChainHash = this.computeChainHash(warrant.content_hash, warrant.prev_hash);
      if (warrant.chain_hash !== expectedChainHash) {
        return this._failResult(i, `Chain hash mismatch \u2014 chain link has been tampered with`, chain, startTime);
      }
    }
    const chainRoot = chain[chain.length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(chain.map((w) => w.content_hash));
    return {
      valid: true,
      warrants_verified: chain.length,
      chain_root: chainRoot,
      merkle_root: merkleRoot,
      verified_at: (/* @__PURE__ */ new Date()).toISOString(),
      verification_time_ms: Date.now() - startTime
    };
  }
  /**
   * Generate a Merkle proof that a specific warrant exists in the chain.
   * The proof can be verified without seeing any other warrant's data —
   * this enables privacy-preserving audits.
   */
  async generateMerkleProof(tenantId, warrantId) {
    const chain = await this.store.getChain(tenantId);
    const target = chain.find((w) => w.warrant_id === warrantId);
    if (!target) return null;
    const leaves = chain.map((w) => w.content_hash);
    const leafIndex = target.chain_index;
    const proofPath = this._buildMerkleProofPath(leaves, leafIndex);
    const merkleRoot = this.computeMerkleRoot(leaves);
    return {
      warrant_id: warrantId,
      content_hash: target.content_hash,
      leaf_index: leafIndex,
      proof_path: proofPath,
      merkle_root: merkleRoot,
      tree_size: chain.length
    };
  }
  /**
   * Verify a Merkle proof — can be done by anyone with just the proof and root.
   * No access to the chain or Vienna OS required.
   */
  static verifyMerkleProof(proof) {
    let currentHash = proof.content_hash;
    for (const step of proof.proof_path) {
      if (step.position === "left") {
        currentHash = MerkleWarrantChain._hashPair(step.hash, currentHash);
      } else {
        currentHash = MerkleWarrantChain._hashPair(currentHash, step.hash);
      }
    }
    return currentHash === proof.merkle_root;
  }
  /**
   * Create a chain anchor — a snapshot of the chain state that can be
   * stored externally (timestamping authority, blockchain, etc.) for
   * non-repudiation.
   */
  async createAnchor(tenantId, method = "internal", externalRef) {
    const chain = await this.store.getChain(tenantId);
    if (chain.length === 0) {
      throw new Error("Cannot anchor empty chain");
    }
    const chainRoot = chain[chain.length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(chain.map((w) => w.content_hash));
    const anchor = {
      anchor_id: `anch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      tenant_id: tenantId,
      chain_root: chainRoot,
      merkle_root: merkleRoot,
      chain_length: chain.length,
      anchored_at: (/* @__PURE__ */ new Date()).toISOString(),
      external_ref: externalRef,
      method
    };
    await this.store.saveAnchor(anchor);
    return anchor;
  }
  /**
   * Verify chain against a previously stored anchor.
   * Proves the chain hasn't been modified since the anchor was created.
   */
  async verifyAgainstAnchor(tenantId, anchor) {
    const chain = await this.store.getChain(tenantId, 0, anchor.chain_length);
    if (chain.length < anchor.chain_length) {
      return {
        valid: false,
        reason: `Chain is shorter than anchor (${chain.length} < ${anchor.chain_length}) \u2014 warrants may have been deleted`,
        chain_grown: false,
        warrants_since_anchor: 0
      };
    }
    const chainRoot = chain[anchor.chain_length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(
      chain.slice(0, anchor.chain_length).map((w) => w.content_hash)
    );
    if (chainRoot !== anchor.chain_root) {
      return {
        valid: false,
        reason: "Chain root does not match anchor \u2014 chain has been modified",
        chain_grown: false,
        warrants_since_anchor: 0
      };
    }
    if (merkleRoot !== anchor.merkle_root) {
      return {
        valid: false,
        reason: "Merkle root does not match anchor \u2014 warrant content has been modified",
        chain_grown: false,
        warrants_since_anchor: 0
      };
    }
    const fullChainLength = await this.store.getChainLength(tenantId);
    return {
      valid: true,
      chain_grown: fullChainLength > anchor.chain_length,
      warrants_since_anchor: fullChainLength - anchor.chain_length
    };
  }
  // ─── Cryptographic Primitives ───
  /**
   * Hash warrant content using SHA-256.
   * Covers all authorization-relevant fields in deterministic order.
   */
  hashWarrantContent(warrantData) {
    const canonical = this._canonicalize(warrantData);
    return "sha256:" + crypto.createHash("sha256").update(canonical).digest("hex");
  }
  /**
   * Compute the chain hash: H(content_hash || prev_hash).
   * This is the chain link — each warrant's chain_hash depends on
   * its content AND the entire history before it.
   */
  computeChainHash(contentHash, prevHash) {
    const input = prevHash ? `${contentHash}||${prevHash}` : `${contentHash}||GENESIS`;
    return "sha256:" + crypto.createHash("sha256").update(input).digest("hex");
  }
  /**
   * Compute Merkle root from an array of leaf hashes.
   * Uses a balanced binary Merkle tree.
   */
  computeMerkleRoot(leafHashes) {
    if (leafHashes.length === 0) return "";
    if (leafHashes.length === 1) return leafHashes[0];
    const leaves = [...leafHashes];
    while (leaves.length & leaves.length - 1) {
      leaves.push(leaves[leaves.length - 1]);
    }
    let level = leaves;
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        nextLevel.push(MerkleWarrantChain._hashPair(level[i], level[i + 1]));
      }
      level = nextLevel;
    }
    return level[0];
  }
  // ─── Private Methods ───
  /**
   * Canonicalize warrant data for deterministic hashing.
   * Fields are sorted alphabetically and serialized consistently.
   */
  _canonicalize(data) {
    const fields = {
      warrant_id: data.warrant_id,
      issued_by: data.issued_by,
      issued_at: data.issued_at,
      expires_at: data.expires_at,
      risk_tier: data.risk_tier,
      truth_snapshot_id: data.truth_snapshot_id,
      plan_id: data.plan_id,
      approval_ids: (data.approval_ids || []).sort(),
      objective: data.objective,
      allowed_actions: (data.allowed_actions || []).sort(),
      forbidden_actions: (data.forbidden_actions || []).sort(),
      constraints: data.constraints || {},
      signature: data.signature
    };
    return JSON.stringify(fields, Object.keys(fields).sort());
  }
  /**
   * Build Merkle proof path for a leaf at a given index.
   */
  _buildMerkleProofPath(leaves, targetIndex) {
    const proof = [];
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length & paddedLeaves.length - 1) {
      paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
    }
    let level = paddedLeaves;
    let index = targetIndex;
    while (level.length > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      if (siblingIndex < level.length) {
        proof.push({
          hash: level[siblingIndex],
          position: index % 2 === 0 ? "right" : "left"
        });
      }
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        nextLevel.push(MerkleWarrantChain._hashPair(level[i], level[i + 1]));
      }
      level = nextLevel;
      index = Math.floor(index / 2);
    }
    return proof;
  }
  /** Hash a pair of hashes (Merkle tree node) */
  static _hashPair(left, right) {
    return "sha256:" + crypto.createHash("sha256").update(`${left}||${right}`).digest("hex");
  }
  /** Create a failed verification result */
  _failResult(index, reason, chain, startTime) {
    return {
      valid: false,
      warrants_verified: index,
      first_invalid_index: index,
      reason,
      chain_root: chain.length > 0 ? chain[chain.length - 1].chain_hash : "",
      merkle_root: "",
      verified_at: (/* @__PURE__ */ new Date()).toISOString(),
      verification_time_ms: Date.now() - startTime
    };
  }
}
var warrant_chain_default = MerkleWarrantChain;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MerkleWarrantChain
});
