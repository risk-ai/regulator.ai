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
import helmet from 'helmet';
import compression from 'compression';

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
import { createHybridAuthMiddleware } from './middleware/hybridAuth.js';
import { jwtAuthMiddleware } from './middleware/jwtAuth.js';
import { apiLimiter, authLimiter, agentLimiter } from './middleware/rateLimiter.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';
import { createCacheMiddleware } from './middleware/cache.js';
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging.js';

// Routes
import { createAuthRouter } from './routes/auth.js';
import { createEventsRouter } from './routes/events.js';
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
import { createSystemHealthRouter } from './routes/system-health.js';
import { createRecoveryRouter } from './routes/recovery.js';

// Tenant-scoped routes (multi-tenant data isolation)
import agentsTenantRouter from './routes/agents-tenant.js';
import policiesTenantRouter from './routes/policies-tenant.js';
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
import { createComplianceRouter } from './routes/compliance.js';
import { createIntegrationsRouter } from './routes/integrations.js';
import { createPoliciesRouter } from './routes/policies.js';
import { createPolicyTemplatesRouter } from './routes/policy-templates.js';
import { createActionTypesRouter } from './routes/action-types.js';
import { createFleetRouter } from './routes/fleet.js';
import { createSimulationRouter } from './routes/simulation.js';
import { createActionsRouter } from './routes/actions.js';
import { createDemoRouter } from './routes/demo.js';
import { createHealthRouter } from './routes/health.js';
import { createActivityFeedRouter } from './routes/activity-feed.js';
import { createSlackRouter } from './routes/slack.js';
import { createAnalyticsRouter } from './routes/analytics.js';
import { createAgentTemplatesRouter } from './routes/agent-templates.js';
import { createFeedbackRouter } from './routes/feedback.js';
import { createExecutionCallbackRouter } from './routes/execution-callbacks.js';
import { createManagedExecutionRouter } from './routes/managed-execution.js';
import { createAdapterConfigsRouter } from './routes/adapter-configs.js';
import { createSettingsRouter } from './routes/settings.js';
import connectRouter from './routes/connect.js';
import { createAnomaliesRouter } from './routes/anomalies.js';

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
  
  // Create auth middleware (hybrid: JWT + cookies)
  const requireAuth = createHybridAuthMiddleware(authService);
  const requireAuthLegacy = createAuthMiddleware(authService);

  // ============================================================================
  // Middleware
  // ============================================================================

  // Security headers (helmet) - Enhanced for production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Vite dev needs unsafe-inline
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind needs unsafe-inline
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://console.regulator.ai"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
  }));

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

  // Compression (gzip responses)
  app.use(compression());
  
  // Metrics (before other middleware to track everything)
  app.use(metricsMiddleware());
  
  // Structured logging (after metrics, before body parsing)
  app.use(requestLoggingMiddleware);
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Cookie parsing (for session management)
  app.use(cookieParser());

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Debug: Log all /actions requests
    if (req.path.startsWith('/api/v1/actions')) {
      console.log('[REQUEST] Path:', req.path, '| Method:', req.method, '| Has auth:', !!req.headers.authorization);
    }
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    });
    
    next();
  });

  // ============================================================================
  // Metrics Endpoint (Prometheus)
  // ============================================================================
  
  app.get('/metrics', metricsEndpoint());

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
      
      // Check State Graph availability (use app.locals.stateGraph which is already initialized)
      try {
        if (app.locals.stateGraph && app.locals.stateGraph.initialized) {
          runtimeHealth.services.state_graph = { status: 'operational', health: 'healthy' };
        } else {
          throw new Error('StateGraph not initialized: ' + (app.locals.stateGraph ? 'exists but not initialized' : 'not set'));
        }
      } catch (error) {
        runtimeHealth.status = 'degraded';
        runtimeHealth.services.state_graph = { status: 'failed', health: 'unhealthy' };
        console.log('[Health] State Graph check failed:', (error as Error).message);
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
          last_success: 'lastSuccessAt' in anthropic ? anthropic.lastSuccessAt || null : null,
        };
        
        providerHealth.providers.local = {
          status: local.status,
          health: local.status,
          last_success: 'lastSuccessAt' in local ? local.lastSuccessAt || null : null,
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

  // Additional health endpoints (Kubernetes-compatible)
  app.use('/health', createHealthRouter());

  // ============================================================================
  // API Routes
  // ============================================================================

  const apiPrefix = '/api/v1';

  // Apply general API rate limiting to all /api/v1/* routes
  app.use(apiPrefix, apiLimiter);

  // ============================================================================
  // Global JWT Auth Enforcement
  // ============================================================================
  // Apply JWT auth to all /api/v1/* routes except public endpoints
  const publicPaths = [
    '/api/v1/auth/',
    '/api/v1/health',
    '/health',
    '/metrics'
  ];

  app.use(apiPrefix, (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for public paths
    const isPublic = publicPaths.some(path => req.path.startsWith(path.replace('/api/v1', '')));
    if (isPublic) {
      return next();
    }
    
    // Require JWT auth for all other /api/v1/* routes
    return jwtAuthMiddleware(req, res, next);
  });

  // ============================================================================
  // Public Routes (no auth required)
  // ============================================================================
  
  // Auth routes (must be public for login) with stricter rate limiting
  app.use(`${apiPrefix}/auth`, authLimiter, createAuthRouter());

  // ============================================================================
  // Protected Routes (auth required)
  // ============================================================================
  
  // Bootstrap (primary initial load)
  app.use(`${apiPrefix}/dashboard/bootstrap`, requireAuth, createBootstrapRouter(bootstrapService));

  // System routes (require auth — status/diagnostics can expose internal details)
  app.use(`${apiPrefix}/system/status`, requireAuth, createCacheMiddleware(30), createStatusRouter(viennaRuntime));
  app.use(`${apiPrefix}/system/diagnostics`, requireAuth, createStatusRouter(viennaRuntime));
  app.use(`${apiPrefix}/system/providers`, requireAuth, createCacheMiddleware(15), createProvidersRouter(viennaRuntime, providerHealthService));
  app.use(`${apiPrefix}/system`, createCacheMiddleware(10), createSystemRouter(systemNowService)); // Phase 5E: Unified "now" view
  app.use(createSystemHealthRouter()); // Enhanced health dashboard
  
  // Assistant status (Phase 1: State Truth Model) — require auth
  app.use(`${apiPrefix}/status/assistant`, requireAuth, createAssistantRouter(viennaRuntime, providerHealthService));
  
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
  
  // Phase 4A: Managed execution with adapter resolution
  app.use(`${apiPrefix}/executions`, requireAuth, createManagedExecutionRouter());
  app.use(`${apiPrefix}/adapters`, requireAuth, createAdapterConfigsRouter());
  
  app.use(`${apiPrefix}/reconciliation`, requireAuth, createReconciliationRouter());
  
  // Phase 11: Intent Gateway (canonical action ingress)
  app.use(`${apiPrefix}/intent`, requireAuth, createIntentRouter());
  
  // Phase 11.5: Intent Tracing (execution graph visibility)
  app.use(`${apiPrefix}/intents`, requireAuth, intentsRouter);
  
  // Agent Intent Layer (OpenClaw agents → Vienna) with higher rate limits
  if (agentIntentBridge) {
    app.use(`${apiPrefix}/agent`, agentLimiter, createAgentIntentRouter(agentIntentBridge));
  }
  
  // Phase 13: Investigation Workspace
  app.use(`${apiPrefix}/investigations`, requireAuth, investigationsRouter);
  app.use(`${apiPrefix}/artifacts`, requireAuth, artifactsRouter);
  
  // Phase 14: Forensic Incidents
  app.use(`${apiPrefix}/incidents`, requireAuth, incidentsRouter);

  // Phase 31: Activity Feed (real-time organization-wide activity)
  app.use(`${apiPrefix}/activity`, requireAuth, createActivityFeedRouter(viennaRuntime));
  
  // Custom Action Types Registry
  app.use(`${apiPrefix}/action-types`, requireAuth, createActionTypesRouter());
  
  // Custom Actions API (dynamic action registration)
  // Actions router also uses jwtAuthMiddleware internally for execute endpoint
  app.use(`${apiPrefix}/actions`, requireAuth, createActionsRouter());
  
  // Real-time events (SSE streaming)
  app.use(`${apiPrefix}/events`, requireAuth, createEventsRouter());
  
  // Phase 15: Agent Fleet Dashboard
  app.use(`${apiPrefix}/fleet`, requireAuth, createFleetRouter(viennaRuntime));
  
  // ========================================
  // TENANT-SCOPED ROUTES (SECURITY CRITICAL)
  // ========================================
  // These routes use tenant filtering for multi-tenant data isolation
  // Routes imported at top of file
  
  app.use(`${apiPrefix}/agents`, requireAuth, agentsTenantRouter);
  app.use(`${apiPrefix}/policies`, requireAuth, policiesTenantRouter);
  app.use(`${apiPrefix}/policy-templates`, requireAuth, createPolicyTemplatesRouter());
  app.use(`${apiPrefix}/agent-templates`, requireAuth, createAgentTemplatesRouter());
  
  // ========================================
  // LEGACY ROUTES (DEPRECATED - TO BE REMOVED)
  // ========================================
  // These routes do NOT enforce tenant isolation
  // Keeping for backward compatibility during migration
  // TODO: Remove after all clients updated to use tenant-safe routes
  
  // Phase 15: Integration Adapters
  app.use(`${apiPrefix}/integrations`, requireAuth, createIntegrationsRouter());
  
  // Phase 31: Slack Integration
  app.use(`${apiPrefix}/slack`, requireAuth, createSlackRouter());
  
  // Phase 31: Analytics Dashboard
  app.use(`${apiPrefix}/analytics`, requireAuth, createAnalyticsRouter());
  
  // Feedback / Bug Reports
  app.use(`${apiPrefix}/feedback`, requireAuth, createFeedbackRouter());
  
  // Phase 4A: Execution Callbacks (webhook receiver for delegated execution)
  // Note: Public endpoint (external systems call this), signature verification inside handler
  app.use(`${apiPrefix}/webhooks/execution-callback`, createExecutionCallbackRouter());
  
  // Validation logging (browser testing) — require auth
  app.use(`${apiPrefix}/validation`, requireAuth, createValidationRouter());
  
  // Phase 15.5: Compliance Reports
  app.use(`${apiPrefix}/compliance`, requireAuth, createComplianceRouter());

  // Simulation Engine (demo traffic generation)
  app.use(`${apiPrefix}/simulation`, requireAuth, createSimulationRouter());
  
  // Demo data seeding (onboarding)
  app.use(`${apiPrefix}/demo`, requireAuth, createDemoRouter(viennaRuntime));
  
  // Settings (tenant configuration)
  app.use(`${apiPrefix}/settings`, requireAuth, createSettingsRouter());
  
  // Agent Connection Wizard
  app.use(`${apiPrefix}/connect`, requireAuth, connectRouter);
  
  // Anomaly Detection
  app.use(`${apiPrefix}/anomalies`, requireAuth, createAnomaliesRouter(viennaRuntime));
  
  app.use(`${apiPrefix}/execution`, requireAuth, createExecutionRouter(viennaRuntime));
  app.use(`${apiPrefix}/decisions`, requireAuth, createDecisionsRouter(viennaRuntime));
  app.use(`${apiPrefix}/deadletters`, requireAuth, createDeadLettersRouter(objectivesService));
  app.use(`${apiPrefix}/replay`, requireAuth, createReplayRouter(viennaRuntime));
  app.use(`${apiPrefix}/audit`, requireAuth, createAuditRouter(viennaRuntime));
  app.use(`${apiPrefix}/directives`, requireAuth, createDirectivesRouter(viennaRuntime));
  app.use(`${apiPrefix}/stream`, requireAuth, createStreamRouter(eventStream));

  // Framework Integration API — external agent framework endpoints
  // Uses its own API key auth (Bearer vos_xxx), not session auth
  import('./routes/framework-api.js').then(mod => {
    app.use(`${apiPrefix}`, mod.default);
  }).catch(err => {
    console.warn('[App] Framework API routes not loaded:', err.message);
  });

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
