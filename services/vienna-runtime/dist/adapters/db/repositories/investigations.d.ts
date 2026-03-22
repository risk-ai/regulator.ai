/**
 * Investigation Repository
 *
 * Data access layer for investigations
 */
export interface Investigation {
    id: string;
    name: string;
    description: string | null;
    status: 'open' | 'investigating' | 'resolved' | 'archived';
    created_at: string;
    created_by: string;
    updated_at: string;
    resolved_at: string | null;
}
export interface NewInvestigation {
    id: string;
    name: string;
    description?: string;
    status: 'open' | 'investigating' | 'resolved' | 'archived';
    created_by: string;
}
export interface InvestigationFilters {
    status?: string;
    limit?: number;
}
export declare class InvestigationRepository {
    /**
     * Create a new investigation
     */
    create(data: NewInvestigation): Investigation;
    /**
     * Find investigation by ID
     */
    findById(id: string): Investigation | null;
    /**
     * List investigations with optional filters
     */
    list(filters?: InvestigationFilters): Investigation[];
    /**
     * Update investigation
     */
    update(id: string, updates: Partial<Investigation>): Investigation;
    /**
     * Link investigation to incident
     */
    linkIncident(investigationId: string, incidentId: string): void;
    /**
     * Get incidents linked to investigation
     */
    getLinkedIncidents(investigationId: string): string[];
}
//# sourceMappingURL=investigations.d.ts.map