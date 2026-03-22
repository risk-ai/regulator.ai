/**
 * Vienna Plugin System
 * 
 * Allows extending Vienna with custom actions, verifiers, policies, and transports
 * while preserving governance boundaries.
 */

const { ContractValidator } = require('./api-contracts');

/**
 * Plugin Type Registry
 */
const PLUGIN_TYPES = {
  ACTION: 'action',
  VERIFIER: 'verifier',
  POLICY: 'policy',
  TRANSPORT: 'transport'
};

/**
 * Base Plugin Contract
 */
class BasePlugin {
  constructor(metadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.version = metadata.version;
    this.type = metadata.type;
    this.author = metadata.author || 'unknown';
    this.description = metadata.description || '';
    this.enabled = metadata.enabled !== false;
    this.tenant_scope = metadata.tenant_scope || 'global';
  }

  /**
   * Plugins must implement initialize()
   */
  async initialize() {
    throw new Error('NOT_IMPLEMENTED: Plugin must implement initialize()');
  }

  /**
   * Plugins must implement execute()
   */
  async execute(context) {
    throw new Error('NOT_IMPLEMENTED: Plugin must implement execute()');
  }

  /**
   * Optional: Plugin teardown
   */
  async teardown() {
    // Default: no-op
  }

  /**
   * Governance boundary check
   */
  _requireGovernance(context) {
    if (!context.warrant) {
      throw new Error('GOVERNANCE_VIOLATION: Plugin execution requires warrant');
    }
    if (!context.tenant_id) {
      throw new Error('GOVERNANCE_VIOLATION: Plugin execution requires tenant_id');
    }
  }
}

/**
 * Action Plugin Contract
 */
class ActionPlugin extends BasePlugin {
  constructor(metadata) {
    super({ ...metadata, type: PLUGIN_TYPES.ACTION });
    this.action_type = metadata.action_type;
    this.risk_tier = metadata.risk_tier || 'T1'; // Default to T1 for safety
    this.supported_targets = metadata.supported_targets || [];
  }

  /**
   * Action plugins must implement execute()
   * 
   * @param {Object} actionSpec - Action specification
   * @param {Object} context - Execution context with warrant
   * @returns {Object} - Action result
   */
  async execute(actionSpec, context) {
    this._requireGovernance(context);
    throw new Error('NOT_IMPLEMENTED: ActionPlugin must implement execute()');
  }

  /**
   * Optional: Validate action spec before execution
   */
  async validate(actionSpec) {
    return { valid: true, errors: [] };
  }
}

/**
 * Verifier Plugin Contract
 */
class VerifierPlugin extends BasePlugin {
  constructor(metadata) {
    super({ ...metadata, type: PLUGIN_TYPES.VERIFIER });
    this.check_type = metadata.check_type;
  }

  /**
   * Verifier plugins must implement verify()
   * 
   * @param {Object} verificationTask - Task to verify
   * @param {Object} context - Verification context
   * @returns {Object} - Verification result
   */
  async verify(verificationTask, context) {
    throw new Error('NOT_IMPLEMENTED: VerifierPlugin must implement verify()');
  }
}

/**
 * Policy Plugin Contract
 */
class PolicyPlugin extends BasePlugin {
  constructor(metadata) {
    super({ ...metadata, type: PLUGIN_TYPES.POLICY });
    this.constraint_type = metadata.constraint_type;
  }

  /**
   * Policy plugins must implement evaluate()
   * 
   * @param {Object} constraint - Constraint to evaluate
   * @param {Object} context - Evaluation context
   * @returns {Object} - { allowed: boolean, reason: string }
   */
  async evaluate(constraint, context) {
    throw new Error('NOT_IMPLEMENTED: PolicyPlugin must implement evaluate()');
  }
}

/**
 * Transport Plugin Contract
 */
class TransportPlugin extends BasePlugin {
  constructor(metadata) {
    super({ ...metadata, type: PLUGIN_TYPES.TRANSPORT });
    this.protocol = metadata.protocol;
  }

  /**
   * Transport plugins must implement send()
   * 
   * @param {Object} message - Message to send
   * @param {Object} destination - Destination info
   * @returns {Object} - Send result
   */
  async send(message, destination) {
    throw new Error('NOT_IMPLEMENTED: TransportPlugin must implement send()');
  }

  /**
   * Transport plugins must implement receive()
   * 
   * @returns {Object} - Received message or null
   */
  async receive() {
    throw new Error('NOT_IMPLEMENTED: TransportPlugin must implement receive()');
  }

