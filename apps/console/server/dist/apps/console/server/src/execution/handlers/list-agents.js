/**
 * List Agents Handler
 *
 * Returns all agents with their status, last activity, and health
 */
import { query } from '../../db/postgres.js';
export const listAgentsHandler = {
    name: 'list-agents',
    description: 'Show all active agents and their status',
    async execute(context) {
        try {
            const startTime = Date.now();
            // Get all agents from database
            const agents = await query(`
        SELECT 
          id,
          name,
          type,
          status,
          last_activity_at,
          created_at,
          metadata
        FROM agents
        ORDER BY last_activity_at DESC NULLS LAST
      `);
            // Format agent data
            const formattedAgents = agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                type: agent.type,
                status: agent.status || 'unknown',
                lastActivity: agent.last_activity_at,
                uptime: agent.created_at ? getUptime(agent.created_at) : null,
                metadata: agent.metadata || {},
            }));
            // Count by status
            const statusCounts = formattedAgents.reduce((acc, agent) => {
                acc[agent.status] = (acc[agent.status] || 0) + 1;
                return acc;
            }, {});
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    agents: formattedAgents,
                    total: formattedAgents.length,
                    statusCounts,
                    timestamp: new Date().toISOString(),
                },
                executionTimeMs: executionTime,
            };
        }
        catch (error) {
            // If agents table doesn't exist, return empty list
            if (error.code === '42P01') {
                return {
                    success: true,
                    data: {
                        agents: [],
                        total: 0,
                        statusCounts: {},
                        timestamp: new Date().toISOString(),
                        warning: 'Agents table not initialized',
                    },
                };
            }
            return {
                success: false,
                error: error.message || 'Failed to list agents',
            };
        }
    },
    validate(payload) {
        // No payload required
        return true;
    },
};
function getUptime(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const parts = [];
    if (days > 0)
        parts.push(`${days}d`);
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0)
        parts.push(`${minutes}m`);
    return parts.join(' ');
}
export default listAgentsHandler;
//# sourceMappingURL=list-agents.js.map