/**
 * Vienna Console Server Entry Point
 * 
 * Starts Express server and event stream.
 * 
 * Performance: Runs in cluster mode (1 worker per CPU core) for horizontal scaling
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
const result = dotenv.config();
if (result.error) {
  console.error('[ENV] Failed to load .env:', result.error);
} else {
  console.log('[ENV] Loaded .env file successfully');
  console.log('[ENV] JWT_SECRET length:', process.env.JWT_SECRET?.length || 'NOT SET');
}

import cluster from 'cluster';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createApp } from './app.js';
import { ViennaRuntimeService } from './services/viennaRuntime.js';
import { ChatService } from './services/chatServiceSimple.js';
// Use Postgres version for Vercel compatibility
// Use SQLite for Phase 1 (portable, no external DB required)
import { ChatHistoryService } from './services/chatHistoryService.js';
import { DashboardBootstrapService } from './services/dashboardBootstrapService.js';
import { ObjectivesService } from './services/objectivesService.js';
import { AuthService } from './services/authService.js';
import { TimelineService } from './services/timelineService.js';
import { RuntimeStatsService } from './services/runtimeStatsService.js';
import { ProviderHealthService } from './services/providerHealthService.js';
import { ProviderHealthChecker } from './services/providerHealthChecker.js';
import { SystemNowService } from './services/systemNowService.js';
import { eventStream } from './sse/eventStream.js';
import { createProviderManagerBridge } from './integrations/providerManager.js';

// Vienna Core components (static imports for bundling compatibility)
import type { WorkspaceManager as WorkspaceManagerType } from '@vienna/lib';
import type { StateGraph as StateGraphType } from '@vienna/lib';

// Vienna Core will be dynamically imported (CommonJS → ES module bridge)

const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Initialize Vienna Core runtime
 * 
 * Now uses REAL governance pipeline instead of stub
 */
async function initializeViennaCore() {
  // Import real Vienna Core initialization
  const { initializeViennaCore: initCore } = await import('./services/viennaCore.js');
  
  const workspace = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
  const env = process.env.VIENNA_ENV || 'prod';
  
  const viennaCore = await initCore({
    workspace,
    env: env as 'prod' | 'test',
  });
  
  return viennaCore;
}

/**
 * Initialize Provider Manager via bridge
 */
async function initializeProviderManager() {
  console.log('Initializing Provider Manager...');
  
  try {
    const bridge = await createProviderManagerBridge({
      primaryProvider: 'anthropic',
      fallbackOrder: ['anthropic', 'local'],
      cooldownMs: 60000,
      maxConsecutiveFailures: 3,
      healthCheckInterval: 30000,
      stickySession: true,
    });
    
    console.log('Provider Manager initialized via bridge');
    return bridge;
  } catch (error) {
    console.error('Failed to initialize Provider Manager:', error);
    console.warn('Provider functionality will be unavailable');
    return null;
  }
}

