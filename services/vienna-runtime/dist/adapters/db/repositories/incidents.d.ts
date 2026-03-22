/**
 * Incident Repository
 */
export interface Incident {
    id: string;
    title: string;
    description: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
    detected_at: string;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface NewIncident {
    id: string;
    title: string;
    description?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
    detected_at: string;
}
export declare class IncidentRepository {
    create(data: NewIncident): Incident;
    findById(id: string): Incident | null;
    list(): Incident[];
    linkInvestigation(incidentId: string, investigationId: string): void;
}
//# sourceMappingURL=incidents.d.ts.map