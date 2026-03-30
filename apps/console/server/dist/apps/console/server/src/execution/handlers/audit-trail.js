/**
 * Audit Trail Handler
 *
 * Returns recent system events and user actions
 */
import { query } from '../../db/postgres.js';
export const auditTrailHandler = {
    name: 'audit-trail',
    description: 'View recent actions and system events',
    async execute(context) {
        try {
            const startTime = Date.now();
            const { limit = 50, offset = 0, eventType, userId, startDate, endDate } = context.payload;
            // Build query with filters
            let whereClause = '1=1';
            const params = [];
            let paramIndex = 1;
            if (eventType) {
                whereClause += ` AND event_type = $${paramIndex}`;
                params.push(eventType);
                paramIndex++;
            }
            if (userId) {
                whereClause += ` AND user_id = $${paramIndex}`;
                params.push(userId);
                paramIndex++;
            }
            if (startDate) {
                whereClause += ` AND created_at >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                whereClause += ` AND created_at <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            // Add limit and offset
            params.push(limit, offset);
            // Query audit log
            let events = [];
            try {
                events = await query(`
          SELECT 
            id,
            event_type,
            user_id,
            tenant_id,
            metadata,
            created_at
          FROM audit_log
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, params);
            }
            catch (error) {
                // Table might not exist
                if (error.code === '42P01') {
                    return {
                        success: true,
                        data: {
                            events: [],
                            total: 0,
                            limit,
                            offset,
                            warning: 'Audit log table not initialized',
                        },
                    };
                }
                throw error;
            }
            // Get total count
            const countResult = await query(`
        SELECT COUNT(*) as total
        FROM audit_log
        WHERE ${whereClause}
      `, params.slice(0, -2));
            const total = parseInt(countResult[0]?.total || '0', 10);
            // Group by event type
            const eventTypeCounts = events.reduce((acc, event) => {
                acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                return acc;
            }, {});
            const executionTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    events: events.map((e) => ({
                        id: e.id,
                        eventType: e.event_type,
                        userId: e.user_id,
                        tenantId: e.tenant_id,
                        metadata: e.metadata || {},
                        timestamp: e.created_at,
                    })),
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                    eventTypeCounts,
                    timestamp: new Date().toISOString(),
                },
                executionTimeMs: executionTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to fetch audit trail',
            };
        }
    },
    validate(payload) {
        // Optional filters
        if (payload.limit && (payload.limit < 1 || payload.limit > 1000)) {
            return false;
        }
        return true;
    },
};
export default auditTrailHandler;
//# sourceMappingURL=audit-trail.js.map