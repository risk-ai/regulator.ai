/**
 * Unified Artifact Storage Interface (Stage 6)
 * 
 * Automatic backend selection based on ARTIFACT_STORAGE_TYPE:
 * - ARTIFACT_STORAGE_TYPE=filesystem → Local filesystem (development)
 * - ARTIFACT_STORAGE_TYPE=s3 → S3-compatible object storage (production)
 * 
 * This module provides a consistent interface regardless of backend.
 */

import * as filesystem from './filesystem';
import * as objectStorage from './object-storage';

export type ArtifactBackend = 'filesystem' | 's3';

/**
 * Determine which artifact backend to use
 */
export function getArtifactBackend(): ArtifactBackend {
  const type = process.env.ARTIFACT_STORAGE_TYPE?.toLowerCase();
  
  if (type === 's3') {
    return 's3';
  }
  
  // Default to filesystem for development
  return 'filesystem';
}

/**
 * Initialize artifact storage backend
 */
export async function initializeArtifactStorage(): Promise<void> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    console.log('[Artifact Storage] Initializing S3 backend');
    objectStorage.initializeS3();
  } else {
    console.log('[Artifact Storage] Initializing filesystem backend');
    filesystem.ensureArtifactsDir();
  }
}

/**
 * Write artifact content
 */
export async function writeArtifact(
  artifactId: string,
  content: Buffer | string,
  contentType?: string
): Promise<string> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.writeArtifactToS3(artifactId, content, contentType);
  } else {
    return filesystem.writeArtifact(artifactId, content);
  }
}

/**
 * Read artifact content
 */
export async function readArtifact(artifactId: string): Promise<Buffer | null> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.readArtifactFromS3(artifactId);
  } else {
    return filesystem.readArtifact(artifactId);
  }
}

/**
 * Check if artifact exists
 */
export async function artifactExists(artifactId: string): Promise<boolean> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.artifactExistsInS3(artifactId);
  } else {
    return filesystem.artifactExists(artifactId);
  }
}

/**
 * Delete artifact
 */
export async function deleteArtifact(artifactId: string): Promise<boolean> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.deleteArtifactFromS3(artifactId);
  } else {
    return filesystem.deleteArtifact(artifactId);
  }
}

/**
 * Get artifact metadata (size, type, timestamps)
 */
export async function getArtifactMetadata(artifactId: string): Promise<{
  size: number;
  contentType?: string;
  lastModified?: Date;
} | null> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.getArtifactMetadataFromS3(artifactId);
  } else {
    const stats = filesystem.getArtifactStats(artifactId);
    if (!stats) return null;
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
    };
  }
}

/**
 * Get pre-signed download URL (S3 only, throws for filesystem)
 * 
 * For production serving, use this instead of readArtifact() to avoid
 * proxying large files through the runtime service.
 */
export async function getDownloadUrl(artifactId: string, expiresIn?: number): Promise<string> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.getPresignedDownloadUrl(artifactId, expiresIn);
  } else {
    throw new Error('Pre-signed URLs not supported for filesystem backend');
  }
}

/**
 * Health check for artifact storage
 */
export async function checkArtifactStorageHealth(): Promise<boolean> {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return await objectStorage.checkS3Health();
  } else {
    try {
      filesystem.ensureArtifactsDir();
      return true;
    } catch (error) {
      console.error('[Artifact Storage] Filesystem health check failed', error);
      return false;
    }
  }
}

/**
 * Get artifact storage info for observability
 */
export function getArtifactStorageInfo(): {
  backend: ArtifactBackend;
  configured: boolean;
  bucket?: string;
} {
  const backend = getArtifactBackend();
  
  if (backend === 's3') {
    return {
      backend: 's3',
      configured: Boolean(process.env.AWS_S3_BUCKET),
      bucket: process.env.AWS_S3_BUCKET,
    };
  } else {
    return {
      backend: 'filesystem',
      configured: true,
    };
  }
}
