/**
 * Vienna OS SDK
 * The execution kernel for AI agents.
 *
 * Agents propose. Vienna OS decides.
 * Every action warranted. Every execution verified.
 */

export { ViennaClient } from './client.js';
export { ViennaError, AuthError, PolicyDeniedError, WarrantExpiredError } from './errors.js';
export type {
  ViennaConfig,
  Intent,
  IntentResult,
  Proposal,
  PolicyEvaluation,
  Warrant,
  WarrantVerification,
  Agent,
  AuditEntry,
  SystemStatus,
} from './types.js';
