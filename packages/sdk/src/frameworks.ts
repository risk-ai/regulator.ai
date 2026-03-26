/**
 * Framework-specific convenience wrappers for Vienna OS SDK.
 * 
 * These wrappers provide simplified interfaces for popular AI agent frameworks,
 * focusing on the core governance operations: submitIntent, waitForApproval,
 * reportExecution, and register.
 */

import { ViennaClient } from './client.js';
import type {
  ViennaConfig,
  IntentRequest,
  IntentResult,
  IntentStatus,
  RequestOptions,
} from './types.js';

/** Base configuration for framework adapters */
export interface FrameworkConfig {
  /** Vienna OS API key (starts with `vna_`) */
  apiKey: string;
  /** Base URL of Vienna OS API (optional, defaults to production) */
  baseUrl?: string;
  /** Agent identifier for this framework instance (optional) */
  agentId?: string;
}

/** Simplified interface focused on core governance operations */
export interface FrameworkAdapter {
  /** Submit an intent for governance evaluation */
  submitIntent(action: string, payload: Record<string, unknown>): Promise<IntentResult>;
  
  /** Wait for approval on a pending intent */
  waitForApproval(intentId: string, timeoutMs?: number): Promise<IntentStatus>;
  
  /** Report execution results back to Vienna */
  reportExecution(intentId: string, result: 'success' | 'failure', details?: Record<string, unknown>): Promise<void>;
  
  /** Register this agent with the Vienna fleet */
  register(metadata?: Record<string, string>): Promise<void>;
}

/** Internal base adapter implementation */
abstract class BaseFrameworkAdapter implements FrameworkAdapter {
  protected readonly vienna: ViennaClient;
  protected readonly agentId: string;

  constructor(config: FrameworkConfig, frameworkName: string) {
    this.vienna = new ViennaClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
    
    this.agentId = config.agentId || `${frameworkName}-${Date.now()}`;
  }

  async submitIntent(action: string, payload: Record<string, unknown>): Promise<IntentResult> {
    return await this.vienna.intent.submit({
      action,
      source: this.agentId,
      payload,
    });
  }

  async waitForApproval(intentId: string, timeoutMs: number = 300000): Promise<IntentStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.vienna.intent.status(intentId);
      
      if (status.status === 'executed' || status.status === 'denied' || status.status === 'cancelled') {
        return status.status;
      }
      
      // Poll every 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Approval timeout after ${timeoutMs}ms for intent ${intentId}`);
  }

  async reportExecution(
    intentId: string,
    result: 'success' | 'failure',
    details?: Record<string, unknown>
  ): Promise<void> {
    // Report execution via the audit trail
    // This is a placeholder - actual implementation depends on Vienna's audit API
    await this.vienna.compliance.generateReport({
      type: 'execution_report',
      filters: {
        intentId,
        result,
        details: details || {},
        timestamp: new Date().toISOString(),
      },
    });
  }

  async register(metadata?: Record<string, string>): Promise<void> {
    // Register with the fleet management system
    await this.vienna.fleet.updateAgent(this.agentId, {
      status: 'active',
      metadata: {
        framework: this.getFrameworkName(),
        registeredAt: new Date().toISOString(),
        ...metadata,
      },
    });
  }

  protected abstract getFrameworkName(): string;
}

/** LangChain-specific adapter */
class LangChainAdapter extends BaseFrameworkAdapter {
  constructor(config: FrameworkConfig) {
    super(config, 'langchain');
  }

  protected getFrameworkName(): string {
    return 'langchain';
  }

  /** Enhanced submitIntent with LangChain tool context */
  async submitToolIntent(
    toolName: string,
    toolArgs: Record<string, unknown>,
    chainContext?: Record<string, unknown>
  ): Promise<IntentResult> {
    return await this.submitIntent(`tool_${toolName}`, {
      tool_name: toolName,
      tool_args: toolArgs,
      chain_context: chainContext,
    });
  }
}

