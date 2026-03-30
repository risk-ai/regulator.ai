export namespace PLUGIN_TYPES {
    let ACTION: string;
    let VERIFIER: string;
    let POLICY: string;
    let TRANSPORT: string;
}
/**
 * Base Plugin Contract
 */
export class BasePlugin {
    constructor(metadata: any);
    id: any;
    name: any;
    version: any;
    type: any;
    author: any;
    description: any;
    enabled: boolean;
    tenant_scope: any;
    /**
     * Plugins must implement initialize()
     */
    initialize(): Promise<void>;
    /**
     * Plugins must implement execute()
     */
    execute(context: any): Promise<void>;
    /**
     * Optional: Plugin teardown
     */
    teardown(): Promise<void>;
    /**
     * Governance boundary check
     */
    _requireGovernance(context: any): void;
}
/**
 * Action Plugin Contract
 */
export class ActionPlugin extends BasePlugin {
    action_type: any;
    risk_tier: any;
    supported_targets: any;
    /**
     * Action plugins must implement execute()
     *
     * @param {Object} actionSpec - Action specification
     * @param {Object} context - Execution context with warrant
     * @returns {Object} - Action result
     */
    execute(actionSpec: any, context: any): any;
    /**
     * Optional: Validate action spec before execution
     */
    validate(actionSpec: any): Promise<{
        valid: boolean;
        errors: any[];
    }>;
}
/**
 * Verifier Plugin Contract
 */
export class VerifierPlugin extends BasePlugin {
    check_type: any;
    /**
     * Verifier plugins must implement verify()
     *
     * @param {Object} verificationTask - Task to verify
     * @param {Object} context - Verification context
     * @returns {Object} - Verification result
     */
    verify(verificationTask: any, context: any): any;
}
/**
 * Policy Plugin Contract
 */
export class PolicyPlugin extends BasePlugin {
    constraint_type: any;
    /**
     * Policy plugins must implement evaluate()
     *
     * @param {Object} constraint - Constraint to evaluate
     * @param {Object} context - Evaluation context
     * @returns {Object} - { allowed: boolean, reason: string }
     */
    evaluate(constraint: any, context: any): any;
}
/**
 * Transport Plugin Contract
 */
export class TransportPlugin extends BasePlugin {
    protocol: any;
    /**
     * Transport plugins must implement send()
     *
     * @param {Object} message - Message to send
     * @param {Object} destination - Destination info
     * @returns {Object} - Send result
     */
    send(message: any, destination: any): any;
    /**
     * Transport plugins must implement receive()
     *
     * @returns {Object} - Received message or null
     */
    receive(): any;
    /**
     * Optional: Connection management
     */
    connect(): Promise<boolean>;
    disconnect(): Promise<boolean>;
}
/**
 * Plugin Registry
 */
export class PluginRegistry {
    plugins: Map<any, any>;
    loadedPlugins: Map<any, any>;
    /**
     * Register a plugin
     */
    register(plugin: any): any;
    /**
     * Load a plugin (initialize it)
     */
    load(pluginId: any): Promise<{
        loaded: boolean;
        plugin_id: any;
    }>;
    /**
     * Unload a plugin
     */
    unload(pluginId: any): Promise<{
        unloaded: boolean;
        plugin_id: any;
    }>;
    /**
     * Get a loaded plugin
     */
    get(pluginId: any): any;
    /**
     * List plugins by type
     */
    listByType(type: any): any[];
    /**
     * List all loaded plugins
     */
    listLoaded(): any[];
    /**
     * List all registered plugins
     */
    listRegistered(): any[];
    /**
     * Execute an action plugin
     */
    executeAction(pluginId: any, actionSpec: any, context: any): Promise<any>;
    /**
     * Execute a verifier plugin
     */
    executeVerifier(pluginId: any, verificationTask: any, context: any): Promise<any>;
    /**
     * Execute a policy plugin
     */
    evaluatePolicy(pluginId: any, constraint: any, context: any): Promise<any>;
    /**
     * Send via transport plugin
     */
    sendViaTransport(pluginId: any, message: any, destination: any): Promise<any>;
}
export function getPluginRegistry(): any;
//# sourceMappingURL=plugin-system.d.ts.map