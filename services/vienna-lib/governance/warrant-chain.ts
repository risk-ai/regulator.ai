/**
 * Merkle Warrant Chain — Vienna OS
 * 
 * Cryptographically verifiable, append-only chain of execution warrants.
 * Each warrant's hash includes the previous warrant's hash, creating an
 * immutable governance history that third parties can independently verify.
 * 
 * Key properties:
 * 1. APPEND-ONLY: New warrants can only be added to the end of the chain
 * 2. TAMPER-EVIDENT: Any modification to any warrant in the chain is detectable
 * 3. INDEPENDENTLY VERIFIABLE: Third-party auditors can verify the entire chain
 *    without trusting Vienna OS — the math proves integrity
 * 4. MERKLE PROOFS: Prove a specific warrant exists in the chain without
 *    revealing the entire chain (privacy-preserving audit)
 * 5. CHAIN ANCHORING: Periodic chain hashes can be anchored to external
 *    systems (blockchain, timestamping services) for non-repudiation
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │ Warrant Chain (per tenant)                               │
 * │                                                         │
 * │  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐          │
 * │  │ W₀   │───▶│ W₁   │───▶│ W₂   │───▶│ W₃   │         │
 * │  │      │    │      │    │      │    │      │          │
 * │  │hash₀ │    │hash₁ │    │hash₂ │    │hash₃ │          │
 * │  │prev:∅│    │prev: │    │prev: │    │prev: │          │
 * │  │      │    │hash₀ │    │hash₁ │    │hash₂ │          │
 * │  └──────┘    └──────┘    └──────┘    └──────┘          │
 * │                                                         │
 * │  Chain Root = hash₃                                     │
 * │  Merkle Root = H(H(hash₀,hash₁), H(hash₂,hash₃))      │
 * └─────────────────────────────────────────────────────────┘
 * 
 * Patent consideration:
 * This extends the existing warrant patent (USPTO #64/018,152) with:
 * - Merkle tree-based warrant chain integrity
 * - Cross-warrant hash linking (prev_hash field)
 * - Independent third-party verification protocol
 * - Privacy-preserving Merkle proofs for selective disclosure
 * - Chain anchoring for non-repudiation
 * 
 * @module governance/warrant-chain
 */

import * as crypto from 'crypto';
import type { RiskTierLevel } from './risk-tier';

// ─── Types ───

export interface ChainedWarrant {
  /** Unique warrant identifier */
  warrant_id: string;
  /** Sequential position in the chain (0-indexed) */
  chain_index: number;
  /** Tenant this chain belongs to */
  tenant_id: string;
  /** SHA-256 hash of this warrant's canonical content */
  content_hash: string;
  /** SHA-256 hash of the previous warrant in the chain (null for genesis) */
  prev_hash: string | null;
  /** Chain hash: H(content_hash || prev_hash) — this is the chain link */
  chain_hash: string;
  /** Full warrant data */
  warrant_data: WarrantData;
  /** ISO timestamp */
  created_at: string;
}

export interface WarrantData {
  warrant_id: string;
  issued_by: string;
  issued_at: string;
  expires_at: string;
  risk_tier: RiskTierLevel;
  truth_snapshot_id: string;
  plan_id: string;
  approval_ids: string[];
  objective: string;
  allowed_actions: string[];
  forbidden_actions: string[];
  constraints: Record<string, unknown>;
  signature: string;
  [key: string]: unknown;
}

export interface MerkleProof {
  /** The warrant being proven */
  warrant_id: string;
  /** Content hash of the target warrant */
  content_hash: string;
  /** Position in the Merkle tree */
  leaf_index: number;
  /** Sibling hashes needed to reconstruct the root */
  proof_path: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  /** The Merkle root this proof validates against */
  merkle_root: string;
  /** Total number of warrants in the tree */
  tree_size: number;
}

