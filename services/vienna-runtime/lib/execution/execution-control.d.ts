export = ExecutionControl;
declare class ExecutionControl {
    constructor(stateDir: any);
    stateDir: any;
    stateFile: string;
    _state: any;
    _ensureStateDir(): void;
    _loadState(): void;
    _persistState(): void;
    /**
     * Pause all execution immediately.
     *
     * @param {string} reason - Why execution is being paused
     * @param {string} pausedBy - Who initiated the pause (default: 'vienna')
     * @returns {Object} New pause state
     */
    pauseExecution(reason: string, pausedBy?: string): any;
    /**
     * Resume execution.
     *
     * @returns {Object} New execution state
     */
    resumeExecution(): any;
    /**
     * Get current execution control state.
     *
     * @returns {Object} Current state
     */
    getExecutionControlState(): any;
    /**
     * Check if execution is currently paused.
     *
     * @returns {boolean} True if paused
     */
    isPaused(): boolean;
    /**
     * Get pause reason if paused.
     *
     * @returns {string|null} Pause reason or null
     */
    getPauseReason(): string | null;
    /**
     * Force reset pause state (emergency use only).
     * Does not validate or log reason.
     */
    forceReset(): any;
}
//# sourceMappingURL=execution-control.d.ts.map