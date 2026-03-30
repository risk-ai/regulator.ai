/**
 * Workspace File Resolver
 *
 * Resolves file references (names, paths, queries) to actual workspace paths.
 *
 * Resolution strategy:
 * 1. Exact relative path match (e.g., "src/server.ts")
 * 2. Exact filename match (e.g., "package-lock.json")
 * 3. Basename fuzzy match (e.g., "server" matches "src/server.ts")
 * 4. Disambiguation when multiple matches
 * 5. Not found when no matches
 */
export interface ResolvedFile {
    status: 'resolved';
    fileName: string;
    path: string;
    relativePath: string;
}
export interface AmbiguousFile {
    status: 'ambiguous';
    query: string;
    matches: Array<{
        fileName: string;
        path: string;
        relativePath: string;
    }>;
}
export interface NotFoundFile {
    status: 'not_found';
    query: string;
    searchedPaths: string[];
}
export type FileResolutionResult = ResolvedFile | AmbiguousFile | NotFoundFile;
export declare class WorkspaceResolver {
    private workspace;
    private fileIndex;
    private lastIndexed;
    private indexTTL;
    constructor(workspace?: string);
    /**
     * Resolve file reference to workspace path
     */
    resolve(query: string): Promise<FileResolutionResult>;
    /**
     * Refresh file index if stale
     */
    private refreshIndex;
    /**
     * Recursively index directory
     */
    private indexDirectory;
    /**
     * Check if file/directory should be ignored
     */
    private shouldIgnore;
    /**
     * Get workspace stats (for debugging)
     */
    getStats(): Promise<{
        totalFiles: number;
        uniqueFilenames: number;
        duplicateFilenames: number;
    }>;
}
//# sourceMappingURL=workspaceResolver.d.ts.map