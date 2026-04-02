/**
 * Adapter Configs Routes — Phase 4A
 * 
 * CRUD for adapter_configs (credential store).
 * Never returns raw credentials in any response.
 * 
 * POST   /api/v1/adapters      — Create adapter config
 * GET    /api/v1/adapters       — List adapter configs (redacted)
 * GET    /api/v1/adapters/:id   — Get single config (redacted)
 * PUT    /api/v1/adapters/:id   — Rotate credentials
 * DELETE /api/v1/adapters/:id   — Disable adapter config
 */

import { Router, Request, Response } from 'express';
import {
  createAdapterConfig,
  getAdapterConfig,
  listAdapterConfigs,
  rotateCredentials,
  disableAdapterConfig,
} from '../services/credentialService.js';
import { isCredentialKeyConfigured } from '../services/credentialCrypto.js';

export function createAdapterConfigsRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/adapters
   * Create a new adapter config with encrypted credentials.
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      if (!isCredentialKeyConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'VIENNA_CREDENTIAL_KEY not configured. Credential storage unavailable.',
          code: 'CREDENTIAL_KEY_MISSING',
        });
      }

      const tenantId = (req as any).user?.tenantId || req.body.tenant_id || 'default';
      const { adapter_type, name, endpoint_url, headers, auth_mode, credential_alias, credentials } = req.body;

      if (!adapter_type || !name || !endpoint_url || !credentials) {
        return res.status(400).json({
          success: false,
          error: 'adapter_type, name, endpoint_url, and credentials are required',
          code: 'INVALID_REQUEST',
        });
      }

      // credentials can be string or object — stringify if object
      const credentialString = typeof credentials === 'string' 
        ? credentials 
        : JSON.stringify(credentials);

      const config = await createAdapterConfig(tenantId, {
        adapter_type,
        name,
        endpoint_url,
        headers,
        auth_mode: auth_mode || 'bearer',
        credential_alias,
        credentials: credentialString,
      });

      res.status(201).json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[AdapterConfigs] Create error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'CREATE_ERROR',
      });
    }
  });

  /**
   * GET /api/v1/adapters
   * List all adapter configs (redacted — no credentials).
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const configs = await listAdapterConfigs(tenantId);

      res.json({
        success: true,
        data: configs,
        count: configs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'LIST_ERROR',
      });
    }
  });

  /**
   * GET /api/v1/adapters/:id
   * Get single adapter config (redacted).
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const config = await getAdapterConfig(tenantId, req.params.id);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Adapter config not found',
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'GET_ERROR',
      });
    }
  });

  /**
   * PUT /api/v1/adapters/:id
   * Rotate credentials for an adapter config.
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { credentials } = req.body;

      if (!credentials) {
        return res.status(400).json({
          success: false,
          error: 'credentials field required for rotation',
          code: 'INVALID_REQUEST',
        });
      }

      const credentialString = typeof credentials === 'string'
        ? credentials
        : JSON.stringify(credentials);

      await rotateCredentials(tenantId, req.params.id, credentialString);

      res.json({
        success: true,
        message: 'Credentials rotated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'ROTATE_ERROR',
      });
    }
  });

  /**
   * DELETE /api/v1/adapters/:id
   * Disable (soft-delete) an adapter config.
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const reason = req.body.reason || 'Disabled via API';

      await disableAdapterConfig(tenantId, req.params.id, reason);

      res.json({
        success: true,
        message: 'Adapter config disabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'DISABLE_ERROR',
      });
    }
  });

  return router;
}
