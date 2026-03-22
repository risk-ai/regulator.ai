/**
 * Time Utility Functions
 * Phase 10.5: Chat Cleanup
 */

/**
 * Format timestamp as relative time
 * 
 * Examples:
 * - Just now
 * - 2m ago
 * - 1h ago
 * - Yesterday
 * - 2d ago
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const now = Date.now();
  const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  // Fall back to date for older messages
  return new Date(then).toLocaleDateString();
}

/**
 * Format absolute timestamp
 * 
 * Examples:
 * - 2026-03-14 00:15:30 EDT
 * - March 14, 2026 at 12:15 AM
 */
export function formatAbsoluteTime(timestamp: string | Date, format: 'full' | 'short' = 'short'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (format === 'full') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  }
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format duration in milliseconds as human-readable string
 * 
 * Examples:
 * - 1.2s
 * - 45ms
 * - 2m 15s
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const decimal = (durationMs / 1000).toFixed(1);
  return `${decimal}s`;
}
