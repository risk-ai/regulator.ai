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
import * as fs from 'fs/promises';
import * as path from 'path';
export class WorkspaceResolver {
    constructor(workspace) {
        this.fileIndex = new Map(); // filename → [paths]
        this.lastIndexed = 0;
        this.indexTTL = 30000; // 30 seconds
        this.workspace = workspace || process.env.OPENCLAW_WORKSPACE || path.join(process.env.HOME || '~', '.openclaw', 'workspace');
    }
    /**
     * Resolve file reference to workspace path
     */
    async resolve(query) {
        // Ensure fresh index
        await this.refreshIndex();
        // Strategy 1: Exact relative path match
        const exactPath = path.resolve(this.workspace, query);
        if (exactPath.startsWith(this.workspace)) {
            try {
                await fs.access(exactPath);
                const stats = await fs.stat(exactPath);
                if (stats.isFile()) {
                    return {
                        status: 'resolved',
                        fileName: path.basename(exactPath),
                        path: exactPath,
                        relativePath: path.relative(this.workspace, exactPath),
                    };
                }
            }
            catch {
                // Not an exact path, continue to other strategies
            }
        }
        // Strategy 2: Exact filename match
        const normalizedQuery = query.toLowerCase();
        const matches = [];
        for (const [fileName, paths] of this.fileIndex.entries()) {
            // Exact filename match (case-insensitive)
            if (fileName.toLowerCase() === normalizedQuery) {
                for (const filePath of paths) {
                    matches.push({
                        fileName,
                        path: filePath,
                        relativePath: path.relative(this.workspace, filePath),
                    });
                }
            }
        }
        // If exact matches found, return them
        if (matches.length === 1) {
            return {
                status: 'resolved',
                ...matches[0],
            };
        }
        if (matches.length > 1) {
            return {
                status: 'ambiguous',
                query,
                matches,
            };
        }
        // Strategy 3: Basename fuzzy match
        for (const [fileName, paths] of this.fileIndex.entries()) {
            const fileNameLower = fileName.toLowerCase();
            // Contains query
            if (fileNameLower.includes(normalizedQuery)) {
                for (const filePath of paths) {
                    matches.push({
                        fileName,
                        path: filePath,
                        relativePath: path.relative(this.workspace, filePath),
                    });
                }
            }
        }
        // Limit fuzzy matches to top 10
        if (matches.length === 1) {
            return {
                status: 'resolved',
                ...matches[0],
            };
        }
        if (matches.length > 1) {
            return {
                status: 'ambiguous',
                query,
                matches: matches.slice(0, 10),
            };
        }
        // Strategy 4: Not found
        return {
            status: 'not_found',
            query,
            searchedPaths: [this.workspace],
        };
    }
    /**
     * Refresh file index if stale
     */
    async refreshIndex() {
        const now = Date.now();
        if (now - this.lastIndexed < this.indexTTL) {
            return; // Index still fresh
        }
        this.fileIndex.clear();
        await this.indexDirectory(this.workspace);
        this.lastIndexed = now;
    }
    /**
     * Recursively index directory
     */
    async indexDirectory(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                // Skip common ignore patterns
                if (this.shouldIgnore(entry.name)) {
                    continue;
                }
                const entryPath = path.join(dir, entry.name);
                if (entry.isFile()) {
                    // Add to index
                    const fileName = entry.name;
                    if (!this.fileIndex.has(fileName)) {
                        this.fileIndex.set(fileName, []);
                    }
                    this.fileIndex.get(fileName).push(entryPath);
                }
                else if (entry.isDirectory()) {
                    // Recurse
                    await this.indexDirectory(entryPath);
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
            console.warn(`[WorkspaceResolver] Failed to index ${dir}:`, error instanceof Error ? error.message : error);
        }
    }
    /**
     * Check if file/directory should be ignored
     */
    shouldIgnore(name) {
        const ignorePatterns = [
            'node_modules',
            '.git',
            '.next',
            '.cache',
            'dist',
            'build',
            '.DS_Store',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            '.nyc_output',
        ];
        return ignorePatterns.includes(name);
    }
    /**
     * Get workspace stats (for debugging)
     */
    async getStats() {
        await this.refreshIndex();
        let totalFiles = 0;
        let duplicateFilenames = 0;
        for (const paths of this.fileIndex.values()) {
            totalFiles += paths.length;
            if (paths.length > 1) {
                duplicateFilenames++;
            }
        }
        return {
            totalFiles,
            uniqueFilenames: this.fileIndex.size,
            duplicateFilenames,
        };
    }
}
