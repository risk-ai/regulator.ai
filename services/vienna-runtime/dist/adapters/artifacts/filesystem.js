"use strict";
/**
 * Filesystem Artifact Storage Adapter
 *
 * Development-ready local storage for artifacts.
 * Production will migrate to S3/Vercel Blob.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureArtifactsDir = ensureArtifactsDir;
exports.writeArtifact = writeArtifact;
exports.readArtifact = readArtifact;
exports.artifactExists = artifactExists;
exports.deleteArtifact = deleteArtifact;
exports.getArtifactStats = getArtifactStats;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ARTIFACTS_DIR = path_1.default.join(__dirname, '../../../data/artifacts');
/**
 * Ensure artifacts directory exists
 */
function ensureArtifactsDir() {
    if (!fs_1.default.existsSync(ARTIFACTS_DIR)) {
        fs_1.default.mkdirSync(ARTIFACTS_DIR, { recursive: true });
        console.log(`[Artifact Storage] Created directory: ${ARTIFACTS_DIR}`);
    }
}
/**
 * Write artifact content to filesystem
 */
function writeArtifact(artifactId, content) {
    ensureArtifactsDir();
    const filePath = path_1.default.join(ARTIFACTS_DIR, artifactId);
    fs_1.default.writeFileSync(filePath, content);
    return filePath;
}
/**
 * Read artifact content from filesystem
 */
function readArtifact(artifactId) {
    const filePath = path_1.default.join(ARTIFACTS_DIR, artifactId);
    if (!fs_1.default.existsSync(filePath)) {
        return null;
    }
    return fs_1.default.readFileSync(filePath);
}
/**
 * Check if artifact exists
 */
function artifactExists(artifactId) {
    const filePath = path_1.default.join(ARTIFACTS_DIR, artifactId);
    return fs_1.default.existsSync(filePath);
}
/**
 * Delete artifact from filesystem
 */
function deleteArtifact(artifactId) {
    const filePath = path_1.default.join(ARTIFACTS_DIR, artifactId);
    if (!fs_1.default.existsSync(filePath)) {
        return false;
    }
    fs_1.default.unlinkSync(filePath);
    return true;
}
/**
 * Get artifact file stats
 */
function getArtifactStats(artifactId) {
    const filePath = path_1.default.join(ARTIFACTS_DIR, artifactId);
    if (!fs_1.default.existsSync(filePath)) {
        return null;
    }
    return fs_1.default.statSync(filePath);
}
//# sourceMappingURL=filesystem.js.map