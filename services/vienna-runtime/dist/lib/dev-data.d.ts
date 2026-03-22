import type { Investigation, Incident, Artifact } from '../types/api';
export declare const mockInvestigations: Investigation[];
export declare const mockIncidents: Incident[];
export declare const mockArtifacts: Artifact[];
export declare const mockTraceTimeline: {
    intent_id: string;
    timeline: ({
        timestamp: string;
        event_type: string;
        actor: string;
        details: {
            action: string;
            target: string;
            plan_id?: undefined;
            steps?: undefined;
            execution_id?: undefined;
            status?: undefined;
            exit_code?: undefined;
        };
    } | {
        timestamp: string;
        event_type: string;
        actor: string;
        details: {
            plan_id: string;
            steps: number;
            action?: undefined;
            target?: undefined;
            execution_id?: undefined;
            status?: undefined;
            exit_code?: undefined;
        };
    } | {
        timestamp: string;
        event_type: string;
        actor: string;
        details: {
            execution_id: string;
            action?: undefined;
            target?: undefined;
            plan_id?: undefined;
            steps?: undefined;
            status?: undefined;
            exit_code?: undefined;
        };
    } | {
        timestamp: string;
        event_type: string;
        actor: string;
        details: {
            status: string;
            exit_code: number;
            action?: undefined;
            target?: undefined;
            plan_id?: undefined;
            steps?: undefined;
            execution_id?: undefined;
        };
    })[];
};
//# sourceMappingURL=dev-data.d.ts.map