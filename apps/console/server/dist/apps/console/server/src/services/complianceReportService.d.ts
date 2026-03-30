/**
 * Compliance Report Generator Service
 * Vienna OS — Enterprise Governance Reporting
 *
 * Queries all governance tables and compiles comprehensive,
 * board-ready compliance reports with auto-generated recommendations.
 */
export interface ReportSection {
    id: string;
    title: string;
    data: any;
}
export interface ComplianceReport {
    id: string;
    report_type: string;
    title: string;
    period_start: string;
    period_end: string;
    report_data: ReportData;
    status: string;
    generated_by: string;
    generated_at: string;
    schedule_cron: string | null;
    recipients: string[];
}
export interface ReportData {
    metadata: ReportMetadata;
    sections: Record<string, any>;
}
export interface ReportMetadata {
    generated_at: string;
    period_start: string;
    period_end: string;
    report_type: string;
    template_name: string;
    vienna_version: string;
}
export interface ReportTemplate {
    id: string;
    name: string;
    description: string | null;
    sections: string[];
    report_type: string | null;
    is_default: boolean;
    created_at: string;
}
export interface QuickStats {
    total_actions: number;
    compliance_rate: number;
    policy_violations: number;
    avg_approval_time_minutes: number;
    unauthorized_executions: number;
    fleet_health_score: number;
    period: string;
}
export interface GenerateReportRequest {
    report_type: string;
    period_start?: string;
    period_end?: string;
    template_id?: string;
    sections?: string[];
    generated_by?: string;
}
export interface ScheduleRequest {
    report_type: string;
    schedule_cron: string;
    template_id?: string;
    recipients?: string[];
}
export declare class ComplianceReportService {
    listReports(limit?: number, offset?: number): Promise<{
        reports: ComplianceReport[];
        total: number;
    }>;
    getReport(id: string): Promise<ComplianceReport | null>;
    deleteReport(id: string): Promise<boolean>;
    listTemplates(): Promise<ReportTemplate[]>;
    createTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate>;
    updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate | null>;
    getTemplate(id: string): Promise<ReportTemplate | null>;
    getQuickStats(periodDays?: number): Promise<QuickStats>;
    generateReport(request: GenerateReportRequest): Promise<ComplianceReport>;
    private buildReportData;
    private buildExecutiveSummary;
    private buildGovernanceOverview;
    private buildActionVolume;
    private buildPolicyCompliance;
    private buildAgentPerformance;
    private buildRiskAnalysis;
    private buildApprovalMetrics;
    private buildViolationsIncidents;
    private buildIntegrationHealth;
    private buildRecommendations;
    createSchedule(req: ScheduleRequest): Promise<ComplianceReport>;
    listSchedules(): Promise<ComplianceReport[]>;
    private calculatePeriodStart;
    private generateTitle;
    private generateHighlights;
}
//# sourceMappingURL=complianceReportService.d.ts.map