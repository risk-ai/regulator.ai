/**
 * Merkle Warrant Chain — Comprehensive Tests
 * 
 * Proves the security properties of the warrant chain:
 * 1. Chain integrity: any tampering is detectable
 * 2. Merkle proofs: verify warrant membership without full chain
 * 3. Anchoring: chain state can be externally verified
 * 4. Append-only: warrants can only be added, never modified
 * 5. Third-party verification: no trust in Vienna OS required
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MerkleWarrantChain, type WarrantData } from '../governance/warrant-chain.js';
import { InMemoryWarrantChainStore } from '../governance/warrant-chain-store.js';

const TENANT = 'test-tenant';

function makeWarrant(overrides: Partial<WarrantData> = {}): WarrantData {
  const id = `wrt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    warrant_id: id,
    issued_by: 'test',
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
    risk_tier: 'T1',
    truth_snapshot_id: `truth_${id}`,
    plan_id: `plan_${id}`,
    approval_ids: [],
    objective: 'Test objective',
    allowed_actions: ['file.read'],
    forbidden_actions: [],
    constraints: {},
    signature: `hmac-sha256:${id}`,
    ...overrides,
  };
}

describe('Merkle Warrant Chain', () => {
  let store: InMemoryWarrantChainStore;
  let chain: MerkleWarrantChain;

  beforeEach(() => {
    store = new InMemoryWarrantChainStore();
    chain = new MerkleWarrantChain(store);
  });

  // ─── Basic Operations ───

  describe('Append and Retrieve', () => {
    it('appends genesis warrant with index 0 and null prev_hash', async () => {
      const w = await chain.append(TENANT, makeWarrant());
      expect(w.chain_index).toBe(0);
      expect(w.prev_hash).toBeNull();
      expect(w.content_hash).toMatch(/^sha256:/);
      expect(w.chain_hash).toMatch(/^sha256:/);
    });

    it('appends sequential warrants with linked prev_hash', async () => {
      const w0 = await chain.append(TENANT, makeWarrant());
      const w1 = await chain.append(TENANT, makeWarrant());
      const w2 = await chain.append(TENANT, makeWarrant());

      expect(w0.chain_index).toBe(0);
      expect(w1.chain_index).toBe(1);
      expect(w2.chain_index).toBe(2);

      expect(w0.prev_hash).toBeNull();
      expect(w1.prev_hash).toBe(w0.chain_hash);
      expect(w2.prev_hash).toBe(w1.chain_hash);
    });

    it('isolates chains by tenant', async () => {
      await chain.append('tenant-a', makeWarrant());
      await chain.append('tenant-a', makeWarrant());
      await chain.append('tenant-b', makeWarrant());

      const lengthA = await store.getChainLength('tenant-a');
      const lengthB = await store.getChainLength('tenant-b');

      expect(lengthA).toBe(2);
      expect(lengthB).toBe(1);
    });
  });

  // ─── Chain Verification ───

  describe('Chain Integrity Verification', () => {
    it('verifies empty chain as valid', async () => {
      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(true);
      expect(result.warrants_verified).toBe(0);
    });

    it('verifies single-warrant chain', async () => {
      await chain.append(TENANT, makeWarrant());
      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(true);
      expect(result.warrants_verified).toBe(1);
    });

    it('verifies 100-warrant chain', async () => {
      for (let i = 0; i < 100; i++) {
        await chain.append(TENANT, makeWarrant({ objective: `Warrant ${i}` }));
      }
      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(true);
      expect(result.warrants_verified).toBe(100);
    });

    it('detects content tampering at any position', async () => {
      for (let i = 0; i < 10; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      // Tamper with warrant at index 5
      const chainData = await store.getChain(TENANT);
      chainData[5].warrant_data.allowed_actions = ['delete_production'];
      // Directly mutate store (simulating DB tampering)
      (store as any).chains.set(TENANT, chainData);

      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(false);
      expect(result.first_invalid_index).toBe(5);
      expect(result.reason).toContain('tampered');
    });

    it('detects chain link tampering', async () => {
      for (let i = 0; i < 5; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      // Tamper with chain_hash at index 2
      const chainData = await store.getChain(TENANT);
      chainData[2].chain_hash = 'sha256:fake_hash_injected';
      (store as any).chains.set(TENANT, chainData);

      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(false);
      // Should fail at index 2 (chain_hash mismatch) or index 3 (prev_hash mismatch)
      expect(result.first_invalid_index).toBeLessThanOrEqual(3);
    });

    it('detects deleted warrant (gap in chain)', async () => {
      for (let i = 0; i < 5; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      // Remove warrant at index 2
      const chainData = await store.getChain(TENANT);
      chainData.splice(2, 1);
      (store as any).chains.set(TENANT, chainData);

      const result = await chain.verifyChain(TENANT);
      expect(result.valid).toBe(false);
    });
  });

  // ─── Merkle Proofs ───

  describe('Merkle Proofs', () => {
    it('generates valid proof for any warrant in chain', async () => {
      const warrants: string[] = [];
      for (let i = 0; i < 8; i++) {
        const w = await chain.append(TENANT, makeWarrant());
        warrants.push(w.warrant_id);
      }

      // Generate and verify proof for each warrant
      for (const warrantId of warrants) {
        const proof = await chain.generateMerkleProof(TENANT, warrantId);
        expect(proof).not.toBeNull();
        
        const valid = MerkleWarrantChain.verifyMerkleProof(proof!);
        expect(valid).toBe(true);
      }
    });

    it('proof fails if content hash is modified', async () => {
      for (let i = 0; i < 4; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const chainData = await store.getChain(TENANT);
      const targetId = chainData[2].warrant_id;
      const proof = await chain.generateMerkleProof(TENANT, targetId);
      expect(proof).not.toBeNull();

      // Tamper with the content hash in the proof
      proof!.content_hash = 'sha256:tampered_hash';

      const valid = MerkleWarrantChain.verifyMerkleProof(proof!);
      expect(valid).toBe(false);
    });

    it('proof fails if merkle root is modified', async () => {
      for (let i = 0; i < 4; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const chainData = await store.getChain(TENANT);
      const proof = await chain.generateMerkleProof(TENANT, chainData[0].warrant_id);
      
      proof!.merkle_root = 'sha256:fake_root';
      expect(MerkleWarrantChain.verifyMerkleProof(proof!)).toBe(false);
    });

    it('returns null for non-existent warrant', async () => {
      await chain.append(TENANT, makeWarrant());
      const proof = await chain.generateMerkleProof(TENANT, 'wrt_nonexistent');
      expect(proof).toBeNull();
    });
  });

  // ─── Anchoring ───

  describe('Chain Anchoring', () => {
    it('creates anchor with correct chain state', async () => {
      for (let i = 0; i < 5; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const anchor = await chain.createAnchor(TENANT);
      expect(anchor.chain_length).toBe(5);
      expect(anchor.chain_root).toMatch(/^sha256:/);
      expect(anchor.merkle_root).toMatch(/^sha256:/);
      expect(anchor.method).toBe('internal');
    });

    it('verifies chain unchanged since anchor', async () => {
      for (let i = 0; i < 5; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const anchor = await chain.createAnchor(TENANT);

      const result = await chain.verifyAgainstAnchor(TENANT, anchor);
      expect(result.valid).toBe(true);
      expect(result.chain_grown).toBe(false);
      expect(result.warrants_since_anchor).toBe(0);
    });

    it('detects chain growth since anchor', async () => {
      for (let i = 0; i < 3; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const anchor = await chain.createAnchor(TENANT);

      // Add more warrants after anchor
      for (let i = 0; i < 2; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const result = await chain.verifyAgainstAnchor(TENANT, anchor);
      expect(result.valid).toBe(true);
      expect(result.chain_grown).toBe(true);
      expect(result.warrants_since_anchor).toBe(2);
    });

    it('detects tampering since anchor', async () => {
      for (let i = 0; i < 5; i++) {
        await chain.append(TENANT, makeWarrant());
      }

      const anchor = await chain.createAnchor(TENANT);

      // Tamper with a warrant
      const chainData = await store.getChain(TENANT);
      chainData[2].warrant_data.objective = 'TAMPERED';
      chainData[2].content_hash = 'sha256:fake';
      (store as any).chains.set(TENANT, chainData);

      const result = await chain.verifyAgainstAnchor(TENANT, anchor);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('modified');
    });

    it('rejects empty chain anchor', async () => {
      await expect(chain.createAnchor(TENANT)).rejects.toThrow('empty chain');
    });
  });

  // ─── Hash Determinism ───

  describe('Hash Determinism', () => {
    it('same warrant data produces same content hash', () => {
      const data = makeWarrant({ warrant_id: 'fixed', issued_at: '2026-01-01T00:00:00Z' });
      const hash1 = chain.hashWarrantContent(data);
      const hash2 = chain.hashWarrantContent(data);
      expect(hash1).toBe(hash2);
    });

    it('different warrant data produces different content hash', () => {
      const data1 = makeWarrant({ warrant_id: 'w1', objective: 'A' });
      const data2 = makeWarrant({ warrant_id: 'w2', objective: 'B' });
      expect(chain.hashWarrantContent(data1)).not.toBe(chain.hashWarrantContent(data2));
    });

    it('chain hash is deterministic', () => {
      const h1 = chain.computeChainHash('sha256:abc', 'sha256:def');
      const h2 = chain.computeChainHash('sha256:abc', 'sha256:def');
      expect(h1).toBe(h2);
    });

    it('genesis chain hash differs from linked chain hash', () => {
      const content = 'sha256:same_content';
      const genesis = chain.computeChainHash(content, null);
      const linked = chain.computeChainHash(content, 'sha256:prev');
      expect(genesis).not.toBe(linked);
    });
  });
});
