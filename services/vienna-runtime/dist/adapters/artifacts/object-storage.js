"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeS3 = initializeS3;
exports.getS3Client = getS3Client;
exports.getS3Bucket = getS3Bucket;
exports.writeArtifactToS3 = writeArtifactToS3;
exports.readArtifactFromS3 = readArtifactFromS3;
exports.artifactExistsInS3 = artifactExistsInS3;
exports.deleteArtifactFromS3 = deleteArtifactFromS3;
exports.getArtifactMetadataFromS3 = getArtifactMetadataFromS3;
exports.getPresignedDownloadUrl = getPresignedDownloadUrl;
exports.getPresignedUploadUrl = getPresignedUploadUrl;
exports.checkS3Health = checkS3Health;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let s3Client = null;
/**
 * Initialize S3 client
 */
function initializeS3() {
    if (s3Client)
        return s3Client;
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
        throw new Error('AWS_S3_BUCKET environment variable required for S3 storage');
    }
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT_URL; // For S3-compatible providers
    s3Client = new client_s3_1.S3Client({
        region,
        ...(endpoint && { endpoint }),
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
    console.log(`[Artifact Storage] Initialized S3 client (region: ${region}, bucket: ${bucket})`);
    return s3Client;
}
/**
 * Get S3 client
 */
function getS3Client() {
    if (!s3Client) {
        throw new Error('S3 client not initialized. Call initializeS3() first.');
    }
    return s3Client;
}
/**
 * Get S3 bucket name from environment
 */
function getS3Bucket() {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
        throw new Error('AWS_S3_BUCKET environment variable required');
    }
    return bucket;
}
/**
 * Write artifact to S3
 */
async function writeArtifactToS3(artifactId, content, contentType) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: typeof content === 'string' ? Buffer.from(content) : content,
        ContentType: contentType || 'application/octet-stream',
    });
    await client.send(command);
    console.log(`[Artifact Storage] Uploaded ${key} to S3 bucket ${bucket}`);
    return `s3://${bucket}/${key}`;
}
/**
 * Read artifact from S3
 *
 * Returns artifact content as Buffer.
 * For large files, consider using getPresignedDownloadUrl() instead.
 */
async function readArtifactFromS3(artifactId) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const response = await client.send(command);
        if (!response.Body) {
            return null;
        }
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    catch (error) {
        if (error.name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
}
/**
 * Check if artifact exists in S3
 */
async function artifactExistsInS3(artifactId) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    try {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        await client.send(command);
        return true;
    }
    catch (error) {
        if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
            return false;
        }
        throw error;
    }
}
/**
 * Delete artifact from S3
 */
async function deleteArtifactFromS3(artifactId) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    try {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        await client.send(command);
        console.log(`[Artifact Storage] Deleted ${key} from S3 bucket ${bucket}`);
        return true;
    }
    catch (error) {
        if (error.name === 'NoSuchKey') {
            return false;
        }
        throw error;
    }
}
/**
 * Get artifact metadata from S3 (size, content type, last modified)
 */
async function getArtifactMetadataFromS3(artifactId) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    try {
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const response = await client.send(command);
        return {
            size: response.ContentLength || 0,
            contentType: response.ContentType || 'application/octet-stream',
            lastModified: response.LastModified || new Date(),
        };
    }
    catch (error) {
        if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
            return null;
        }
        throw error;
    }
}
/**
 * Generate pre-signed URL for artifact download
 *
 * Recommended for production serving instead of readArtifactFromS3().
 * Allows direct browser download without proxying through runtime.
 *
 * @param artifactId - Artifact identifier
 * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
 */
async function getPresignedDownloadUrl(artifactId, expiresIn = 3600) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
    return url;
}
/**
 * Generate pre-signed URL for artifact upload
 *
 * Allows client-side direct upload to S3 without proxying through runtime.
 * Useful for large artifacts or frontend file uploads.
 *
 * @param artifactId - Artifact identifier
 * @param expiresIn - URL expiration in seconds (default: 900 = 15 minutes)
 */
async function getPresignedUploadUrl(artifactId, contentType, expiresIn = 900) {
    const client = getS3Client();
    const bucket = getS3Bucket();
    const key = `artifacts/${artifactId}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType || 'application/octet-stream',
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
    return url;
}
/**
 * Health check for S3 connectivity
 */
async function checkS3Health() {
    try {
        const client = getS3Client();
        const bucket = getS3Bucket();
        // Simple check: list objects with max 1 result
        const command = new client_s3_1.HeadObjectCommand({
            Bucket: bucket,
            Key: 'healthcheck', // Non-existent key is fine, we just want to test connectivity
        });
        await client.send(command);
        return true;
    }
    catch (error) {
        // NoSuchKey is expected and means S3 is reachable
        if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
            return true;
        }
        console.error('[Artifact Storage] S3 health check failed', error);
        return false;
    }
}
//# sourceMappingURL=object-storage.js.map