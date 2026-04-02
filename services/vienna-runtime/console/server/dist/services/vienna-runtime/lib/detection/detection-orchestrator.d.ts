export = DetectionOrchestrator;
declare class DetectionOrchestrator {
    constructor(stateGraph: any);
    stateGraph: any;
    detectorRegistry: DetectorRegistry;
    objectiveDeclaration: ObjectiveDeclarationEngine;
    intentProposal: IntentProposalEngine;
    /**
     * Run full detection cycle
     *
     * Flow:
     * 1. Run all detectors → anomalies
     * 2. Persist anomalies
     * 3. Declare objectives from anomalies
     * 4. Generate proposals from objectives
     * 5. Record summary event
     *
     * @returns {Promise<object>} - Cycle results
     */
    runDetectionCycle(): Promise<object>;
    /**
     * Find duplicate anomaly
     *
     * @param {object} candidate - Anomaly candidate
     * @returns {Promise<object|null>} - Existing anomaly or null
     */
    findDuplicateAnomaly(candidate: object): Promise<object | null>;
    /**
     * Should declare objective from anomaly?
     *
     * @param {object} anomaly - Anomaly object
     * @returns {Promise<boolean>}
     */
    shouldDeclareObjective(anomaly: object): Promise<boolean>;
    /**
     * Should propose intent from objective?
     *
     * @param {object} objective - Objective object
     * @returns {Promise<boolean>}
     */
    shouldProposeIntent(objective: object): Promise<boolean>;
    /**
     * Register detector
     *
     * @param {Detector} detector - Detector instance
     */
    registerDetector(detector: Detector): void;
    /**
     * Unregister detector
     *
     * @param {string} name - Detector name
     */
    unregisterDetector(name: string): void;
    /**
     * Get detector registry stats
     *
     * @returns {object} - Registry statistics
     */
    getDetectorStats(): object;
    /**
     * Record cycle event
     *
     * @param {string} event_type - Event type
     * @param {object} event_data - Event data
     */
    recordCycleEvent(event_type: string, event_data: object): void;
}
import { DetectorRegistry } from "./detector-framework.js";
import { ObjectiveDeclarationEngine } from "./objective-declaration.js";
import { IntentProposalEngine } from "./intent-proposal-engine.js";
//# sourceMappingURL=detection-orchestrator.d.ts.map