export interface ChainVerificationResult {
  /** Whether the entire chain is valid */
  valid: boolean;
  /** Number of warrants verified */
  warrants_verified: number;
  /** Index of first invalid warrant (if any) */
  first_invalid_index?: number;
  /** Reason for invalidity */
  reason?: string;
  /** Chain root hash (hash of the latest warrant) */
  chain_root: string;
  /** Merkle root of all warrants */
  merkle_root: string;
  /** Verification timestamp */
  verified_at: string;
  /** Time taken in milliseconds */
  verification_time_ms: number;
}

export interface ChainAnchor {
  /** Anchor identifier */
  anchor_id: string;
  /** Tenant */
  tenant_id: string;
  /** Chain root hash at time of anchoring */
  chain_root: string;
  /** Merkle root at time of anchoring */
  merkle_root: string;
  /** Number of warrants in chain at anchor time */
  chain_length: number;
  /** ISO timestamp */
  anchored_at: string;
  /** External anchor reference (e.g., blockchain tx hash) */
  external_ref?: string;
  /** Anchor method */
  method: 'internal' | 'timestamp_authority' | 'blockchain';
}

export interface WarrantChainStore {
  /** Append a warrant to the chain */
  appendWarrant(warrant: ChainedWarrant): Promise<void>;
  /** Get the latest warrant in the chain */
  getLatest(tenantId: string): Promise<ChainedWarrant | null>;
  /** Get a warrant by chain index */
  getByIndex(tenantId: string, index: number): Promise<ChainedWarrant | null>;
  /** Get a warrant by ID */
  getByWarrantId(warrantId: string): Promise<ChainedWarrant | null>;
  /** Get all warrants in the chain (for verification) */
  getChain(tenantId: string, fromIndex?: number, toIndex?: number): Promise<ChainedWarrant[]>;
  /** Get chain length */
  getChainLength(tenantId: string): Promise<number>;
  /** Store an anchor */
  saveAnchor(anchor: ChainAnchor): Promise<void>;
  /** Get latest anchor */
  getLatestAnchor(tenantId: string): Promise<ChainAnchor | null>;
}

// ─── Merkle Warrant Chain ───

export class MerkleWarrantChain {
  private store: WarrantChainStore;

  constructor(store: WarrantChainStore) {
    this.store = store;
  }

