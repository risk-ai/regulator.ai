/**
 * Recovery API Client (Phase 6.5)
 * 
 * Operator recovery copilot interface
 */

import { apiClient } from './client.js';

export interface RuntimeMode {
  mode: 'normal' | 'degraded' | 'local-only' | 'operator-only';
  reasons: string[];
  enteredAt: string;
  previousMode: string | null;
  fallbackProvidersActive: string[];
  availableCapabilities: string[];
}

export interface RuntimeModeTransition {
  from: string;
  to: string;
  timestamp: string;
  reason: string;
  automatic: boolean;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  latencyMs: number | null;
  errorRate: number | null;
  consecutiveFailures: number;
}

export interface RecoveryIntentResponse {
  message: string;
  response: string;
}

/**
 * Classify if a message is a recovery intent
 */
export function isRecoveryIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  const recoveryPatterns = [
    /^diagnose\s+(system|runtime|state)/,
    /^show\s+(failures|failed|errors)/,
    /^show\s+(dead\s*letters?|dlq)/,
    /^explain\s+(blockers?|blocks?|issues?)/,
    /^test\s+provider/,
    /^enter\s+local[\s-]?only/,
    /^recovery\s+checklist/,
    /^show\s+(mode|runtime\s+mode)/,
    /why.*degraded/,
    /what.*wrong/,
    /system.*status/,
  ];
  
  return recoveryPatterns.some(pattern => pattern.test(lowerMessage));
}

/**
 * Process recovery intent
 */
export async function processRecoveryIntent(message: string): Promise<RecoveryIntentResponse> {
  try {
    const response = await apiClient.post<RecoveryIntentResponse>('/recovery/intent', {
      message,
    });
    
    // apiClient already extracts .data from backend response
    return response;
  } catch (error) {
    console.error('[RecoveryAPI] processIntent error:', error);
    // Fallback: return error message as response
    return {
      message,
      response: `Recovery copilot unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get current runtime mode
 */
export async function getRuntimeMode(): Promise<RuntimeMode> {
  try {
    const response = await apiClient.get<RuntimeMode>('/recovery/mode');
    return response; // apiClient already extracts .data
  } catch (error) {
    console.error('[RecoveryAPI] getRuntimeMode error:', error);
    // Fallback: return degraded mode (safe default)
    return {
      mode: 'degraded',
      reasons: ['Failed to fetch runtime mode'],
      enteredAt: new Date().toISOString(),
      previousMode: null,
      fallbackProvidersActive: [],
      availableCapabilities: [],
    };
  }
}

/**
 * Force runtime mode transition (operator override)
 */
export async function forceRuntimeMode(mode: string, reason: string): Promise<RuntimeModeTransition> {
  try {
    const response = await apiClient.post<RuntimeModeTransition>('/recovery/mode/force', {
      mode,
      reason,
    });
    
    return response; // apiClient already extracts .data
  } catch (error) {
    console.error('[RecoveryAPI] forceRuntimeMode error:', error);
    throw error; // Re-throw for caller to handle
  }
}

/**
 * Get provider health status
 */
export async function getProviderHealth(): Promise<Record<string, ProviderHealth>> {
  try {
    const response = await apiClient.get<Record<string, ProviderHealth>>('/recovery/health');
    return response; // apiClient already extracts .data
  } catch (error) {
    console.error('[RecoveryAPI] getProviderHealth error:', error);
    return {}; // Fallback: empty health map
  }
}

export const recoveryApi = {
  isRecoveryIntent,
  processIntent: processRecoveryIntent,
  getRuntimeMode,
  forceRuntimeMode,
  getProviderHealth,
};
