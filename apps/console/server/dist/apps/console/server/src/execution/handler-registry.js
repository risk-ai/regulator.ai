/**
 * Execution Handler Registry
 *
 * Central registry for all execution handlers
 */
import systemStatusHandler from './handlers/system-status.js';
import listAgentsHandler from './handlers/list-agents.js';
import auditTrailHandler from './handlers/audit-trail.js';
import viewLogsHandler from './handlers/view-logs.js';
import queryDatabaseHandler from './handlers/query-database.js';
export const handlerRegistry = {
    'system-status': systemStatusHandler,
    'list-agents': listAgentsHandler,
    'audit-trail': auditTrailHandler,
    'view-logs': viewLogsHandler,
    'query-database': queryDatabaseHandler,
};
export function getHandler(actionType) {
    return handlerRegistry[actionType];
}
export function registerHandler(actionType, handler) {
    handlerRegistry[actionType] = handler;
}
export default handlerRegistry;
//# sourceMappingURL=handler-registry.js.map