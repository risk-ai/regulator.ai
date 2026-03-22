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
export class EntityNormalizationTable {
    tables: {
        service: {
            gateway: string;
            'openclaw-gateway': string;
            'openclaw gateway': string;
            'the gateway': string;
            'claw gateway': string;
            'oc gateway': string;
            'openclaw gw': string;
            gw: string;
            node: string;
            'openclaw-node': string;
            'openclaw node': string;
            'the node': string;
            'claw node': string;
            'oc node': string;
            api: string;
            'openclaw-api': string;
            'openclaw api': string;
            'the api': string;
            'claw api': string;
            'oc api': string;
        };
        endpoint: {
            openclaw: string;
            oc: string;
            claw: string;
            'open claw': string;
            local: string;
            vienna: string;
            here: string;
        };
        operation: {
            restart: string;
            reboot: string;
            're-start': string;
            stop: string;
            halt: string;
            kill: string;
            start: string;
            launch: string;
            begin: string;
            check: string;
            verify: string;
            inspect: string;
            show: string;
            display: string;
            list: string;
            enumerate: string;
            query: string;
            ask: string;
            get: string;
        };
        timeframe: {
            recent: string;
            recently: string;
            latest: string;
            last: string;
            past: string;
            'just now': string;
            today: string;
            yesterday: string;
            'this week': string;
            'last hour': string;
            'last day': string;
            'last week': string;
        };
        status: {
            healthy: string;
            ok: string;
            good: string;
            fine: string;
            up: string;
            running: string;
            active: string;
            unhealthy: string;
            bad: string;
            down: string;
            dead: string;
            stopped: string;
            inactive: string;
        };
    };
    /**
     * Normalize an entity value
     *
     * @param {string} entityType - Type of entity (service, endpoint, operation, etc.)
     * @param {string} rawValue - Raw value from user input
     * @returns {string} Normalized canonical value
     */
    normalize(entityType: string, rawValue: string): string;
    /**
     * Check if an entity value is ambiguous
     *
     * @param {string} entityType
     * @param {string} rawValue
     * @returns {boolean}
     */
    isAmbiguous(entityType: string, rawValue: string): boolean;
    /**
     * Get all possible values for an entity type
     *
     * @param {string} entityType
     * @returns {string[]}
     */
    getCanonicalValues(entityType: string): string[];
    /**
     * Get suggestions for ambiguous entity
     *
     * @param {string} entityType
     * @param {string} rawValue
     * @returns {string[]}
     */
    getSuggestions(entityType: string, rawValue: string): string[];
    /**
     * Build normalization tables
     */
    _buildNormalizationTables(): {
        service: {
            gateway: string;
            'openclaw-gateway': string;
            'openclaw gateway': string;
            'the gateway': string;
            'claw gateway': string;
            'oc gateway': string;
            'openclaw gw': string;
            gw: string;
            node: string;
            'openclaw-node': string;
            'openclaw node': string;
            'the node': string;
            'claw node': string;
            'oc node': string;
            api: string;
            'openclaw-api': string;
            'openclaw api': string;
            'the api': string;
            'claw api': string;
            'oc api': string;
        };
        endpoint: {
            openclaw: string;
            oc: string;
            claw: string;
            'open claw': string;
            local: string;
            vienna: string;
            here: string;
        };
        operation: {
            restart: string;
            reboot: string;
            're-start': string;
            stop: string;
            halt: string;
            kill: string;
            start: string;
            launch: string;
            begin: string;
            check: string;
            verify: string;
            inspect: string;
            show: string;
            display: string;
            list: string;
            enumerate: string;
            query: string;
            ask: string;
            get: string;
        };
        timeframe: {
            recent: string;
            recently: string;
            latest: string;
            last: string;
            past: string;
            'just now': string;
            today: string;
            yesterday: string;
            'this week': string;
            'last hour': string;
            'last day': string;
            'last week': string;
        };
        status: {
            healthy: string;
            ok: string;
            good: string;
            fine: string;
            up: string;
            running: string;
            active: string;
            unhealthy: string;
            bad: string;
            down: string;
            dead: string;
            stopped: string;
            inactive: string;
        };
    };
}
//# sourceMappingURL=entity-normalization-table.d.ts.map