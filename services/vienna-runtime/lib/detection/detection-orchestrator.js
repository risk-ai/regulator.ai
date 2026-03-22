/**
 * Detection Orchestrator — Phase 15 Stage 6
 * 
 * Coordinates full detection → objective → proposal flow.
 */

const { DetectorRegistry } = require('./detector-framework.js');
const { ObjectiveDeclarationEngine } = require('./objective-declaration.js');
const { IntentProposalEngine } = require('./intent-proposal-engine.js');

class DetectionOrchestrator {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
    this.detectorRegistry = new DetectorRegistry();
    this.objectiveDeclaration = new ObjectiveDeclarationEngine(stateGraph);
    this.intentProposal = new IntentProposalEngine(stateGraph);
  }

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
  async runDetectionCycle() {
    console.log('[DetectionOrchestrator] Starting detection cycle');

    const startTime = Date.now();

    // Step 1: Run all detectors
    const anomalyCandidates = await this.detectorRegistry.runAll();
    console.log(`[DetectionOrchestrator] Detected ${anomalyCandidates.length} anomaly candidates`);

    // Step 2: Persist anomalies (with deduplication)
    const persistedAnomalies = [];
    for (const candidate of anomalyCandidates) {
      // Check for duplicate (same entity + type + status=new within last hour)
      const duplicate = await this.findDuplicateAnomaly(candidate);
      if (duplicate) {
        console.log(`[DetectionOrchestrator] Skipping duplicate anomaly for ${candidate.entity_id}`);
        continue;
      }

      const persisted = this.stateGraph.createAnomaly(candidate);
      persistedAnomalies.push(persisted);
    }
    console.log(`[DetectionOrchestrator] Persisted ${persistedAnomalies.length} anomalies (${anomalyCandidates.length - persistedAnomalies.length} duplicates skipped)`);

    // Step 3: Declare objectives from anomalies
    const objectives = [];
    for (const anomaly of persistedAnomalies) {
      if (await this.shouldDeclareObjective(anomaly)) {
        const objective = await this.objectiveDeclaration.declareFromAnomaly(anomaly);
        if (objective) {
          objectives.push(objective);
        }
      }
    }
    console.log(`[DetectionOrchestrator] Declared ${objectives.length} objectives`);

    // Step 4: Generate proposals from objectives
    const proposals = [];
    for (const objective of objectives) {
      if (await this.shouldProposeIntent(objective)) {
        const proposal = await this.intentProposal.proposeFromObjective(objective);
        if (proposal) {
          proposals.push(proposal);
        }
      }
    }
    console.log(`[DetectionOrchestrator] Created ${proposals.length} proposals`);

    // Step 5: Record summary event
    const duration = Date.now() - startTime;
    this.recordCycleEvent('detection_cycle_completed', {
      anomalies_detected: anomalyCandidates.length,
      anomalies_persisted: persistedAnomalies.length,
      objectives_declared: objectives.length,
      proposals_created: proposals.length,
      duration_ms: duration
    });

    console.log(`[DetectionOrchestrator] Detection cycle complete in ${duration}ms`);

    return {
      anomalies: persistedAnomalies,
      objectives,
      proposals,
      duration_ms: duration,
      summary: {
        detected: anomalyCandidates.length,
        persisted: persistedAnomalies.length,
        objectives: objectives.length,
        proposals: proposals.length
      }
    };
  }

  /**
   * Find duplicate anomaly
   * 
   * @param {object} candidate - Anomaly candidate
   * @returns {Promise<object|null>} - Existing anomaly or null
   */
  async findDuplicateAnomaly(candidate) {
    if (!candidate.entity_id) return null;

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const existing = this.stateGraph.listAnomalies({
      anomaly_type: candidate.anomaly_type,
      entity_type: candidate.entity_type,
      entity_id: candidate.entity_id,
      status: 'new',
      detected_after: oneHourAgo,
      limit: 1
    });

    return existing[0] || null;
  }

  /**
   * Should declare objective from anomaly?
   * 
   * @param {object} anomaly - Anomaly object
   * @returns {Promise<boolean>}
   */
  async shouldDeclareObjective(anomaly) {
    // Don't declare if anomaly is low severity
    if (anomaly.severity === 'low') {
      return false;
    }

    // Don't declare if already has objective
    try {
      const existing = this.stateGraph.query(`
        SELECT * FROM managed_objectives
        WHERE json_extract(metadata, '$.declared_from_anomaly') = ?
        LIMIT 1
      `, [anomaly.anomaly_id]);
      return existing.length === 0;
    } catch (error) {
      // Table may not exist (Phase 9 not deployed)
      console.log('[DetectionOrchestrator] managed_objectives table not found, skipping objective check');
      return false;  // Don't declare if table doesn't exist
    }
  }

  /**
   * Should propose intent from objective?
   * 
   * @param {object} objective - Objective object
   * @returns {Promise<boolean>}
   */
  async shouldProposeIntent(objective) {
    // Don't propose if already has pending proposal
    const existing = this.stateGraph.listProposals({
      objective_id: objective.objective_id,
      status: 'pending',
      limit: 1
    });

    return existing.length === 0;
  }

  /**
   * Register detector
   * 
   * @param {Detector} detector - Detector instance
   */
  registerDetector(detector) {
    this.detectorRegistry.register(detector);
  }

  /**
   * Unregister detector
   * 
   * @param {string} name - Detector name
   */
  unregisterDetector(name) {
    this.detectorRegistry.unregister(name);
  }

  /**
   * Get detector registry stats
   * 
   * @returns {object} - Registry statistics
   */
  getDetectorStats() {
    return this.detectorRegistry.getStats();
  }

  /**
   * Record cycle event
   * 
   * @param {string} event_type - Event type
   * @param {object} event_data - Event data
   */
  recordCycleEvent(event_type, event_data) {
    // Record to runtime_context or similar
    // For now, just log
    console.log(`[DetectionOrchestrator] Event: ${event_type}`, event_data);
  }
}

module.exports = DetectionOrchestrator;
