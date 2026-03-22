/**
 * Artifact Repository
 */
export type ArtifactType = 'investigation_workspace' | 'investigation_notes' | 'investigation_report' | 'intent_trace' | 'execution_graph' | 'timeline_export' | 'execution_stdout' | 'execution_stderr' | 'state_snapshot' | 'config_snapshot' | 'objective_history' | 'objective_analysis' | 'incident_timeline' | 'incident_postmortem';
export interface Artifact {
    id: string;
    artifact_type: ArtifactType;
    content_type: string;
    size_bytes: number;
    storage_path: string;
    investigation_id: string | null;
    intent_id: string | null;
    execution_id: string | null;
    created_by: string;
    created_at: string;
}
export interface NewArtifact {
    id: string;
    artifact_type: ArtifactType;
    content_type: string;
    size_bytes: number;
    storage_path: string;
    investigation_id?: string;
    intent_id?: string;
    execution_id?: string;
    created_by: string;
}
export declare class ArtifactRepository {
    create(data: NewArtifact): Artifact;
    findById(id: string): Artifact | null;
    list(): Artifact[];
    listByInvestigation(investigationId: string): Artifact[];
}
//# sourceMappingURL=artifacts.d.ts.map