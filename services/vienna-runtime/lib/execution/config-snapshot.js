/**
 * Phase 7.4 Stage 5: Config Snapshot Protection
 * 
 * Purpose: Protect against bad configuration mutations by automatically snapshotting prior state.
 * 
 * Design:
 * - Captures deterministic snapshots before config mutations
 * - Stores timestamped backups
 * - Links snapshots to envelope_id for audit trail
 * - Blocks mutation if snapshot creation fails
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SNAPSHOT_DIR = path.join(process.env.HOME, '.openclaw', 'runtime', 'config-snapshots');

class ConfigSnapshot {
  constructor(snapshotDir = DEFAULT_SNAPSHOT_DIR) {
    this.snapshotDir = snapshotDir;
  }
  
  /**
   * Create snapshot of config file before mutation
   * 
   * @param {string} configPath - Path to config file
   * @param {string} envelopeId - Envelope performing mutation
   * @returns {Promise<object>} Snapshot metadata
   */
  async capture(configPath, envelopeId) {
    if (!configPath) {
      throw new Error('Config path required for snapshot');
    }
    
    if (!envelopeId) {
      throw new Error('Envelope ID required for snapshot');
    }
    
    try {
      // Ensure snapshot directory exists
      await fs.mkdir(this.snapshotDir, { recursive: true });
      
      // Read current config
      let content;
      try {
        content = await fs.readFile(configPath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist yet, snapshot empty state
          content = '';
        } else {
          throw error;
        }
      }
      
      // Generate snapshot metadata
      const timestamp = new Date().toISOString();
      const snapshotId = this._generateSnapshotId(configPath, timestamp);
      const hash = this._computeHash(content);
      
      const metadata = {
        snapshot_id: snapshotId,
        config_path: configPath,
        envelope_id: envelopeId,
        timestamp,
        content_hash: hash,
        content_size: content.length,
        existed: content.length > 0
      };
      
      // Store snapshot
      const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
      const snapshotData = {
        metadata,
        content
      };
      
      await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');
      
      return metadata;
      
    } catch (error) {
      throw new Error(`Failed to capture config snapshot: ${error.message}`);
    }
  }
  
  /**
   * Restore config from snapshot
   * 
   * @param {string} snapshotId - Snapshot to restore
   * @returns {Promise<object>} Restored config metadata
   */
  async restore(snapshotId) {
    try {
      const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
      
      const raw = await fs.readFile(snapshotPath, 'utf8');
      const snapshotData = JSON.parse(raw);
      
      const { metadata, content } = snapshotData;
      
      // Restore config file
      if (metadata.existed && content) {
        await fs.writeFile(metadata.config_path, content, 'utf8');
      }
      
      return {
        snapshot_id: snapshotId,
        config_path: metadata.config_path,
        restored_at: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Failed to restore config snapshot: ${error.message}`);
    }
  }
  
  /**
   * List snapshots for config path
   * 
   * @param {string} configPath - Config file path
   * @param {number} limit - Max snapshots to return
   * @returns {Promise<Array>} Snapshot metadata list
   */
  async list(configPath, limit = 10) {
    try {
      const files = await fs.readdir(this.snapshotDir);
      const snapshots = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const snapshotPath = path.join(this.snapshotDir, file);
        try {
          const raw = await fs.readFile(snapshotPath, 'utf8');
          const snapshotData = JSON.parse(raw);
          
          if (!configPath || snapshotData.metadata.config_path === configPath) {
            snapshots.push(snapshotData.metadata);
          }
        } catch (error) {
          // Skip invalid snapshot files
          continue;
        }
      }
      
      // Sort by timestamp (most recent first)
      snapshots.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      return snapshots.slice(0, limit);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Snapshot directory doesn't exist yet
      }
      throw error;
    }
  }
  
  /**
   * Clean old snapshots
   * 
   * @param {number} daysOld - Delete snapshots older than this
   * @returns {Promise<number>} Number of snapshots deleted
   */
  async cleanOld(daysOld = 30) {
    try {
      const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const files = await fs.readdir(this.snapshotDir);
      let deleted = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const snapshotPath = path.join(this.snapshotDir, file);
        try {
          const raw = await fs.readFile(snapshotPath, 'utf8');
          const snapshotData = JSON.parse(raw);
          const timestamp = new Date(snapshotData.metadata.timestamp).getTime();
          
          if (timestamp < cutoff) {
            await fs.unlink(snapshotPath);
            deleted++;
          }
        } catch (error) {
          // Skip invalid files
          continue;
        }
      }
      
      return deleted;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0; // Nothing to clean
      }
      throw error;
    }
  }
  
  /**
   * Generate snapshot ID
   */
  _generateSnapshotId(configPath, timestamp) {
    const basename = path.basename(configPath);
    const timestampShort = timestamp.replace(/[-:]/g, '').replace(/\..+/, '');
    const random = Math.random().toString(36).substr(2, 6);
    return `${basename}_${timestampShort}_${random}`;
  }
  
  /**
   * Compute content hash
   */
  _computeHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substr(0, 16);
  }
}

module.exports = ConfigSnapshot;
