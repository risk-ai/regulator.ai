/**
 * Base Detector Class
 *
 * All detectors must extend this class and implement detect().
 */
export class Detector {
    constructor(name: any, config?: {});
    name: any;
    config: {
        threshold: number;
        enabled: boolean;
    };
    /**
     * Detect anomalies
     *
     * Must be implemented by subclasses.
     * Should return array of anomaly candidates (not yet persisted).
     *
     * @returns {Promise<Array>} - Array of anomaly objects
     */
    detect(): Promise<any[]>;
    /**
     * Run detection with filtering
     *
     * @returns {Promise<Array>} - Filtered anomaly candidates
     */
    run(): Promise<any[]>;
    /**
     * Create anomaly candidate
     *
     * Helper for building anomaly objects in detect() implementations.
     *
     * @param {object} data - Anomaly data
     * @returns {object} - Valid anomaly object (not yet persisted)
     */
    createCandidate(data: object): object;
}
/**
 * Detector Registry
 *
 * Manages collection of detectors and coordinates batch detection.
 */
export class DetectorRegistry {
    detectors: Map<any, any>;
    /**
     * Register detector
     *
     * @param {Detector} detector - Detector instance
     */
    register(detector: Detector): void;
    /**
     * Unregister detector
     *
     * @param {string} name - Detector name
     */
    unregister(name: string): void;
    /**
     * Get detector by name
     *
     * @param {string} name - Detector name
     * @returns {Detector|undefined} - Detector instance
     */
    get(name: string): Detector | undefined;
    /**
     * List all registered detectors
     *
     * @returns {Array} - Array of detector names
     */
    list(): any[];
    /**
     * Run all detectors
     *
     * @returns {Promise<Array>} - Combined anomaly candidates from all detectors
     */
    runAll(): Promise<any[]>;
    /**
     * Run specific detector
     *
     * @param {string} name - Detector name
     * @returns {Promise<Array>} - Anomaly candidates
     */
    runOne(name: string): Promise<any[]>;
    /**
     * Run detectors by type
     *
     * @param {string} anomalyType - Anomaly type filter
     * @returns {Promise<Array>} - Anomaly candidates
     */
    runByType(anomalyType: string): Promise<any[]>;
    /**
     * Get detector stats
     *
     * @returns {object} - Registry statistics
     */
    getStats(): object;
}
//# sourceMappingURL=detector-framework.d.ts.map