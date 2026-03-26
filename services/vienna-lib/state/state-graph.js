/**
 * Vienna State Graph
 * 
 * Persistent memory layer for Vienna OS.
 * Tracks services, providers, incidents, objectives, runtime context.
 * 
 * Design: Agents read directly, write via executor envelopes.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Get environment-aware database path
 * @returns {string} Path to state-graph.db in correct environment
 */
function getDefaultDbPath() {
  const env = process.env.VIENNA_ENV || 'prod';
  return path.join(
    process.env.HOME,
    '.openclaw',
    'runtime',
    env,
    'state',
    'state-graph.db'
  );
}

class StateGraph {
  constructor(options = {}) {
    this.dbPath = options.dbPath || getDefaultDbPath();
    this.db = null;
    this.initialized = false;
    this.environment = options.environment || process.env.VIENNA_ENV || 'prod';
  }

  /**
   * Initialize database (create if missing, apply schema)
   */
  async initialize() {
    if (this.initialized) return;

    // SAFETY BARRIER: Prevent test execution in production environment
    if (this.environment === 'prod' && process.env.NODE_ENV === 'test') {
      throw new Error(
        'SAFETY: Test execution attempted in production environment. ' +
        'Tests must run with VIENNA_ENV=test to prevent production data pollution. ' +
        `Current: VIENNA_ENV=${this.environment}, NODE_ENV=${process.env.NODE_ENV}`
      );
    }

    // Startup logging (visibility into environment selection)
    if (!process.env.VIENNA_STARTUP_LOGGED) {
      console.log(`[StateGraph] Environment: ${this.environment}`);
      console.log(`[StateGraph] Database: ${this.dbPath}`);
      process.env.VIENNA_STARTUP_LOGGED = 'true';
    }

    // Ensure state directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON');

    // Apply schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    this.db.exec(schema);

    // Run migrations
    await this._runMigrations();

    this.initialized = true;
  }

