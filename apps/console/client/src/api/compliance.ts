/**
 * Compliance API Client
 * Typed wrappers for /api/v1/compliance endpoints
 */

import { apiClient } from './client.js';

// ── Types ────────────────────────────────────────────────────────

export interface FrameworkControl {
  name: string;
  score: number;
  weight: number;
  detail?: string;
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  controls: FrameworkControl[];
}

export interface ComplianceReport {
  id: string;
  title: string;
  report_type: string;
  status: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string;
  report_data?: Record<string, unknown>;
}

export interface ComplianceDashboard {
  frameworks: Framework[];
  recentReports: ComplianceReport[];
  generatedAt: string;
}

export interface QuickStats {
  active_policies: string;
  total_agents: string;
  audit_events_30d: string;
  retention_policies: string;
  roles_configured: string;
  reports_30d: string;
}

export interface RetentionPolicy {
  id: string;
  tenant_id: string;
  table_name: string;
  retention_days: number;
  archive_before_delete: boolean;
  enabled: boolean;
}

export interface RetentionData {
  policies: RetentionPolicy[];
  recentArchives: Array<Record<string, unknown>>;
}

export interface Role {
  id: string;
  tenant_id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  permissions: string[];
  is_system_role: boolean;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  display_name: string;
  email: string | null;
  assigned_at: string;
  expires_at: string | null;
}

export interface RBACData {
  roles: Role[];
  assignments: RoleAssignment[];
}

// ── API Functions ────────────────────────────────────────────────

export async function getComplianceDashboard(): Promise<ComplianceDashboard> {
  return apiClient.get<ComplianceDashboard>('/compliance');
}

export async function getQuickStats(): Promise<QuickStats> {
  return apiClient.get<QuickStats>('/compliance/quick-stats');
}

export async function generateReport(options?: {
  type?: string;
  title?: string;
  periodStart?: string;
  periodEnd?: string;
}): Promise<ComplianceReport> {
  return apiClient.post<ComplianceReport>('/compliance/reports', options || {});
}

export async function listReports(limit?: number, offset?: number): Promise<{ data: ComplianceReport[]; total: number }> {
  const params: Record<string, string | number> = {};
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  return apiClient.get('/compliance/reports', params);
}

export async function getReport(reportId: string): Promise<ComplianceReport> {
  return apiClient.get<ComplianceReport>(`/compliance/reports/${reportId}`);
}

export function getReportExportUrl(reportId: string): string {
  return `/api/v1/compliance/reports/${reportId}/csv`;
}

export async function getRetentionData(): Promise<RetentionData> {
  return apiClient.get<RetentionData>('/compliance/retention');
}

export async function getRBAC(): Promise<RBACData> {
  return apiClient.get<RBACData>('/compliance/roles');
}

export async function getAuditExport(options?: {
  start?: string;
  end?: string;
  format?: 'json' | 'csv';
  limit?: number;
}): Promise<unknown> {
  const params: Record<string, string | number> = {};
  if (options?.start) params.start = options.start;
  if (options?.end) params.end = options.end;
  if (options?.format) params.format = options.format;
  if (options?.limit) params.limit = options.limit;
  return apiClient.get('/compliance/audit-export', params);
}

export function getAuditExportCsvUrl(start?: string, end?: string): string {
  const params = new URLSearchParams({ format: 'csv' });
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return `/api/v1/compliance/audit-export?${params.toString()}`;
}

export async function getReportTemplates(): Promise<Array<Record<string, unknown>>> {
  return apiClient.get('/compliance/templates');
}
