/**
 * Entity Normalization Table
 * Phase 7.6 - Central entity mapping
 *
 * Purpose: Normalize natural language entity variations to canonical values
 *
 * Design:
 * - Single source of truth for entity normalization
 * - Easy to expand without classifier bloat
 * - Supports aliases, abbreviations, common misspellings
 */
class EntityNormalizationTable {
    constructor() {
        this.tables = this._buildNormalizationTables();
    }
    /**
     * Normalize an entity value
     *
     * @param {string} entityType - Type of entity (service, endpoint, operation, etc.)
     * @param {string} rawValue - Raw value from user input
     * @returns {string} Normalized canonical value
     */
    normalize(entityType, rawValue) {
        const table = this.tables[entityType];
        if (!table) {
            return rawValue; // Pass through if no table exists
        }
        const lower = rawValue.toLowerCase().trim();
        // Check direct mapping
        if (table[lower]) {
            return table[lower];
        }
        // Check fuzzy matches (remove spaces, hyphens)
        const fuzzy = lower.replace(/[\s-]/g, '');
        for (const [key, value] of Object.entries(table)) {
            const keyFuzzy = key.replace(/[\s-]/g, '');
            if (fuzzy === keyFuzzy) {
                return value;
            }
        }
        // No match - return raw value
        return rawValue;
    }
    /**
     * Check if an entity value is ambiguous
     *
     * @param {string} entityType
     * @param {string} rawValue
     * @returns {boolean}
     */
    isAmbiguous(entityType, rawValue) {
        const ambiguousValues = {
            service: ['gateway', 'api', 'service', 'node', 'it', 'that', 'openclaw'],
            endpoint: ['it', 'that', 'there'],
            operation: ['do', 'run']
        };
        const ambiguous = ambiguousValues[entityType] || [];
        return ambiguous.includes(rawValue.toLowerCase().trim());
    }
    /**
     * Get all possible values for an entity type
     *
     * @param {string} entityType
     * @returns {string[]}
     */
    getCanonicalValues(entityType) {
        const table = this.tables[entityType];
        if (!table)
            return [];
        const canonical = new Set();
        for (const value of Object.values(table)) {
            canonical.add(value);
        }
        return Array.from(canonical);
    }
    /**
     * Get suggestions for ambiguous entity
     *
     * @param {string} entityType
     * @param {string} rawValue
     * @returns {string[]}
     */
    getSuggestions(entityType, rawValue) {
        if (entityType === 'service') {
            const lower = rawValue.toLowerCase();
            if (lower.includes('gateway') || lower === 'gateway') {
                return ['openclaw-gateway'];
            }
            if (lower.includes('node') || lower === 'node') {
                return ['openclaw-node'];
            }
            if (lower.includes('api') || lower === 'api') {
                return ['openclaw-api'];
            }
            // Generic ambiguous service
            return ['openclaw-gateway', 'openclaw-node', 'openclaw-api'];
        }
        return [];
    }
    /**
     * Build normalization tables
     */
    _buildNormalizationTables() {
        return {
            // Service names
            service: {
                // Gateway variations
                'gateway': 'openclaw-gateway',
                'openclaw-gateway': 'openclaw-gateway',
                'openclaw gateway': 'openclaw-gateway',
                'the gateway': 'openclaw-gateway',
                'claw gateway': 'openclaw-gateway',
                'oc gateway': 'openclaw-gateway',
                'openclaw gw': 'openclaw-gateway',
                'gw': 'openclaw-gateway',
                // Node variations
                'node': 'openclaw-node',
                'openclaw-node': 'openclaw-node',
                'openclaw node': 'openclaw-node',
                'the node': 'openclaw-node',
                'claw node': 'openclaw-node',
                'oc node': 'openclaw-node',
                // API variations
                'api': 'openclaw-api',
                'openclaw-api': 'openclaw-api',
                'openclaw api': 'openclaw-api',
                'the api': 'openclaw-api',
                'claw api': 'openclaw-api',
                'oc api': 'openclaw-api'
            },
            // Endpoint names
            endpoint: {
                'openclaw': 'openclaw',
                'oc': 'openclaw',
                'claw': 'openclaw',
                'open claw': 'openclaw',
                'local': 'local',
                'vienna': 'local',
                'here': 'local'
            },
            // Operations
            operation: {
                'restart': 'restart',
                'reboot': 'restart',
                're-start': 'restart',
                'stop': 'stop',
                'halt': 'stop',
                'kill': 'stop',
                'start': 'start',
                'launch': 'start',
                'begin': 'start',
                'check': 'check',
                'verify': 'check',
                'inspect': 'check',
                'show': 'show',
                'display': 'show',
                'list': 'list',
                'enumerate': 'list',
                'query': 'query',
                'ask': 'query',
                'get': 'query'
            },
            // Time expressions
            timeframe: {
                'recent': 'recent',
                'recently': 'recent',
                'latest': 'recent',
                'last': 'recent',
                'past': 'recent',
                'just now': 'recent',
                'today': '1d',
                'yesterday': '2d',
                'this week': '1w',
                'last hour': '1h',
                'last day': '1d',
                'last week': '1w'
            },
            // Status values
            status: {
                'healthy': 'operational',
                'ok': 'operational',
                'good': 'operational',
                'fine': 'operational',
                'up': 'operational',
                'running': 'operational',
                'active': 'operational',
                'unhealthy': 'degraded',
                'bad': 'degraded',
                'down': 'offline',
                'dead': 'offline',
                'stopped': 'offline',
                'inactive': 'offline'
            }
        };
    }
}
module.exports = { EntityNormalizationTable };
//# sourceMappingURL=entity-normalization-table.js.map