/** CrewAI-specific adapter */
class CrewAIAdapter extends BaseFrameworkAdapter {
  constructor(config: FrameworkConfig) {
    super(config, 'crewai');
  }

  protected getFrameworkName(): string {
    return 'crewai';
  }

  /** Enhanced submitIntent with CrewAI task context */
  async submitTaskIntent(
    taskType: string,
    taskPayload: Record<string, unknown>,
    crewContext?: Record<string, unknown>
  ): Promise<IntentResult> {
    return await this.submitIntent(`crew_${taskType}`, {
      task_type: taskType,
      task_payload: taskPayload,
      crew_context: crewContext,
    });
  }
}

/** AutoGen-specific adapter */
class AutoGenAdapter extends BaseFrameworkAdapter {
  constructor(config: FrameworkConfig) {
    super(config, 'autogen');
  }

  protected getFrameworkName(): string {
    return 'autogen';
  }

  /** Enhanced submitIntent with AutoGen conversation context */
  async submitConversationIntent(
    functionName: string,
    functionArgs: Record<string, unknown>,
    conversationContext?: Record<string, unknown>
  ): Promise<IntentResult> {
    return await this.submitIntent(`function_${functionName}`, {
      function_name: functionName,
      function_args: functionArgs,
      conversation_context: conversationContext,
    });
  }
}

/** OpenClaw-specific adapter */
class OpenClawAdapter extends BaseFrameworkAdapter {
  constructor(config: FrameworkConfig) {
    super(config, 'openclaw');
  }

  protected getFrameworkName(): string {
    return 'openclaw';
  }

  /** Enhanced submitIntent with OpenClaw skill context */
  async submitSkillIntent(
    skillName: string,
    skillArgs: Record<string, unknown>,
    sessionContext?: Record<string, unknown>
  ): Promise<IntentResult> {
    return await this.submitIntent(`skill_${skillName}`, {
      skill_name: skillName,
      skill_args: skillArgs,
      session_context: sessionContext,
    });
  }
}

// ─── Factory Functions ────────────────────────────────────────────────────────

/**
 * Create a LangChain-optimized Vienna adapter.
 * 
 * @example
 * ```typescript
 * const vienna = createForLangChain({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'langchain-bot-1',
 * });
 * 
 * const result = await vienna.submitToolIntent('web_search', { query: 'AI governance' });
 * ```
 */
export function createForLangChain(config: FrameworkConfig): LangChainAdapter {
  return new LangChainAdapter(config);
}

/**
 * Create a CrewAI-optimized Vienna adapter.
 * 
 * @example
 * ```typescript
 * const vienna = createForCrewAI({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'crew-researcher',
 * });
 * 
 * const result = await vienna.submitTaskIntent('research', { topic: 'market analysis' });
 * ```
 */
export function createForCrewAI(config: FrameworkConfig): CrewAIAdapter {
  return new CrewAIAdapter(config);
}

/**
 * Create an AutoGen-optimized Vienna adapter.
 * 
 * @example
 * ```typescript
 * const vienna = createForAutoGen({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'autogen-assistant',
 * });
 * 
 * const result = await vienna.submitConversationIntent('get_stock_price', { symbol: 'NVDA' });
 * ```
 */
export function createForAutoGen(config: FrameworkConfig): AutoGenAdapter {
  return new AutoGenAdapter(config);
}

/**
 * Create an OpenClaw-optimized Vienna adapter.
 * 
 * @example
 * ```typescript
 * const vienna = createForOpenClaw({
 *   apiKey: process.env.VIENNA_API_KEY!,
 *   agentId: 'openclaw-agent',
 * });
 * 
 * const result = await vienna.submitSkillIntent('web_search', { query: 'OpenAI news' });
 * ```
 */
export function createForOpenClaw(config: FrameworkConfig): OpenClawAdapter {
  return new OpenClawAdapter(config);
}