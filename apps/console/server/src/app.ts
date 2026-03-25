/**
 * Vienna Console Server
 * 
 * Express application setup.
 * Mounts all routes and middleware.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ViennaRuntimeService } from './services/viennaRuntime.js';
import { ChatService } from './services/chatService.js';
import { DashboardBootstrapService } from './services/dashboardBootstrapService.js';
import { ObjectivesService } from './services/objectivesService.js';
import { AuthService } from './services/authService.js';
import { TimelineService } from './services/timelineService.js';
import { RuntimeStatsService } from './services/runtimeStatsService.js';
import { ProviderHealthService } from './services/providerHealthService.js';
import { SystemNowService } from './services/systemNowService.js';
import { eventStream } from './sse/eventStream.js';
import { createAuthMiddleware } from './middleware/requireAuth.js';

// Routes
import { createAuthRouter } from './routes/auth.js';
import { createStatusRouter } from './routes/status.js';
import { createDiagnosticsRouter } from './routes/diagnostics.js';
import { createApprovalsRouter } from './routes/approvals.js';
import { createBootstrapRouter } from './routes/bootstrap.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createObjectivesRouter } from './routes/objectives.js';
import { createExecutionRouter } from './routes/execution.js';
import { createDecisionsRouter } from './routes/decisions.js';
import { createDeadLettersRouter } from './routes/deadletters.js';
import { createAgentsRouter } from './routes/agents.js';
import { createReplayRouter } from './routes/replay.js';
import { createAuditRouter } from './routes/audit.js';
import { createDirectivesRouter } from './routes/directives.js';
import { createStreamRouter } from './routes/stream.js';
import { createServicesRouter } from './routes/services.js';
import { createProvidersRouter } from './routes/providers.js';
import { createChatRouter } from './routes/chat.js';
import { createFilesRouter } from './routes/files.js';
import { createRuntimeRouter } from './routes/runtime.js';
import { createCommandsRouter } from './routes/commands.js';
import { createSystemRouter } from './routes/system.js';
import { createRecoveryRouter } from './routes/recovery.js';
import { createWorkflowRouter } from './routes/workflows.js';
import { createModelsRouter } from './routes/models.js';
import { createManagedObjectivesRouter } from './routes/managed-objectives.js';
import { createExecutionsRouter } from './routes/executions.js';
import { createReconciliationRouter } from './routes/reconciliation.js';
import { createAssistantRouter } from './routes/assistant.js';
import { createIntentRouter } from './routes/intent.js';
import intentsRouter from './routes/intents.js';
import { createAgentIntentRouter } from './routes/agent-intent.js';
import investigationsRouter from './routes/investigations.js';
import artifactsRouter from './routes/artifacts.js';
import incidentsRouter from './routes/incidents.js';
import { createValidationRouter } from './routes/validation.js';
import { createAgentIntentRouter } from './routes/agent-intent.js';

import type { ErrorResponse } from './types/api.js';

export function createApp(
  viennaRuntime: ViennaRuntimeService,
  chatService: ChatService,
  bootstrapService: DashboardBootstrapService,
  objectivesService: ObjectivesService,
  authService: AuthService,
  timelineService?: TimelineService,
  runtimeStatsService?: RuntimeStatsService,
  providerHealthService?: ProviderHealthService,
  systemNowService?: SystemNowService,
  agentIntentBridge?: any
): Express {
  const app = express();
  
  // Create auth middleware
  const requireAuth = createAuthMiddleware(authService);

  // ============================================================================
  // Middleware
  // ============================================================================

  // CORS - environment-driven origins
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [
        // Development defaults (when CORS_ORIGIN not set)
        'http://localhost:5173',
        'http://localhost:5174',
      ];
  
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Cookie parsing (for session management)
  app.use(cookieParser());

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    
    next();
  });

  // ============================================================================
  // Health Check (Separated Runtime + Provider Health)
  // ============================================================================

  app.get('/health', async (req: Request, res: Response) => {
    try {
      // Runtime health (core services, not LLM-dependent)
      const runtimeHealth = {
        status: 'healthy', // Can be: healthy | degraded | critical
        uptime_seconds: Math.floor(process.uptime()),
        sse_clients: eventStream.getClientCount(),
        services: {} as Record<string, { status: string; health: string }>,
      };
      
      // Check State Graph availability
      try {
        const { getStateGraph } = await import('@vienna/lib');
        const stateGraph = getStateGraph();
        await stateGraph.initialize();
        runtimeHealth.services.state_graph = { status: 'operational', health: 'healthy' };
      } catch (error) {
        runtimeHealth.status = 'degraded';
        runtimeHealth.services.state_graph = { status: 'failed', health: 'unhealthy' };
      }
      
      // Provider health (LLM availability)
      let providerHealth: any = {
        chat_available: false,
        providers: {},
      };
      
      if (providerHealthService) {
        const providersSnapshot = await providerHealthService.getProvidersHealth();
        const anthropic = providersSnapshot.providers.anthropic || { status: 'unknown' };
        const local = providersSnapshot.providers.local || { status: 'unknown' };
        
        providerHealth.providers.anthropic = {
          status: anthropic.status,
          health: anthropic.status,
          last_success: anthropic.lastSuccessAt || null,
        };
        
        providerHealth.providers.local = {
          status: local.status,
          health: local.status,
          last_success: local.lastSuccessAt || null,
        };
        
        // Chat available if ANY provider healthy OR unknown (untested but usable)
        // Only unavailable if all providers are truly unavailable (not just unknown)
        providerHealth.chat_available = 
          anthropic.status === 'healthy' || local.status === 'healthy' ||
          anthropic.status === 'unknown' || local.status === 'unknown';
      }
      
      res.json({
        success: true,
        data: {
          runtime: runtimeHealth,
          providers: providerHealth,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============================================================================
  // API Routes
  // ============================================================================

  const apiPrefix = '/api/v1';

  // ============================================================================
  // Public Routes (no auth required)
  // ============================================================================
  
  // Auth routes (must be public for login)
  app.use(`${apiPrefix}/auth`, createAuthRouter(authService));

  // ============================================================================
  // Protected Routes (auth required)
  // ============================================================================
  
  // Bootstrap (primary initial load)
  app.use(`${apiPrefix}/dashboard/bootstrap`, requireAuth, createBootstrapRouter(bootstrapService));

  // System routes (read-only, no auth for status monitoring)
  app.use(`${apiPrefix}/system/status`, createStatusRouter(viennaRuntime));
  app.use(`${apiPrefix}/system/diagnostics`, createDiagnosticsRouter(viennaRuntime));
  app.use(`${apiPrefix}/system/providers`, createProvidersRouter(viennaRuntime, providerHealthService));
  app.use(`${apiPrefix}/system`, createSystemRouter(systemNowService)); // Phase 5E: Unified "now" view
  
  // Assistant status (Phase 1: State Truth Model)
  app.use(`${apiPrefix}/status/assistant`, createAssistantRouter(viennaRuntime, providerHealthService));
  
  // System routes (mutating, require auth)
  app.use(`${apiPrefix}/system/services`, requireAuth, createServicesRouter(viennaRuntime));
  
  // Chat (require auth) - Phase 6.6: Route through Vienna for LLM provider selection
  app.use(`${apiPrefix}/chat`, requireAuth, createChatRouter(viennaRuntime, providerHealthService));
  app.use(`${apiPrefix}/approvals`, requireAuth, createApprovalsRouter(viennaRuntime));
  
  // Files workspace (require auth)
  app.use(`${apiPrefix}/files`, requireAuth, createFilesRouter(viennaRuntime));
  
  // Commands (require auth)
  app.use(`${apiPrefix}/commands`, requireAuth, createCommandsRouter(viennaRuntime));
  
  // Runtime visibility (require auth)
  app.use(`${apiPrefix}/runtime`, requireAuth, createRuntimeRouter(viennaRuntime, runtimeStatsService));
  
  // Recovery copilot (require auth) - Phase 6.5
  app.use(`${apiPrefix}/recovery`, requireAuth, createRecoveryRouter(viennaRuntime));
  
  // Workflow engine (require auth) - Phase 6.11
  app.use(`${apiPrefix}/workflows`, requireAuth, createWorkflowRouter(viennaRuntime));
  
  // Model control (require auth) - Phase 6.12
  app.use(`${apiPrefix}/models`, requireAuth, createModelsRouter(viennaRuntime));
  
  // Core routes (protected)
  app.use(`${apiPrefix}/dashboard`, requireAuth, createDashboardRouter(viennaRuntime));
  app.use(`${apiPrefix}/objectives`, requireAuth, createObjectivesRouter(objectivesService, timelineService));
  
  // Phase 10: Autonomous operations visibility
  app.use(`${apiPrefix}/managed-objectives`, requireAuth, createManagedObjectivesRouter(viennaRuntime));
  app.use(`${apiPrefix}/executions`, requireAuth, createExecutionsRouter(viennaRuntime));
  app.use(`${apiPrefix}/reconciliation`, requireAuth, createReconciliationRouter());
  
  // Phase 11: Intent Gateway (canonical action ingress)
  app.use(`${apiPrefix}/intent`, requireAuth, createIntentRouter());
  
  // Phase 11.5: Intent Tracing (execution graph visibility)
  app.use(`${apiPrefix}/intents`, requireAuth, intentsRouter);
  
  // Agent Intent Layer (OpenClaw agents → Vienna)
  if (agentIntentBridge) {
    app.use(`${apiPrefix}/agent`, createAgentIntentRouter(agentIntentBridge));
  }
  
  // Phase 13: Investigation Workspace
  app.use(`${apiPrefix}/investigations`, requireAuth, investigationsRouter);
  app.use(`${apiPrefix}/artifacts`, requireAuth, artifactsRouter);
  
  // Phase 14: Forensic Incidents
  app.use(`${apiPrefix}/incidents`, requireAuth, incidentsRouter);
  
  // Validation logging (browser testing)
  app.use(`${apiPrefix}/validation`, createValidationRouter());
  
  app.use(`${apiPrefix}/execution`, requireAuth, createExecutionRouter(viennaRuntime));
  app.use(`${apiPrefix}/decisions`, requireAuth, createDecisionsRouter(viennaRuntime));
  app.use(`${apiPrefix}/deadletters`, requireAuth, createDeadLettersRouter(objectivesService));
  app.use(`${apiPrefix}/agents`, requireAuth, createAgentsRouter(viennaRuntime));
  app.use(`${apiPrefix}/replay`, requireAuth, createReplayRouter(viennaRuntime));
  app.use(`${apiPrefix}/audit`, requireAuth, createAuditRouter(viennaRuntime));
  app.use(`${apiPrefix}/directives`, requireAuth, createDirectivesRouter(viennaRuntime));
  app.use(`${apiPrefix}/stream`, requireAuth, createStreamRouter(eventStream));

  // ============================================================================
  // ============================================================================
  // Static Frontend (Serve built React app)
  // ============================================================================
  
  // In production (bundled), __dirname = /app/build, client at /app/client/dist
  // In development, __dirname = /app/apps/console/server/src, client at ../../client/dist
  const clientDistPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '../client/dist')
    : path.join(__dirname, '../../client/dist');
  
  // Serve static files
  app.use(express.static(clientDistPath));
  
  // SPA fallback: All non-API routes serve index.html
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return next();
    }
    
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        next(err);
      }
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  // 404 handler (only for API routes that don't match)
  app.use((req: Request, res: Response) => {
    const error: ErrorResponse = {
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(error);
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    
    const error: ErrorResponse = {
      success: false,
      error: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined,
      timestamp: new Date().toISOString(),
    };
    
    res.status(500).json(error);
  });

  return app;
}
