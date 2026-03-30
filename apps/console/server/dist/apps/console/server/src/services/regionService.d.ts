/**
 * Region Service
 *
 * Provides region-aware routing, data residency compliance,
 * health checking, and metrics tracking for multi-region deployments
 */
import { Request, Response } from 'express';
export interface Region {
    id: string;
    name: string;
    fly_region: string;
    postgres_url_env: string;
    status: 'active' | 'maintenance' | 'unavailable';
    location: {
        country: string;
        city: string;
        timezone: string;
    };
    features: {
        gdpr_compliant: boolean;
        primary_region: boolean;
    };
}
export interface RegionMetrics {
    request_count: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_rate: number;
    last_health_check: Date;
}
declare class RegionService {
    private static instance;
    private regions;
    private metrics;
    constructor();
    static getInstance(): RegionService;
    private initializeRegions;
    /**
     * Route request to the nearest region based on Fly-Replay header
     */
    routeToNearestRegion(req: Request, res: Response): string | null;
    /**
     * Ensure data residency compliance for tenant data
     */
    validateDataResidency(tenantId: string, requestedRegion: string): boolean;
    /**
     * Get database connection URL for specific region
     */
    getDatabaseUrl(regionId: string): string;
    /**
     * Check health of all regions
     */
    performHealthCheck(): Promise<Map<string, boolean>>;
    /**
     * Track request metrics for region
     */
    recordRequest(regionId: string, latencyMs: number, isError?: boolean): void;
    /**
     * Get metrics for all regions
     */
    getMetrics(): Map<string, RegionMetrics>;
    /**
     * Get all available regions
     */
    getRegions(): Map<string, Region>;
    /**
     * Get region configuration by ID
     */
    getRegion(regionId: string): Region | undefined;
    private getRegionByFlyCode;
    private selectTargetRegion;
    private checkRegionHealth;
    private getTenantRegion;
    private startHealthChecks;
}
export default RegionService;
export declare const regionService: RegionService;
export declare function regionMiddleware(req: Request, res: Response, next: any): void;
//# sourceMappingURL=regionService.d.ts.map