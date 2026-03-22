export class OutputPathResolver {
    constructor(workspace: any);
    workspace: any;
    reservations: Map<any, any>;
    reservationTimeoutMs: number;
    /**
     * Resolve collision-safe output path
     *
     * @param {object} params
     * @param {string} params.sourcePath - Original source file/folder path
     * @param {string} params.purpose - Output purpose: 'summary' | 'aggregate-summary' | 'report'
     * @param {string} params.objectiveId - Objective ID for reservation tracking
     * @param {string} params.envelopeId - Envelope ID for reservation tracking
     * @returns {Promise<ResolvedOutputPath>}
     */
    resolveOutputPath({ sourcePath, purpose, objectiveId, envelopeId }: {
        sourcePath: string;
        purpose: string;
        objectiveId: string;
        envelopeId: string;
    }): Promise<ResolvedOutputPath>;
    /**
     * Derive canonical output name based on source and purpose
     */
    deriveCanonicalPath(sourcePath: any, purpose: any): string;
    /**
     * Find available path by checking existence and reservations
     *
     * Returns canonical path if available, otherwise appends numeric suffix
     */
    findAvailablePath(canonical: any): Promise<any>;
    /**
     * Check if path is taken (exists on filesystem OR reserved in memory)
     */
    isPathTaken(targetPath: any): Promise<boolean>;
    /**
     * Append numeric suffix to path
     *
     * file.summary.md → file.summary-2.md
     */
    appendSuffix(targetPath: any, suffix: any): string;
    /**
     * Extract collision index from path
     *
     * file.summary.md → 0 (no collision)
     * file.summary-2.md → 2
     */
    extractCollisionIndex(targetPath: any): number;
    /**
     * Reserve path in memory
     */
    reservePath(targetPath: any, objectiveId: any, envelopeId: any): Promise<void>;
    /**
     * Release path reservation
     */
    releasePath(targetPath: any): Promise<boolean>;
    /**
     * Clean up expired reservations
     */
    cleanupExpiredReservations(): number;
    /**
     * Resolve relative path to full filesystem path
     */
    resolveFullPath(relativePath: any): string;
}
//# sourceMappingURL=output-path-resolver.d.ts.map