/**
 * Integration Adapter Registry — Vienna OS
 *
 * Central registry for all integration adapters.
 * Provides adapter lookup and config schema discovery.
 */
import { slackAdapter, slackConfigSchema } from './slackAdapter.js';
import { emailAdapter, emailConfigSchema } from './emailAdapter.js';
import { webhookAdapter, webhookConfigSchema } from './webhookAdapter.js';
import { githubAdapter, githubConfigSchema } from './githubAdapter.js';
const adapters = new Map();
const schemas = new Map();
// Register built-in adapters
function register(adapter, schema) {
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
export function getAdapter(type) {
    return adapters.get(type);
}
/**
 * Get all registered adapter types
 */
export function getAdapterTypes() {
    return Array.from(adapters.keys());
}
/**
 * Get config schema for a type
 */
export function getConfigSchema(type) {
    return schemas.get(type);
}
/**
 * Get all config schemas
 */
export function getAllConfigSchemas() {
    return Array.from(schemas.values());
}
/**
 * Check if adapter type exists
 */
export function hasAdapter(type) {
    return adapters.has(type);
}
//# sourceMappingURL=adapterRegistry.js.map