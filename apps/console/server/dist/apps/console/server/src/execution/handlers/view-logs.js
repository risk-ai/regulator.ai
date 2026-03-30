/**
 * View Logs Handler
 *
 * Returns recent system logs (from systemd journal or log files)
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export const viewLogsHandler = {
    name: 'view-logs',
    description: 'Tail or search recent system logs',
    async execute(context) {
        try {
            const startTime = Date.now();
            const { service = 'vienna-console-server', lines = 100, follow = false, grep, since, } = context.payload;
            // Security: whitelist allowed services
            const allowedServices = [
                'vienna-console-server',
                'vienna-console-client',
                'cloudflared-console',
            ];
            if (!allowedServices.includes(service)) {
                return {
                    success: false,
                    error: `Service "${service}" not allowed. Allowed: ${allowedServices.join(', ')}`,
                };
            }
            // Build journalctl command
            let cmd = `journalctl --user -u ${service}.service`;
            // Add flags
            if (lines) {
                cmd += ` -n ${Math.min(lines, 1000)}`; // Max 1000 lines
            }
            if (since) {
                cmd += ` --since="${since}"`;
            }
            if (!follow) {
                cmd += ' --no-pager';
            }
            // Execute command
            let stdout = '';
            let stderr = '';
            try {
                const result = await execAsync(cmd, { timeout: 10000 });
                stdout = result.stdout;
                stderr = result.stderr;
            }
            catch (error) {
                // journalctl might not be available
                return {
                    success: false,
                    error: 'Could not access system logs. journalctl may not be available.',
                };
            }
            // Parse log lines
            let logLines = stdout.split('\n').filter(line => line.trim());
            // Apply grep filter if provided
            if (grep) {
                try {
                    const regex = new RegExp(grep, 'i');
                    logLines = logLines.filter(line => regex.test(line));
                }
                catch (error) {
                    return {
                        success: false,
                        error: 'Invalid grep pattern',
                    };
                }
            }
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    service,
                    lines: logLines,
                    totalLines: logLines.length,
                    filtered: !!grep,
                    timestamp: new Date().toISOString(),
                },
                executionTimeMs: executionTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch logs',
            };
        }
    },
    validate(payload) {
        if (payload.lines && (payload.lines < 1 || payload.lines > 1000)) {
            return false;
        }
        return true;
    },
};
export default viewLogsHandler;
//# sourceMappingURL=view-logs.js.map