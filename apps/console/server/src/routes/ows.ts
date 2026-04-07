/**
 * Open Warrant Standard (OWS) API Routes
 * 
 * Public endpoints for the OWS specification and token verification.
 * These endpoints are designed to be used by third-party systems
 * implementing the Open Warrant Standard.
 */

import { Router, Request, Response } from 'express';

export function createOWSRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/ows/spec
   * Returns the Open Warrant Standard specification (JSON Schema).
   * PUBLIC — no authentication required.
   */
  router.get('/spec', async (_req: Request, res: Response) => {
    try {
      const { OpenWarrantStandard } = await import(
        '@vienna-lib/governance/open-warrant-standard.js'
      );
      const spec = OpenWarrantStandard.getSpecification();

      res.set('Content-Type', 'application/schema+json');
      res.json(spec);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/ows/verify
   * Verify an OWS token. PUBLIC — no authentication required.
   * Third-party systems can verify tokens without access to Vienna OS.
   * 
   * Body: { token: string, action?: string, params?: object }
   * 
   * Note: The verifier must have the signing key registered.
   * For HMAC tokens, this means the shared secret.
   * For RS256/ES256, the public key.
   */
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { token, action, params } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, error: 'token is required' });
      }

      // Parse without verification first to show the claims
      const { OpenWarrantStandard } = await import(
        '@vienna-lib/governance/open-warrant-standard.js'
      );
      const ows = new OpenWarrantStandard();

      // Try to parse the token
      try {
        const parsed = ows.parse(token);

        // We can't verify the signature without the key,
        // but we can validate structure and expiration
        const now = Math.floor(Date.now() / 1000);
        const expired = parsed.payload.exp < now;
        const notYetValid = parsed.payload.nbf ? parsed.payload.nbf > now : false;

        // Check scope if action provided
        let scopeValid: boolean | undefined;
        if (action) {
          const denied = parsed.payload.deny?.includes(action);
          const allowed = parsed.payload.scope.includes(action) || parsed.payload.scope.includes('*');
          scopeValid = !denied && allowed;
        }

        res.json({
          success: true,
          data: {
            parsed: true,
            signature_verified: false, // Can't verify without the key
            signature_note: 'Signature verification requires the signing key. Register the key and use the authenticated verify endpoint.',
            expired,
            not_yet_valid: notYetValid,
            scope_valid: scopeValid,
            header: parsed.header,
            payload: parsed.payload,
          },
        });
      } catch (parseErr) {
        res.json({
          success: false,
          data: {
            parsed: false,
            error: parseErr instanceof Error ? parseErr.message : 'Failed to parse token',
          },
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/ows/issue
   * Issue an OWS token for a warrant (authenticated).
   * Converts an existing Vienna warrant to OWS format.
   */
  router.post('/issue', async (req: Request, res: Response) => {
    try {
      const warrantChain = req.app.locals.warrantChain;
      const { warrant_id, agent_id, audience } = req.body;

      if (!warrant_id) {
        return res.status(400).json({ success: false, error: 'warrant_id is required' });
      }

      // Load the warrant
      const viennaCore = req.app.locals.viennaCore;
      if (!viennaCore?.warrant) {
        return res.status(503).json({ success: false, error: 'Warrant system not available' });
      }

      // Get warrant data
      const warrant = await viennaCore.warrant.adapter?.loadWarrant(warrant_id);
      if (!warrant) {
        return res.status(404).json({ success: false, error: `Warrant ${warrant_id} not found` });
      }

      // Create OWS instance with server signing key
      const { OpenWarrantStandard } = await import(
        '@vienna-lib/governance/open-warrant-standard.js'
      );
      const ows = new OpenWarrantStandard();
      
      const signingKey = process.env.VIENNA_OWS_KEY || process.env.VIENNA_WARRANT_KEY || 'vienna-ows-default-key';
      ows.registerKey({
        kid: 'vienna-primary',
        alg: 'HS256',
        secret: signingKey,
      });

      const token = ows.fromViennaWarrant(warrant, {
        agentId: agent_id || warrant.issued_by,
        audience: audience || 'vienna-os',
      });

      res.json({
        success: true,
        data: {
          token,
          format: 'OWS v1.0',
          description: 'Open Warrant Standard token — portable, verifiable execution authorization',
        },
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
