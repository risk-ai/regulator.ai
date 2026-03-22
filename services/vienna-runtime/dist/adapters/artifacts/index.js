"use strict";
/**
 * Unified Artifact Storage Interface (Stage 6)
 *
 * Automatic backend selection based on ARTIFACT_STORAGE_TYPE:
 * - ARTIFACT_STORAGE_TYPE=filesystem → Local filesystem (development)
 * - ARTIFACT_STORAGE_TYPE=s3 → S3-compatible object storage (production)
 *
 * This module provides a consistent interface regardless of backend.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifactBackend = getArtifactBackend;
exports.initializeArtifactStorage = initializeArtifactStorage;
exports.writeArtifact = writeArtifact;
exports.readArtifact = readArtifact;
exports.artifactExists = artifactExists;
exports.deleteArtifact = deleteArtifact;
exports.getArtifactMetadata = getArtifactMetadata;
exports.getDownloadUrl = getDownloadUrl;
exports.checkArtifactStorageHealth = checkArtifactStorageHealth;
exports.getArtifactStorageInfo = getArtifactStorageInfo;
const filesystem = __importStar(require("./filesystem"));
const objectStorage = __importStar(require("./object-storage"));
/**
 * Determine which artifact backend to use
 */
function getArtifactBackend() {
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
async function initializeArtifactStorage() {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        console.log('[Artifact Storage] Initializing S3 backend');
        objectStorage.initializeS3();
    }
    else {
        console.log('[Artifact Storage] Initializing filesystem backend');
        filesystem.ensureArtifactsDir();
    }
}
/**
 * Write artifact content
 */
async function writeArtifact(artifactId, content, contentType) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.writeArtifactToS3(artifactId, content, contentType);
    }
    else {
        return filesystem.writeArtifact(artifactId, content);
    }
}
/**
 * Read artifact content
 */
async function readArtifact(artifactId) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.readArtifactFromS3(artifactId);
    }
    else {
        return filesystem.readArtifact(artifactId);
    }
}
/**
 * Check if artifact exists
 */
async function artifactExists(artifactId) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.artifactExistsInS3(artifactId);
    }
    else {
        return filesystem.artifactExists(artifactId);
    }
}
/**
 * Delete artifact
 */
async function deleteArtifact(artifactId) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.deleteArtifactFromS3(artifactId);
    }
    else {
        return filesystem.deleteArtifact(artifactId);
    }
}
/**
 * Get artifact metadata (size, type, timestamps)
 */
async function getArtifactMetadata(artifactId) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.getArtifactMetadataFromS3(artifactId);
    }
    else {
        const stats = filesystem.getArtifactStats(artifactId);
        if (!stats)
            return null;
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
async function getDownloadUrl(artifactId, expiresIn) {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.getPresignedDownloadUrl(artifactId, expiresIn);
    }
    else {
        throw new Error('Pre-signed URLs not supported for filesystem backend');
    }
}
/**
 * Health check for artifact storage
 */
async function checkArtifactStorageHealth() {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return await objectStorage.checkS3Health();
    }
    else {
        try {
            filesystem.ensureArtifactsDir();
            return true;
        }
        catch (error) {
            console.error('[Artifact Storage] Filesystem health check failed', error);
            return false;
        }
    }
}
/**
 * Get artifact storage info for observability
 */
function getArtifactStorageInfo() {
    const backend = getArtifactBackend();
    if (backend === 's3') {
        return {
            backend: 's3',
            configured: Boolean(process.env.AWS_S3_BUCKET),
            bucket: process.env.AWS_S3_BUCKET,
        };
    }
    else {
        return {
            backend: 'filesystem',
            configured: true,
        };
    }
}
//# sourceMappingURL=index.js.map