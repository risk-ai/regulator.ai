/**
 * Vienna State Graph (Postgres)
 * 
 * Persistent memory layer for Vienna OS.
 * Migrated from SQLite (better-sqlite3) to Postgres (@vercel/postgres).
 * 
 * Design: Agents read directly, write via executor envelopes.
 * 
 * Migration Strategy: Minimal boot path first.
 * Only methods required for runtime startup are implemented initially.
 * Additional methods will be migrated as needed for endpoint validation.
 */

const fs = require('fs');
const path = require('path');

// Hybrid Postgres client: pg for local, @vercel/postgres for Vercel
const isVercel = process.env.VERCEL === '1' || 
                 (process.env.POSTGRES_URL?.includes('vercel.app') || 
                  process.env.POSTGRES_URL?.includes('?pgbouncer=true'));

let pgClient = null;

function getPgClient() {
  if (!pgClient) {
    if (isVercel) {
      const vercelPg = require('@vercel/postgres');
      pgClient = vercelPg.sql;
    } else {
      const { Pool } = require('pg');
      const isLocal = !process.env.POSTGRES_URL || 
                      process.env.POSTGRES_URL.includes('localhost') ||
                      process.env.POSTGRES_URL.includes('///');
      
      if (isLocal) {
        // Extract database name if present in connection string
        const dbMatch = process.env.POSTGRES_URL?.match(/\/\/\/([^?]+)/);
        const database = dbMatch ? dbMatch[1] : 'vienna_dev';
        
        pgClient = new Pool({
          host: '/var/run/postgresql',  // Unix socket
          database,
          port: 5432
        });
      } else {
        pgClient = new Pool({
          connectionString: process.env.POSTGRES_URL
        });
      }
    }
  }
  return pgClient;
}

const SCHEMA_PATH = path.join(__dirname, 'schema.postgres.sql');

/**
 * StateGraph (Postgres)
 */
class StateGraph {
  constructor(options = {}) {
    this.connectionString = process.env.POSTGRES_URL;
    this.initialized = false;
    this.environment = options.environment || process.env.VIENNA_ENV || 'prod';
    
    if (!this.connectionString) {
      throw new Error(
        'POSTGRES_URL environment variable is required. ' +
        'Set this to your Vercel Postgres connection string.'
      );
    }
  }

  /**
   * Initialize database (create tables if missing)
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

    // Startup logging
    if (!process.env.VIENNA_STARTUP_LOGGED) {
      console.log(`[StateGraph] Environment: ${this.environment}`);
      console.log(`[StateGraph] Database: Vercel Postgres`);
      process.env.VIENNA_STARTUP_LOGGED = 'true';
    }

    try {
      // Load and apply schema
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
      
      // Execute entire schema at once (let Postgres handle statement parsing)
      const client = getPgClient();
      await client.query(schema);

      // Run migrations (if any)
      await this._runMigrations();

      this.initialized = true;
      console.log('[StateGraph] Initialized with Postgres');
    } catch (error) {
      console.error('[StateGraph] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Parse schema file into executable statements
   */
  _parseSchema(schema) {
    // Split on semicolons, but preserve structure
    const statements = [];
    let currentStatement = '';
    let inComment = false;
    
    const lines = schema.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip single-line comments
      if (trimmed.startsWith('--')) {
        continue;
      }
      
      // Add line to current statement
      currentStatement += line + '\n';
      
      // Check if statement is complete (ends with semicolon)
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add final statement if any
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    return statements.filter(s => s.length > 0);
  }

  /**
   * Run migrations (minimal implementation for now)
   */
  async _runMigrations() {
    // TODO: Implement migration system if needed
    // For now, schema creation is idempotent (CREATE TABLE IF NOT EXISTS)
    console.log('[StateGraph] Migrations complete (none required)');
  }

  /**
   * Query helper: Execute query and return all rows
   */
  async _query(text, params = []) {
    const client = getPgClient();
    const result = await client.query(text, params);
    return result.rows;
  }

