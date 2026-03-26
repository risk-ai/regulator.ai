/**
 * Integration Adapter Registry — Vienna OS
 * 
 * Central registry for all integration adapters.
 * Provides adapter lookup and config schema discovery.
 */

import type { IntegrationAdapter, ConfigSchema } from './types.js';
import { slackAdapter, slackConfigSchema } from './slackAdapter.js';
import { emailAdapter, emailConfigSchema } from './emailAdapter.js';
import { webhookAdapter, webhookConfigSchema } from './webhookAdapter.js';
import { githubAdapter, githubConfigSchema } from './githubAdapter.js';

const adapters: Map<string, IntegrationAdapter> = new Map();
const schemas: Map<string, ConfigSchema> = new Map();

// Register built-in adapters
function register(adapter: IntegrationAdapter, schema: ConfigSchema) {
  adapters.set(adapter.type, adapter);
  schemas.set(adapter.type, schema);
}

register(slackAdapter, slackConfigSchema);
register(emailAdapter, emailConfigSchema);
register(webhookAdapter, webhookConfigSchema);
register(githubAdapter, githubConfigSchema);

/**
 * Get adapter by type
 */
export function getAdapter(type: string): IntegrationAdapter | undefined {
  return adapters.get(type);
}

/**
 * Get all registered adapter types
 */
export function getAdapterTypes(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Get config schema for a type
 */
export function getConfigSchema(type: string): ConfigSchema | undefined {
  return schemas.get(type);
}

/**
 * Get all config schemas
 */
export function getAllConfigSchemas(): ConfigSchema[] {
  return Array.from(schemas.values());
}

/**
 * Check if adapter type exists
 */
export function hasAdapter(type: string): boolean {
  return adapters.has(type);
}
