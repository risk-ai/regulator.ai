/**
 * Vienna Console Server Entry Point
 * 
 * Starts Express server and event stream.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { createApp } from './app.js';
import { ViennaRuntimeService } from './services/viennaRuntime.js';
import { ChatService } from './services/chatServiceSimple.js';
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

// Vienna Core will be dynamically imported (CommonJS → ES module bridge)

const PORT = parseInt(process.env.PORT || '3100', 10);
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Initialize Vienna Core runtime
 */
async function initializeViennaCore() {
  console.log('Initializing Vienna Core...');
  
  const workspace = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
  
  // Dynamic import for CommonJS module via workspace package
  const ViennaCore = (await import('@vienna/lib')).default;
  
  // Initialize Vienna Core
  ViennaCore.init({
    adapter: 'openclaw',
    workspace
  });
  
  console.log('Vienna Core initialized', {
    adapter: 'openclaw',
    workspace
  });
  
  return ViennaCore;
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
      console.error('FATAL: VIENNA_OPERATOR_PASSWORD environment variable is required');
      console.error('Set it to a secure password for operator authentication');
      process.exit(1);
    }
    
    // Require session secret in production
    if (process.env.NODE_ENV === 'production' && !process.env.VIENNA_SESSION_SECRET) {
      console.error('FATAL: VIENNA_SESSION_SECRET is required in production');
      console.error('Generate with: openssl rand -hex 32');
      console.error('Set VIENNA_SESSION_SECRET in .env.production');
      process.exit(1);
    }
    
    if (!process.env.VIENNA_SESSION_SECRET) {
      console.warn('WARNING: VIENNA_SESSION_SECRET not set, using random secret (sessions will not persist across restarts)');
    }
    
    // Initialize Auth Service
    const authService = new AuthService({
      operatorPassword,
      operatorName,
      sessionSecret,
      sessionTTL,
    });
    console.log(`Auth service initialized (operator: ${operatorName})`);
    
    // Initialize Vienna Core runtime
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
    
    // Initialize State Graph (Phase 13)
    const { getStateGraph, WorkspaceManager } = await import('@vienna/lib');
    const stateGraph = getStateGraph();
    await stateGraph.initialize();
    console.log('State Graph initialized');
    
    // Initialize Workspace Manager (Phase 13)
    const workspaceManager = new WorkspaceManager(stateGraph);
    console.log('Workspace Manager initialized');
    
    // Initialize Agent Intent Bridge
    const { IntentGateway } = await import('@vienna/lib');
    const { AgentIntentBridge } = await import('@vienna/lib');
    const intentGateway = new IntentGateway();
    const agentIntentBridge = new AgentIntentBridge(intentGateway);
    console.log('Agent Intent Bridge initialized');
    
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
      agentIntentBridge
    );
    
    // Expose State Graph and Workspace Manager to routes (Phase 13)
    app.locals.stateGraph = stateGraph;
    app.locals.workspaceManager = workspaceManager;
    
    // Start event stream
    eventStream.start();
    console.log('Event stream started');
    
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
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log(`Vienna Console Server listening on http://${HOST}:${PORT}`);
      console.log(`API: http://${HOST}:${PORT}/api/v1`);
      console.log(`SSE Stream: http://${HOST}:${PORT}/api/v1/stream`);
      console.log(`Health: http://${HOST}:${PORT}/health`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      
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

start();
