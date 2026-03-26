/**
 * Compliance API Client — Vienna OS
 */

import { apiClient } from './client.js';

export interface QuickStats {
  total_actions: number;
  compliance_rate: number;
  policy_violations: number;
  avg_approval_time_minutes: number;
  unauthorized_executions: number;
  fleet_health_score: number;
  period: string;
}

export interface ComplianceReport {
  id: string;
  report_type: string;
  title: string;
  period_start: string;
  period_end: string;
  report_data: any;
  status: string;
  generated_by: string;
  generated_at: string;
  schedule_cron: string | null;
  recipients: string[];
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

export interface ReportsListResponse {
  reports: ComplianceReport[];
  total: number;
  limit: number;
  offset: number;
}

export const complianceApi = {
  // Quick Stats
  getQuickStats: (period = 30) =>
    apiClient.get<QuickStats>('/compliance/quick-stats', { period }),

  // Reports
  listReports: (limit = 50, offset = 0) =>
    apiClient.get<ReportsListResponse>('/compliance/reports', { limit, offset }),

  getReport: (id: string) =>
    apiClient.get<ComplianceReport>(`/compliance/reports/${id}`),

  generateReport: (params: {
    report_type: string;
    period_start?: string;
    period_end?: string;
    template_id?: string;
    sections?: string[];
    generated_by?: string;
  }) => apiClient.post<ComplianceReport, typeof params>('/compliance/reports/generate', params),

  deleteReport: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/compliance/reports/${id}`),

  getPdfUrl: (id: string) => `/api/v1/compliance/reports/${id}/pdf`,
  getCsvUrl: (id: string) => `/api/v1/compliance/reports/${id}/csv`,

  // Templates
  listTemplates: () =>
    apiClient.get<ReportTemplate[]>('/compliance/templates'),

  createTemplate: (template: Partial<ReportTemplate>) =>
    apiClient.post<ReportTemplate, Partial<ReportTemplate>>('/compliance/templates', template),

  updateTemplate: (id: string, updates: Partial<ReportTemplate>) =>
    apiClient.put<ReportTemplate, Partial<ReportTemplate>>(`/compliance/templates/${id}`, updates),

  // Scheduling
  createSchedule: (params: {
    report_type: string;
    schedule_cron: string;
    template_id?: string;
    recipients?: string[];
  }) => apiClient.post<ComplianceReport, typeof params>('/compliance/schedule', params),
};
