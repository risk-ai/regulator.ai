/**
 * Warrant Chain API Routes — Vienna OS
 * 
 * Exposes the Merkle Warrant Chain for:
 * - Chain verification (third-party auditors)
 * - Merkle proof generation (privacy-preserving warrant membership proof)
 * - Chain anchoring (external non-repudiation)
 * - Chain status (dashboard)
 */

import { Router, Request, Response } from 'express';

export function createWarrantChainRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/warrant-chain/status
   * Get chain status for the authenticated tenant
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const chain = req.app.locals.warrantChain;
      if (!chain) {
        return res.status(503).json({
          success: false,
          error: 'Warrant chain not available',
        });
      }

      const tenantId = (req as any).user?.tenantId || 'default';
      const store = (chain as any).store;
      const length = await store.getChainLength(tenantId);
      const latest = await store.getLatest(tenantId);
      const latestAnchor = await store.getLatestAnchor(tenantId);

      res.json({
        success: true,
        data: {
          chain_length: length,
          chain_root: latest?.chain_hash || null,
          latest_warrant: latest ? {
            warrant_id: latest.warrant_id,
            chain_index: latest.chain_index,
            chain_hash: latest.chain_hash,
            created_at: latest.created_at,
          } : null,
          latest_anchor: latestAnchor ? {
            anchor_id: latestAnchor.anchor_id,
            chain_length: latestAnchor.chain_length,
            merkle_root: latestAnchor.merkle_root,
            anchored_at: latestAnchor.anchored_at,
            method: latestAnchor.method,
          } : null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/warrant-chain/verify
   * Verify the entire chain integrity.
   * Can be called by third-party auditors.
   */
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const chain = req.app.locals.warrantChain;
      if (!chain) {
        return res.status(503).json({ success: false, error: 'Warrant chain not available' });
      }

      const tenantId = (req as any).user?.tenantId || 'default';
      const result = await chain.verifyChain(tenantId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/warrant-chain/proof/:warrantId
   * Generate a Merkle proof for a specific warrant.
   * The proof can be independently verified without the full chain.
   */
  router.get('/proof/:warrantId', async (req: Request, res: Response) => {
    try {
      const chain = req.app.locals.warrantChain;
      if (!chain) {
        return res.status(503).json({ success: false, error: 'Warrant chain not available' });
      }

      const tenantId = (req as any).user?.tenantId || 'default';
      const { warrantId } = req.params;

      const proof = await chain.generateMerkleProof(tenantId, warrantId);

      if (!proof) {
        return res.status(404).json({
          success: false,
          error: `Warrant ${warrantId} not found in chain`,
        });
      }

      res.json({
        success: true,
        data: {
          proof,
          verification_instructions: {
            description: 'This Merkle proof can be verified independently without access to the full chain or Vienna OS.',
            algorithm: 'Starting from content_hash, hash with each sibling in proof_path to reconstruct merkle_root.',
            hash_function: 'SHA-256',
            format: 'H(left || right) where || is string concatenation with separator',
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/warrant-chain/verify-proof
   * Verify a Merkle proof. This endpoint requires NO authentication —
   * anyone with a proof can verify it. This is the third-party verification API.
   */
  router.post('/verify-proof', async (req: Request, res: Response) => {
    try {
      const { proof } = req.body;

      if (!proof || !proof.content_hash || !proof.proof_path || !proof.merkle_root) {
        return res.status(400).json({
          success: false,
          error: 'Invalid proof format. Required: content_hash, proof_path, merkle_root',
        });
      }

      // Dynamic import to avoid circular deps
      const { MerkleWarrantChain } = await import(
        '../../../../services/vienna-lib/governance/warrant-chain.js'
      );
      
      const valid = MerkleWarrantChain.verifyMerkleProof(proof);

      res.json({
        success: true,
        data: {
          valid,
          warrant_id: proof.warrant_id,
          merkle_root: proof.merkle_root,
          verified_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/warrant-chain/anchor
   * Create a chain anchor (snapshot of current chain state).
   * Can be stored externally for non-repudiation.
   */
  router.post('/anchor', async (req: Request, res: Response) => {
    try {
      const chain = req.app.locals.warrantChain;
      if (!chain) {
        return res.status(503).json({ success: false, error: 'Warrant chain not available' });
      }

      const tenantId = (req as any).user?.tenantId || 'default';
      const { method = 'internal', external_ref } = req.body;

      const anchor = await chain.createAnchor(tenantId, method, external_ref);

      res.json({
        success: true,
        data: anchor,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/warrant-chain/verify-anchor
   * Verify chain against a previously created anchor.
   */
  router.post('/verify-anchor', async (req: Request, res: Response) => {
    try {
      const chain = req.app.locals.warrantChain;
      if (!chain) {
        return res.status(503).json({ success: false, error: 'Warrant chain not available' });
      }

      const tenantId = (req as any).user?.tenantId || 'default';
      const { anchor } = req.body;

      if (!anchor) {
        return res.status(400).json({ success: false, error: 'anchor object required' });
      }

      const result = await chain.verifyAgainstAnchor(tenantId, anchor);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