  /**
   * Append a warrant to the chain.
   * This is the ONLY way to add warrants — ensures chain integrity.
   */
  async append(tenantId: string, warrantData: WarrantData): Promise<ChainedWarrant> {
    // Get the current chain head
    const latest = await this.store.getLatest(tenantId);
    const prevHash = latest?.chain_hash || null;
    const chainIndex = latest ? latest.chain_index + 1 : 0;

    // Compute content hash (covers all warrant fields)
    const contentHash = this.hashWarrantContent(warrantData);

    // Compute chain hash: H(content_hash || prev_hash)
    // This is the critical link — any change to this or prior warrants
    // will cascade and invalidate all subsequent chain hashes
    const chainHash = this.computeChainHash(contentHash, prevHash);

    const chainedWarrant: ChainedWarrant = {
      warrant_id: warrantData.warrant_id,
      chain_index: chainIndex,
      tenant_id: tenantId,
      content_hash: contentHash,
      prev_hash: prevHash,
      chain_hash: chainHash,
      warrant_data: warrantData,
      created_at: new Date().toISOString(),
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
  async verifyChain(tenantId: string): Promise<ChainVerificationResult> {
    const startTime = Date.now();
    const chain = await this.store.getChain(tenantId);

    if (chain.length === 0) {
      return {
        valid: true,
        warrants_verified: 0,
        chain_root: '',
        merkle_root: '',
        verified_at: new Date().toISOString(),
        verification_time_ms: Date.now() - startTime,
      };
    }

    // Verify genesis
    if (chain[0].prev_hash !== null) {
      return this._failResult(0, 'Genesis warrant must have prev_hash = null', chain, startTime);
    }

    if (chain[0].chain_index !== 0) {
      return this._failResult(0, 'Genesis warrant must have chain_index = 0', chain, startTime);
    }

    // Verify each warrant
    for (let i = 0; i < chain.length; i++) {
      const warrant = chain[i];

      // Check sequential index
      if (warrant.chain_index !== i) {
        return this._failResult(i, `Expected chain_index ${i}, got ${warrant.chain_index}`, chain, startTime);
      }

      // Verify content hash
      const expectedContentHash = this.hashWarrantContent(warrant.warrant_data);
      if (warrant.content_hash !== expectedContentHash) {
        return this._failResult(i, `Content hash mismatch — warrant data has been tampered with`, chain, startTime);
      }

      // Verify prev_hash linkage
      if (i > 0) {
        const prevWarrant = chain[i - 1];
        if (warrant.prev_hash !== prevWarrant.chain_hash) {
          return this._failResult(i, `prev_hash does not match previous warrant's chain_hash — chain broken`, chain, startTime);
        }
      }

      // Verify chain hash
      const expectedChainHash = this.computeChainHash(warrant.content_hash, warrant.prev_hash);
      if (warrant.chain_hash !== expectedChainHash) {
        return this._failResult(i, `Chain hash mismatch — chain link has been tampered with`, chain, startTime);
      }
    }

    const chainRoot = chain[chain.length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(chain.map((w) => w.content_hash));

    return {
      valid: true,
      warrants_verified: chain.length,
      chain_root: chainRoot,
      merkle_root: merkleRoot,
      verified_at: new Date().toISOString(),
      verification_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Generate a Merkle proof that a specific warrant exists in the chain.
   * The proof can be verified without seeing any other warrant's data —
   * this enables privacy-preserving audits.
   */
  async generateMerkleProof(tenantId: string, warrantId: string): Promise<MerkleProof | null> {
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
      tree_size: chain.length,
    };
  }

  /**
   * Verify a Merkle proof — can be done by anyone with just the proof and root.
   * No access to the chain or Vienna OS required.
   */
  static verifyMerkleProof(proof: MerkleProof): boolean {
    let currentHash = proof.content_hash;

    for (const step of proof.proof_path) {
      if (step.position === 'left') {
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
  async createAnchor(
    tenantId: string,
    method: ChainAnchor['method'] = 'internal',
    externalRef?: string
  ): Promise<ChainAnchor> {
    const chain = await this.store.getChain(tenantId);

    if (chain.length === 0) {
      throw new Error('Cannot anchor empty chain');
    }

    const chainRoot = chain[chain.length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(chain.map((w) => w.content_hash));

    const anchor: ChainAnchor = {
      anchor_id: `anch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tenant_id: tenantId,
      chain_root: chainRoot,
      merkle_root: merkleRoot,
      chain_length: chain.length,
      anchored_at: new Date().toISOString(),
      external_ref: externalRef,
      method,
    };

    await this.store.saveAnchor(anchor);

    return anchor;
  }

  /**
   * Verify chain against a previously stored anchor.
   * Proves the chain hasn't been modified since the anchor was created.
   */
  async verifyAgainstAnchor(tenantId: string, anchor: ChainAnchor): Promise<{
    valid: boolean;
    reason?: string;
    chain_grown: boolean;
    warrants_since_anchor: number;
  }> {
    const chain = await this.store.getChain(tenantId, 0, anchor.chain_length);

    if (chain.length < anchor.chain_length) {
      return {
        valid: false,
        reason: `Chain is shorter than anchor (${chain.length} < ${anchor.chain_length}) — warrants may have been deleted`,
        chain_grown: false,
        warrants_since_anchor: 0,
      };
    }

    // Verify the chain up to the anchor point
    const chainRoot = chain[anchor.chain_length - 1].chain_hash;
    const merkleRoot = this.computeMerkleRoot(
      chain.slice(0, anchor.chain_length).map((w) => w.content_hash)
    );

    if (chainRoot !== anchor.chain_root) {
      return {
        valid: false,
        reason: 'Chain root does not match anchor — chain has been modified',
        chain_grown: false,
        warrants_since_anchor: 0,
      };
    }

    if (merkleRoot !== anchor.merkle_root) {
      return {
        valid: false,
        reason: 'Merkle root does not match anchor — warrant content has been modified',
        chain_grown: false,
        warrants_since_anchor: 0,
      };
    }

    const fullChainLength = await this.store.getChainLength(tenantId);

    return {
      valid: true,
      chain_grown: fullChainLength > anchor.chain_length,
      warrants_since_anchor: fullChainLength - anchor.chain_length,
    };
  }

  // ─── Cryptographic Primitives ───

  /**
   * Hash warrant content using SHA-256.
   * Covers all authorization-relevant fields in deterministic order.
   */
  hashWarrantContent(warrantData: WarrantData): string {
    const canonical = this._canonicalize(warrantData);
    return 'sha256:' + crypto
      .createHash('sha256')
      .update(canonical)
      .digest('hex');
  }

  /**
   * Compute the chain hash: H(content_hash || prev_hash).
   * This is the chain link — each warrant's chain_hash depends on
   * its content AND the entire history before it.
   */
  computeChainHash(contentHash: string, prevHash: string | null): string {
    const input = prevHash
      ? `${contentHash}||${prevHash}`
      : `${contentHash}||GENESIS`;

    return 'sha256:' + crypto
      .createHash('sha256')
      .update(input)
      .digest('hex');
  }

  /**
   * Compute Merkle root from an array of leaf hashes.
   * Uses a balanced binary Merkle tree.
   */
  computeMerkleRoot(leafHashes: string[]): string {
    if (leafHashes.length === 0) return '';
    if (leafHashes.length === 1) return leafHashes[0];

    // Pad to power of 2
    const leaves = [...leafHashes];
    while (leaves.length & (leaves.length - 1)) {
      leaves.push(leaves[leaves.length - 1]); // Duplicate last leaf
    }

    let level = leaves;
    while (level.length > 1) {
      const nextLevel: string[] = [];
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
  private _canonicalize(data: WarrantData): string {
    const fields: Record<string, unknown> = {
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
      signature: data.signature,
    };

    // Sort keys and serialize deterministically
    return JSON.stringify(fields, Object.keys(fields).sort());
  }

  /**
   * Build Merkle proof path for a leaf at a given index.
   */
  private _buildMerkleProofPath(
    leaves: string[],
    targetIndex: number
  ): MerkleProof['proof_path'] {
    const proof: MerkleProof['proof_path'] = [];

    // Pad to power of 2
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length & (paddedLeaves.length - 1)) {
      paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
    }

    let level = paddedLeaves;
    let index = targetIndex;

    while (level.length > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;

      if (siblingIndex < level.length) {
        proof.push({
          hash: level[siblingIndex],
          position: index % 2 === 0 ? 'right' : 'left',
        });
      }

      // Move up to next level
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        nextLevel.push(MerkleWarrantChain._hashPair(level[i], level[i + 1]));
      }
      level = nextLevel;
      index = Math.floor(index / 2);
    }

    return proof;
  }

  /** Hash a pair of hashes (Merkle tree node) */
  private static _hashPair(left: string, right: string): string {
    return 'sha256:' + crypto
      .createHash('sha256')
      .update(`${left}||${right}`)
      .digest('hex');
  }

  /** Create a failed verification result */
  private _failResult(
    index: number,
    reason: string,
    chain: ChainedWarrant[],
    startTime: number
  ): ChainVerificationResult {
    return {
      valid: false,
      warrants_verified: index,
      first_invalid_index: index,
      reason,
      chain_root: chain.length > 0 ? chain[chain.length - 1].chain_hash : '',
      merkle_root: '',
      verified_at: new Date().toISOString(),
      verification_time_ms: Date.now() - startTime,
    };
  }
}

export default MerkleWarrantChain;