async function start() {
  try {
    // Initialize auth config
    const operatorPassword = process.env.VIENNA_OPERATOR_PASSWORD;
    const operatorName = process.env.VIENNA_OPERATOR_NAME || 'vienna';
    const sessionSecret = process.env.VIENNA_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
    const sessionTTL = parseInt(process.env.VIENNA_SESSION_TTL || '86400000', 10); // 24h default
    
    if (!operatorPassword) {
      // In production, generate a random password and log it for first-time setup
      if (process.env.NODE_ENV === 'production') {
        const generatedPassword = crypto.randomBytes(16).toString('hex');
        console.warn('WARNING: VIENNA_OPERATOR_PASSWORD not set. Generated temporary password:');
        console.warn(`  ${generatedPassword}`);
        console.warn('Set VIENNA_OPERATOR_PASSWORD as a Fly.io secret for production use.');
        (process.env as any).VIENNA_OPERATOR_PASSWORD = generatedPassword;
      } else {
        console.warn('WARNING: VIENNA_OPERATOR_PASSWORD not set. Using "vienna-dev" for local development.');
        (process.env as any).VIENNA_OPERATOR_PASSWORD = 'vienna-dev';
      }
    }
    
    // Generate session secret if not provided (warn but don't crash)
    if (!process.env.VIENNA_SESSION_SECRET) {
      const generated = crypto.randomBytes(32).toString('hex');
      if (process.env.NODE_ENV === 'production') {
        console.warn('WARNING: VIENNA_SESSION_SECRET not set. Generated random secret (sessions won\'t persist across restarts).');
        console.warn('Set VIENNA_SESSION_SECRET as a Fly.io secret for session persistence.');
      }
      (process.env as any).VIENNA_SESSION_SECRET = generated;
    }
    
    // Session secret already handled above
    
    // Initialize Auth Service
    const authService = new AuthService({
      operatorPassword,
      operatorName,
      sessionSecret,
      sessionTTL,
    });
    console.log(`Auth service initialized (operator: ${operatorName})`);
    
    // Initialize Vienna Core runtime
    console.log('[Server] Initializing Vienna Core...');
    const viennaCore = await initializeViennaCore();
    
    // Initialize Provider Manager
    const providerManager = await initializeProviderManager();
    
    // Initialize Chat History Service
    const chatHistory = new ChatHistoryService();
    await chatHistory.initialize();
    console.log('Chat history service initialized');
    
    // Create runtime service wrapper
    const viennaRuntime = new ViennaRuntimeService(viennaCore, providerManager);
    
    // Create chat service
    const chatService = new ChatService(viennaRuntime, chatHistory, providerManager);
    
    // Create objectives service
    const objectivesService = new ObjectivesService(viennaRuntime);
    
    // Create timeline service (Phase 5B)
    const timelineService = new TimelineService(viennaRuntime, {
      maxEventsPerObjective: 500,
      retentionWindowHours: 24,
    });
    
    // Create runtime stats service (Phase 5C)
    const runtimeStatsService = new RuntimeStatsService(viennaRuntime, providerManager);
    
    // Create provider health service (Phase 5D)
    const providerHealthService = new ProviderHealthService(providerManager);
    
    // Create system "now" service (Phase 5E)
    const systemNowService = new SystemNowService(
      viennaRuntime,
      runtimeStatsService,
      providerHealthService,
      objectivesService
    );
    
    // Create bootstrap service
    const bootstrapService = new DashboardBootstrapService(viennaRuntime, chatService, objectivesService);
    
    // Use Vienna Core's already-initialized StateGraph and components (Phase 13)
    const ViennaLib = await import('@vienna/lib');
    const { AgentIntentBridge } = ViennaLib;
    
    const stateGraph = viennaCore.stateGraph;
    const workspaceManager = viennaCore.workspaceManager;
    const intentGateway = viennaCore.intentGateway;
    
    // Initialize Agent Intent Bridge (with StateGraph dependency)
    const agentIntentBridge = new AgentIntentBridge(intentGateway);
    console.log('Agent Intent Bridge initialized');

    // Initialize Merkle Warrant Chain (cryptographic governance proof)
    let warrantChain: any = null;
    try {
      const { MerkleWarrantChain } = await import('../../services/vienna-lib/governance/warrant-chain.js');
      const { PostgresWarrantChainStore } = await import('../../services/vienna-lib/governance/warrant-chain-store.js');
      const { query: dbQuery, execute: dbExecute } = await import('./db/postgres.js');

      const chainStore = new PostgresWarrantChainStore({ query: dbQuery, execute: dbExecute });
      await chainStore.initialize(); // Creates tables if needed
      warrantChain = new MerkleWarrantChain(chainStore);
      console.log('Merkle Warrant Chain initialized');
    } catch (err) {
      console.warn('[Server] Merkle Warrant Chain not available (non-critical):', (err as Error).message);
    }

    // Initialize Learning Coordinator (Phase 15)
    let learningCoordinator: any = null;
    try {
      const { LearningCoordinator } = ViennaLib;
      if (LearningCoordinator) {
        const LCClass = (LearningCoordinator as any).LearningCoordinator || LearningCoordinator;
        learningCoordinator = new LCClass({
          stateGraph,
          feedbackEnabled: true,
          patternDetectionEnabled: true,
          policyRecommendationEnabled: true,
        });
        await learningCoordinator.initialize?.();
        console.log('Learning Coordinator initialized');
      }
    } catch (err) {
      console.warn('[Server] Learning Coordinator not available (non-critical):', (err as Error).message);
    }
    
    // Create Express app
    const app = createApp(
      viennaRuntime, 
      chatService, 
      bootstrapService, 
      objectivesService, 
      authService, 
      timelineService, 
      runtimeStatsService,
      providerHealthService,
      systemNowService,
      agentIntentBridge,
      chatHistory
    );
    
    // Expose State Graph, Workspace Manager, Learning, Chain, and Vienna Core to routes
    app.locals.stateGraph = stateGraph;
    app.locals.workspaceManager = workspaceManager;
    app.locals.viennaCore = viennaCore;
    if (learningCoordinator) {
      app.locals.learningCoordinator = learningCoordinator;
    }
    if (warrantChain) {
      app.locals.warrantChain = warrantChain;
    }
    
    // Start event stream
    eventStream.start();
    console.log('Event stream started');

    // Bridge governance eventBus → SSE eventStream for real-time dashboard updates
    const { eventBus } = await import('./services/eventBus.js');
    const governanceEvents = [
      'intent.submitted', 'intent.approved', 'intent.denied',
      'warrant.issued', 'warrant.expired', 'warrant.tampered',
      'agent.registered', 'agent.heartbeat', 'agent.trust_changed',
      'execution.started', 'execution.completed', 'execution.scope_drift',
      'approval.required', 'approval.resolved',
    ];
    for (const eventType of governanceEvents) {
      eventBus.subscribe(
        (data: any) => {
          eventStream.publish({
            type: eventType,
            payload: data,
            timestamp: new Date().toISOString(),
          });
        },
        { eventType: eventType as any }
      );
    }
    console.log(`Event bus → SSE bridge connected (${governanceEvents.length} event types)`);
    
    // Phase 5A: Connect event stream to Vienna Core for real-time observability
    if (viennaCore.queuedExecutor) {
      viennaCore.queuedExecutor.connectEventStream(eventStream);
      console.log('Event stream connected to Vienna Core executor');
    } else {
      console.warn('WARNING: queuedExecutor not found on viennaCore, event stream not connected');
    }
    
    // Phase 5B: Buffer SSE events in timeline service
    // Phase 5C: Record executions in stats service
    // Phase 5D: Track provider health from executions
    // Phase 5E: Record activity events in system now service
    // Intercept eventStream.publish to buffer relevant events
    const originalPublish = eventStream.publish.bind(eventStream);
    eventStream.publish = function(event: any) {
      // Buffer event in timeline service
      timelineService.bufferEvent(event);
      
      // Record execution in stats service (Phase 5C)
      if (event.type === 'execution.completed' && event.payload) {
        const provider = event.payload.provider || 'unknown';
        const durationMs = event.payload.duration_ms || 0;
        
        runtimeStatsService.recordExecution({
          success: true,
          durationMs,
          provider,
        });
        
        // Record in provider health service (Phase 5D)
        providerHealthService.recordExecution({
          provider,
          success: true,
          durationMs,
          timeout: false,
        });
        
        providerHealthService.recordExecutionEnd(provider);
        
        // Record in system now service (Phase 5E)
        systemNowService.recordEvent({
          type: 'execution.completed',
          timestamp: event.timestamp,
          summary: `Execution completed: ${event.payload.envelope_id}`,
          envelopeId: event.payload.envelope_id,
          objectiveId: event.payload.objective_id,
          severity: 'info',
        });
      } else if (event.type === 'execution.failed' && event.payload) {
        const provider = event.payload.provider || 'unknown';
        const durationMs = event.payload.duration_ms || 0;
        const timeout = event.payload.timeout || false;
        const errorMessage = event.payload.error;
        
        runtimeStatsService.recordExecution({
          success: false,
          durationMs,
          provider,
        });
        
        // Record in provider health service (Phase 5D)
        providerHealthService.recordExecution({
          provider,
          success: false,
          durationMs,
          timeout,
          errorMessage,
        });
        
        providerHealthService.recordExecutionEnd(provider);
        
        // Record in system now service (Phase 5E)
        systemNowService.recordEvent({
          type: 'execution.failed',
          timestamp: event.timestamp,
          summary: `Execution failed: ${errorMessage?.substring(0, 80)}`,
          envelopeId: event.payload.envelope_id,
          objectiveId: event.payload.objective_id,
          severity: 'critical',
        });
      } else if (event.type === 'execution.started' && event.payload) {
        const provider = event.payload.provider || 'unknown';
        providerHealthService.recordExecutionStart(provider);
        
        // Record in system now service (Phase 5E)
        systemNowService.recordEvent({
          type: 'execution.started',
          timestamp: event.timestamp,
          summary: `Execution started: ${event.payload.envelope_id}`,
          envelopeId: event.payload.envelope_id,
          objectiveId: event.payload.objective_id,
          severity: 'info',
        });
      } else if (event.type === 'objective.created' && event.payload) {
        systemNowService.recordEvent({
          type: 'objective.created',
          timestamp: event.timestamp,
          summary: `Objective created: ${event.payload.objective_id}`,
          objectiveId: event.payload.objective_id,
          severity: 'info',
        });
      } else if (event.type === 'objective.completed' && event.payload) {
        systemNowService.recordEvent({
          type: 'objective.completed',
          timestamp: event.timestamp,
          summary: `Objective completed: ${event.payload.objective_id}`,
          objectiveId: event.payload.objective_id,
          severity: 'info',
        });
      } else if (event.type === 'alert.created' && event.payload) {
        systemNowService.recordEvent({
          type: 'alert.created',
          timestamp: event.timestamp,
          summary: event.payload.message || 'Alert created',
          severity: event.payload.severity || 'warning',
        });
      }
      
      // Continue with normal publish
      return originalPublish(event);
    };
    console.log('Timeline service connected to event stream');
    console.log('Runtime stats service connected to event stream');
    console.log('Provider health service connected to event stream');
    console.log('System now service connected to event stream');
    
    // Start periodic buffer cleanup (every hour)
    setInterval(() => {
      timelineService.cleanupBuffer();
      runtimeStatsService.cleanup();
      providerHealthService.cleanup();
    }, 60 * 60 * 1000);
    
    // Start provider health checker (tests providers every 30s and updates State Graph)
    const healthChecker = new ProviderHealthChecker(30000);
    healthChecker.start();
    console.log('Provider health checker started');
    
    // Auto-start simulation engine if enabled (default: true)
    const simulationEnabled = process.env.VIENNA_SIMULATION !== 'false';
    if (simulationEnabled) {
      const { simulationService } = await import('./services/simulationService.js');
      try {
        await simulationService.seed();
        await simulationService.start();
        console.log('Simulation engine auto-started');
      } catch (simErr) {
        console.warn('Simulation engine failed to auto-start:', simErr);
      }
    }

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log(`Vienna Console Server listening on http://${HOST}:${PORT}`);
      console.log(`API: http://${HOST}:${PORT}/api/v1`);
      console.log(`SSE Stream: http://${HOST}:${PORT}/api/v1/stream`);
      console.log(`Health: http://${HOST}:${PORT}/health`);
    });
    
    // Enable HTTP keep-alive for better performance
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      
      // Stop simulation engine
      if (simulationEnabled) {
        const { simulationService } = await import('./services/simulationService.js');
        await simulationService.stop();
        console.log('Simulation engine stopped');
      }
      
      server.close(() => {
        console.log('HTTP server closed');
        eventStream.stop();
        console.log('Event stream stopped');
        healthChecker.stop();
        console.log('Provider health checker stopped');
        if (providerManager) {
          providerManager.stop();
          console.log('Provider manager stopped');
        }
        process.exit(0);
      });
      
      // Force shutdown after 10s
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      
      server.close(() => {
        console.log('HTTP server closed');
        eventStream.stop();
        console.log('Event stream stopped');
        if (providerManager) {
          providerManager.stop();
          console.log('Provider manager stopped');
        }
        chatHistory.close();
        console.log('Chat history closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cluster mode for horizontal scaling (use all CPU cores)
// TEMP: Disable cluster mode to avoid tsx watch cache issues
const ENABLE_CLUSTER = false; // process.env.NODE_ENV === 'production' || process.env.ENABLE_CLUSTER === 'true';
const numCPUs = os.cpus().length;

if (ENABLE_CLUSTER && cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting ${numCPUs} workers...`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });
  
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });
} else {
  // Worker process (or single-process mode)
  if (ENABLE_CLUSTER) {
    console.log(`Worker ${process.pid} starting...`);
  }
  start();
}
