/**
 * Vienna Core Runtime - Full Implementation
 * Serverless function wrapper for Vienna Core
 */

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vienna Core initialization
let viennaCore: any = null;
let viennaRuntime: any = null;

async function initViennaCore() {
  if (viennaCore) return { viennaCore, viennaRuntime };
  
  try {
    // Import Vienna Core from the server package
    const viennaCoreModule = await import('../../../console/server/src/services/viennaCore.js');
    const ViennaRuntimeService = await import('../../../console/server/src/services/viennaRuntime.js');
    
    // Initialize Vienna Core with Neon database
    viennaCore = await viennaCoreModule.initializeViennaCore({
      env: 'prod',
      databaseUrl: process.env.DATABASE_URL,
    });
    
    // Create runtime service
    viennaRuntime = new ViennaRuntimeService.ViennaRuntimeService(viennaCore, null);
    
    console.log('[Vienna Core] Initialized successfully');
    return { viennaCore, viennaRuntime };
  } catch (error: any) {
    console.error('[Vienna Core] Initialization failed:', error.message);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { viennaRuntime } = await initViennaCore();
    
    // Route based on path
    const path = req.url?.replace(/^\/api\/vienna\/runtime/, '') || '';
    
    // System status
    if (path === '/status' || path === '' || path === '/') {
      const status = await viennaRuntime.getSystemStatus();
      return res.json({ success: true, data: status });
    }
    
    // Active envelopes
    if (path === '/execution/active') {
      const envelopes = await viennaRuntime.getActiveEnvelopes();
      return res.json({ success: true, data: envelopes });
    }
    
    // Queue state
    if (path === '/execution/queue') {
      const queue = await viennaRuntime.getQueueState();
      return res.json({ success: true, data: queue });
    }
    
    // Metrics
    if (path === '/execution/metrics') {
      const metrics = await viennaRuntime.getExecutionMetrics();
      return res.json({ success: true, data: metrics });
    }
    
    // Health check
    if (path === '/health') {
      const health = await viennaRuntime.getHealthSnapshot();
      return res.json({ success: true, data: health });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      available: ['/status', '/execution/active', '/execution/queue', '/execution/metrics', '/health']
    });
    
  } catch (error: any) {
    console.error('[Vienna Runtime]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'VIENNA_RUNTIME_ERROR'
    });
  }
}
