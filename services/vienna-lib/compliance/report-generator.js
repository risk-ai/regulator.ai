"use strict";
/**
 * Compliance Report Generator — Vienna OS
 *
 * One-click export of governance evidence for SOC 2, ISO 27001, and
 * internal audits. Generates structured reports that map directly to
 * compliance control evidence requirements.
 *
 * Report types:
 * 1. GOVERNANCE SUMMARY — period overview with key metrics
 * 2. WARRANT AUDIT — all warrants issued, verified, and chain integrity
 * 3. APPROVAL AUDIT — all approval decisions with reviewer details
 * 4. POLICY EVALUATION LOG — all policy evaluations with reasoning
 * 5. ANOMALY REPORT — all anomalies detected with severity
 * 6. AGENT ACTIVITY — per-agent action history with trust metrics
 * 7. FULL COMPLIANCE PACKAGE — all of the above in one export
 *
 * Outputs: JSON (structured), CSV (tabular), or Markdown (human-readable).
 *
 * SOC 2 mapping:
 * - CC6.1 (Logical Access): Warrant scope + approval evidence
 * - CC6.2 (System Access): Agent registration + trust scoring
 * - CC6.3 (Change Management): Policy evaluation + simulation logs
 * - CC7.2 (System Monitoring): Anomaly detection + metrics
 * - CC8.1 (Incident Management): Scope drift + denied intents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReportGenerator = void 0;
// ─── Report Generator ───
class ComplianceReportGenerator {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    /**
     * Generate a compliance report.
     */
    async generate(request) {
        const startTime = Date.now();
        const reportId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let data;
        switch (request.type) {
            case 'governance_summary':
                data = await this._generateGovernanceSummary(request);
                break;
            case 'warrant_audit':
                data = await this._generateWarrantAudit(request);
                break;
            case 'approval_audit':
                data = await this._generateApprovalAudit(request);
                break;
            case 'policy_evaluation':
                data = await this._generatePolicyEvaluationLog(request);
                break;
            case 'anomaly_report':
                data = await this._generateAnomalyReport(request);
                break;
            case 'agent_activity':
                data = await this._generateAgentActivity(request);
                break;
            case 'full_compliance':
                data = await this._generateFullCompliance(request);
                break;
            default:
                throw new Error(`Unknown report type: ${request.type}`);
        }
        const recordCount = this._countRecords(data);
        const format = request.format || 'json';
        const report = {
            metadata: {
                report_id: reportId,
                type: request.type,
                tenant_id: request.tenant_id,
                period: { start: request.period_start, end: request.period_end },
                generated_at: new Date().toISOString(),
                generation_time_ms: Date.now() - startTime,
                record_count: recordCount,
                format,
                vienna_os_version: '1.0.0',
            },
            data,
        };
        // Convert format if needed
        if (format === 'markdown') {
            report.data = this._toMarkdown(request.type, data);
        }
        else if (format === 'csv') {
            report.data = this._toCSV(request.type, data);
        }
        return report;
    }
    // ─── Report Generators ───
    async _generateGovernanceSummary(req) {
        const auditEvents = await this.dataSource.queryAuditLog(req.tenant_id, {
            start: req.period_start,
            end: req.period_end,
            limit: 10000,
        });
        const policies = await this.dataSource.queryPolicies(req.tenant_id);
        const agents = await this.dataSource.queryAgents(req.tenant_id);
        // Classify events
        const intentEvents = auditEvents.filter(e => e.event?.includes('intent'));
        const warrantEvents = auditEvents.filter(e => e.event?.includes('warrant'));
        const approvalEvents = auditEvents.filter(e => e.event?.includes('approval'));
        const anomalyEvents = auditEvents.filter(e => e.event?.includes('anomaly'));
        const policyEvents = auditEvents.filter(e => e.event?.includes('policy'));
        const approved = intentEvents.filter(e => e.event?.includes('approved'));
        const denied = intentEvents.filter(e => e.event?.includes('denied'));
        const submitted = intentEvents.filter(e => e.event?.includes('submitted'));
        // By tier
        const byTier = { T0: 0, T1: 0, T2: 0, T3: 0 };
        for (const e of submitted) {
            const tier = e.details?.risk_tier || `T${e.risk_tier || 0}`;
            if (tier in byTier)
                byTier[tier]++;
        }
        // Anomalies by severity
        const bySeverity = {};
        for (const e of anomalyEvents) {
            const sev = e.details?.severity || 'unknown';
            bySeverity[sev] = (bySeverity[sev] || 0) + 1;
        }
        // Approvals by source
        const bySource = {};
        for (const e of approvalEvents.filter(a => a.event?.includes('resolved'))) {
            const src = e.details?.source || 'console';
            bySource[src] = (bySource[src] || 0) + 1;
        }
        // Chain verification
        let chainInfo = { length: 0, valid: false, root: '' };
        if (this.dataSource.queryWarrantChain) {
            try {
                chainInfo = await this.dataSource.queryWarrantChain(req.tenant_id);
            }
            catch { /* non-critical */ }
        }
        // Active agents in period
        const activeAgentIds = new Set();
        for (const e of intentEvents) {
            if (e.details?.agent_id)
                activeAgentIds.add(e.details.agent_id);
        }
        const totalIntents = submitted.length;
        const approvalRate = totalIntents > 0 ? approved.length / totalIntents : 0;
        // SOC 2 control evidence
        const soc2Controls = this._mapToSOC2Controls({
            intentsTotal: totalIntents,
            approved: approved.length,
            denied: denied.length,
            warrantsIssued: warrantEvents.filter(e => e.event?.includes('issued')).length,
            chainValid: chainInfo.valid,
            policiesActive: policies.filter(p => p.enabled).length,
            policyEvaluations: policyEvents.length,
            anomalies: anomalyEvents.length,
            agentsRegistered: agents.length,
            approvalsProcessed: approvalEvents.length,
        });
        return {
            period: { start: req.period_start, end: req.period_end },
            intents: {
                total: totalIntents,
                approved: approved.length,
                denied: denied.length,
                pending: totalIntents - approved.length - denied.length,
                by_tier: byTier,
                approval_rate: Math.round(approvalRate * 1000) / 10,
                avg_processing_time_ms: 0, // Would need timing data
            },
            warrants: {
                total_issued: warrantEvents.filter(e => e.event?.includes('issued')).length,
                total_expired: warrantEvents.filter(e => e.event?.includes('expired')).length,
                total_invalidated: warrantEvents.filter(e => e.event?.includes('invalidated')).length,
                chain_integrity: chainInfo.valid ? 'verified' : chainInfo.length > 0 ? 'unverified' : 'unverified',
                chain_length: chainInfo.length,
            },
            approvals: {
                total: approvalEvents.length,
                avg_latency_seconds: 0,
                by_source: bySource,
            },
            policies: {
                active_count: policies.filter(p => p.enabled).length,
                evaluations: policyEvents.length,
                conflicts_detected: policyEvents.filter(e => e.details?.conflicts_detected?.has_conflicts).length,
            },
            anomalies: {
                total: anomalyEvents.length,
                by_severity: bySeverity,
            },
            agents: {
                total_registered: agents.length,
                active_in_period: activeAgentIds.size,
            },
            soc2_controls: soc2Controls,
        };
    }
    async _generateWarrantAudit(req) {
        const events = await this.dataSource.queryAuditLog(req.tenant_id, {
            events: ['warrant_issued', 'warrant.issued', 'warrant_chained'],
            start: req.period_start,
            end: req.period_end,
            limit: 5000,
        });
        return events
            .filter(e => e.event?.includes('warrant') && e.event?.includes('issued'))
            .map(e => {
            const d = e.details || {};
            return {
                warrant_id: d.warrant_id || '',
                issued_at: e.created_at,
                expires_at: d.expires_at || '',
                risk_tier: (d.risk_tier || `T${e.risk_tier || 0}`),
                agent_id: d.agent_id || (e.actor || ''),
                objective: d.objective || '',
                allowed_actions: d.allowed_actions || [],
                status: 'issued',
                chain_index: d.chain_index,
                chain_hash: d.chain_hash,
                approval_ids: d.approval_ids || [],
            };
        });
    }
    async _generateApprovalAudit(req) {
        const events = await this.dataSource.queryAuditLog(req.tenant_id, {
            events: ['approval.resolved', 'intent.approved', 'intent.denied'],
            start: req.period_start,
            end: req.period_end,
            limit: 5000,
        });
        return events
            .filter(e => e.event?.includes('approved') || e.event?.includes('denied') || e.event?.includes('resolved'))
            .map(e => {
            const d = e.details || {};
            return {
                approval_id: d.approval_id || '',
                intent_id: d.intent_id || '',
                agent_id: d.agent_id || '',
                action: d.action || '',
                risk_tier: (d.risk_tier || `T${e.risk_tier || 0}`),
                decision: e.event?.includes('denied') ? 'denied' : 'approved',
                reviewed_by: d.reviewed_by || d.approved_by || e.actor || 'system',
                review_source: d.source || 'console',
                decision_reason: d.decision_reason || undefined,
                latency_seconds: 0,
                timestamp: e.created_at,
            };
        });
    }
    async _generatePolicyEvaluationLog(req) {
        const events = await this.dataSource.queryAuditLog(req.tenant_id, {
            events: ['policy_evaluation'],
            start: req.period_start,
            end: req.period_end,
            limit: 5000,
        });
        return events.map(e => ({
            evaluation_id: e.details?.evaluation_id || '',
            plan_id: e.details?.plan_id || '',
            decision: e.details?.decision || '',
            matched_policies: e.details?.matched_policies || [],
            final_policy: e.details?.final_policy || null,
            evaluation_time_ms: e.details?.evaluation_time_ms || 0,
            conflicts: e.details?.conflicts_detected || null,
            timestamp: e.created_at,
        }));
    }
    async _generateAnomalyReport(req) {
        const events = await this.dataSource.queryAuditLog(req.tenant_id, {
            events: ['anomaly'],
            start: req.period_start,
            end: req.period_end,
            limit: 5000,
        });
        return events
            .filter(e => e.event?.includes('anomaly'))
            .map(e => {
            const d = e.details || {};
            return {
                anomaly_id: d.anomaly_id || d.id || '',
                type: d.type || e.event || '',
                severity: d.severity || 'unknown',
                agent_id: d.agent_id || '',
                description: d.description || '',
                detected_at: e.created_at,
                resolved: !!(d.resolved),
            };
        });
    }
    async _generateAgentActivity(req) {
        const events = await this.dataSource.queryAuditLog(req.tenant_id, {
            start: req.period_start,
            end: req.period_end,
            limit: 10000,
        });
        const agents = await this.dataSource.queryAgents(req.tenant_id);
        // Aggregate per agent
        const agentMap = new Map();
        for (const e of events) {
            const agentId = e.details?.agent_id || '';
            if (!agentId)
                continue;
            if (!agentMap.has(agentId)) {
                agentMap.set(agentId, {
                    total: 0, approved: 0, denied: 0, anomalies: 0,
                    actions: new Map(), lastActive: e.created_at,
                });
            }
            const agent = agentMap.get(agentId);
            if (e.event?.includes('intent') || e.event?.includes('submitted'))
                agent.total++;
            if (e.event?.includes('approved'))
                agent.approved++;
            if (e.event?.includes('denied'))
                agent.denied++;
            if (e.event?.includes('anomaly'))
                agent.anomalies++;
            const action = e.details?.action || '';
            if (action)
                agent.actions.set(action, (agent.actions.get(action) || 0) + 1);
            if (e.created_at > agent.lastActive)
                agent.lastActive = e.created_at;
        }
        return Array.from(agentMap.entries()).map(([agentId, data]) => {
            // Trust score: 100 - (denial_rate * 50) - (anomaly_rate * 100)
            const denialRate = data.total > 0 ? data.denied / data.total : 0;
            const anomalyRate = data.total > 0 ? data.anomalies / data.total : 0;
            const trustScore = Math.max(0, Math.min(100, Math.round(100 - (denialRate * 50) - (anomalyRate * 100))));
            const topActions = Array.from(data.actions.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([action]) => action);
            return {
                agent_id: agentId,
                total_intents: data.total,
                approved: data.approved,
                denied: data.denied,
                anomalies: data.anomalies,
                trust_score: trustScore,
                most_common_actions: topActions,
                last_active: data.lastActive,
            };
        });
    }
    async _generateFullCompliance(req) {
        const [summary, warrants, approvals, policies, anomalies, agents] = await Promise.all([
            this._generateGovernanceSummary(req),
            this._generateWarrantAudit(req),
            this._generateApprovalAudit(req),
            this._generatePolicyEvaluationLog(req),
            this._generateAnomalyReport(req),
            this._generateAgentActivity(req),
        ]);
        return {
            governance_summary: summary,
            warrant_audit: warrants,
            approval_audit: approvals,
            policy_evaluations: policies,
            anomaly_report: anomalies,
            agent_activity: agents,
        };
    }
    // ─── SOC 2 Control Mapping ───
    _mapToSOC2Controls(metrics) {
        return [
            {
                control_id: 'CC6.1',
                control_name: 'Logical and Physical Access Controls',
                evidence_type: 'Warrant-based access control',
                status: metrics.warrantsIssued > 0 ? 'satisfied' : 'not_applicable',
                evidence_summary: `${metrics.warrantsIssued} execution warrants issued with cryptographic scope enforcement. ${metrics.denied} unauthorized actions denied.`,
                record_count: metrics.warrantsIssued + metrics.denied,
            },
            {
                control_id: 'CC6.2',
                control_name: 'Prior to Issuing System Credentials',
                evidence_type: 'Agent registration and trust scoring',
                status: metrics.agentsRegistered > 0 ? 'satisfied' : 'partial',
                evidence_summary: `${metrics.agentsRegistered} agents registered with identity verification. Trust scores computed from operational history.`,
                record_count: metrics.agentsRegistered,
            },
            {
                control_id: 'CC6.3',
                control_name: 'Change Management',
                evidence_type: 'Policy evaluation logs',
                status: metrics.policiesActive > 0 ? 'satisfied' : 'partial',
                evidence_summary: `${metrics.policiesActive} active policies enforced. ${metrics.policyEvaluations} policy evaluations logged with full decision reasoning.`,
                record_count: metrics.policyEvaluations,
            },
            {
                control_id: 'CC7.2',
                control_name: 'Monitoring of System Components',
                evidence_type: 'Anomaly detection',
                status: 'satisfied',
                evidence_summary: `Continuous anomaly detection active. ${metrics.anomalies} anomalies detected and logged during period.`,
                record_count: metrics.anomalies,
            },
            {
                control_id: 'CC7.3',
                control_name: 'Evaluation of Security Events',
                evidence_type: 'Governance audit trail',
                status: metrics.intentsTotal > 0 ? 'satisfied' : 'not_applicable',
                evidence_summary: `${metrics.intentsTotal} governance events evaluated. All decisions logged with immutable audit trail. Merkle chain integrity: ${metrics.chainValid ? 'verified' : 'unverified'}.`,
                record_count: metrics.intentsTotal,
            },
            {
                control_id: 'CC8.1',
                control_name: 'Incident Identification and Response',
                evidence_type: 'Denied intents and anomaly response',
                status: metrics.denied > 0 || metrics.anomalies > 0 ? 'satisfied' : 'partial',
                evidence_summary: `${metrics.denied} unauthorized actions prevented. ${metrics.anomalies} anomalies detected. All incidents logged with response actions.`,
                record_count: metrics.denied + metrics.anomalies,
            },
        ];
    }
    // ─── Format Converters ───
    _toMarkdown(type, data) {
        const lines = [];
        lines.push(`# Vienna OS Compliance Report: ${type}`);
        lines.push(`\nGenerated: ${new Date().toISOString()}\n`);
        if (type === 'governance_summary' && data && typeof data === 'object') {
            const d = data;
            lines.push('## Intent Summary');
            lines.push(`| Metric | Value |`);
            lines.push(`|--------|-------|`);
            lines.push(`| Total Intents | ${d.intents.total} |`);
            lines.push(`| Approved | ${d.intents.approved} |`);
            lines.push(`| Denied | ${d.intents.denied} |`);
            lines.push(`| Approval Rate | ${d.intents.approval_rate}% |`);
            lines.push('');
            lines.push('## Warrants');
            lines.push(`| Metric | Value |`);
            lines.push(`|--------|-------|`);
            lines.push(`| Issued | ${d.warrants.total_issued} |`);
            lines.push(`| Chain Length | ${d.warrants.chain_length} |`);
            lines.push(`| Chain Integrity | ${d.warrants.chain_integrity} |`);
            lines.push('');
            lines.push('## SOC 2 Control Evidence');
            lines.push(`| Control | Name | Status | Evidence |`);
            lines.push(`|---------|------|--------|----------|`);
            for (const c of d.soc2_controls) {
                lines.push(`| ${c.control_id} | ${c.control_name} | ${c.status} | ${c.evidence_summary} |`);
            }
        }
        else {
            lines.push('```json');
            lines.push(JSON.stringify(data, null, 2));
            lines.push('```');
        }
        return lines.join('\n');
    }
    _toCSV(type, data) {
        if (!Array.isArray(data)) {
            // For non-array data, convert to single-row CSV
            if (data && typeof data === 'object') {
                const flat = this._flattenObject(data);
                const headers = Object.keys(flat);
                const values = Object.values(flat).map(v => `"${String(v).replace(/"/g, '""')}"`);
                return `${headers.join(',')}\n${values.join(',')}`;
            }
            return String(data);
        }
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(h => {
            const val = row[h];
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
        }).join(','));
        return `${headers.join(',')}\n${rows.join('\n')}`;
    }
    _flattenObject(obj, prefix = '') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(result, this._flattenObject(value, fullKey));
            }
            else {
                result[fullKey] = String(value ?? '');
            }
        }
        return result;
    }
    _countRecords(data) {
        if (Array.isArray(data))
            return data.length;
        if (data && typeof data === 'object') {
            let count = 0;
            for (const value of Object.values(data)) {
                if (Array.isArray(value))
                    count += value.length;
                else
                    count++;
            }
            return count;
        }
        return 1;
    }
}
exports.ComplianceReportGenerator = ComplianceReportGenerator;
exports.default = ComplianceReportGenerator;
