/**
 * Object Storage Artifact Adapter (Stage 6 Production Backend)
 *
 * S3-compatible storage for production artifact serving.
 * Supports AWS S3, Cloudflare R2, Backblaze B2, MinIO, etc.
 *
 * Configuration via environment variables:
 * - AWS_S3_BUCKET (required)
 * - AWS_REGION (default: us-east-1)
 * - AWS_ACCESS_KEY_ID (required)
 * - AWS_SECRET_ACCESS_KEY (required)
 * - AWS_ENDPOINT_URL (optional, for S3-compatible providers)
 */
import { S3Client } from '@aws-sdk/client-s3';
/**
 * Initialize S3 client
 */
export declare function initializeS3(): S3Client;
/**
 * Get S3 client
 */
export declare function getS3Client(): S3Client;
/**
 * Get S3 bucket name from environment
 */
export declare function getS3Bucket(): string;
/**
 * Write artifact to S3
 */
export declare function writeArtifactToS3(artifactId: string, content: Buffer | string, contentType?: string): Promise<string>;
/**
 * Read artifact from S3
 *
 * Returns artifact content as Buffer.
 * For large files, consider using getPresignedDownloadUrl() instead.
 */
export declare function readArtifactFromS3(artifactId: string): Promise<Buffer | null>;
/**
 * Check if artifact exists in S3
 */
export declare function artifactExistsInS3(artifactId: string): Promise<boolean>;
/**
 * Delete artifact from S3
 */
export declare function deleteArtifactFromS3(artifactId: string): Promise<boolean>;
/**
 * Get artifact metadata from S3 (size, content type, last modified)
 */
export declare function getArtifactMetadataFromS3(artifactId: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
} | null>;
/**
 * Generate pre-signed URL for artifact download
 *
 * Recommended for production serving instead of readArtifactFromS3().
 * Allows direct browser download without proxying through runtime.
 *
 * @param artifactId - Artifact identifier
 * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
 */
export declare function getPresignedDownloadUrl(artifactId: string, expiresIn?: number): Promise<string>;
/**
 * Generate pre-signed URL for artifact upload
 *
 * Allows client-side direct upload to S3 without proxying through runtime.
 * Useful for large artifacts or frontend file uploads.
 *
 * @param artifactId - Artifact identifier
 * @param expiresIn - URL expiration in seconds (default: 900 = 15 minutes)
 */
export declare function getPresignedUploadUrl(artifactId: string, contentType?: string, expiresIn?: number): Promise<string>;
/**
 * Health check for S3 connectivity
 */
export declare function checkS3Health(): Promise<boolean>;
//# sourceMappingURL=object-storage.d.ts.map