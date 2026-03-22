"use strict";
// Development seed data for Vienna Runtime
// Used when VIENNA_STATE_BACKEND=memory
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockTraceTimeline = exports.mockArtifacts = exports.mockIncidents = exports.mockInvestigations = void 0;
exports.mockInvestigations = [
    {
        id: 'inv_20260314_001',
        name: 'Gateway Failure 2026-03-14',
        description: 'Investigating repeated gateway restarts every 30 minutes',
        status: 'investigating',
        objective_id: 'obj_maintain_gateway_health',
        created_by: 'operator@example.com',
        created_at: '2026-03-14T21:18:00Z',
        workspace_path: '/investigations/gateway-failure-2026-03-14',
        artifact_count: 12,
        trace_count: 3
    },
    {
        id: 'inv_20260312_002',
        name: 'Database Performance Degradation',
        description: 'Query latency spike detected on production database',
        status: 'resolved',
        created_by: 'operator@example.com',
        created_at: '2026-03-12T10:30:00Z',
        resolved_at: '2026-03-13T14:20:00Z',
        workspace_path: '/investigations/database-performance-degradation',
        artifact_count: 8,
        trace_count: 1
    }
];
exports.mockIncidents = [
    {
        id: 'inc_20260314_001',
        title: 'OpenClaw Gateway Unavailable',
        severity: 'critical',
        status: 'resolved',
        service_id: 'openclaw-gateway',
        detected_by: 'objective_evaluator',
        detected_at: '2026-03-14T21:15:00Z',
        resolved_at: '2026-03-14T21:20:00Z',
        resolution_summary: 'Automatic remediation successful (service restart)'
    },
    {
        id: 'inc_20260312_002',
        title: 'Database Connection Pool Exhausted',
        severity: 'medium',
        status: 'open',
        service_id: 'postgres',
        detected_by: 'monitoring',
        detected_at: '2026-03-12T08:00:00Z'
    }
];
exports.mockArtifacts = [
    {
        id: 'art_20260314_001',
        artifact_type: 'trace',
        file_path: '/workspace/traces/2026-03-14/intent_trace_int_20260314_001.json',
        mime_type: 'application/json',
        size_bytes: 4521,
        content_hash: 'sha256:7f3a...',
        investigation_id: 'inv_20260314_001',
        intent_id: 'int_20260314_001',
        created_by: 'system',
        created_at: '2026-03-14T21:20:00Z'
    },
    {
        id: 'art_20260314_002',
        artifact_type: 'execution_graph',
        file_path: '/workspace/traces/2026-03-14/execution_graph_exe_20260314_001.json',
        mime_type: 'application/json',
        size_bytes: 2100,
        content_hash: 'sha256:8a2b...',
        investigation_id: 'inv_20260314_001',
        execution_id: 'exe_20260314_001',
        created_by: 'system',
        created_at: '2026-03-14T21:20:05Z'
    }
];
exports.mockTraceTimeline = {
    intent_id: 'int_20260314_001',
    timeline: [
        {
            timestamp: '2026-03-14T21:18:00Z',
            event_type: 'intent_received',
            actor: 'operator@example.com',
            details: { action: 'restart_service', target: 'openclaw-gateway' }
        },
        {
            timestamp: '2026-03-14T21:18:01Z',
            event_type: 'plan_created',
            actor: 'vienna_planner',
            details: { plan_id: 'pln_20260314_001', steps: 3 }
        },
        {
            timestamp: '2026-03-14T21:18:02Z',
            event_type: 'execution_started',
            actor: 'vienna_executor',
            details: { execution_id: 'exe_20260314_001' }
        },
        {
            timestamp: '2026-03-14T21:18:05Z',
            event_type: 'execution_completed',
            actor: 'vienna_executor',
            details: { status: 'success', exit_code: 0 }
        }
    ]
};
//# sourceMappingURL=dev-data.js.map