  /**
   * Query helper: Execute query and return first row
   */
  async _queryOne(text, params = []) {
    const client = getPgClient();
    const result = await client.query(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute helper: INSERT/UPDATE/DELETE
   */
  async _execute(text, params = []) {
    const client = getPgClient();
    await client.query(text, params);
  }

  /**
   * Transaction helper
   */
  async _transaction(callback) {
    const client = getPgClient();
    await client.query('BEGIN');
    try {
      const result = await callback();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  // ============================================================================
  // STUB METHODS (to be implemented as needed for endpoint validation)
  // ============================================================================

  /**
   * Get service by ID
   * STUB: Implement when needed for /api/v1/intent
   */
  async getService(serviceId) {
    return await this._queryOne(
      'SELECT * FROM services WHERE service_id = $1',
      [serviceId]
    );
  }

  /**
   * Get provider by ID
   * STUB: Implement when needed
   */
  async getProvider(providerId) {
    return await this._queryOne(
      'SELECT * FROM providers WHERE provider_id = $1',
      [providerId]
    );
  }

  /**
   * Get all services
   * STUB: Implement when needed
   */
  async getAllServices() {
    return await this._query('SELECT * FROM services ORDER BY service_name');
  }

  /**
   * Get all providers
   * STUB: Implement when needed
   */
  async getAllProviders() {
    return await this._query('SELECT * FROM providers ORDER BY provider_name');
  }

  /**
   * Update service status
   * STUB: Implement when needed
   */
  async updateServiceStatus(serviceId, status, health = null) {
    const now = new Date().toISOString();
    await this._execute(
      `UPDATE services 
       SET status = $1, health = $2, last_check_at = $3, updated_at = $4
       WHERE service_id = $5`,
      [status, health, now, now, serviceId]
    );
  }

  /**
   * Insert execution ledger event
   * STUB: Implement when needed for /api/v1/intent
   */
  async insertExecutionLedgerEvent(event) {
    await this._execute(
      `INSERT INTO execution_ledger_events (
        event_id, execution_id, plan_id, verification_id, warrant_id, outcome_id,
        event_type, stage, actor_type, actor_id, environment, risk_tier,
        objective, target_type, target_id, event_timestamp, sequence_num,
        status, payload_json, evidence_json, summary, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )`,
      [
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
        event.environment || null,
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
        new Date().toISOString(),
      ]
    );
  }

  /**
   * Get plan by ID
   * STUB: Implement when needed
   */
  async getPlan(planId) {
    const row = await this._queryOne(
      'SELECT * FROM plans WHERE plan_id = $1',
      [planId]
    );
    
    if (!row) return null;
    
    // Parse JSON fields
    return {
      ...row,
      steps: row.steps ? JSON.parse(row.steps) : [],
      preconditions: row.preconditions ? JSON.parse(row.preconditions) : [],
      postconditions: row.postconditions ? JSON.parse(row.postconditions) : [],
      verification_spec: row.verification_spec ? JSON.parse(row.verification_spec) : null,
      result: row.result ? JSON.parse(row.result) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  }

  /**
   * Insert plan
   * STUB: Implement when needed for /api/v1/intent
   */
  async insertPlan(plan) {
    const now = new Date().toISOString();
    await this._execute(
      `INSERT INTO plans (
        plan_id, objective, intent_id, steps, preconditions, postconditions,
        risk_tier, estimated_duration_ms, status, verification_spec,
        warrant_id, execution_id, result, error, actual_duration_ms,
        metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )`,
      [
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
        now,
      ]
    );
  }

  // ============================================================================
  // Additional methods will be added as needed during endpoint validation
  // ============================================================================
}

/**
 * Singleton instance
 */
let instance = null;

function getStateGraph(options = {}) {
  if (!instance) {
    instance = new StateGraph(options);
  }
  return instance;
}

module.exports = {
  StateGraph,
  getStateGraph,
};
