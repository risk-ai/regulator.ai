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

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client
 */
export function initializeS3(): S3Client {
  if (s3Client) return s3Client;

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable required for S3 storage');
  }

  const region = process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.AWS_ENDPOINT_URL; // For S3-compatible providers

  s3Client = new S3Client({
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
export function getS3Client(): S3Client {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Call initializeS3() first.');
  }
  return s3Client;
}

/**
 * Get S3 bucket name from environment
 */
export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable required');
  }
  return bucket;
}

/**
 * Write artifact to S3
 */
export async function writeArtifactToS3(
  artifactId: string,
  content: Buffer | string,
  contentType?: string
): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  const command = new PutObjectCommand({
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
export async function readArtifactFromS3(artifactId: string): Promise<Buffer | null> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return null;
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if artifact exists in S3
 */
export async function artifactExistsInS3(artifactId: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

/**
 * Delete artifact from S3
 */
export async function deleteArtifactFromS3(artifactId: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    console.log(`[Artifact Storage] Deleted ${key} from S3 bucket ${bucket}`);
    return true;
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

/**
 * Get artifact metadata from S3 (size, content type, last modified)
 */
export async function getArtifactMetadataFromS3(artifactId: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
} | null> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  } catch (error: any) {
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
export async function getPresignedDownloadUrl(
  artifactId: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

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
export async function getPresignedUploadUrl(
  artifactId: string,
  contentType?: string,
  expiresIn: number = 900
): Promise<string> {
  const client = getS3Client();
  const bucket = getS3Bucket();
  const key = `artifacts/${artifactId}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  const url = await getSignedUrl(client, command, { expiresIn });

  return url;
}

/**
 * Health check for S3 connectivity
 */
export async function checkS3Health(): Promise<boolean> {
  try {
    const client = getS3Client();
    const bucket = getS3Bucket();

    // Simple check: list objects with max 1 result
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: 'healthcheck', // Non-existent key is fine, we just want to test connectivity
    });

    await client.send(command);
    return true;
  } catch (error: any) {
    // NoSuchKey is expected and means S3 is reachable
    if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
      return true;
    }
    console.error('[Artifact Storage] S3 health check failed', error);
    return false;
  }
}
