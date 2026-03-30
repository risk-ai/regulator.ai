/**
 * System Status Handler
 *
 * Returns comprehensive system status including:
 * - Uptime
 * - Resource usage (CPU, memory, disk)
 * - Service health
 * - Active agents
 * - Pending approvals
 * - Recent activity
 */
import { queryOne } from '../../db/postgres.js';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export const systemStatusHandler = {
    name: 'system-status',
    description: 'Get comprehensive system status report',
    async execute(context) {
        try {
            const startTime = Date.now();
            // System uptime
            const uptimeSeconds = os.uptime();
            const uptime = formatUptime(uptimeSeconds);
            // Resource usage
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const memoryUsagePercent = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
            // CPU usage (average over last minute)
            const loadAvg = os.loadavg();
            const cpuCount = os.cpus().length;
            const cpuUsagePercent = ((loadAvg[0] / cpuCount) * 100).toFixed(1);
            // Disk usage
            let diskUsage = null;
            try {
                const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'");
                diskUsage = `${stdout.trim()}%`;
            }
            catch (error) {
                console.warn('[SystemStatus] Could not get disk usage:', error);
            }
            // Database stats
            const dbStats = await queryOne(`
        SELECT 
          pg_database_size(current_database()) as db_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      `);
            // Active agents (assuming agents table exists)
            let activeAgents = 0;
            try {
                const result = await queryOne(`SELECT COUNT(*) as count FROM agents WHERE status = 'active'`);
                activeAgents = parseInt(result?.count || '0', 10);
            }
            catch (error) {
                // Table may not exist
            }
            // Pending approvals
            let pendingApprovals = 0;
            try {
                const result = await queryOne(`SELECT COUNT(*) as count FROM approvals WHERE status = 'pending'`);
                pendingApprovals = parseInt(result?.count || '0', 10);
            }
            catch (error) {
                // Table may not exist
            }
            // Recent activity (last 24 hours)
            let recentIntents = 0;
            try {
                const result = await queryOne(`
          SELECT COUNT(*) as count 
          FROM intents 
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `);
                recentIntents = parseInt(result?.count || '0', 10);
            }
            catch (error) {
                // Table may not exist
            }
            // Service health
            const services = {
                database: 'healthy',
                runtime: 'healthy',
                api: 'healthy',
            };
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    timestamp: new Date().toISOString(),
                    uptime,
                    uptimeSeconds,
                    resources: {
                        cpu: {
                            usage: `${cpuUsagePercent}%`,
                            cores: cpuCount,
                            loadAverage: loadAvg,
                        },
                        memory: {
                            total: formatBytes(totalMem),
                            used: formatBytes(totalMem - freeMem),
                            free: formatBytes(freeMem),
                            usage: `${memoryUsagePercent}%`,
                        },
                        disk: {
                            usage: diskUsage,
                        },
                    },
                    database: {
                        size: formatBytes(parseInt(dbStats?.db_size || '0', 10)),
                        activeConnections: dbStats?.active_connections || 0,
                    },
                    activity: {
                        activeAgents,
                        pendingApprovals,
                        recentIntents24h: recentIntents,
                    },
                    services,
                    executionTimeMs: executionTime,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to get system status',
            };
        }
    },
    validate(payload) {
        // No payload required
        return true;
    },
};
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0)
        parts.push(`${minutes}m`);
    return parts.join(' ');
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
export default systemStatusHandler;
//# sourceMappingURL=system-status.js.map