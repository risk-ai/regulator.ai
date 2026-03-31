/**
 * Timeline Types
 * Phase 5B: Objective Timeline View
 *
 * Operator-focused read model for objective execution history.
 * Transforms SSE events into operator-comprehensible timeline items.
 */
/**
 * Timeline Event Mappings
 * Defines how SSE events transform into timeline items
 */
export const EVENT_TIMELINE_MAPPINGS = {
    // Execution events
    'execution.started': {
        category: 'execution',
        status: 'running',
        titleTemplate: 'Execution started',
    },
    'execution.completed': {
        category: 'execution',
        status: 'success',
        titleTemplate: 'Execution completed',
    },
    'execution.failed': {
        category: 'execution',
        status: 'error',
        titleTemplate: 'Execution failed',
    },
    'execution.retried': {
        category: 'execution',
        status: 'warning',
        titleTemplate: 'Execution retried',
    },
    'execution.timeout': {
        category: 'execution',
        status: 'error',
        titleTemplate: 'Execution timeout',
    },
    'execution.blocked': {
        category: 'execution',
        status: 'warning',
        titleTemplate: 'Execution blocked',
    },
    // Objective events
    'objective.created': {
        category: 'objective',
        status: 'info',
        titleTemplate: 'Objective created',
    },
    'objective.updated': {
        category: 'objective',
        status: 'info',
        titleTemplate: 'Progress updated',
    },
    'objective.completed': {
        category: 'objective',
        status: 'success',
        titleTemplate: 'Objective completed',
    },
    'objective.failed': {
        category: 'objective',
        status: 'error',
        titleTemplate: 'Objective failed',
    },
    // Alert events
    'alert.created': {
        category: 'alert',
        status: 'warning',
        titleTemplate: 'Alert created',
    },
    // System events
    'system.paused': {
        category: 'system',
        status: 'warning',
        titleTemplate: 'System paused',
    },
    'system.resumed': {
        category: 'system',
        status: 'info',
        titleTemplate: 'System resumed',
    },
};
//# sourceMappingURL=timeline.js.map