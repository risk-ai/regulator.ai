export = OpenClawAdapter;
declare class OpenClawAdapter {
    constructor(config: any);
    workspace: any;
    warrantsDir: string;
    auditDir: string;
    truthDir: string;
    runtimeStateFile: string;
    /**
     * Initialize adapter (create directories)
     */
    init(): Promise<void>;
    /**
     * Save warrant to filesystem
     *
     * @param {object} warrant - Warrant object
     */
    saveWarrant(warrant: object): Promise<void>;
    /**
     * Load warrant from filesystem
     *
     * @param {string} warrantId - Warrant ID or change ID
     * @returns {Promise<object|null>} Warrant or null if not found
     */
    loadWarrant(warrantId: string): Promise<object | null>;
    /**
     * List all warrants
     *
     * @returns {Promise<Array>} All warrants
     */
    listWarrants(): Promise<any[]>;
    /**
     * Load truth snapshot
     *
     * @param {string} truthId - Truth snapshot ID
     * @returns {Promise<object>} Truth snapshot
     */
    loadTruthSnapshot(truthId: string): Promise<object>;
    /**
     * Load runtime state
     *
     * @returns {Promise<object>} Runtime state
     */
    loadRuntimeState(): Promise<object>;
    /**
     * Emit audit event
     *
     * @param {object} event - Audit event
     */
    emitAudit(event: object): Promise<void>;
    _fileExists(filepath: any): Promise<boolean>;
}
//# sourceMappingURL=openclaw.d.ts.map