  /**
   * Run database migrations
   */
  async _runMigrations() {
    // Check if reconciliation fields exist (Phase 10.1a)
    const tableInfo = this.db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='managed_objectives'
    `).get();

    if (tableInfo && !tableInfo.sql.includes('reconciliation_status')) {
      console.log('[StateGraph] Running Phase 10.1a migration: Adding reconciliation fields...');
      
      // SQLite doesn't support multiple ADD COLUMN in one statement
      const migrations = [
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_status TEXT NOT NULL DEFAULT 'idle' CHECK(reconciliation_status IN ('idle', 'reconciling', 'cooldown', 'degraded', 'safe_mode'))",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_started_at TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_cooldown_until TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_result TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_error TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_execution_id TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_last_verified_at TEXT",
        "ALTER TABLE managed_objectives ADD COLUMN reconciliation_generation INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE managed_objectives ADD COLUMN manual_hold INTEGER NOT NULL DEFAULT 0 CHECK(manual_hold IN (0, 1))",
        "CREATE INDEX IF NOT EXISTS idx_managed_objectives_reconciliation_status ON managed_objectives(reconciliation_status)"
      ];

      for (const sql of migrations) {
        this.db.exec(sql);
      }

      // Verify migration
      const verification = this.db.prepare(`
        SELECT 
          COUNT(*) as total_objectives,
          SUM(CASE WHEN reconciliation_status = 'idle' THEN 1 ELSE 0 END) as idle_count,
          SUM(CASE WHEN reconciliation_attempt_count = 0 THEN 1 ELSE 0 END) as zero_attempts,
          SUM(CASE WHEN reconciliation_generation = 0 THEN 1 ELSE 0 END) as zero_generation,
          SUM(CASE WHEN manual_hold = 0 THEN 1 ELSE 0 END) as not_held
        FROM managed_objectives
      `).get();

      console.log('[StateGraph] Phase 10.1a migration verification:', verification);

      // All existing objectives should have safe defaults
      if (verification.total_objectives > 0) {
        if (verification.idle_count !== verification.total_objectives) {
          throw new Error('Migration verification failed: Not all objectives set to idle');
        }
        if (verification.zero_attempts !== verification.total_objectives) {
          throw new Error('Migration verification failed: Not all attempt counts zero');
        }
        if (verification.zero_generation !== verification.total_objectives) {
          throw new Error('Migration verification failed: Not all generations zero');
        }
        if (verification.not_held !== verification.total_objectives) {
          throw new Error('Migration verification failed: Not all manual_hold set to false');
        }
      }

      console.log('[StateGraph] Phase 10.1a migration completed successfully.');
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Ensure database is initialized
   */
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('StateGraph not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute arbitrary SQL query (read-only helper for dashboard/services)
   * 
   * @param {string} sql - SQL query string
   * @param {array} params - Query parameters
   * @returns {array} Query results
   */
  query(sql, params = []) {
    this._ensureInitialized();
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  // ============================================================
  // SERVICES
  // ============================================================

  /**
   * List services (with optional filters)
   */
  listServices(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.service_type) {
      query += ' AND service_type = ?';
      params.push(filters.service_type);
    }
    if (filters.health) {
      query += ' AND health = ?';
      params.push(filters.health);
    }

    query += ' ORDER BY service_name ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get service by ID
   */
  getService(serviceId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM services WHERE service_id = ?');
    return stmt.get(serviceId);
  }

  /**
   * Create service
   */
  createService(service) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO services (
        service_id, service_name, service_type, status, health,
        last_check_at, last_restart_at, dependencies, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      service.service_id,
      service.service_name,
      service.service_type,
      service.status,
      service.health || null,
      service.last_check_at || null,
      service.last_restart_at || null,
      service.dependencies ? JSON.stringify(service.dependencies) : null,
      service.metadata ? JSON.stringify(service.metadata) : null,
      now,
      now
    );

    return { service_id: service.service_id, changes: info.changes };
  }

  /**
   * Update service
   */
  updateService(serviceId, updates, changedBy = 'system') {
    this._ensureInitialized();

    const current = this.getService(serviceId);
    if (!current) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    // Build dynamic update query
    const allowedFields = ['service_name', 'service_type', 'status', 'health', 
                           'last_check_at', 'last_restart_at', 'dependencies', 'metadata'];
    
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        
        // Handle JSON fields
        if (field === 'dependencies' || field === 'metadata') {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }

        // Record state transition for significant changes
        if (field === 'status' || field === 'health') {
          this._recordTransition('service', serviceId, field, current[field], updates[field], changedBy);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(serviceId);

    const query = `UPDATE services SET ${fields.join(', ')} WHERE service_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  /**
   * Delete service
   */
  deleteService(serviceId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM services WHERE service_id = ?');
    const info = stmt.run(serviceId);
    return { changes: info.changes };
  }

  // ============================================================
  // PROVIDERS
  // ============================================================

  listProviders(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM providers WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.provider_type) {
      query += ' AND provider_type = ?';
      params.push(filters.provider_type);
    }

    query += ' ORDER BY provider_name ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getProvider(providerId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM providers WHERE provider_id = ?');
    return stmt.get(providerId);
  }

  createProvider(provider) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO providers (
        provider_id, provider_name, provider_type, status, health,
        last_health_check, credentials_status, rate_limit_info,
        error_count, last_error_at, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      provider.provider_id,
      provider.provider_name,
      provider.provider_type,
      provider.status,
      provider.health || null,
      provider.last_health_check || null,
      provider.credentials_status || null,
      provider.rate_limit_info ? JSON.stringify(provider.rate_limit_info) : null,
      provider.error_count || 0,
      provider.last_error_at || null,
      provider.metadata ? JSON.stringify(provider.metadata) : null,
      now,
      now
    );

    return { provider_id: provider.provider_id, changes: info.changes };
  }

  updateProvider(providerId, updates, changedBy = 'system') {
    this._ensureInitialized();

    const current = this.getProvider(providerId);
    if (!current) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    const allowedFields = ['provider_name', 'provider_type', 'status', 'health',
                           'last_health_check', 'credentials_status', 'rate_limit_info',
                           'error_count', 'last_error_at', 'metadata'];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);

        if (field === 'rate_limit_info' || field === 'metadata') {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }

        if (field === 'status' || field === 'health' || field === 'credentials_status') {
          this._recordTransition('provider', providerId, field, current[field], updates[field], changedBy);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(providerId);

    const query = `UPDATE providers SET ${fields.join(', ')} WHERE provider_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  deleteProvider(providerId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM providers WHERE provider_id = ?');
    const info = stmt.run(providerId);
    return { changes: info.changes };
  }

  // ============================================================
  // INCIDENTS
  // ============================================================

  listIncidents(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.pattern_id) {
      query += ' AND pattern_id = ?';
      params.push(filters.pattern_id);
    }

    query += ' ORDER BY detected_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getIncident(incidentId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?');
    return stmt.get(incidentId);
  }

  createIncident(incident) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO incidents (
        incident_id, incident_type, severity, status,
        affected_services, detected_at, detected_by,
        resolved_at, resolution, root_cause, action_taken,
        pattern_id, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      incident.incident_id,
      incident.incident_type,
      incident.severity,
      incident.status,
      incident.affected_services ? JSON.stringify(incident.affected_services) : null,
      incident.detected_at,
      incident.detected_by || null,
      incident.resolved_at || null,
      incident.resolution || null,
      incident.root_cause || null,
      incident.action_taken || null,
      incident.pattern_id || null,
      incident.metadata ? JSON.stringify(incident.metadata) : null,
      now,
      now
    );

    return { incident_id: incident.incident_id, changes: info.changes };
  }

  updateIncident(incidentId, updates, changedBy = 'system') {
    this._ensureInitialized();

    const current = this.getIncident(incidentId);
    if (!current) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    const allowedFields = ['incident_type', 'severity', 'status', 'affected_services',
                           'resolved_at', 'resolution', 'root_cause', 'action_taken',
                           'pattern_id', 'metadata'];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);

        if (field === 'affected_services' || field === 'metadata') {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }

        if (field === 'status' || field === 'severity') {
          this._recordTransition('incident', incidentId, field, current[field], updates[field], changedBy);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(incidentId);

    const query = `UPDATE incidents SET ${fields.join(', ')} WHERE incident_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  deleteIncident(incidentId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM incidents WHERE incident_id = ?');
    const info = stmt.run(incidentId);
    return { changes: info.changes };
  }

  // ============================================================
  // OBJECTIVES
  // ============================================================

  listObjectives(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM objectives WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters.assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(filters.assigned_to);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getObjective(objectiveId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM managed_objectives WHERE objective_id = ?');
    return stmt.get(objectiveId);
  }

  createObjective(objective) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO managed_objectives (
        objective_id, objective_name, objective_type, status, priority,
        assigned_to, blocked_reason, dependencies, completion_criteria,
        progress_pct, started_at, completed_at, due_at, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      objective.objective_id,
      objective.objective_name,
      objective.objective_type,
      objective.status,
      objective.priority || null,
      objective.assigned_to || null,
      objective.blocked_reason || null,
      objective.dependencies ? JSON.stringify(objective.dependencies) : null,
      objective.completion_criteria || null,
      objective.progress_pct || 0,
      objective.started_at || null,
      objective.completed_at || null,
      objective.due_at || null,
      objective.metadata ? JSON.stringify(objective.metadata) : null,
      now,
      now
    );

    return { objective_id: objective.objective_id, changes: info.changes };
  }

  updateObjective(objectiveId, updates, changedBy = 'system') {
    this._ensureInitialized();

    const current = this.getObjective(objectiveId);
    if (!current) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    const allowedFields = ['objective_name', 'objective_type', 'status', 'priority',
                           'assigned_to', 'blocked_reason', 'dependencies', 'completion_criteria',
                           'progress_pct', 'started_at', 'completed_at', 'due_at', 'metadata',
                           // Phase 10.1 reconciliation fields
                           'reconciliation_status', 'reconciliation_attempt_count', 'reconciliation_started_at',
                           'reconciliation_cooldown_until', 'reconciliation_last_result', 'reconciliation_last_error',
                           'reconciliation_last_execution_id', 'reconciliation_last_verified_at',
                           'reconciliation_generation', 'manual_hold',
                           // Phase 10.2 circuit breaker fields
                           'policy_ref', 'consecutive_failures', 'total_failures', 'total_attempts',
                           'last_failure_at', 'last_attempt_at', 'degraded_reason',
                           // Phase 10.3 execution timeout fields
                           'active_attempt_id', 'execution_started_at', 'execution_deadline_at',
                           'cancel_requested_at', 'execution_terminated_at', 'last_terminal_reason',
                           'last_timeout_at', 'termination_result'];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);

        if (field === 'dependencies' || field === 'metadata') {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }

        if (field === 'status' || field === 'priority' || field === 'progress_pct') {
          this._recordTransition('objective', objectiveId, field, current[field], updates[field], changedBy);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(objectiveId);

    const query = `UPDATE managed_objectives SET ${fields.join(', ')} WHERE objective_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  deleteObjective(objectiveId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM objectives WHERE objective_id = ?');
    const info = stmt.run(objectiveId);
    return { changes: info.changes };
  }

  // ============================================================
  // RUNTIME CONTEXT
  // ============================================================

  listRuntimeContext(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM runtime_context WHERE 1=1';
    const params = [];

    if (filters.context_type) {
      query += ' AND context_type = ?';
      params.push(filters.context_type);
    }

    // Filter out expired entries
    query += ' AND (expires_at IS NULL OR expires_at > datetime(\'now\'))';

    query += ' ORDER BY context_key ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getRuntimeContext(contextKey) {
    this._ensureInitialized();
    const stmt = this.db.prepare(`
      SELECT * FROM runtime_context 
      WHERE context_key = ? 
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `);
    return stmt.get(contextKey);
  }

  setRuntimeContext(contextKey, contextValue, options = {}) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    
    // Check if key exists
    const existing = this.db.prepare('SELECT context_key FROM runtime_context WHERE context_key = ?').get(contextKey);

    if (existing) {
      // Update
      const stmt = this.db.prepare(`
        UPDATE runtime_context 
        SET context_value = ?, context_type = ?, expires_at = ?, metadata = ?, updated_at = ?
        WHERE context_key = ?
      `);

      const info = stmt.run(
        contextValue,
        options.context_type || null,
        options.expires_at || null,
        options.metadata ? JSON.stringify(options.metadata) : null,
        now,
        contextKey
      );

      return { context_key: contextKey, changes: info.changes };
    } else {
      // Insert
      const stmt = this.db.prepare(`
        INSERT INTO runtime_context (
          context_key, context_value, context_type, expires_at, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        contextKey,
        contextValue,
        options.context_type || null,
        options.expires_at || null,
        options.metadata ? JSON.stringify(options.metadata) : null,
        now,
        now
      );

      return { context_key: contextKey, changes: info.changes };
    }
  }

  deleteRuntimeContext(contextKey) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM runtime_context WHERE context_key = ?');
    const info = stmt.run(contextKey);
    return { changes: info.changes };
  }

  // ============================================================
  // SAFE MODE (Phase 10.4)
  // ============================================================

  /**
   * Get current safe mode status
   * @returns {Object} { active: boolean, reason: string|null, entered_at: string|null, entered_by: string|null }
   */
  getSafeModeStatus() {
    this._ensureInitialized();
    
    const activeRow = this.getRuntimeContext('safe_mode_active');
    const reasonRow = this.getRuntimeContext('safe_mode_reason');
    const enteredAtRow = this.getRuntimeContext('safe_mode_entered_at');
    const enteredByRow = this.getRuntimeContext('safe_mode_entered_by');
    
    return {
      active: activeRow?.context_value === 'true',
      reason: (reasonRow?.context_value && reasonRow.context_value !== '') ? reasonRow.context_value : null,
      entered_at: (enteredAtRow?.context_value && enteredAtRow.context_value !== '') ? enteredAtRow.context_value : null,
      entered_by: (enteredByRow?.context_value && enteredByRow.context_value !== '') ? enteredByRow.context_value : null,
    };
  }

  /**
   * Enable safe mode (suspends autonomous reconciliation admission)
   * @param {string} reason - Why safe mode was enabled
   * @param {string} operator - Who enabled it (operator name or 'system')
   * @param {Object} context - Optional intent context (intent_id, etc.)
   */
  enableSafeMode(reason, operator = 'system', context = {}) {
    // HYBRID ENFORCEMENT (Phase 11): Log if no intent context
    if (!context.intent_id && operator !== 'system') {
      console.warn('[DIRECT_ACTION_BYPASS] action=enableSafeMode operator=' + operator + ' source=direct migration_required=true');
      console.warn('[DIRECT_ACTION_BYPASS] Direct safe mode control without intent context. Use IntentGateway.submitIntent() instead.');
    }
    this._ensureInitialized();
    
    const now = new Date().toISOString();
    
    this.setRuntimeContext('safe_mode_active', 'true', { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_reason', reason, { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_entered_at', now, { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_entered_by', operator, { context_type: 'mode' });
    
    // Record system event
    this.recordSystemEvent('safe_mode_entered', {
      reason,
      entered_by: operator,
      trigger: operator === 'system' ? 'automatic' : 'manual',
    });
    
    console.log(`[StateGraph] Safe mode enabled by ${operator}: ${reason}`);
  }

  /**
   * Disable safe mode (resume autonomous reconciliation)
   * @param {string} operator - Who disabled it (operator name or 'system')
   * @param {Object} context - Optional intent context (intent_id, etc.)
   */
  disableSafeMode(operator = 'system', context = {}) {
    // HYBRID ENFORCEMENT (Phase 11): Log if no intent context
    if (!context.intent_id && operator !== 'system') {
      console.warn('[DIRECT_ACTION_BYPASS] action=disableSafeMode operator=' + operator + ' source=direct migration_required=true');
      console.warn('[DIRECT_ACTION_BYPASS] Direct safe mode control without intent context. Use IntentGateway.submitIntent() instead.');
    }
    this._ensureInitialized();
    
    const status = this.getSafeModeStatus();
    
    // Record system event before clearing
    if (status.active && status.entered_at) {
      const durationMs = Date.now() - new Date(status.entered_at).getTime();
      
      this.recordSystemEvent('safe_mode_released', {
        duration_seconds: Math.floor(durationMs / 1000),
        released_by: operator,
        trigger: operator === 'system' ? 'automatic' : 'manual',
      });
    }
    
    // Clear runtime context (use empty string for nullable fields)
    this.setRuntimeContext('safe_mode_active', 'false', { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_reason', '', { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_entered_at', '', { context_type: 'mode' });
    this.setRuntimeContext('safe_mode_entered_by', '', { context_type: 'mode' });
    
    console.log(`[StateGraph] Safe mode disabled by ${operator}`);
  }

  /**
   * Record system lifecycle event (safe mode, etc.)
   * @param {string} eventType - Event type (without 'system.' prefix)
   * @param {Object} metadata - Event metadata
   */
  recordSystemEvent(eventType, metadata) {
    this._ensureInitialized();
    
    const now = new Date().toISOString();
    
    // Use appendLedgerEvent for proper handling
    // Safe mode affects policy stage (governance override)
    this.appendLedgerEvent({
      execution_id: 'system-' + Date.now(),
      event_type: 'system.' + eventType,
      stage: 'policy',
      actor_type: 'system',
      actor_id: 'vienna-os',
      event_timestamp: now,
      payload_json: metadata,
    });
  }

  // ============================================================
  // ENDPOINTS
  // ============================================================

  listEndpoints(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM endpoints WHERE 1=1';
    const params = [];

    if (filters.endpoint_type) {
      query += ' AND endpoint_type = ?';
      params.push(filters.endpoint_type);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.health) {
      query += ' AND health = ?';
      params.push(filters.health);
    }

    query += ' ORDER BY endpoint_name ASC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getEndpoint(endpointId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM endpoints WHERE endpoint_id = ?');
    return stmt.get(endpointId);
  }

  createEndpoint(endpoint) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO endpoints (
        endpoint_id, endpoint_type, endpoint_name, status, health,
        connectivity, last_heartbeat, last_successful_action,
        capabilities, version, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      endpoint.endpoint_id,
      endpoint.endpoint_type,
      endpoint.endpoint_name,
      endpoint.status,
      endpoint.health,
      endpoint.connectivity || null,
      endpoint.last_heartbeat || null,
      endpoint.last_successful_action || null,
      endpoint.capabilities || null,
      endpoint.version || null,
      endpoint.metadata || null,
      now,
      now
    );

    return { endpoint_id: endpoint.endpoint_id, changes: info.changes };
  }

  updateEndpoint(endpointId, updates, changedBy = 'system') {
    this._ensureInitialized();

    const current = this.getEndpoint(endpointId);
    if (!current) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    const allowedFields = ['endpoint_type', 'endpoint_name', 'status', 'health',
                           'connectivity', 'last_heartbeat', 'last_successful_action',
                           'capabilities', 'version', 'metadata'];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        params.push(updates[field]);

        if (field === 'status' || field === 'health' || field === 'connectivity') {
          this._recordTransition('endpoint', endpointId, field, current[field], updates[field], changedBy);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(endpointId);

    const query = `UPDATE endpoints SET ${fields.join(', ')} WHERE endpoint_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  deleteEndpoint(endpointId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM endpoints WHERE endpoint_id = ?');
    const info = stmt.run(endpointId);
    return { changes: info.changes };
  }

  // ============================================================
  // ENDPOINT INSTRUCTIONS
  // ============================================================

  listEndpointInstructions(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM endpoint_instructions WHERE 1=1';
    const params = [];

    if (filters.endpoint_id) {
      query += ' AND endpoint_id = ?';
      params.push(filters.endpoint_id);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.risk_tier) {
      query += ' AND risk_tier = ?';
      params.push(filters.risk_tier);
    }

    query += ' ORDER BY issued_at DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getEndpointInstruction(instructionId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM endpoint_instructions WHERE instruction_id = ?');
    return stmt.get(instructionId);
  }

  createEndpointInstruction(instruction) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT INTO endpoint_instructions (
        instruction_id, endpoint_id, instruction_type, action, risk_tier,
        warrant_id, issued_by, issued_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      instruction.instruction_id,
      instruction.endpoint_id,
      instruction.instruction_type,
      instruction.action,
      instruction.risk_tier,
      instruction.warrant_id || null,
      instruction.issued_by,
      instruction.issued_at,
      instruction.status
    );

    return { instruction_id: instruction.instruction_id, changes: info.changes };
  }

  updateEndpointInstruction(instructionId, updates) {
    this._ensureInitialized();

    const current = this.getEndpointInstruction(instructionId);
    if (!current) {
      throw new Error(`Endpoint instruction not found: ${instructionId}`);
    }

    const fields = [];
    const params = [];

    const allowedFields = ['status', 'completed_at', 'result', 'error', 'duration_ms'];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    params.push(instructionId);

    const query = `UPDATE endpoint_instructions SET ${fields.join(', ')} WHERE instruction_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  // ============================================================
  // PLANS
  // ============================================================

  /**
   * List plans (with optional filters)
   */
  listPlans(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM plans WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.risk_tier) {
      query += ' AND risk_tier = ?';
      params.push(filters.risk_tier);
    }
    if (filters.warrant_id) {
      query += ' AND warrant_id = ?';
      params.push(filters.warrant_id);
    }
    if (filters.intent_id) {
      query += ' AND intent_id = ?';
      params.push(filters.intent_id);
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    const plans = stmt.all(...params);

    // Parse JSON fields
    return plans.map(plan => ({
      ...plan,
      steps: plan.steps ? JSON.parse(plan.steps) : [],
      preconditions: plan.preconditions ? JSON.parse(plan.preconditions) : [],
      postconditions: plan.postconditions ? JSON.parse(plan.postconditions) : [],
      verification_spec: plan.verification_spec ? JSON.parse(plan.verification_spec) : null,
      result: plan.result ? JSON.parse(plan.result) : null,
      metadata: plan.metadata ? JSON.parse(plan.metadata) : {}
    }));
  }

  /**
   * Get plan by ID
   */
  getPlan(planId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM plans WHERE plan_id = ?');
    const plan = stmt.get(planId);

    if (!plan) return null;

    // Parse JSON fields
    return {
      ...plan,
      steps: plan.steps ? JSON.parse(plan.steps) : [],
      preconditions: plan.preconditions ? JSON.parse(plan.preconditions) : [],
      postconditions: plan.postconditions ? JSON.parse(plan.postconditions) : [],
      verification_spec: plan.verification_spec ? JSON.parse(plan.verification_spec) : null,
      result: plan.result ? JSON.parse(plan.result) : null,
      metadata: plan.metadata ? JSON.parse(plan.metadata) : {}
    };
  }

  /**
   * Create plan
   */
  createPlan(plan) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO plans (
        plan_id, objective, intent_id, steps, preconditions, postconditions,
        risk_tier, estimated_duration_ms, status, verification_spec, warrant_id, execution_id,
        result, error, actual_duration_ms, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      plan.plan_id,
      plan.objective,
      plan.intent_id || null,
      JSON.stringify(plan.steps),
      plan.preconditions ? JSON.stringify(plan.preconditions) : null,
      plan.postconditions ? JSON.stringify(plan.postconditions) : null,
      plan.risk_tier,
      plan.estimated_duration_ms || null,
      plan.status,
      plan.verification_spec ? JSON.stringify(plan.verification_spec) : null,
      plan.warrant_id || null,
      plan.execution_id || null,
      plan.result ? JSON.stringify(plan.result) : null,
      plan.error || null,
      plan.actual_duration_ms || null,
      plan.metadata ? JSON.stringify(plan.metadata) : null,
      now,
      now
    );

    return { plan_id: plan.plan_id, changes: info.changes };
  }

  /**
   * Update plan
   */
  updatePlan(planId, updates) {
    this._ensureInitialized();

    const current = this.getPlan(planId);
    if (!current) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const fields = [];
    const params = [];

    const allowedFields = [
      'status', 'warrant_id', 'execution_id', 'result', 'error',
      'actual_duration_ms', 'metadata'
    ];

    const now = new Date().toISOString();
    fields.push('updated_at = ?');
    params.push(now);

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        
        // Handle JSON fields
        if (['result', 'metadata'].includes(field)) {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }

        // Record state transition
        if (field === 'status') {
          this._recordTransition('plan', planId, 'status', current.status, updates[field], updates.changed_by || 'system');
        }
      }
    }

    if (fields.length === 1) { // Only updated_at
      return { changes: 0 };
    }

    params.push(planId);

    const query = `UPDATE plans SET ${fields.join(', ')} WHERE plan_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  /**
   * Delete plan
   */
  deletePlan(planId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM plans WHERE plan_id = ?');
    const info = stmt.run(planId);
    return { changes: info.changes };
  }

  // ============================================================
  // VERIFICATIONS
  // ============================================================

  /**
   * List verifications (with optional filters)
   */
  listVerifications(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM verifications WHERE 1=1';
    const params = [];

    if (filters.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filters.plan_id);
    }
    if (filters.execution_id) {
      query += ' AND execution_id = ?';
      params.push(filters.execution_id);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.objective_achieved !== undefined) {
      query += ' AND objective_achieved = ?';
      params.push(filters.objective_achieved ? 1 : 0);
    }

    query += ' ORDER BY started_at DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    const verifications = stmt.all(...params);

    // Parse JSON fields
    return verifications.map(v => ({
      ...v,
      objective_achieved: v.objective_achieved === 1,
      evidence_json: v.evidence_json ? JSON.parse(v.evidence_json) : null,
      metadata: v.metadata ? JSON.parse(v.metadata) : {}
    }));
  }

  /**
   * Get verification by ID
   */
  getVerification(verificationId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM verifications WHERE verification_id = ?');
    const verification = stmt.get(verificationId);

    if (!verification) return null;

    // Parse JSON fields
    return {
      ...verification,
      objective_achieved: verification.objective_achieved === 1,
      evidence_json: verification.evidence_json ? JSON.parse(verification.evidence_json) : null,
      metadata: verification.metadata ? JSON.parse(verification.metadata) : {}
    };
  }

  /**
   * Create verification
   */
  createVerification(verification) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO verifications (
        verification_id, plan_id, execution_id, verification_type, status,
        objective_achieved, verification_strength_target, verification_strength_achieved,
        started_at, completed_at, duration_ms, summary, evidence_json, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      verification.verification_id,
      verification.plan_id,
      verification.execution_id || null,
      verification.verification_type,
      verification.status,
      verification.objective_achieved ? 1 : 0,
      verification.verification_strength_target || null,
      verification.verification_strength_achieved || null,
      verification.started_at,
      verification.completed_at || null,
      verification.duration_ms || null,
      verification.summary || null,
      verification.evidence_json ? JSON.stringify(verification.evidence_json) : null,
      verification.metadata ? JSON.stringify(verification.metadata) : null,
      now
    );

    return { verification_id: verification.verification_id, changes: info.changes };
  }

  /**
   * Update verification
   */
  updateVerification(verificationId, updates) {
    this._ensureInitialized();

    const current = this.getVerification(verificationId);
    if (!current) {
      throw new Error(`Verification not found: ${verificationId}`);
    }

    const fields = [];
    const params = [];

    const allowedFields = [
      'status', 'objective_achieved', 'verification_strength_achieved',
      'completed_at', 'duration_ms', 'summary', 'evidence_json', 'metadata'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        
        // Handle JSON and boolean fields
        if (field === 'objective_achieved') {
          params.push(updates[field] ? 1 : 0);
        } else if (['evidence_json', 'metadata'].includes(field)) {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    params.push(verificationId);

    const query = `UPDATE verifications SET ${fields.join(', ')} WHERE verification_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  /**
   * Delete verification
   */
  deleteVerification(verificationId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM verifications WHERE verification_id = ?');
    const info = stmt.run(verificationId);
    return { changes: info.changes };
  }

  // ============================================================
  // WORKFLOW OUTCOMES
  // ============================================================

  /**
   * List workflow outcomes (with optional filters)
   */
  listWorkflowOutcomes(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM workflow_outcomes WHERE 1=1';
    const params = [];

    if (filters.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filters.plan_id);
    }
    if (filters.workflow_status) {
      query += ' AND workflow_status = ?';
      params.push(filters.workflow_status);
    }
    if (filters.objective_achieved !== undefined) {
      query += ' AND objective_achieved = ?';
      params.push(filters.objective_achieved ? 1 : 0);
    }
    if (filters.risk_tier) {
      query += ' AND risk_tier = ?';
      params.push(filters.risk_tier);
    }
    if (filters.created_since) {
      query += ' AND finalized_at > ?';
      params.push(filters.created_since);
    }

    if (filters.limit) {
      query += ` ORDER BY finalized_at DESC LIMIT ${parseInt(filters.limit, 10)}`;
    } else {
      query += ' ORDER BY finalized_at DESC LIMIT 1000';
    }

    const stmt = this.db.prepare(query);
    const outcomes = stmt.all(...params);

    // Parse JSON fields
    return outcomes.map(o => ({
      ...o,
      objective_achieved: o.objective_achieved === 1,
      next_actions: o.next_actions ? JSON.parse(o.next_actions) : [],
      metadata: o.metadata ? JSON.parse(o.metadata) : {}
    }));
  }

  /**
   * Get workflow outcome by ID
   */
  getWorkflowOutcome(outcomeId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM workflow_outcomes WHERE outcome_id = ?');
    const outcome = stmt.get(outcomeId);

    if (!outcome) return null;

    // Parse JSON fields
    return {
      ...outcome,
      objective_achieved: outcome.objective_achieved === 1,
      next_actions: outcome.next_actions ? JSON.parse(outcome.next_actions) : [],
      metadata: outcome.metadata ? JSON.parse(outcome.metadata) : {}
    };
  }

  /**
   * Get workflow outcome by plan ID
   */
  getWorkflowOutcomeByPlan(planId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM workflow_outcomes WHERE plan_id = ? ORDER BY finalized_at DESC LIMIT 1');
    const outcome = stmt.get(planId);

    if (!outcome) return null;

    // Parse JSON fields
    return {
      ...outcome,
      objective_achieved: outcome.objective_achieved === 1,
      next_actions: outcome.next_actions ? JSON.parse(outcome.next_actions) : [],
      metadata: outcome.metadata ? JSON.parse(outcome.metadata) : {}
    };
  }

  /**
   * Create workflow outcome
   */
  createWorkflowOutcome(outcome) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO workflow_outcomes (
        outcome_id, plan_id, execution_id, verification_id, workflow_status,
        execution_status, verification_status, objective_achieved, risk_tier,
        finalized_at, operator_visible_summary, next_actions, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      outcome.outcome_id,
      outcome.plan_id,
      outcome.execution_id || null,
      outcome.verification_id || null,
      outcome.workflow_status,
      outcome.execution_status || null,
      outcome.verification_status || null,
      outcome.objective_achieved ? 1 : 0,
      outcome.risk_tier,
      outcome.finalized_at,
      outcome.operator_visible_summary || null,
      outcome.next_actions ? JSON.stringify(outcome.next_actions) : null,
      outcome.metadata ? JSON.stringify(outcome.metadata) : null,
      now
    );

    return { outcome_id: outcome.outcome_id, changes: info.changes };
  }

  /**
   * Update workflow outcome
   */
  updateWorkflowOutcome(outcomeId, updates) {
    this._ensureInitialized();

    const current = this.getWorkflowOutcome(outcomeId);
    if (!current) {
      throw new Error(`Workflow outcome not found: ${outcomeId}`);
    }

    const fields = [];
    const params = [];

    const allowedFields = [
      'workflow_status', 'execution_status', 'verification_status',
      'objective_achieved', 'operator_visible_summary', 'next_actions', 'metadata'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        
        // Handle JSON and boolean fields
        if (field === 'objective_achieved') {
          params.push(updates[field] ? 1 : 0);
        } else if (['next_actions', 'metadata'].includes(field)) {
          params.push(updates[field] ? JSON.stringify(updates[field]) : null);
        } else {
          params.push(updates[field]);
        }
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    params.push(outcomeId);

    const query = `UPDATE workflow_outcomes SET ${fields.join(', ')} WHERE outcome_id = ?`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(...params);

    return { changes: info.changes };
  }

  /**
   * Delete workflow outcome
   */
  deleteWorkflowOutcome(outcomeId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('DELETE FROM workflow_outcomes WHERE outcome_id = ?');
    const info = stmt.run(outcomeId);
    return { changes: info.changes };
  }

  // ============================================================
  // EXECUTION LEDGER
  // ============================================================

  /**
   * Append execution ledger event (immutable)
   * 
   * Design: Events are append-only lifecycle facts. Summary is derived projection.
   * Projection rules apply event → summary updates deterministically.
   * 
   * @param {Object} event - Event to append
   * @returns {Object} { event_id, changes }
   */
  appendLedgerEvent(event) {
    this._ensureInitialized();

    // Auto-generate event_id if not provided
    if (!event.event_id) {
      event.event_id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Auto-generate sequence_num if not provided (use max + 1 for this execution_id)
    if (!event.sequence_num) {
      const maxSeq = this.db.prepare(
        'SELECT COALESCE(MAX(sequence_num), 0) as max_seq FROM execution_ledger_events WHERE execution_id = ?'
      ).get(event.execution_id);
      event.sequence_num = (maxSeq?.max_seq || 0) + 1;
    }

    // Validate required fields
    const required = ['event_id', 'execution_id', 'event_type', 'stage', 'event_timestamp'];
    for (const field of required) {
      if (event[field] === undefined || event[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate stage enum
    const validStages = ['intent', 'plan', 'policy', 'warrant', 'execution', 'verification', 'outcome'];
    if (!validStages.includes(event.stage)) {
      throw new Error(`Invalid stage: ${event.stage}. Must be one of: ${validStages.join(', ')}`);
    }

    // Validate risk_tier if present
    if (event.risk_tier && !['T0', 'T1', 'T2'].includes(event.risk_tier)) {
      throw new Error(`Invalid risk_tier: ${event.risk_tier}. Must be T0, T1, or T2`);
    }

    const now = new Date().toISOString();

    // Insert event (append-only)
    const stmt = this.db.prepare(`
      INSERT INTO execution_ledger_events (
        event_id, execution_id, plan_id, verification_id, warrant_id, outcome_id,
        event_type, stage, actor_type, actor_id, environment, risk_tier,
        objective, target_type, target_id, event_timestamp, sequence_num,
        status, payload_json, evidence_json, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      event.event_id,
      event.execution_id,
      event.plan_id || null,
      event.verification_id || null,
      event.warrant_id || null,
      event.outcome_id || null,
      event.event_type,
      event.stage,
      event.actor_type || null,
      event.actor_id || null,
      event.environment || this.environment,
      event.risk_tier || null,
      event.objective || null,
      event.target_type || null,
      event.target_id || null,
      event.event_timestamp,
      event.sequence_num,
      event.status || null,
      event.payload_json ? JSON.stringify(event.payload_json) : null,
      event.evidence_json ? JSON.stringify(event.evidence_json) : null,
      event.summary || null,
      now
    );

    // Project event into summary
    this._projectEventIntoSummary(event);

    return { event_id: event.event_id, changes: info.changes };
  }

  /**
   * Project event into summary (deterministic)
   * Internal method - called by appendLedgerEvent
   * 
   * @param {Object} event - Event to project
   */
  _projectEventIntoSummary(event) {
    this._ensureInitialized();

    // Load or create summary
    let summary = this.getExecutionLedgerSummary(event.execution_id);
    const payload = event.payload_json || {};

    if (!summary) {
      // Create initial summary from first event
      summary = {
        execution_id: event.execution_id,
        plan_id: event.plan_id || null,
        verification_id: event.verification_id || null,
        warrant_id: event.warrant_id || null,
        outcome_id: event.outcome_id || null,
        actor_type: event.actor_type || null,
        actor_id: event.actor_id || null,
        environment: event.environment || this.environment,
        risk_tier: event.risk_tier || null,
        objective: event.objective || null,
        target_type: event.target_type || null,
        target_id: event.target_id || null,
        current_stage: event.stage,
        execution_status: null,
        verification_status: null,
        workflow_status: null,
        objective_achieved: null,
        approval_required: null,
        approval_status: null,
        started_at: event.event_timestamp,
        completed_at: null,
        duration_ms: null,
        event_count: 1,
        last_event_type: event.event_type,
        last_event_timestamp: event.event_timestamp,
        summary: event.summary || null,
        entities_json: null
      };
    } else {
      // Update summary from event
      summary.event_count += 1;
      summary.last_event_type = event.event_type;
      summary.last_event_timestamp = event.event_timestamp;

      // Link IDs if not already set
      if (event.plan_id && !summary.plan_id) summary.plan_id = event.plan_id;
      if (event.verification_id && !summary.verification_id) summary.verification_id = event.verification_id;
      if (event.warrant_id && !summary.warrant_id) summary.warrant_id = event.warrant_id;
      if (event.outcome_id && !summary.outcome_id) summary.outcome_id = event.outcome_id;
    }

    // Apply projection rules by event type (for both new and existing summaries)
    switch (event.event_type) {
        case 'intent_received':
        case 'intent_classified':
          summary.current_stage = 'intent';
          break;

        case 'plan_created':
          summary.current_stage = 'plan';
          if (payload.objective) summary.objective = payload.objective;
          if (payload.target_type) summary.target_type = payload.target_type;
          if (payload.target_id) summary.target_id = payload.target_id;
          if (payload.risk_tier) summary.risk_tier = payload.risk_tier;
          break;

        case 'policy_evaluated_requires_approval':
          summary.current_stage = 'policy';
          summary.approval_required = 1;
          summary.approval_status = 'pending';
          break;

        case 'approval_requested':
          summary.approval_required = 1;
          summary.approval_status = 'pending';
          break;

        case 'approval_granted':
          summary.approval_status = 'approved';
          break;

        case 'approval_denied':
          summary.approval_status = 'denied';
          summary.workflow_status = 'denied';
          summary.completed_at = event.event_timestamp;
          break;

        case 'warrant_issued':
          summary.current_stage = 'warrant';
          break;

        case 'execution_dispatched':
        case 'execution_started':
          summary.current_stage = 'execution';
          summary.execution_status = 'running';
          break;

        case 'execution_completed':
          summary.execution_status = 'success';
          break;

        case 'execution_failed':
          summary.execution_status = 'failed';
          summary.workflow_status = 'execution_failed';
          summary.completed_at = event.event_timestamp;
          break;

        case 'execution_timed_out':
          summary.execution_status = 'timed_out';
          summary.workflow_status = 'timed_out';
          summary.completed_at = event.event_timestamp;
          break;

        case 'verification_started':
          summary.current_stage = 'verification';
          summary.verification_status = 'running';
          break;

        case 'verification_completed':
          summary.verification_status = 'success';
          if (payload.objective_achieved === true) {
            summary.objective_achieved = 1;
          }
          break;

        case 'verification_failed':
          summary.verification_status = 'failed';
          summary.workflow_status = 'verification_failed';
          summary.objective_achieved = 0;
          summary.completed_at = event.event_timestamp;
          break;

        case 'verification_inconclusive':
          summary.verification_status = 'inconclusive';
          summary.workflow_status = 'inconclusive';
          summary.objective_achieved = 0;
          summary.completed_at = event.event_timestamp;
          break;

        case 'verification_skipped':
          summary.verification_status = 'skipped';
          break;

        case 'workflow_outcome_finalized':
          summary.current_stage = 'outcome';
          if (payload.workflow_status) summary.workflow_status = payload.workflow_status;
          if (typeof payload.objective_achieved === 'boolean') {
            summary.objective_achieved = payload.objective_achieved ? 1 : 0;
          }
          if (payload.final_summary) summary.summary = payload.final_summary;
          summary.completed_at = event.event_timestamp;
          if (summary.started_at && summary.completed_at) {
            const start = new Date(summary.started_at).getTime();
            const end = new Date(summary.completed_at).getTime();
            summary.duration_ms = end - start;
          }
          break;
      }

    // Upsert summary
    const now = new Date().toISOString();
    const upsert = this.db.prepare(`
      INSERT INTO execution_ledger_summary (
        execution_id, plan_id, verification_id, warrant_id, outcome_id,
        actor_type, actor_id, environment, risk_tier,
        objective, target_type, target_id,
        current_stage, execution_status, verification_status, workflow_status, objective_achieved,
        approval_required, approval_status,
        started_at, completed_at, duration_ms,
        event_count, last_event_type, last_event_timestamp,
        summary, entities_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(execution_id) DO UPDATE SET
        plan_id = excluded.plan_id,
        verification_id = excluded.verification_id,
        warrant_id = excluded.warrant_id,
        outcome_id = excluded.outcome_id,
        actor_type = excluded.actor_type,
        actor_id = excluded.actor_id,
        environment = excluded.environment,
        risk_tier = excluded.risk_tier,
        objective = excluded.objective,
        target_type = excluded.target_type,
        target_id = excluded.target_id,
        current_stage = excluded.current_stage,
        execution_status = excluded.execution_status,
        verification_status = excluded.verification_status,
        workflow_status = excluded.workflow_status,
        objective_achieved = excluded.objective_achieved,
        approval_required = excluded.approval_required,
        approval_status = excluded.approval_status,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        duration_ms = excluded.duration_ms,
        event_count = excluded.event_count,
        last_event_type = excluded.last_event_type,
        last_event_timestamp = excluded.last_event_timestamp,
        summary = excluded.summary,
        entities_json = excluded.entities_json,
        updated_at = excluded.updated_at
    `);

    upsert.run(
      summary.execution_id,
      summary.plan_id,
      summary.verification_id,
      summary.warrant_id,
      summary.outcome_id,
      summary.actor_type,
      summary.actor_id,
      summary.environment,
      summary.risk_tier,
      summary.objective,
      summary.target_type,
      summary.target_id,
      summary.current_stage,
      summary.execution_status,
      summary.verification_status,
      summary.workflow_status,
      summary.objective_achieved,
      summary.approval_required,
      summary.approval_status,
      summary.started_at,
      summary.completed_at,
      summary.duration_ms,
      summary.event_count,
      summary.last_event_type,
      summary.last_event_timestamp,
      summary.summary,
      summary.entities_json,
      summary.created_at || now,
      now
    );
  }

  /**
   * Get execution ledger summary by execution_id
   */
  getExecutionLedgerSummary(executionId) {
    this._ensureInitialized();
    const stmt = this.db.prepare('SELECT * FROM execution_ledger_summary WHERE execution_id = ?');
    const summary = stmt.get(executionId);

    if (!summary) return null;

    // Parse JSON fields
    return {
      ...summary,
      entities_json: summary.entities_json ? JSON.parse(summary.entities_json) : null
    };
  }

  /**
   * Get execution ledger events by execution_id
   */
  getExecutionLedgerEvents(executionId) {
    this._ensureInitialized();
    const stmt = this.db.prepare(`
      SELECT * FROM execution_ledger_events
      WHERE execution_id = ?
      ORDER BY sequence_num ASC, event_timestamp ASC
    `);
    const events = stmt.all(executionId);

    // Parse JSON fields
    return events.map(event => ({
      ...event,
      payload_json: event.payload_json ? JSON.parse(event.payload_json) : null,
      evidence_json: event.evidence_json ? JSON.parse(event.evidence_json) : null
    }));
  }

  /**
   * List execution ledger summaries (with filters)
   */
  listExecutionLedgerSummaries(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM execution_ledger_summary WHERE 1=1';
    const params = [];

    if (filters.workflow_status) {
      query += ' AND workflow_status = ?';
      params.push(filters.workflow_status);
    }
    if (filters.execution_status) {
      query += ' AND execution_status = ?';
      params.push(filters.execution_status);
    }
    // Support 'status' as alias for 'execution_status' (Phase 18 compatibility)
    if (filters.status) {
      query += ' AND execution_status = ?';
      params.push(filters.status);
    }
    if (filters.risk_tier) {
      query += ' AND risk_tier = ?';
      params.push(filters.risk_tier);
    }
    if (filters.objective) {
      query += ' AND objective = ?';
      params.push(filters.objective);
    }
    if (filters.target_id) {
      query += ' AND target_id = ?';
      params.push(filters.target_id);
    }
    if (filters.actor_id) {
      query += ' AND actor_id = ?';
      params.push(filters.actor_id);
    }
    if (filters.environment) {
      query += ' AND environment = ?';
      params.push(filters.environment);
    }
    if (filters.current_stage) {
      query += ' AND current_stage = ?';
      params.push(filters.current_stage);
    }
    if (filters.objective_achieved !== undefined) {
      query += ' AND objective_achieved = ?';
      params.push(filters.objective_achieved ? 1 : 0);
    }
    if (filters.started_after) {
      query += ' AND started_at > ?';
      params.push(filters.started_after);
    }
    if (filters.started_before) {
      query += ' AND started_at < ?';
      params.push(filters.started_before);
    }
    if (filters.created_since) {
      query += ' AND started_at > ?';
      params.push(filters.created_since);
    }
    if (filters.limit) {
      query += ` ORDER BY started_at DESC LIMIT ${parseInt(filters.limit, 10)}`;
    } else {
      query += ' ORDER BY started_at DESC LIMIT 1000';
    }

    const stmt = this.db.prepare(query);
    const summaries = stmt.all(...params);

    // Parse JSON fields
    return summaries.map(summary => ({
      ...summary,
      entities_json: summary.entities_json ? JSON.parse(summary.entities_json) : null
    }));
  }

  /**
   * Rebuild execution ledger summary from events
   * 
   * Use when summary is corrupted or needs to be regenerated.
   * This is the safety valve that preserves integrity.
   * 
   * @param {string} executionId - Execution to rebuild
   * @returns {Object} Rebuilt summary
   */
  rebuildExecutionLedgerSummary(executionId) {
    this._ensureInitialized();

    // Delete existing summary
    const deleteSummary = this.db.prepare('DELETE FROM execution_ledger_summary WHERE execution_id = ?');
    deleteSummary.run(executionId);

    // Fetch all events for this execution
    const events = this.getExecutionLedgerEvents(executionId);

    if (events.length === 0) {
      throw new Error(`No events found for execution: ${executionId}`);
    }

    // Replay events in order
    for (const event of events) {
      this._projectEventIntoSummary(event);
    }

    // Return rebuilt summary
    return this.getExecutionLedgerSummary(executionId);
  }

  /**
   * Rebuild all execution ledger summaries from events
   * 
   * Use for migrations or corruption recovery.
   * 
   * @returns {Object} { rebuilt: number, failed: string[] }
   */
  rebuildAllExecutionLedgerSummaries() {
    this._ensureInitialized();

    // Get all unique execution_ids
    const stmt = this.db.prepare('SELECT DISTINCT execution_id FROM execution_ledger_events ORDER BY execution_id');
    const executions = stmt.all();

    let rebuilt = 0;
    const failed = [];

    for (const { execution_id } of executions) {
      try {
        this.rebuildExecutionLedgerSummary(execution_id);
        rebuilt++;
      } catch (err) {
        failed.push(execution_id);
        console.error(`Failed to rebuild summary for ${execution_id}:`, err.message);
      }
    }

    return { rebuilt, failed };
  }

  // ============================================================
  // POLICIES
  // ============================================================

  /**
   * Save a policy
   */
  savePolicy(policy) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO policies (
        policy_id, policy_version, policy_json, enabled, priority, description,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(policy_id, policy_version) DO UPDATE SET
        policy_json = excluded.policy_json,
        enabled = excluded.enabled,
        priority = excluded.priority,
        description = excluded.description,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      policy.policy_id,
      policy.policy_version,
      JSON.stringify(policy),
      policy.enabled ? 1 : 0,
      policy.priority,
      policy.description || null,
      now,
      now
    );

    return policy;
  }

  /**
   * Get a policy by ID and version
   */
  getPolicy(policyId, policyVersion) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM policies 
      WHERE policy_id = ? AND policy_version = ?
    `);

    const row = stmt.get(policyId, policyVersion);
    if (!row) return null;

    return JSON.parse(row.policy_json);
  }

  /**
   * List policies with optional filters
   */
  listPolicies(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM policies WHERE 1=1';
    const params = [];

    if (filters.enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(filters.enabled ? 1 : 0);
    }

    if (filters.policy_id) {
      query += ' AND policy_id = ?';
      params.push(filters.policy_id);
    }

    query += ' ORDER BY priority DESC, policy_id ASC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => JSON.parse(row.policy_json));
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId, policyVersion) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      DELETE FROM policies WHERE policy_id = ? AND policy_version = ?
    `);

    const result = stmt.run(policyId, policyVersion);
    return result.changes > 0;
  }

  // ============================================================
  // POLICY DECISIONS
  // ============================================================

  /**
   * Save a policy decision
   */
  savePolicyDecision(decision) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO policy_decisions (
        decision_id, plan_id, policy_id, policy_version, decision,
        decision_json, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      decision.decision_id,
      decision.plan_id,
      decision.policy_id,
      decision.policy_version,
      decision.decision,
      JSON.stringify(decision),
      decision.timestamp,
      now
    );

    return decision;
  }

  /**
   * Get a policy decision by ID
   */
  getPolicyDecision(decisionId) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM policy_decisions WHERE decision_id = ?
    `);

    const row = stmt.get(decisionId);
    if (!row) return null;

    return JSON.parse(row.decision_json);
  }

  /**
   * Get policy decision for a plan
   */
  getPolicyDecisionForPlan(planId) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM policy_decisions WHERE plan_id = ? ORDER BY timestamp DESC LIMIT 1
    `);

    const row = stmt.get(planId);
    if (!row) return null;

    return JSON.parse(row.decision_json);
  }

  /**
   * List policy decisions with optional filters
   */
  listPolicyDecisions(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM policy_decisions WHERE 1=1';
    const params = [];

    if (filters.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filters.plan_id);
    }

    if (filters.policy_id) {
      query += ' AND policy_id = ?';
      params.push(filters.policy_id);
    }

    if (filters.decision) {
      query += ' AND decision = ?';
      params.push(filters.decision);
    }

    if (filters.timestamp_after) {
      query += ' AND timestamp > ?';
      params.push(filters.timestamp_after);
    }

    if (filters.created_since) {
      query += ' AND timestamp > ?';
      params.push(filters.created_since);
    }

    if (filters.limit) {
      query += ` ORDER BY timestamp DESC LIMIT ${parseInt(filters.limit, 10)}`;
    } else {
      query += ' ORDER BY timestamp DESC LIMIT 1000';
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => JSON.parse(row.decision_json));
  }

  // ============================================================
  // MANAGED OBJECTIVES (Phase 9)
  // ============================================================

  /**
   * Create managed objective (with state machine validation)
   */
  createObjective(objective) {
    this._ensureInitialized();

    // Validate objective schema
    const { validateObjective } = require('../core/objective-schema');
    const validation = validateObjective(objective);
    if (!validation.valid) {
      throw new Error(`Invalid objective: ${validation.errors.join(', ')}`);
    }

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO managed_objectives (
        objective_id, objective_type, target_type, target_id, environment, status,
        desired_state_json, remediation_plan, evaluation_interval_seconds,
        verification_strength, priority, owner, context_json,
        reconciliation_status, reconciliation_attempt_count, reconciliation_started_at,
        reconciliation_cooldown_until, reconciliation_last_result, reconciliation_last_error,
        reconciliation_last_execution_id, reconciliation_last_verified_at,
        reconciliation_generation, manual_hold,
        created_at, updated_at, is_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      objective.objective_id,
      objective.objective_type || 'custom',
      objective.target_type || 'service',
      objective.target_id,
      this.environment,
      objective.status,
      JSON.stringify(objective.desired_state),
      objective.remediation_plan,
      objective.evaluation_interval_seconds || this._parseInterval(objective.evaluation_interval),
      objective.verification_strength,
      objective.priority || 100,
      objective.owner || 'system',
      JSON.stringify(objective.context || {}),
      objective.reconciliation_status || 'idle',
      objective.reconciliation_attempt_count || 0,
      objective.reconciliation_started_at || null,
      objective.reconciliation_cooldown_until || null,
      objective.reconciliation_last_result || null,
      objective.reconciliation_last_error || null,
      objective.reconciliation_last_execution_id || null,
      objective.reconciliation_last_verified_at || null,
      objective.reconciliation_generation || 0,
      objective.manual_hold !== undefined ? (objective.manual_hold ? 1 : 0) : 0,
      objective.created_at || now,
      objective.updated_at || now,
      objective.is_enabled !== undefined ? (objective.is_enabled ? 1 : 0) : 1
    );

    return this.getObjective(objective.objective_id);
  }

  /**
   * Get objective by ID
   */
  getObjective(objectiveId) {
    this._ensureInitialized();

    const stmt = this.db.prepare('SELECT * FROM managed_objectives WHERE objective_id = ?');
    const row = stmt.get(objectiveId);

    if (!row) return null;

    return this._parseObjectiveRow(row);
  }

  /**
   * List objectives (with optional filters)
   */
  listObjectives(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM managed_objectives WHERE environment = ?';
    const params = [this.environment];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.target_id) {
      query += ' AND target_id = ?';
      params.push(filters.target_id);
    }
    if (filters.target_type) {
      query += ' AND target_type = ?';
      params.push(filters.target_type);
    }
    if (filters.is_enabled !== undefined) {
      query += ' AND is_enabled = ?';
      params.push(filters.is_enabled ? 1 : 0);
    }
    if (filters.reconciliation_status) {
      query += ' AND reconciliation_status = ?';
      params.push(filters.reconciliation_status);
    }

    query += ' ORDER BY priority ASC, created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => this._parseObjectiveRow(row));
  }

  /**
   * Update objective (general update)
   */
  updateObjective(objectiveId, updates) {
    this._ensureInitialized();

    const objective = this.getObjective(objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const allowedFields = [
      'desired_state_json',
      'remediation_plan',
      'evaluation_interval_seconds',
      'verification_strength',
      'priority',
      'is_enabled',
      'context_json',
      // Phase 10.1: Reconciliation state fields
      'reconciliation_status',
      'reconciliation_attempt_count',
      'reconciliation_started_at',
      'reconciliation_cooldown_until',
      'reconciliation_last_result',
      'reconciliation_last_error',
      'reconciliation_last_execution_id',
      'reconciliation_last_verified_at',
      'reconciliation_generation',
      'manual_hold',
      // Phase 10.2: Circuit breaker status fields
      'policy_ref',
      'consecutive_failures',
      'total_failures',
      'total_attempts',
      'last_failure_at',
      'last_attempt_at',
      'degraded_reason',
      // Phase 10.3: Execution timeout fields
      'active_attempt_id',
      'execution_started_at',
      'execution_deadline_at',
      'cancel_requested_at',
      'execution_terminated_at',
      'last_terminal_reason',
      'last_timeout_at',
      'termination_result',
      'updated_at'
    ];

    const updateFields = [];
    const params = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        // Handle JSON fields
        if (key.endsWith('_json')) {
          params.push(JSON.stringify(value));
        } else if (key === 'is_enabled' || key === 'manual_hold') {
          // Convert boolean to integer for SQLite
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return objective;
    }

    updateFields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(objectiveId);

    const query = `UPDATE managed_objectives SET ${updateFields.join(', ')} WHERE objective_id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(...params);

    return this.getObjective(objectiveId);
  }

  /**
   * Update objective status (with state machine validation)
   */
  updateObjectiveStatus(objectiveId, newStatus, reason, metadata = {}) {
    this._ensureInitialized();

    const objective = this.getObjective(objectiveId);
    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    // Validate transition via state machine
    const { isValidTransition, transitionState } = require('../core/objective-state-machine');

    if (!isValidTransition(objective.status, newStatus)) {
      const { getAllowedTransitions } = require('../core/objective-state-machine');
      const allowed = getAllowedTransitions(objective.status);
      throw new Error(
        `Invalid transition: ${objective.status} → ${newStatus}. ` +
        `Allowed: [${allowed.join(', ')}]`
      );
    }

    const now = new Date().toISOString();

    // Update status
    const stmt = this.db.prepare(`
      UPDATE managed_objectives
      SET status = ?, updated_at = ?
      WHERE objective_id = ?
    `);
    stmt.run(newStatus, now, objectiveId);

    // Update timestamp fields based on status
    if (newStatus === 'violation_detected') {
      const updateStmt = this.db.prepare('UPDATE managed_objectives SET last_violation_at = ? WHERE objective_id = ?');
      updateStmt.run(now, objectiveId);
    } else if (newStatus === 'restored') {
      const updateStmt = this.db.prepare('UPDATE managed_objectives SET last_restored_at = ? WHERE objective_id = ?');
      updateStmt.run(now, objectiveId);
    }

    // Record transition in history
    this.recordObjectiveTransition(objectiveId, objective.status, newStatus, reason, metadata);

    return this.getObjective(objectiveId);
  }

  /**
   * Record objective evaluation
   */
  recordObjectiveEvaluation(evaluation) {
    this._ensureInitialized();

    const { v4: uuidv4 } = require('uuid');
    const evaluationId = evaluation.evaluation_id || uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO managed_objective_evaluations (
        evaluation_id, objective_id, evaluation_timestamp,
        observed_state_json, objective_satisfied, violation_detected,
        action_taken, result_summary, triggered_plan_id, triggered_execution_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      evaluationId,
      evaluation.objective_id,
      evaluation.evaluation_timestamp || now,
      JSON.stringify(evaluation.observed_state),
      evaluation.objective_satisfied ? 1 : 0,
      evaluation.violation_detected ? 1 : 0,
      evaluation.action_taken || 'none',
      evaluation.result_summary || null,
      evaluation.triggered_plan_id || null,
      evaluation.triggered_execution_id || null
    );

    // Update last_evaluated_at
    const updateStmt = this.db.prepare('UPDATE managed_objectives SET last_evaluated_at = ? WHERE objective_id = ?');
    updateStmt.run(now, evaluation.objective_id);

    return evaluationId;
  }

  /**
   * Record objective transition in history
   */
  recordObjectiveTransition(objectiveId, fromStatus, toStatus, reason, metadata = {}) {
    this._ensureInitialized();

    // Simple unique ID generator (no ESM dependency)
    const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO managed_objective_history (
        history_id, objective_id, from_status, to_status, reason, metadata_json, event_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      historyId,
      objectiveId,
      fromStatus || null,
      toStatus,
      reason || null,
      JSON.stringify(metadata),
      now
    );

    return historyId;
  }

  /**
   * List objective history
   */
  listObjectiveHistory(objectiveId, limit = 100) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM managed_objective_history
      WHERE objective_id = ?
      ORDER BY event_timestamp DESC, created_at DESC, ROWID DESC
      LIMIT ?
    `);

    const rows = stmt.all(objectiveId, limit);

    return rows.map(row => ({
      history_id: row.history_id,
      objective_id: row.objective_id,
      from_status: row.from_status,
      to_status: row.to_status,
      reason: row.reason,
      metadata: JSON.parse(row.metadata_json || '{}'),
      event_timestamp: row.event_timestamp,
      created_at: row.created_at
    }));
  }

  /**
   * List objective evaluations
   */
  listObjectiveEvaluations(objectiveId, limit = 100) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      SELECT * FROM managed_objective_evaluations
      WHERE objective_id = ?
      ORDER BY evaluation_timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(objectiveId, limit);

    return rows.map(row => ({
      evaluation_id: row.evaluation_id,
      objective_id: row.objective_id,
      evaluation_timestamp: row.evaluation_timestamp,
      observed_state: JSON.parse(row.observed_state_json),
      objective_satisfied: row.objective_satisfied === 1,
      violation_detected: row.violation_detected === 1,
      action_taken: row.action_taken,
      result_summary: row.result_summary,
      triggered_plan_id: row.triggered_plan_id,
      triggered_execution_id: row.triggered_execution_id,
      created_at: row.created_at
    }));
  }

  /**
   * Parse objective row from database
   */
  _parseObjectiveRow(row) {
    return {
      objective_id: row.objective_id,
      objective_type: row.objective_type,
      target_type: row.target_type,
      target_id: row.target_id,
      environment: row.environment,
      status: row.status,
      desired_state: JSON.parse(row.desired_state_json),
      remediation_plan: row.remediation_plan,
      evaluation_interval_seconds: row.evaluation_interval_seconds,
      verification_strength: row.verification_strength,
      priority: row.priority,
      owner: row.owner,
      context: JSON.parse(row.context_json || '{}'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_evaluated_at: row.last_evaluated_at,
      last_violation_at: row.last_violation_at,
      last_restored_at: row.last_restored_at,
      is_enabled: row.is_enabled === 1,
      // Phase 10.1: Reconciliation state fields
      reconciliation_status: row.reconciliation_status,
      reconciliation_attempt_count: row.reconciliation_attempt_count,
      reconciliation_started_at: row.reconciliation_started_at,
      reconciliation_cooldown_until: row.reconciliation_cooldown_until,
      reconciliation_last_result: row.reconciliation_last_result,
      reconciliation_last_error: row.reconciliation_last_error,
      reconciliation_last_execution_id: row.reconciliation_last_execution_id,
      reconciliation_last_verified_at: row.reconciliation_last_verified_at,
      reconciliation_generation: row.reconciliation_generation,
      manual_hold: row.manual_hold === 1,
      // Phase 10.2: Circuit breaker status fields
      policy_ref: row.policy_ref,
      consecutive_failures: row.consecutive_failures,
      total_failures: row.total_failures,
      total_attempts: row.total_attempts,
      last_failure_at: row.last_failure_at,
      last_attempt_at: row.last_attempt_at,
      degraded_reason: row.degraded_reason,
      // Phase 10.3: Execution timeout fields
      active_attempt_id: row.active_attempt_id,
      execution_started_at: row.execution_started_at,
      execution_deadline_at: row.execution_deadline_at,
      cancel_requested_at: row.cancel_requested_at,
      execution_terminated_at: row.execution_terminated_at,
      last_terminal_reason: row.last_terminal_reason,
      last_timeout_at: row.last_timeout_at,
      termination_result: row.termination_result
    };
  }

  /**
   * Parse interval string to seconds
   */
  _parseInterval(interval) {
    if (typeof interval === 'number') return interval;
    
    const match = interval.match(/^(\d+)([smh])$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    const multipliers = { s: 1, m: 60, h: 3600 };
    
    return value * multipliers[unit];
  }

  // ============================================================
  // FAILURE POLICIES (Phase 10.2)
  // ============================================================

  /**
   * Create failure policy
   */
  createFailurePolicy(policy) {
    this._ensureInitialized();

    const { validateFailurePolicy } = require('../core/failure-policy-schema');
    const validation = validateFailurePolicy(policy);
    if (!validation.valid) {
      throw new Error(`Invalid failure policy: ${validation.errors.join(', ')}`);
    }

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO failure_policies (
        policy_id, policy_name, description,
        max_consecutive_failures,
        cooldown_mode, cooldown_base_seconds, cooldown_multiplier, cooldown_max_seconds,
        degraded_after_consecutive_failures,
        reset_on_verified_recovery, reset_on_manual_reset,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      policy.policy_id,
      policy.policy_name,
      policy.description || null,
      policy.max_consecutive_failures || null,
      policy.cooldown?.mode || null,
      policy.cooldown?.base_seconds || null,
      policy.cooldown?.multiplier || null,
      policy.cooldown?.max_seconds || null,
      policy.degraded?.enter_after_consecutive_failures || null,
      policy.reset?.on_verified_recovery !== false ? 1 : 0,
      policy.reset?.on_manual_reset !== false ? 1 : 0,
      policy.created_at || now,
      policy.updated_at || now
    );

    return this.getFailurePolicy(policy.policy_id);
  }

  /**
   * Get failure policy by ID
   */
  getFailurePolicy(policyId) {
    this._ensureInitialized();

    const stmt = this.db.prepare('SELECT * FROM failure_policies WHERE policy_id = ?');
    const row = stmt.get(policyId);

    if (!row) return null;

    return this._parseFailurePolicyRow(row);
  }

  /**
   * List all failure policies
   */
  listFailurePolicies() {
    this._ensureInitialized();

    const stmt = this.db.prepare('SELECT * FROM failure_policies ORDER BY policy_name');
    const rows = stmt.all();

    return rows.map(row => this._parseFailurePolicyRow(row));
  }

  /**
   * Update failure policy
   */
  updateFailurePolicy(policyId, updates) {
    this._ensureInitialized();

    const current = this.getFailurePolicy(policyId);
    if (!current) {
      throw new Error(`Failure policy not found: ${policyId}`);
    }

    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    const allowedFields = [
      'policy_name', 'description', 'max_consecutive_failures',
      'cooldown_mode', 'cooldown_base_seconds', 'cooldown_multiplier', 'cooldown_max_seconds',
      'degraded_after_consecutive_failures',
      'reset_on_verified_recovery', 'reset_on_manual_reset'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(policyId);

    const query = `UPDATE failure_policies SET ${fields.join(', ')} WHERE policy_id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(...params);

    return this.getFailurePolicy(policyId);
  }

  /**
   * Delete failure policy
   */
  deleteFailurePolicy(policyId) {
    this._ensureInitialized();

    const stmt = this.db.prepare('DELETE FROM failure_policies WHERE policy_id = ?');
    const info = stmt.run(policyId);

    return { policy_id: policyId, changes: info.changes };
  }

  /**
   * Parse failure policy row from database
   */
  _parseFailurePolicyRow(row) {
    const policy = {
      policy_id: row.policy_id,
      policy_name: row.policy_name,
      description: row.description,
      max_consecutive_failures: row.max_consecutive_failures,
      cooldown: {},
      degraded: {},
      reset: {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    // Parse cooldown config
    if (row.cooldown_mode) {
      policy.cooldown = {
        mode: row.cooldown_mode,
        base_seconds: row.cooldown_base_seconds,
        multiplier: row.cooldown_multiplier,
        max_seconds: row.cooldown_max_seconds
      };
    }

    // Parse degraded config
    if (row.degraded_after_consecutive_failures !== null) {
      policy.degraded = {
        enter_after_consecutive_failures: row.degraded_after_consecutive_failures
      };
    }

    // Parse reset config
    policy.reset = {
      on_verified_recovery: row.reset_on_verified_recovery === 1,
      on_manual_reset: row.reset_on_manual_reset === 1
    };

    return policy;
  }

  // ============================================================
  // STATE TRANSITIONS (Internal)
  // ============================================================

  _recordTransition(entityType, entityId, fieldName, oldValue, newValue, changedBy) {
    if (oldValue === newValue) return; // No change

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO state_transitions (
        entity_type, entity_id, field_name, old_value, new_value, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(entityType, entityId, fieldName, String(oldValue), String(newValue), changedBy, now);
  }

  listTransitions(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM state_transitions WHERE 1=1';
    const params = [];

    if (filters.entity_type) {
      query += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      query += ' AND entity_id = ?';
      params.push(filters.entity_id);
    }
    if (filters.changed_by) {
      query += ' AND changed_by = ?';
      params.push(filters.changed_by);
    }

    query += ' ORDER BY changed_at DESC LIMIT 1000';

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // ============================================================
  // INTENT TRACES (Phase 11.5)
  // ============================================================

  /**
   * Create intent trace
   */
  createIntentTrace(intent_id, intent_type, source, submitted_at = null) {
    this._ensureInitialized();

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO intent_traces (
        intent_id, intent_type, source, submitted_at, status, events, created_at
      ) VALUES (?, ?, ?, ?, 'submitted', '[]', ?)
    `);

    stmt.run(
      intent_id,
      intent_type,
      JSON.stringify(source),
      submitted_at || now,
      now
    );

    return intent_id;
  }

  /**
   * Append event to intent trace
   */
  appendIntentTraceEvent(intent_id, event) {
    this._ensureInitialized();

    const trace = this.getIntentTrace(intent_id);
    if (!trace) {
      throw new Error(`Intent trace not found: ${intent_id}`);
    }

    let events = [];
    if (trace.events && trace.events.length > 0) {
      events = trace.events; // Already parsed by getIntentTrace
    }
    events.push(event);

    const stmt = this.db.prepare(`
      UPDATE intent_traces 
      SET events = ?, updated_at = ?
      WHERE intent_id = ?
    `);

    stmt.run(JSON.stringify(events), new Date().toISOString(), intent_id);
  }

  /**
   * Get intent trace by ID
   */
  getIntentTrace(intent_id) {
    this._ensureInitialized();

    const stmt = this.db.prepare('SELECT * FROM intent_traces WHERE intent_id = ?');
    const row = stmt.get(intent_id);

    if (!row) return null;

    return {
      intent_id: row.intent_id,
      intent_type: row.intent_type,
      source: JSON.parse(row.source),
      submitted_at: row.submitted_at,
      status: row.status,
      events: JSON.parse(row.events || '[]'),
      relationships: row.relationships ? JSON.parse(row.relationships) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * List intent traces with filters
   */
  listIntentTraces(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM intent_traces WHERE 1=1';
    const params = [];

    if (filters.intent_type) {
      query += ' AND intent_type = ?';
      params.push(filters.intent_type);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.source_type) {
      query += ' AND source LIKE ?';
      params.push(`%"type":"${filters.source_type}"%`);
    }

    query += ' ORDER BY submitted_at DESC LIMIT 100';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      intent_id: row.intent_id,
      intent_type: row.intent_type,
      source: JSON.parse(row.source),
      submitted_at: row.submitted_at,
      status: row.status,
      events: JSON.parse(row.events || '[]'),
      relationships: row.relationships ? JSON.parse(row.relationships) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Update intent relationship links
   */
  updateIntentRelationship(intent_id, relationships) {
    this._ensureInitialized();

    const trace = this.getIntentTrace(intent_id);
    if (!trace) {
      throw new Error(`Intent trace not found: ${intent_id}`);
    }

    const existing = trace.relationships || {};
    const merged = { ...existing, ...relationships };

    const stmt = this.db.prepare(`
      UPDATE intent_traces 
      SET relationships = ?, updated_at = ?
      WHERE intent_id = ?
    `);

    stmt.run(JSON.stringify(merged), new Date().toISOString(), intent_id);
  }

  /**
   * Update intent status
   */
  updateIntentStatus(intent_id, status) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      UPDATE intent_traces 
      SET status = ?, updated_at = ?
      WHERE intent_id = ?
    `);

    stmt.run(status, new Date().toISOString(), intent_id);
  }

  // ========================================================================
  // FORENSIC INCIDENTS (Phase 14)
  // ========================================================================

  /**
   * Create forensic incident (investigation container)
   */
  createForensicIncident({ title, summary, severity, created_by }) {
    this._ensureInitialized();

    const incident_id = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO forensic_incidents (
        incident_id, title, summary, severity, status, created_by
      ) VALUES (?, ?, ?, ?, 'open', ?)
    `);

    stmt.run(incident_id, title, summary || null, severity, created_by || null);

    return this.getForensicIncident(incident_id);
  }

  /**
   * Get forensic incident by ID
   */
  getForensicIncident(incident_id) {
    this._ensureInitialized();

    const stmt = this.db.prepare('SELECT * FROM forensic_incidents WHERE incident_id = ?');
    const incident = stmt.get(incident_id);

    if (!incident) return null;

    return incident;
  }

  /**
   * List forensic incidents with filters
   */
  listForensicIncidents(filters = {}) {
    this._ensureInitialized();

    let query = 'SELECT * FROM forensic_incidents WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.created_by) {
      query += ' AND created_by = ?';
      params.push(filters.created_by);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Update forensic incident
   */
  updateForensicIncident(incident_id, updates) {
    this._ensureInitialized();

    const allowed = ['title', 'summary', 'severity', 'status', 'resolved_by'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    if (updates.status === 'resolved' || updates.status === 'archived') {
      fields.push('resolved_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(incident_id);

    const stmt = this.db.prepare(`
      UPDATE forensic_incidents 
      SET ${fields.join(', ')}
      WHERE incident_id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Link investigation to incident
   */
  linkInvestigationToIncident(incident_id, investigation_id, linked_by = null) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_investigations (incident_id, investigation_id, linked_by)
      VALUES (?, ?, ?)
    `);

    stmt.run(incident_id, investigation_id, linked_by);
  }

  /**
   * Link intent to incident
   */
  linkIntentToIncident(incident_id, intent_id, linked_by = null) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_intents (incident_id, intent_id, linked_by)
      VALUES (?, ?, ?)
    `);

    stmt.run(incident_id, intent_id, linked_by);
  }

  /**
   * Link objective to incident
   */
  linkObjectiveToIncident(incident_id, objective_id, linked_by = null) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_objectives (incident_id, objective_id, linked_by)
      VALUES (?, ?, ?)
    `);

    stmt.run(incident_id, objective_id, linked_by);
  }

  /**
   * Link artifact to incident
   */
  linkArtifactToIncident(incident_id, artifact_id, linked_by = null) {
    this._ensureInitialized();

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_artifacts (incident_id, artifact_id, linked_by)
      VALUES (?, ?, ?)
    `);

    stmt.run(incident_id, artifact_id, linked_by);
  }

  /**
   * Unlink entity from incident
   */
  unlinkFromIncident(incident_id, entity_type, entity_id) {
    this._ensureInitialized();

    const tables = {
      investigation: 'incident_investigations',
      intent: 'incident_intents',
      objective: 'incident_objectives',
      artifact: 'incident_artifacts'
    };

    const table = tables[entity_type];
    if (!table) {
      throw new Error(`Invalid entity type: ${entity_type}`);
    }

    const column = `${entity_type}_id`;
    const stmt = this.db.prepare(`DELETE FROM ${table} WHERE incident_id = ? AND ${column} = ?`);
    stmt.run(incident_id, entity_id);
  }

  /**
   * Get incident graph (all linked entities)
   */
  getIncidentGraph(incident_id) {
    this._ensureInitialized();

    const incident = this.getForensicIncident(incident_id);
    if (!incident) return null;

    // Get linked investigations
    const investigations = this.db.prepare(`
      SELECT wi.*, ii.linked_at, ii.linked_by
      FROM incident_investigations ii
      JOIN workspace_investigations wi ON ii.investigation_id = wi.investigation_id
      WHERE ii.incident_id = ?
    `).all(incident_id);

    // Get linked intents
    const intents = this.db.prepare(`
      SELECT it.*, iin.linked_at, iin.linked_by
      FROM incident_intents iin
      JOIN intent_traces it ON iin.intent_id = it.intent_id
      WHERE iin.incident_id = ?
    `).all(incident_id);

    // Get linked objectives
    const objectives = this.db.prepare(`
      SELECT mo.*, io.linked_at, io.linked_by
      FROM incident_objectives io
      JOIN managed_objectives mo ON io.objective_id = mo.objective_id
      WHERE io.incident_id = ?
    `).all(incident_id);

    // Get linked artifacts
    const artifacts = this.db.prepare(`
      SELECT wa.*, ia.linked_at, ia.linked_by
      FROM incident_artifacts ia
      JOIN workspace_artifacts wa ON ia.artifact_id = wa.artifact_id
      WHERE ia.incident_id = ?
    `).all(incident_id);

    return {
      incident,
      investigations,
      intents: intents.map(row => ({
        ...row,
        source: JSON.parse(row.source),
        events: JSON.parse(row.events || '[]'),
        relationships: row.relationships ? JSON.parse(row.relationships) : {},
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      })),
      objectives,
      artifacts
    };
  }

  // ========================================================================
  // Phase 15 — Anomaly Methods
  // ========================================================================

  /**
   * Create anomaly record
   * @param {object} anomalyData - Anomaly object (validated by anomaly-schema.js)
   * @returns {object} - Created anomaly
   */
  createAnomaly(anomalyData) {
    const stmt = this.db.prepare(`
      INSERT INTO anomalies (
        anomaly_id, anomaly_type, severity, source, entity_type, entity_id,
        evidence, confidence, detected_at, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      anomalyData.anomaly_id,
      anomalyData.anomaly_type,
      anomalyData.severity,
      anomalyData.source,
      anomalyData.entity_type || null,
      anomalyData.entity_id || null,
      JSON.stringify(anomalyData.evidence),
      anomalyData.confidence,
      anomalyData.detected_at,
      anomalyData.status || 'new',
      anomalyData.metadata ? JSON.stringify(anomalyData.metadata) : null
    );

    // Record creation event
    this.recordAnomalyEvent(anomalyData.anomaly_id, 'detected', {
      anomaly_type: anomalyData.anomaly_type,
      severity: anomalyData.severity,
      entity_id: anomalyData.entity_id
    });

    return this.getAnomaly(anomalyData.anomaly_id);
  }

  /**
   * Get anomaly by ID
   * @param {string} anomaly_id - Anomaly identifier
   * @returns {object|null} - Anomaly object or null if not found
   */
  getAnomaly(anomaly_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM anomalies WHERE anomaly_id = ?
    `);

    const row = stmt.get(anomaly_id);
    if (!row) return null;

    return {
      ...row,
      evidence: JSON.parse(row.evidence),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  /**
   * List anomalies with optional filters
   * @param {object} filters - Query filters (anomaly_type, severity, status, entity_type, entity_id, etc.)
   * @returns {array} - Array of anomaly objects
   */
  listAnomalies(filters = {}) {
    let query = 'SELECT * FROM anomalies WHERE 1=1';
    const params = [];

    if (filters.anomaly_type) {
      query += ' AND anomaly_type = ?';
      params.push(filters.anomaly_type);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }
    if (filters.entity_type) {
      query += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      query += ' AND entity_id = ?';
      params.push(filters.entity_id);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.confidence_min !== undefined) {
      query += ' AND confidence >= ?';
      params.push(filters.confidence_min);
    }
    if (filters.confidence_max !== undefined) {
      query += ' AND confidence <= ?';
      params.push(filters.confidence_max);
    }
    if (filters.detected_after) {
      query += ' AND detected_at >= ?';
      params.push(filters.detected_after);
    }
    if (filters.detected_before) {
      query += ' AND detected_at <= ?';
      params.push(filters.detected_before);
    }

    query += ' ORDER BY detected_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      evidence: JSON.parse(row.evidence),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  /**
   * Update anomaly status
   * @param {string} anomaly_id - Anomaly identifier
   * @param {object} updates - Updates object (status, reviewed_by, reviewed_at, resolution)
   * @returns {object} - Updated anomaly
   */
  updateAnomalyStatus(anomaly_id, updates) {
    const fields = [];
    const params = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.reviewed_by !== undefined) {
      fields.push('reviewed_by = ?');
      params.push(updates.reviewed_by);
    }
    if (updates.reviewed_at !== undefined) {
      fields.push('reviewed_at = ?');
      params.push(updates.reviewed_at);
    }
    if (updates.resolution !== undefined) {
      fields.push('resolution = ?');
      params.push(updates.resolution);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(anomaly_id);

    const stmt = this.db.prepare(`
      UPDATE anomalies SET ${fields.join(', ')} WHERE anomaly_id = ?
    `);

    stmt.run(...params);

    // Record status change event
    if (updates.status) {
      this.recordAnomalyEvent(anomaly_id, 'status_changed', {
        new_status: updates.status,
        reviewed_by: updates.reviewed_by
      });
    }

    return this.getAnomaly(anomaly_id);
  }

  /**
   * Record anomaly event
   * @param {string} anomaly_id - Anomaly identifier
   * @param {string} event_type - Event type (detected, reviewed, resolved, etc.)
   * @param {object} event_data - Event-specific data
   */
  recordAnomalyEvent(anomaly_id, event_type, event_data = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO anomaly_history (anomaly_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      anomaly_id,
      event_type,
      JSON.stringify(event_data),
      new Date().toISOString()
    );
  }

  /**
   * Get anomaly history
   * @param {string} anomaly_id - Anomaly identifier
   * @returns {array} - Array of history events
   */
  getAnomalyHistory(anomaly_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM anomaly_history
      WHERE anomaly_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(anomaly_id);

    return rows.map(row => ({
      ...row,
      event_data: JSON.parse(row.event_data)
    }));
  }

  /**
   * Link anomaly to incident
   * @param {string} incident_id - Incident identifier
   * @param {string} anomaly_id - Anomaly identifier
   * @param {string} linked_by - Operator who created link
   */
  linkAnomalyToIncident(incident_id, anomaly_id, linked_by) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_anomalies (incident_id, anomaly_id, linked_by, linked_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(incident_id, anomaly_id, linked_by, new Date().toISOString());
  }

  /**
   * Link anomaly to objective (via objective metadata)
   * @param {string} anomaly_id - Anomaly identifier
   * @param {string} objective_id - Objective identifier
   */
  linkAnomalyToObjective(anomaly_id, objective_id) {
    // Store anomaly_id in objective metadata
    const objective = this.getManagedObjective(objective_id);
    if (!objective) {
      throw new Error(`Objective not found: ${objective_id}`);
    }

    const metadata = objective.metadata || {};
    metadata.declared_from_anomaly = anomaly_id;

    this.updateObjective(objective_id, { metadata });

    // Record event
    this.recordAnomalyEvent(anomaly_id, 'objective_declared', {
      objective_id
    });
  }

  // ========================================================================
  // Phase 15 — Proposal Methods
  // ========================================================================

  /**
   * Create proposal record
   * @param {object} proposalData - Proposal object (validated by proposal-schema.js)
   * @returns {object} - Created proposal
   */
  createProposal(proposalData) {
    const stmt = this.db.prepare(`
      INSERT INTO proposals (
        proposal_id, proposal_type, objective_id, anomaly_id,
        suggested_intent, rationale, risk_assessment, confidence,
        created_at, status, expires_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      proposalData.proposal_id,
      proposalData.proposal_type,
      proposalData.objective_id || null,
      proposalData.anomaly_id || null,
      JSON.stringify(proposalData.suggested_intent),
      proposalData.rationale,
      JSON.stringify(proposalData.risk_assessment),
      proposalData.confidence,
      proposalData.created_at,
      proposalData.status || 'pending',
      proposalData.expires_at,
      proposalData.metadata ? JSON.stringify(proposalData.metadata) : null
    );

    // Record creation event
    this.recordProposalEvent(proposalData.proposal_id, 'created', {
      proposal_type: proposalData.proposal_type,
      objective_id: proposalData.objective_id,
      risk_tier: proposalData.risk_assessment.risk_tier
    });

    return this.getProposal(proposalData.proposal_id);
  }

  /**
   * Get proposal by ID
   * @param {string} proposal_id - Proposal identifier
   * @returns {object|null} - Proposal object or null if not found
   */
  getProposal(proposal_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM proposals WHERE proposal_id = ?
    `);

    const row = stmt.get(proposal_id);
    if (!row) return null;

    return {
      ...row,
      suggested_intent: JSON.parse(row.suggested_intent),
      risk_assessment: JSON.parse(row.risk_assessment),
      approval_decision: row.approval_decision ? JSON.parse(row.approval_decision) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  /**
   * List proposals with optional filters
   * @param {object} filters - Query filters (proposal_type, status, objective_id, etc.)
   * @returns {array} - Array of proposal objects
   */
  listProposals(filters = {}) {
    let query = 'SELECT * FROM proposals WHERE 1=1';
    const params = [];

    if (filters.proposal_type) {
      query += ' AND proposal_type = ?';
      params.push(filters.proposal_type);
    }
    if (filters.objective_id) {
      query += ' AND objective_id = ?';
      params.push(filters.objective_id);
    }
    if (filters.anomaly_id) {
      query += ' AND anomaly_id = ?';
      params.push(filters.anomaly_id);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.confidence_min !== undefined) {
      query += ' AND confidence >= ?';
      params.push(filters.confidence_min);
    }
    if (filters.created_after) {
      query += ' AND created_at >= ?';
      params.push(filters.created_after);
    }
    if (filters.created_before) {
      query += ' AND created_at <= ?';
      params.push(filters.created_before);
    }

    // Handle expired filter
    if (filters.expired === false) {
      query += ' AND (expires_at > datetime(\'now\') OR status = \'executed\')';
    } else if (filters.expired === true) {
      query += ' AND expires_at <= datetime(\'now\') AND status != \'executed\'';
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      suggested_intent: JSON.parse(row.suggested_intent),
      risk_assessment: JSON.parse(row.risk_assessment),
      approval_decision: row.approval_decision ? JSON.parse(row.approval_decision) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));
  }

  /**
   * Review proposal (approve/reject/modify)
   * @param {string} proposal_id - Proposal identifier
   * @param {object} decision - Approval decision object
   * @returns {object} - Updated proposal
   */
  reviewProposal(proposal_id, decision) {
    const stmt = this.db.prepare(`
      UPDATE proposals
      SET status = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          approval_decision = ?
      WHERE proposal_id = ?
    `);

    const newStatus = decision.approved ? 'approved' : 'rejected';

    stmt.run(
      newStatus,
      decision.reviewed_by,
      decision.reviewed_at,
      JSON.stringify(decision),
      proposal_id
    );

    // Record review event
    this.recordProposalEvent(proposal_id, newStatus, {
      reviewed_by: decision.reviewed_by,
      reason: decision.reason
    });

    return this.getProposal(proposal_id);
  }

  /**
   * Update proposal fields
   * @param {string} proposal_id - Proposal identifier
   * @param {object} updates - Fields to update
   * @returns {object} - Updated proposal
   */
  updateProposal(proposal_id, updates) {
    const fields = [];
    const params = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.plan_id !== undefined) {
      fields.push('plan_id = ?');
      params.push(updates.plan_id);
    }
    if (updates.execution_id !== undefined) {
      fields.push('execution_id = ?');
      params.push(updates.execution_id);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(proposal_id);

    const stmt = this.db.prepare(`
      UPDATE proposals SET ${fields.join(', ')} WHERE proposal_id = ?
    `);

    stmt.run(...params);

    return this.getProposal(proposal_id);
  }

  /**
   * Expire proposal
   * @param {string} proposal_id - Proposal identifier
   * @returns {object} - Updated proposal
   */
  expireProposal(proposal_id) {
    const stmt = this.db.prepare(`
      UPDATE proposals SET status = 'expired' WHERE proposal_id = ?
    `);

    stmt.run(proposal_id);

    this.recordProposalEvent(proposal_id, 'expired', {
      reason: 'Proposal exceeded expiry time'
    });

    return this.getProposal(proposal_id);
  }

  /**
   * Record proposal event
   * @param {string} proposal_id - Proposal identifier
   * @param {string} event_type - Event type (created, approved, rejected, etc.)
   * @param {object} event_data - Event-specific data
   */
  recordProposalEvent(proposal_id, event_type, event_data = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO proposal_history (proposal_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      proposal_id,
      event_type,
      JSON.stringify(event_data),
      new Date().toISOString()
    );
  }

  /**
   * Get proposal history
   * @param {string} proposal_id - Proposal identifier
   * @returns {array} - Array of history events
   */
  getProposalHistory(proposal_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM proposal_history
      WHERE proposal_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(proposal_id);

    return rows.map(row => ({
      ...row,
      event_data: JSON.parse(row.event_data)
    }));
  }

  /**
   * Link proposal to incident
   * @param {string} incident_id - Incident identifier
   * @param {string} proposal_id - Proposal identifier
   * @param {string} linked_by - Operator who created link
   */
  linkProposalToIncident(incident_id, proposal_id, linked_by) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO incident_proposals (incident_id, proposal_id, linked_by, linked_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(incident_id, proposal_id, linked_by, new Date().toISOString());
  }

  // ========================================
  // Phase 17: Approval Workflow
  // ========================================

  /**
   * Create approval request
   * @param {Object} approval - Approval request object
   * @returns {Object} Created approval
   */
  createApproval(approval) {
    const stmt = this.db.prepare(`
      INSERT INTO approval_requests (
        approval_id, execution_id, plan_id, step_id, intent_id,
        required_tier, required_by, status,
        requested_at, requested_by, expires_at,
        reviewed_by, reviewed_at, decision_reason,
        action_summary, risk_summary, target_entities,
        estimated_duration_ms, rollback_available,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      approval.approval_id,
      approval.execution_id,
      approval.plan_id,
      approval.step_id,
      approval.intent_id,
      approval.required_tier,
      approval.required_by,
      approval.status,
      approval.requested_at,
      approval.requested_by,
      approval.expires_at,
      approval.reviewed_by,
      approval.reviewed_at,
      approval.decision_reason,
      approval.action_summary,
      approval.risk_summary,
      JSON.stringify(approval.target_entities),
      approval.estimated_duration_ms,
      approval.rollback_available ? 1 : 0,
      approval.created_at,
      approval.updated_at
    );

    return approval;
  }

  /**
   * Get approval by ID
   * @param {string} approval_id - Approval ID
   * @returns {Object|null} Approval object or null
   */
  getApproval(approval_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM approval_requests WHERE approval_id = ?
    `);

    const row = stmt.get(approval_id);

    if (!row) return null;

    return {
      ...row,
      target_entities: JSON.parse(row.target_entities),
      rollback_available: Boolean(row.rollback_available)
    };
  }

  /**
   * Get approval by execution and step
   * @param {string} execution_id - Execution ID
   * @param {string} step_id - Step ID
   * @returns {Object|null} Approval object or null
   */
  getApprovalByExecutionStep(execution_id, step_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM approval_requests
      WHERE execution_id = ? AND step_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(execution_id, step_id);

    if (!row) return null;

    return {
      ...row,
      target_entities: JSON.parse(row.target_entities),
      rollback_available: Boolean(row.rollback_available)
    };
  }

  /**
   * List approvals
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of approval objects
   */
  listApprovals(filters = {}) {
    let query = 'SELECT * FROM approval_requests WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.execution_id) {
      query += ' AND execution_id = ?';
      params.push(filters.execution_id);
    }

    if (filters.plan_id) {
      query += ' AND plan_id = ?';
      params.push(filters.plan_id);
    }

    if (filters.required_tier) {
      query += ' AND required_tier = ?';
      params.push(filters.required_tier);
    }

    query += ' ORDER BY requested_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      target_entities: JSON.parse(row.target_entities),
      rollback_available: Boolean(row.rollback_available)
    }));
  }

  /**
   * Update approval
   * @param {string} approval_id - Approval ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated approval
   */
  updateApproval(approval_id, updates) {
    const fields = [];
    const params = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.reviewed_by !== undefined) {
      fields.push('reviewed_by = ?');
      params.push(updates.reviewed_by);
    }

    if (updates.reviewed_at !== undefined) {
      fields.push('reviewed_at = ?');
      params.push(updates.reviewed_at);
    }

    if (updates.decision_reason !== undefined) {
      fields.push('decision_reason = ?');
      params.push(updates.decision_reason);
    }

    if (updates.updated_at !== undefined) {
      fields.push('updated_at = ?');
      params.push(updates.updated_at);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(approval_id);

    const stmt = this.db.prepare(`
      UPDATE approval_requests SET ${fields.join(', ')} WHERE approval_id = ?
    `);

    stmt.run(...params);

    return this.getApproval(approval_id);
  }

  /**
   * Count approvals by status
   * @param {string} status - Approval status
   * @returns {number} Count
   */
  countApprovalsByStatus(status) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM approval_requests WHERE status = ?
    `);

    return stmt.get(status).count;
  }

  // ========================================
  // Workspace Delegation Methods (Phase 12)
  // ========================================

  /**
   * List investigations (delegates to WorkspaceManager)
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of investigation objects
   */
  listInvestigations(filters = {}) {
    // Lazy load WorkspaceManager
    if (!this._workspaceManager) {
      const { WorkspaceManager } = require('../workspace/workspace-manager.js');
      this._workspaceManager = new WorkspaceManager(this);
    }
    
    return this._workspaceManager.listInvestigations(filters);
  }

  /**
   * Get investigation by ID (delegates to WorkspaceManager)
   * @param {string} investigation_id - Investigation ID
   * @returns {Object|null} Investigation object or null
   */
  getInvestigation(investigation_id) {
    if (!this._workspaceManager) {
      const { WorkspaceManager } = require('../workspace/workspace-manager.js');
      this._workspaceManager = new WorkspaceManager(this);
    }
    
    return this._workspaceManager.getInvestigation(investigation_id);
  }

  /**
   * List artifacts (delegates to WorkspaceManager)
   * @param {Object} filters - Filter criteria
   * @returns {Array} Array of artifact objects
   */
  listArtifacts(filters = {}) {
    if (!this._workspaceManager) {
      const { WorkspaceManager } = require('../workspace/workspace-manager.js');
      this._workspaceManager = new WorkspaceManager(this);
    }
    
    return this._workspaceManager.listArtifacts(filters);
  }

  /**
   * Get artifact by ID (delegates to WorkspaceManager)
   * @param {string} artifact_id - Artifact ID
   * @returns {Object|null} Artifact object or null
   */
  getArtifact(artifact_id) {
    if (!this._workspaceManager) {
      const { WorkspaceManager } = require('../workspace/workspace-manager.js');
      this._workspaceManager = new WorkspaceManager(this);
    }
    
    return this._workspaceManager.getArtifact(artifact_id);
  }

  // ============================================================
  // CUSTOM ACTIONS
  // ============================================================

  /**
   * Create custom action
   */
  createCustomAction(action) {
    const action_id = action.action_id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO custom_actions (
        action_id, tenant_id, action_name, intent_type, 
        risk_tier, schema_json, description, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      action_id,
      action.tenant_id,
      action.action_name,
      action.intent_type,
      action.risk_tier,
      action.schema_json ? JSON.stringify(action.schema_json) : null,
      action.description || null,
      action.enabled !== undefined ? action.enabled : 1
    );
    
    return action_id;
  }

  /**
   * Get custom action by ID
   */
  getCustomAction(action_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM custom_actions WHERE action_id = ?
    `);
    
    const row = stmt.get(action_id);
    if (!row) return null;
    
    return {
      ...row,
      schema_json: row.schema_json ? JSON.parse(row.schema_json) : null,
      enabled: row.enabled === 1
    };
  }

  /**
   * Get custom action by tenant and name
   */
  getCustomActionByName(tenant_id, action_name) {
    const stmt = this.db.prepare(`
      SELECT * FROM custom_actions 
      WHERE tenant_id = ? AND action_name = ? AND enabled = 1
    `);
    
    const row = stmt.get(tenant_id, action_name);
    if (!row) return null;
    
    return {
      ...row,
      schema_json: row.schema_json ? JSON.parse(row.schema_json) : null,
      enabled: row.enabled === 1
    };
  }

  /**
   * List custom actions for tenant
   */
  listCustomActions(tenant_id, filters = {}) {
    let query = 'SELECT * FROM custom_actions WHERE tenant_id = ?';
    const params = [tenant_id];
    
    if (filters.enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(filters.enabled ? 1 : 0);
    }
    
    if (filters.risk_tier) {
      query += ' AND risk_tier = ?';
      params.push(filters.risk_tier);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map(row => ({
      ...row,
      schema_json: row.schema_json ? JSON.parse(row.schema_json) : null,
      enabled: row.enabled === 1
    }));
  }

  /**
   * Update custom action
   */
  updateCustomAction(action_id, updates) {
    const allowed = ['action_name', 'intent_type', 'risk_tier', 'schema_json', 'description', 'enabled'];
    const fields = [];
    const values = [];
    
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'schema_json') {
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'enabled') {
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = datetime("now")');
    values.push(action_id);
    
    const stmt = this.db.prepare(`
      UPDATE custom_actions SET ${fields.join(', ')} WHERE action_id = ?
    `);
    
    stmt.run(...values);
  }

  /**
   * Delete custom action
   */
  deleteCustomAction(action_id) {
    const stmt = this.db.prepare('DELETE FROM custom_actions WHERE action_id = ?');
    stmt.run(action_id);
  }
}

// Singleton instance
let instance = null;

function getStateGraph(options = {}) {
  if (!instance) {
    instance = new StateGraph(options);
  }
  return instance;
}

/**
 * Reset singleton for testing
 * WARNING: Only use in tests! Closes current instance and resets singleton.
 */
function _resetStateGraphForTesting() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

module.exports = {
  StateGraph,
  getStateGraph,
  _resetStateGraphForTesting
};
