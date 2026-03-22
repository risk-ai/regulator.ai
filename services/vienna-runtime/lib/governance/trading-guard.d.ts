export = TradingGuard;
/**
 * Trading Safety Guard
 *
 * Prevents actions that could disrupt live trading.
 */
declare class TradingGuard {
    constructor(adapter: any);
    adapter: any;
    /**
     * Check if actions are safe during trading
     *
     * @param {Array<object>} actions - Actions to check
     * @returns {Promise<object>} Safety result
     */
    check(actions: Array<object>): Promise<object>;
    /**
     * Assert actions are safe (throws if not)
     *
     * @param {Array<object>} actions - Actions to check
     * @returns {Promise<void>}
     */
    assert(actions: Array<object>): Promise<void>;
    _filterTradingCritical(actions: any): any;
}
//# sourceMappingURL=trading-guard.d.ts.map