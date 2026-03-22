/**
 * Filesystem Artifact Storage Adapter
 *
 * Development-ready local storage for artifacts.
 * Production will migrate to S3/Vercel Blob.
 */
import fs from 'fs';
/**
 * Ensure artifacts directory exists
 */
export declare function ensureArtifactsDir(): void;
/**
 * Write artifact content to filesystem
 */
export declare function writeArtifact(artifactId: string, content: Buffer | string): string;
/**
 * Read artifact content from filesystem
 */
export declare function readArtifact(artifactId: string): Buffer | null;
/**
 * Check if artifact exists
 */
export declare function artifactExists(artifactId: string): boolean;
/**
 * Delete artifact from filesystem
 */
export declare function deleteArtifact(artifactId: string): boolean;
/**
 * Get artifact file stats
 */
export declare function getArtifactStats(artifactId: string): fs.Stats | null;
//# sourceMappingURL=filesystem.d.ts.map