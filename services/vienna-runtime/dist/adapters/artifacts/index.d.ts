/**
 * Unified Artifact Storage Interface (Stage 6)
 *
 * Automatic backend selection based on ARTIFACT_STORAGE_TYPE:
 * - ARTIFACT_STORAGE_TYPE=filesystem → Local filesystem (development)
 * - ARTIFACT_STORAGE_TYPE=s3 → S3-compatible object storage (production)
 *
 * This module provides a consistent interface regardless of backend.
 */
export type ArtifactBackend = 'filesystem' | 's3';
/**
 * Determine which artifact backend to use
 */
export declare function getArtifactBackend(): ArtifactBackend;
/**
 * Initialize artifact storage backend
 */
export declare function initializeArtifactStorage(): Promise<void>;
/**
 * Write artifact content
 */
export declare function writeArtifact(artifactId: string, content: Buffer | string, contentType?: string): Promise<string>;
/**
 * Read artifact content
 */
export declare function readArtifact(artifactId: string): Promise<Buffer | null>;
/**
 * Check if artifact exists
 */
export declare function artifactExists(artifactId: string): Promise<boolean>;
/**
 * Delete artifact
 */
export declare function deleteArtifact(artifactId: string): Promise<boolean>;
/**
 * Get artifact metadata (size, type, timestamps)
 */
export declare function getArtifactMetadata(artifactId: string): Promise<{
    size: number;
    contentType?: string;
    lastModified?: Date;
} | null>;
/**
 * Get pre-signed download URL (S3 only, throws for filesystem)
 *
 * For production serving, use this instead of readArtifact() to avoid
 * proxying large files through the runtime service.
 */
export declare function getDownloadUrl(artifactId: string, expiresIn?: number): Promise<string>;
/**
 * Health check for artifact storage
 */
export declare function checkArtifactStorageHealth(): Promise<boolean>;
/**
 * Get artifact storage info for observability
 */
export declare function getArtifactStorageInfo(): {
    backend: ArtifactBackend;
    configured: boolean;
    bucket?: string;
};
//# sourceMappingURL=index.d.ts.map