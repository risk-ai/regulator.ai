/**
 * Output Path Resolver
 * 
 * Phase 3A: Output collision safety
 * 
 * RESPONSIBILITIES:
 * - Derive canonical output names from source paths
 * - Detect path collisions
 * - Generate collision-safe variants with numeric suffixes
 * - Reserve paths during concurrent execution
 * - Release reservations after success/failure
 * 
 * DESIGN:
 * - Deterministic naming (no random UUIDs)
 * - Numeric suffix collision handling: file.summary.md → file.summary-2.md
 * - In-memory reservation map for concurrent safety
 * - Preserves file extensions where sensible
 */

const fs = require('fs/promises');
const path = require('path');

class OutputPathResolver {
  constructor(workspace) {
    this.workspace = workspace || path.join(process.env.HOME || '~', '.openclaw', 'workspace');
    
    // In-memory reservation map: path → { objectiveId, envelopeId, expiresAt }
    this.reservations = new Map();
    
    // Default reservation timeout: 5 minutes
    this.reservationTimeoutMs = 5 * 60 * 1000;
  }
  
  /**
   * Resolve collision-safe output path
   * 
   * @param {object} params
   * @param {string} params.sourcePath - Original source file/folder path
   * @param {string} params.purpose - Output purpose: 'summary' | 'aggregate-summary' | 'report'
   * @param {string} params.objectiveId - Objective ID for reservation tracking
   * @param {string} params.envelopeId - Envelope ID for reservation tracking
   * @returns {Promise<ResolvedOutputPath>}
   */
  async resolveOutputPath({ sourcePath, purpose, objectiveId, envelopeId }) {
    // Derive canonical output path
    const canonical = this.deriveCanonicalPath(sourcePath, purpose);
    
    // Check for collision
    const finalPath = await this.findAvailablePath(canonical);
    
    // Determine if collision occurred
    const collided = (canonical !== finalPath);
    const collisionIndex = this.extractCollisionIndex(finalPath);
    
    // Reserve the chosen path
    await this.reservePath(finalPath, objectiveId, envelopeId);
    
    return {
      requestedPath: canonical,
      finalPath,
      collided,
      collisionIndex,
    };
  }
  
  /**
   * Derive canonical output name based on source and purpose
   */
  deriveCanonicalPath(sourcePath, purpose) {
    const ext = path.extname(sourcePath);
    const base = path.basename(sourcePath, ext);
    const dir = path.dirname(sourcePath);
    
    switch (purpose) {
      case 'summary':
        // file.md → file.summary.md
        return path.join(dir, `${base}.summary${ext}`);
        
      case 'aggregate-summary':
        // /folder → /folder/_folder-summary.md
        return path.join(sourcePath, '_folder-summary.md');
        
      case 'report':
        // file.md → file.report.md
        return path.join(dir, `${base}.report${ext}`);
        
      default:
        throw new Error(`Unknown output purpose: ${purpose}`);
    }
  }
  
  /**
   * Find available path by checking existence and reservations
   * 
   * Returns canonical path if available, otherwise appends numeric suffix
   */
  async findAvailablePath(canonical) {
    let candidate = canonical;
    let suffix = 2;
    
    while (await this.isPathTaken(candidate)) {
      candidate = this.appendSuffix(canonical, suffix);
      suffix++;
      
      // Safety: prevent infinite loop
      if (suffix > 1000) {
        throw new Error(`Too many collisions for path: ${canonical}`);
      }
    }
    
    return candidate;
  }
  
  /**
   * Check if path is taken (exists on filesystem OR reserved in memory)
   */
  async isPathTaken(targetPath) {
    // Check filesystem existence
    const fullPath = this.resolveFullPath(targetPath);
    
    try {
      await fs.access(fullPath);
      return true; // Path exists
    } catch (err) {
      // Path does not exist, check reservations
    }
    
    // Check reservation map
    const reservation = this.reservations.get(targetPath);
    
    if (!reservation) {
      return false; // Not reserved
    }
    
    // Check if reservation expired
    if (Date.now() > reservation.expiresAt) {
      this.reservations.delete(targetPath);
      return false; // Expired reservation
    }
    
    return true; // Active reservation
  }
  
  /**
   * Append numeric suffix to path
   * 
   * file.summary.md → file.summary-2.md
   */
  appendSuffix(targetPath, suffix) {
    const ext = path.extname(targetPath);
    const base = path.basename(targetPath, ext);
    const dir = path.dirname(targetPath);
    
    return path.join(dir, `${base}-${suffix}${ext}`);
  }
  
  /**
   * Extract collision index from path
   * 
   * file.summary.md → 0 (no collision)
   * file.summary-2.md → 2
   */
  extractCollisionIndex(targetPath) {
    const base = path.basename(targetPath, path.extname(targetPath));
    const match = base.match(/-(\d+)$/);
    
    return match ? parseInt(match[1], 10) : 0;
  }
  
  /**
   * Reserve path in memory
   */
  async reservePath(targetPath, objectiveId, envelopeId) {
    const expiresAt = Date.now() + this.reservationTimeoutMs;
    
    this.reservations.set(targetPath, {
      objectiveId,
      envelopeId,
      expiresAt,
    });
    
    console.log('[OutputPathResolver] Reserved:', targetPath, { objectiveId, envelopeId });
  }
  
  /**
   * Release path reservation
   */
  async releasePath(targetPath) {
    const deleted = this.reservations.delete(targetPath);
    
    if (deleted) {
      console.log('[OutputPathResolver] Released:', targetPath);
    }
    
    return deleted;
  }
  
  /**
   * Clean up expired reservations
   */
  cleanupExpiredReservations() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [targetPath, reservation] of this.reservations.entries()) {
      if (now > reservation.expiresAt) {
        this.reservations.delete(targetPath);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log('[OutputPathResolver] Cleaned up expired reservations:', cleaned);
    }
    
    return cleaned;
  }
  
  /**
   * Resolve relative path to full filesystem path
   */
  resolveFullPath(relativePath) {
    return path.resolve(this.workspace, relativePath.replace(/^\//, ''));
  }
}

module.exports = { OutputPathResolver };
