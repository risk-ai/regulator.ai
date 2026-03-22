/**
 * Vienna Runtime Configuration
 * 
 * Environment-aware path resolution and runtime settings.
 * Prevents test pollution of production runtime.
 */

const path = require('path');

/**
 * Get current runtime environment
 * 
 * @returns {string} 'prod' | 'test'
 */
function getRuntimeEnvironment() {
  return process.env.VIENNA_ENV || 'prod';
}

/**
 * Get runtime base directory for current environment
 * 
 * @returns {string} Path to runtime directory
 */
function getRuntimeDir() {
  const env = getRuntimeEnvironment();
  return path.join(process.env.HOME, '.openclaw', 'runtime', env);
}

/**
 * Get runtime file path for current environment
 * 
 * @param {string} filename - File name (e.g., 'execution-queue.jsonl')
 * @returns {string} Full path to runtime file
 */
function getRuntimePath(filename) {
  return path.join(getRuntimeDir(), filename);
}

/**
 * Get archive directory
 * 
 * @returns {string} Path to archive directory
 */
function getArchiveDir() {
  return path.join(process.env.HOME, '.openclaw', 'runtime', 'archive');
}

/**
 * Replay log rotation configuration
 */
const REPLAY_LOG_CONFIG = {
  maxSizeBytes: 1 * 1024 * 1024 * 1024, // 1GB
  maxFiles: 10,
  rotationEnabled: true
};

/**
 * Dead letter queue configuration
 */
const DLQ_CONFIG = {
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  maxFiles: 5,
  rotationEnabled: true
};

module.exports = {
  getRuntimeEnvironment,
  getRuntimeDir,
  getRuntimePath,
  getArchiveDir,
  REPLAY_LOG_CONFIG,
  DLQ_CONFIG
};
