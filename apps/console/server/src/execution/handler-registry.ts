/**
 * Execution Handler Registry
 * 
 * Central registry for all execution handlers
 */

import { HandlerRegistry } from './types.js';
import systemStatusHandler from './handlers/system-status.js';
import listAgentsHandler from './handlers/list-agents.js';
import auditTrailHandler from './handlers/audit-trail.js';
import viewLogsHandler from './handlers/view-logs.js';
import queryDatabaseHandler from './handlers/query-database.js';

export const handlerRegistry: HandlerRegistry = {
  'system-status': systemStatusHandler,
  'list-agents': listAgentsHandler,
  'audit-trail': auditTrailHandler,
  'view-logs': viewLogsHandler,
  'query-database': queryDatabaseHandler,
};

export function getHandler(actionType: string) {
  return handlerRegistry[actionType];
}

export function registerHandler(actionType: string, handler: any) {
  handlerRegistry[actionType] = handler;
}

export default handlerRegistry;
