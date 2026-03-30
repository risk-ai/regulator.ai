/**
 * Integration Adapter Registry — Vienna OS
 *
 * Central registry for all integration adapters.
 * Provides adapter lookup and config schema discovery.
 */
import type { IntegrationAdapter, ConfigSchema } from './types.js';
/**
 * Get adapter by type
 */
export declare function getAdapter(type: string): IntegrationAdapter | undefined;
/**
 * Get all registered adapter types
 */
export declare function getAdapterTypes(): string[];
/**
 * Get config schema for a type
 */
export declare function getConfigSchema(type: string): ConfigSchema | undefined;
/**
 * Get all config schemas
 */
export declare function getAllConfigSchemas(): ConfigSchema[];
/**
 * Check if adapter type exists
 */
export declare function hasAdapter(type: string): boolean;
//# sourceMappingURL=adapterRegistry.d.ts.map