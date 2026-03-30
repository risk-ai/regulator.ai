/**
 * Vercel Serverless Entry Point
 * 
 * Wraps the Express app for Vercel serverless deployment.
 * Uses Postgres exclusively (no SQLite/better-sqlite3).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
dotenv.config();

// Force Postgres mode
process.env.VERCEL = '1';

import { createApp } from './app.js';
import { ViennaRuntimeService } from './services/viennaRuntime.js';
import { ChatService } from './services/chatServiceSimple.js';
import { ChatHistoryService } from './services/chatHistoryService.postgres.js';
import { DashboardBootstrapService } from './services/dashboardBootstrapService.js';
import { ObjectivesService } from './services/objectivesService.js';
import { AuthService } from './services/authService.js';
import { TimelineService } from './services/timelineService.js';
import { RuntimeStatsService } from './services/runtimeStatsService.js';
import { ProviderHealthService } from './services/providerHealthService.js';
import { SystemNowService } from './services/systemNowService.js';

let app: any = null;
let initPromise: Promise<any> | null = null;

async function initApp() {
  if (app) return app;
  
  console.log('[Vercel] Initializing Vienna Console...');
  
  // Initialize Vienna Core with Postgres
  let viennaCore: any = null;
  try {
    const { initializeViennaCore } = await import('./services/viennaCore.js');
    viennaCore = await initializeViennaCore({ env: 'prod' });
    console.log('[Vercel] Vienna Core initialized');
  } catch (err: any) {
    console.warn('[Vercel] Vienna Core init failed (degraded mode):', err.message);
  }

  // Initialize services
  const viennaRuntime = new ViennaRuntimeService(viennaCore);
  
  const chatHistory = new ChatHistoryService();
  await chatHistory.initialize();
  
  const chatService = new ChatService(viennaRuntime, chatHistory, null);
  
  const authConfig = {
    sessionTTL: 24 * 60 * 60 * 1000,
    maxSessions: 100,
    operators: [{
      name: process.env.VIENNA_OPERATOR_NAME || 'vienna',
      passwordHash: '',
      role: 'admin' as const,
      active: true,
    }],
    stateGraph: viennaCore?.stateGraph,
  };
  
  const authService = new AuthService(authConfig);
  const bootstrapService = new DashboardBootstrapService(viennaRuntime);
  const objectivesService = new ObjectivesService(viennaCore?.stateGraph);
  
  app = createApp(
    viennaRuntime,
    chatService,
    bootstrapService,
    objectivesService,
    authService,
  );
  
  console.log('[Vercel] App initialized successfully');
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!initPromise) {
      initPromise = initApp();
    }
    const expressApp = await initPromise;
    return expressApp(req, res);
  } catch (err: any) {
    console.error('[Vercel] Handler error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server initialization failed',
      message: err.message 
    });
  }
}
