export = ConfigSnapshot;
declare class ConfigSnapshot {
    constructor(snapshotDir?: string);
    snapshotDir: string;
    /**
     * Create snapshot of config file before mutation
     *
     * @param {string} configPath - Path to config file
     * @param {string} envelopeId - Envelope performing mutation
     * @returns {Promise<object>} Snapshot metadata
     */
    capture(configPath: string, envelopeId: string): Promise<object>;
    /**
     * Restore config from snapshot
     *
     * @param {string} snapshotId - Snapshot to restore
     * @returns {Promise<object>} Restored config metadata
     */
    restore(snapshotId: string): Promise<object>;
    /**
     * List snapshots for config path
     *
     * @param {string} configPath - Config file path
     * @param {number} limit - Max snapshots to return
     * @returns {Promise<Array>} Snapshot metadata list
     */
    list(configPath: string, limit?: number): Promise<any[]>;
    /**
     * Clean old snapshots
     *
     * @param {number} daysOld - Delete snapshots older than this
     * @returns {Promise<number>} Number of snapshots deleted
     */
    cleanOld(daysOld?: number): Promise<number>;
    /**
     * Generate snapshot ID
     */
    _generateSnapshotId(configPath: any, timestamp: any): string;
    /**
     * Compute content hash
     */
    _computeHash(content: any): string;
}
//# sourceMappingURL=config-snapshot.d.ts.map