/**
 * Detector Framework — Phase 15 Stage 2
 *
 * Base detector interface and registry for anomaly detection.
 *
 * Core Invariant: Detectors observe only. They cannot execute.
 */
const { createAnomaly } = require('../core/anomaly-schema.js');
/**
 * Base Detector Class
 *
 * All detectors must extend this class and implement detect().
 */
class Detector {
    constructor(name, config = {}) {
        this.name = name;
        this.config = {
            threshold: 0.7, // Minimum confidence to emit anomaly
            enabled: true,
            ...config
        };
    }
    /**
     * Detect anomalies
     *
     * Must be implemented by subclasses.
     * Should return array of anomaly candidates (not yet persisted).
     *
     * @returns {Promise<Array>} - Array of anomaly objects
     */
    async detect() {
        throw new Error(`Detector ${this.name} must implement detect()`);
    }
    /**
     * Run detection with filtering
     *
     * @returns {Promise<Array>} - Filtered anomaly candidates
     */
    async run() {
        if (!this.config.enabled) {
            return [];
        }
        const candidates = await this.detect();
        // Filter by confidence threshold
        return candidates.filter(c => c.confidence >= this.config.threshold);
    }
    /**
     * Create anomaly candidate
     *
     * Helper for building anomaly objects in detect() implementations.
     *
     * @param {object} data - Anomaly data
     * @returns {object} - Valid anomaly object (not yet persisted)
     */
    createCandidate(data) {
        return createAnomaly({
            source: this.name,
            ...data
        });
    }
}
/**
 * Detector Registry
 *
 * Manages collection of detectors and coordinates batch detection.
 */
class DetectorRegistry {
    constructor() {
        this.detectors = new Map();
    }
    /**
     * Register detector
     *
     * @param {Detector} detector - Detector instance
     */
    register(detector) {
        if (!(detector instanceof Detector)) {
            throw new Error('Must register Detector instance');
        }
        this.detectors.set(detector.name, detector);
    }
    /**
     * Unregister detector
     *
     * @param {string} name - Detector name
     */
    unregister(name) {
        this.detectors.delete(name);
    }
    /**
     * Get detector by name
     *
     * @param {string} name - Detector name
     * @returns {Detector|undefined} - Detector instance
     */
    get(name) {
        return this.detectors.get(name);
    }
    /**
     * List all registered detectors
     *
     * @returns {Array} - Array of detector names
     */
    list() {
        return Array.from(this.detectors.keys());
    }
    /**
     * Run all detectors
     *
     * @returns {Promise<Array>} - Combined anomaly candidates from all detectors
     */
    async runAll() {
        const results = [];
        for (const [name, detector] of this.detectors) {
            try {
                const anomalies = await detector.run();
                results.push(...anomalies);
            }
            catch (error) {
                console.error(`[DetectorRegistry] Detector ${name} failed:`, error.message);
                // Continue with other detectors even if one fails
            }
        }
        return results;
    }
    /**
     * Run specific detector
     *
     * @param {string} name - Detector name
     * @returns {Promise<Array>} - Anomaly candidates
     */
    async runOne(name) {
        const detector = this.detectors.get(name);
        if (!detector) {
            throw new Error(`Detector not found: ${name}`);
        }
        return await detector.run();
    }
    /**
     * Run detectors by type
     *
     * @param {string} anomalyType - Anomaly type filter
     * @returns {Promise<Array>} - Anomaly candidates
     */
    async runByType(anomalyType) {
        const results = [];
        for (const [name, detector] of this.detectors) {
            try {
                const anomalies = await detector.run();
                const filtered = anomalies.filter(a => a.anomaly_type === anomalyType);
                results.push(...filtered);
            }
            catch (error) {
                console.error(`[DetectorRegistry] Detector ${name} failed:`, error.message);
            }
        }
        return results;
    }
    /**
     * Get detector stats
     *
     * @returns {object} - Registry statistics
     */
    getStats() {
        return {
            total_detectors: this.detectors.size,
            enabled: Array.from(this.detectors.values()).filter(d => d.config.enabled).length,
            disabled: Array.from(this.detectors.values()).filter(d => !d.config.enabled).length,
            detectors: Array.from(this.detectors.entries()).map(([name, detector]) => ({
                name,
                enabled: detector.config.enabled,
                threshold: detector.config.threshold
            }))
        };
    }
}
module.exports = {
    Detector,
    DetectorRegistry
};
//# sourceMappingURL=detector-framework.js.map