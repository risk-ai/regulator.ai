/**
 * Filesystem Artifact Storage Adapter
 * 
 * Development-ready local storage for artifacts.
 * Production will migrate to S3/Vercel Blob.
 */

import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = path.join(__dirname, '../../../data/artifacts');

/**
 * Ensure artifacts directory exists
 */
export function ensureArtifactsDir(): void {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    console.log(`[Artifact Storage] Created directory: ${ARTIFACTS_DIR}`);
  }
}

/**
 * Write artifact content to filesystem
 */
export function writeArtifact(artifactId: string, content: Buffer | string): string {
  ensureArtifactsDir();
  
  const filePath = path.join(ARTIFACTS_DIR, artifactId);
  fs.writeFileSync(filePath, content);
  
  return filePath;
}

/**
 * Read artifact content from filesystem
 */
export function readArtifact(artifactId: string): Buffer | null {
  const filePath = path.join(ARTIFACTS_DIR, artifactId);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return fs.readFileSync(filePath);
}

/**
 * Check if artifact exists
 */
export function artifactExists(artifactId: string): boolean {
  const filePath = path.join(ARTIFACTS_DIR, artifactId);
  return fs.existsSync(filePath);
}

/**
 * Delete artifact from filesystem
 */
export function deleteArtifact(artifactId: string): boolean {
  const filePath = path.join(ARTIFACTS_DIR, artifactId);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  fs.unlinkSync(filePath);
  return true;
}

/**
 * Get artifact file stats
 */
export function getArtifactStats(artifactId: string): fs.Stats | null {
  const filePath = path.join(ARTIFACTS_DIR, artifactId);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return fs.statSync(filePath);
}