  /**
   * Optional: Connection management
   */
  async connect() {
    return true;
  }

  async disconnect() {
    return true;
  }
}

/**
 * Plugin Registry
 */
class PluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.loadedPlugins = new Map();
  }

  /**
   * Register a plugin
   */
  register(plugin) {
    if (!(plugin instanceof BasePlugin)) {
      throw new Error('INVALID_PLUGIN: Must extend BasePlugin');
    }

    // Validate plugin metadata
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('INVALID_PLUGIN: Missing required metadata (id, name, version)');
    }

    // Check for conflicts
    if (this.plugins.has(plugin.id)) {
      throw new Error(`PLUGIN_CONFLICT: Plugin ${plugin.id} already registered`);
    }

    this.plugins.set(plugin.id, plugin);
    return plugin.id;
  }

  /**
   * Load a plugin (initialize it)
   */
  async load(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_FOUND: ${pluginId}`);
    }

    if (this.loadedPlugins.has(pluginId)) {
      throw new Error(`PLUGIN_ALREADY_LOADED: ${pluginId}`);
    }

    try {
      await plugin.initialize();
      this.loadedPlugins.set(pluginId, plugin);
      return { loaded: true, plugin_id: pluginId };
    } catch (error) {
      throw new Error(`PLUGIN_LOAD_FAILED: ${pluginId} - ${error.message}`);
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId) {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_LOADED: ${pluginId}`);
    }

    try {
      await plugin.teardown();
      this.loadedPlugins.delete(pluginId);
      return { unloaded: true, plugin_id: pluginId };
    } catch (error) {
      throw new Error(`PLUGIN_UNLOAD_FAILED: ${pluginId} - ${error.message}`);
    }
  }

  /**
   * Get a loaded plugin
   */
  get(pluginId) {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * List plugins by type
   */
  listByType(type) {
    return Array.from(this.loadedPlugins.values()).filter(p => p.type === type);
  }

  /**
   * List all loaded plugins
   */
  listLoaded() {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * List all registered plugins
   */
  listRegistered() {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute an action plugin
   */
  async executeAction(pluginId, actionSpec, context) {
    const plugin = this.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_LOADED: ${pluginId}`);
    }

    if (plugin.type !== PLUGIN_TYPES.ACTION) {
      throw new Error(`WRONG_PLUGIN_TYPE: ${pluginId} is not an action plugin`);
    }

    // Validate action spec
    const validation = await plugin.validate(actionSpec);
    if (!validation.valid) {
      throw new Error(`INVALID_ACTION_SPEC: ${validation.errors.join(', ')}`);
    }

    // Execute with governance enforcement
    return await plugin.execute(actionSpec, context);
  }

  /**
   * Execute a verifier plugin
   */
  async executeVerifier(pluginId, verificationTask, context) {
    const plugin = this.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_LOADED: ${pluginId}`);
    }

    if (plugin.type !== PLUGIN_TYPES.VERIFIER) {
      throw new Error(`WRONG_PLUGIN_TYPE: ${pluginId} is not a verifier plugin`);
    }

    return await plugin.verify(verificationTask, context);
  }

  /**
   * Execute a policy plugin
   */
  async evaluatePolicy(pluginId, constraint, context) {
    const plugin = this.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_LOADED: ${pluginId}`);
    }

    if (plugin.type !== PLUGIN_TYPES.POLICY) {
      throw new Error(`WRONG_PLUGIN_TYPE: ${pluginId} is not a policy plugin`);
    }

    return await plugin.evaluate(constraint, context);
  }

  /**
   * Send via transport plugin
   */
  async sendViaTransport(pluginId, message, destination) {
    const plugin = this.get(pluginId);
    if (!plugin) {
      throw new Error(`PLUGIN_NOT_LOADED: ${pluginId}`);
    }

    if (plugin.type !== PLUGIN_TYPES.TRANSPORT) {
      throw new Error(`WRONG_PLUGIN_TYPE: ${pluginId} is not a transport plugin`);
    }

    return await plugin.send(message, destination);
  }
}

/**
 * Global plugin registry instance
 */
let globalRegistry = null;

function getPluginRegistry() {
  if (!globalRegistry) {
    globalRegistry = new PluginRegistry();
  }
  return globalRegistry;
}

module.exports = {
  PLUGIN_TYPES,
  BasePlugin,
  ActionPlugin,
  VerifierPlugin,
  PolicyPlugin,
  TransportPlugin,
  PluginRegistry,
  getPluginRegistry
};
