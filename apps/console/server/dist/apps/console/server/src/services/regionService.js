/**
 * Region Service
 *
 * Provides region-aware routing, data residency compliance,
 * health checking, and metrics tracking for multi-region deployments
 */
class RegionService {
    static instance;
    regions = new Map();
    metrics = new Map();
    constructor() {
        this.initializeRegions();
        this.startHealthChecks();
    }
    static getInstance() {
        if (!RegionService.instance) {
            RegionService.instance = new RegionService();
        }
        return RegionService.instance;
    }
    initializeRegions() {
        const supportedRegions = [
            {
                id: 'us-east',
                name: 'US East',
                fly_region: 'iad',
                postgres_url_env: 'POSTGRES_URL_US_EAST',
                status: 'active',
                location: {
                    country: 'United States',
                    city: 'Washington, DC',
                    timezone: 'America/New_York'
                },
                features: {
                    gdpr_compliant: false,
                    primary_region: true
                }
            },
            {
                id: 'eu-west',
                name: 'EU West',
                fly_region: 'ams',
                postgres_url_env: 'POSTGRES_URL_EU_WEST',
                status: 'active',
                location: {
                    country: 'Netherlands',
                    city: 'Amsterdam',
                    timezone: 'Europe/Amsterdam'
                },
                features: {
                    gdpr_compliant: true,
                    primary_region: false
                }
            },
            {
                id: 'ap-southeast',
                name: 'Asia Pacific Southeast',
                fly_region: 'sin',
                postgres_url_env: 'POSTGRES_URL_AP_SOUTHEAST',
                status: 'active',
                location: {
                    country: 'Singapore',
                    city: 'Singapore',
                    timezone: 'Asia/Singapore'
                },
                features: {
                    gdpr_compliant: false,
                    primary_region: false
                }
            }
        ];
        supportedRegions.forEach(region => {
            this.regions.set(region.id, region);
            this.metrics.set(region.id, {
                request_count: 0,
                avg_latency_ms: 0,
                p95_latency_ms: 0,
                error_rate: 0,
                last_health_check: new Date()
            });
        });
    }
    /**
     * Route request to the nearest region based on Fly-Replay header
     */
    routeToNearestRegion(req, res) {
        const flyRegion = req.headers['fly-region'];
        const clientRegion = req.headers['cf-ipcountry'];
        // If already in correct region, continue processing
        const currentRegion = this.getRegionByFlyCode(flyRegion);
        if (currentRegion && currentRegion.status === 'active') {
            return currentRegion.id;
        }
        // Determine target region based on client location
        const targetRegion = this.selectTargetRegion(clientRegion, flyRegion);
        if (targetRegion && targetRegion.fly_region !== flyRegion) {
            // Set Fly-Replay header to route to correct region
            res.setHeader('fly-replay', `region=${targetRegion.fly_region}`);
            return null; // Request will be replayed to target region
        }
        return targetRegion?.id || 'us-east'; // Fallback to primary region
    }
    /**
     * Ensure data residency compliance for tenant data
     */
    validateDataResidency(tenantId, requestedRegion) {
        const tenant = this.getTenantRegion(tenantId);
        const region = this.regions.get(requestedRegion);
        if (!tenant || !region) {
            return false;
        }
        // GDPR compliance check
        if (tenant.requiresGDPR && !region.features.gdpr_compliant) {
            throw new Error(`Tenant ${tenantId} requires GDPR compliant region. Region ${requestedRegion} is not GDPR compliant.`);
        }
        // Data residency check - tenant data must stay in configured region
        if (tenant.dataResidencyRegion && tenant.dataResidencyRegion !== requestedRegion) {
            throw new Error(`Tenant ${tenantId} data must remain in region ${tenant.dataResidencyRegion}`);
        }
        return true;
    }
    /**
     * Get database connection URL for specific region
     */
    getDatabaseUrl(regionId) {
        const region = this.regions.get(regionId);
        if (!region) {
            throw new Error(`Unknown region: ${regionId}`);
        }
        const dbUrl = process.env[region.postgres_url_env];
        if (!dbUrl) {
            throw new Error(`Database URL not configured for region ${regionId}. Missing ${region.postgres_url_env}`);
        }
        return dbUrl;
    }
    /**
     * Check health of all regions
     */
    async performHealthCheck() {
        const healthResults = new Map();
        for (const [regionId, region] of this.regions) {
            try {
                const isHealthy = await this.checkRegionHealth(region);
                healthResults.set(regionId, isHealthy);
                // Update region status based on health
                if (!isHealthy && region.status === 'active') {
                    region.status = 'unavailable';
                    console.warn(`Region ${regionId} marked as unavailable due to health check failure`);
                }
                else if (isHealthy && region.status === 'unavailable') {
                    region.status = 'active';
                    console.info(`Region ${regionId} back online`);
                }
                // Update metrics
                const metrics = this.metrics.get(regionId);
                metrics.last_health_check = new Date();
            }
            catch (error) {
                console.error(`Health check failed for region ${regionId}:`, error);
                healthResults.set(regionId, false);
            }
        }
        return healthResults;
    }
    /**
     * Track request metrics for region
     */
    recordRequest(regionId, latencyMs, isError = false) {
        const metrics = this.metrics.get(regionId);
        if (!metrics) {
            console.warn(`Unknown region for metrics: ${regionId}`);
            return;
        }
        metrics.request_count++;
        // Update latency (simple moving average)
        metrics.avg_latency_ms = (metrics.avg_latency_ms * 0.9) + (latencyMs * 0.1);
        // Update P95 (approximate)
        if (latencyMs > metrics.p95_latency_ms) {
            metrics.p95_latency_ms = latencyMs;
        }
        else {
            metrics.p95_latency_ms = (metrics.p95_latency_ms * 0.95) + (latencyMs * 0.05);
        }
        // Update error rate
        if (isError) {
            metrics.error_rate = (metrics.error_rate * 0.9) + 0.1;
        }
        else {
            metrics.error_rate = metrics.error_rate * 0.99;
        }
    }
    /**
     * Get metrics for all regions
     */
    getMetrics() {
        return new Map(this.metrics);
    }
    /**
     * Get all available regions
     */
    getRegions() {
        return new Map(this.regions);
    }
    /**
     * Get region configuration by ID
     */
    getRegion(regionId) {
        return this.regions.get(regionId);
    }
    getRegionByFlyCode(flyCode) {
        for (const region of this.regions.values()) {
            if (region.fly_region === flyCode) {
                return region;
            }
        }
        return undefined;
    }
    selectTargetRegion(clientCountry, currentFlyRegion) {
        // Region selection logic based on client location
        const activeRegions = Array.from(this.regions.values()).filter(r => r.status === 'active');
        if (!activeRegions.length) {
            return undefined;
        }
        // If already in a region, stay there if it's active
        const currentRegion = this.getRegionByFlyCode(currentFlyRegion || '');
        if (currentRegion && currentRegion.status === 'active') {
            return currentRegion;
        }
        // Route based on client country
        if (clientCountry) {
            const euCountries = ['DE', 'FR', 'GB', 'NL', 'ES', 'IT', 'BE', 'AT', 'SE', 'DK', 'NO', 'FI', 'PT', 'IE', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY'];
            const apacCountries = ['SG', 'JP', 'KR', 'AU', 'NZ', 'MY', 'TH', 'ID', 'PH', 'VN', 'TW', 'HK', 'IN', 'CN'];
            if (euCountries.includes(clientCountry)) {
                return activeRegions.find(r => r.id === 'eu-west') || activeRegions[0];
            }
            if (apacCountries.includes(clientCountry)) {
                return activeRegions.find(r => r.id === 'ap-southeast') || activeRegions[0];
            }
        }
        // Default to US East (primary region)
        return activeRegions.find(r => r.features.primary_region) || activeRegions[0];
    }
    async checkRegionHealth(region) {
        try {
            // Check database connectivity
            const dbUrl = process.env[region.postgres_url_env];
            if (!dbUrl) {
                return false;
            }
            // Simple connection test (implement actual DB ping in real deployment)
            // For now, we assume healthy if the URL is configured
            return true;
        }
        catch (error) {
            console.error(`Health check failed for region ${region.id}:`, error);
            return false;
        }
    }
    getTenantRegion(tenantId) {
        // This would typically query the database to get tenant configuration
        // For now, return a mock configuration
        // In real implementation, this should query the tenants table
        return {
            dataResidencyRegion: undefined, // Allow any region by default
            requiresGDPR: false // Determine based on tenant settings
        };
    }
    startHealthChecks() {
        // Perform health checks every 30 seconds
        setInterval(async () => {
            await this.performHealthCheck();
        }, 30000);
    }
}
export default RegionService;
export const regionService = RegionService.getInstance();
// Express middleware for region routing
export function regionMiddleware(req, res, next) {
    const startTime = Date.now();
    try {
        const targetRegion = regionService.routeToNearestRegion(req, res);
        if (!targetRegion) {
            // Request was replayed to another region
            return;
        }
        // Store region info in request for downstream use
        req.region = targetRegion;
        // Continue to next middleware
        res.on('finish', () => {
            const latency = Date.now() - startTime;
            const isError = res.statusCode >= 400;
            regionService.recordRequest(targetRegion, latency, isError);
        });
        next();
    }
    catch (error) {
        console.error('Region middleware error:', error);
        next(error);
    }
}
//# sourceMappingURL=regionService.js.map