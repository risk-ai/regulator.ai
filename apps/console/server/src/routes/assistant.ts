/**
 * Assistant Status Routes
 * Phase 1: State Truth Model
 * 
 * Provides unified assistant availability status (separate from provider health)
 */

import { Router, Request, Response } from 'express';
import type { ProviderHealthService } from '../services/providerHealthService.js';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

export type AssistantUnavailableReason =
  | 'provider_cooldown'
  | 'runtime_degraded'
  | 'no_providers'
  | 'service_unavailable';

export interface AssistantStatusResponse {
  available: boolean;
  reason: AssistantUnavailableReason | null;
  cooldown_until: string | null;
  providers: Record<string, string>; // provider name → status
  degraded: boolean;
  timestamp: string;
}

export function createAssistantRouter(
  vienna: ViennaRuntimeService,
  providerHealthService?: ProviderHealthService
): Router {
  const router = Router();

  /**
   * GET /api/v1/status/assistant
   * 
   * Unified assistant availability status
   * 
   * TRUTH LOGIC:
   * - available = at least one provider healthy OR unknown (untested but usable)
   *              AND no active cooldown
   *              AND runtime not critically degraded
   * 
   * DISTINCT FROM PROVIDER HEALTH:
   * - Provider health: can Anthropic/Ollama respond?
   * - Assistant availability: can Vienna Chat accept operator messages?
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Default response (assume available until proven otherwise)
      let available = true;
      let reason: AssistantUnavailableReason | null = null;
      let cooldown_until: string | null = null;
      let providers: Record<string, string> = {};
      let degraded = false;
      
      // Check provider health
      if (providerHealthService) {
        try {
          const providerHealth = await providerHealthService.getProvidersHealth();
          
          // Extract provider statuses
          for (const [name, detail] of Object.entries(providerHealth.providers)) {
            providers[name] = detail.status;
          }
          
          // Determine availability based on provider states
          const providerStatuses = Object.values(providerHealth.providers);
          
          // Count providers by status
          const healthyCount = providerStatuses.filter(p => p.status === 'healthy').length;
          const unknownCount = providerStatuses.filter(p => p.status === 'unknown').length;
          const unavailableCount = providerStatuses.filter(p => p.status === 'unavailable').length;
          const totalProviders = providerStatuses.length;
          
          // TRUTH: Assistant available if ANY provider healthy OR unknown
          // (unknown means "not yet tested", NOT failure)
          const anyProviderUsable = (healthyCount + unknownCount) > 0;
          
          // TRUTH: Assistant unavailable if ALL providers explicitly unavailable
          const allProvidersUnavailable = unavailableCount === totalProviders && totalProviders > 0;
          
          // Check for active cooldowns
          const providersInCooldown = providerStatuses.filter(p => p.cooldownUntil !== null);
          const allInCooldown = providersInCooldown.length === totalProviders && totalProviders > 0;
          
          // Determine earliest cooldown expiry
          if (providersInCooldown.length > 0) {
            const cooldownTimes = providersInCooldown
              .map(p => p.cooldownUntil ? new Date(p.cooldownUntil).getTime() : 0)
              .filter(t => t > 0);
            
            if (cooldownTimes.length > 0) {
              const earliestCooldown = Math.min(...cooldownTimes);
              cooldown_until = new Date(earliestCooldown).toISOString();
            }
          }
          
          // Determine availability and reason
          if (allProvidersUnavailable && allInCooldown) {
            available = false;
            reason = 'provider_cooldown';
          } else if (allProvidersUnavailable) {
            available = false;
            reason = 'no_providers';
          } else if (!anyProviderUsable) {
            // No healthy or unknown providers (only degraded?)
            available = false;
            reason = 'service_unavailable';
            degraded = true;
          }
          
        } catch (error) {
          console.error('[AssistantRouter] Error checking provider health:', error);
          // If we can't check provider health, assume unavailable
          available = false;
          reason = 'service_unavailable';
        }
      } else {
        // No provider health service = can't determine availability
        available = false;
        reason = 'service_unavailable';
      }
      
      // Check Vienna Runtime health
      let runtimeHealthy = true;
      try {
        const runtimeHealth = vienna.getHealth();
        runtimeHealthy = runtimeHealth.state === 'HEALTHY' && runtimeHealth.executor_ready;
        if (!runtimeHealthy) {
          degraded = true;
          if (!reason) reason = 'runtime_degraded';
        }
      } catch (error) {
        console.warn('[AssistantRouter] Failed to check runtime health:', error);
        degraded = true;
      }
      
      const response: SuccessResponse<AssistantStatusResponse> = {
        success: true,
        data: {
          available,
          reason,
          cooldown_until,
          providers,
          degraded,
          timestamp,
        },
        timestamp,
      };
      
      res.json(response);
    } catch (error) {
      console.error('[AssistantRouter] Error getting assistant status:', error);
      
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ASSISTANT_STATUS_ERROR',
        timestamp: new Date().toISOString(),
      };
      
      res.status(500).json(err);
    }
  });

  return router;
}
