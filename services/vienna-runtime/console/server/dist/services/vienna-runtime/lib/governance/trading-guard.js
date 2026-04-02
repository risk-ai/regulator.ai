/**
 * Trading Safety Guard
 *
 * Prevents actions that could disrupt live trading.
 */
class TradingGuard {
    constructor(adapter) {
        this.adapter = adapter;
    }
    /**
     * Check if actions are safe during trading
     *
     * @param {Array<object>} actions - Actions to check
     * @returns {Promise<object>} Safety result
     */
    async check(actions) {
        // Load runtime state
        const runtimeState = await this.adapter.loadRuntimeState();
        // If no autonomous window active, all actions safe
        if (!runtimeState.autonomous_window_active) {
            return { safe: true, reason: 'No autonomous window active' };
        }
        // Check for trading-critical actions
        const tradingCritical = this._filterTradingCritical(actions);
        if (tradingCritical.length === 0) {
            return { safe: true, reason: 'No trading-critical actions' };
        }
        // During autonomous window, block trading-critical actions
        return {
            safe: false,
            reason: 'AUTONOMOUS_WINDOW_ACTIVE',
            message: 'Cannot modify trading services during autonomous window',
            blocked_actions: tradingCritical.map(a => a.type),
            autonomous_window_end: runtimeState.autonomous_window_end
        };
    }
    /**
     * Assert actions are safe (throws if not)
     *
     * @param {Array<object>} actions - Actions to check
     * @returns {Promise<void>}
     */
    async assert(actions) {
        const result = await this.check(actions);
        if (!result.safe) {
            throw new Error(`Trading guard blocked: ${result.message}`);
        }
    }
    _filterTradingCritical(actions) {
        const tradingPatterns = ['kalshi', 'trading', 'kalshi_mm_bot'];
        const criticalActions = ['restart_service', 'stop_service', 'write_db', 'modify_config'];
        return actions.filter(action => {
            const targetMatches = tradingPatterns.some(pattern => action.target?.toLowerCase().includes(pattern.toLowerCase()));
            const typeMatches = criticalActions.some(critical => action.type?.startsWith(critical));
            return targetMatches && typeMatches;
        });
    }
}
module.exports = TradingGuard;
//# sourceMappingURL=trading-guard.js.map