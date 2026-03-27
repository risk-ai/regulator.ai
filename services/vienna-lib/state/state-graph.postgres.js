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
   * Run migrations (Postgres implementation)
   * 
   * Uses a schema_migrations table to track which migrations have been applied.
   * Each migration is idempotent and safe to re-run, but we track them to avoid
   * unnecessary work and to provide audit trail.
   */
  async _runMigrations() {
    const client = getPgClient();
    
    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        description TEXT
      )
    `);

    // Get list of applied migrations
    const appliedResult = await client.query('SELECT migration_id FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map(r => r.migration_id));

    const migrations = [
      {
        id: '15-add-tenant-id',
        description: 'Add tenant_id to objectives, execution_ledger_events, execution_ledger_summary tables',
        check: async () => {
          // Check if objectives table exists but lacks tenant_id
          const result = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'objectives' AND column_name = 'tenant_id'
          `);
          return result.rows.length === 0;
        },
        run: async () => {
          const alterStatements = [
            // Add tenant_id to objectives if missing
            `DO $$ BEGIN
              ALTER TABLE objectives ADD COLUMN tenant_id TEXT DEFAULT 'default';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;`,
            
            `DO $$ BEGIN
              CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON objectives(tenant_id);
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;`,
            
            // Add tenant_id to execution_ledger_events if missing
            `DO $$ BEGIN
              ALTER TABLE execution_ledger_events ADD COLUMN tenant_id TEXT DEFAULT 'default';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;`,
            
            // Add tenant_id to execution_ledger_summary if missing
            `DO $$ BEGIN
              ALTER TABLE execution_ledger_summary ADD COLUMN tenant_id TEXT DEFAULT 'default';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$;`
          ];

          for (const sql of alterStatements) {
            await client.query(sql);
          }
        }
      },
      {
        id: '15-multi-tenant-tables',
        description: 'Create custom_actions, policies, agents tables for multi-tenant support',
        check: async () => {
          const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'custom_actions'
          `);
          return result.rows.length === 0;
        },
        run: async () => {
          // These tables should already be created by the main schema
          // But in case they're missing, create them
          const createStatements = [
            `CREATE TABLE IF NOT EXISTS custom_actions (
              action_id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              action_name TEXT NOT NULL,
              intent_type TEXT NOT NULL,
              risk_tier TEXT NOT NULL CHECK(risk_tier IN ('T0', 'T1', 'T2')),
              schema_json JSONB,
              description TEXT,
              enabled BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE(tenant_id, action_name)
            )`,
            
            `CREATE INDEX IF NOT EXISTS idx_custom_actions_tenant ON custom_actions(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_custom_actions_enabled ON custom_actions(enabled)`,
            `CREATE INDEX IF NOT EXISTS idx_custom_actions_risk_tier ON custom_actions(risk_tier)`,
            
            `CREATE TABLE IF NOT EXISTS policies (
              policy_id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              name TEXT NOT NULL,
              description TEXT,
              conditions_json JSONB NOT NULL,
              actions_json JSONB NOT NULL,
              priority INTEGER DEFAULT 100,
              enabled BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              created_by TEXT,
              UNIQUE(tenant_id, name)
            )`,
            
            `CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled)`,
            `CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority DESC)`,
            
            `CREATE TABLE IF NOT EXISTS agents (
              agent_id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              name TEXT,
              type TEXT,
              status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
              last_seen TIMESTAMPTZ,
              first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              total_executions INTEGER DEFAULT 0,
              successful_executions INTEGER DEFAULT 0,
              failed_executions INTEGER DEFAULT 0,
              blocked_executions INTEGER DEFAULT 0,
              metadata_json JSONB,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`,
            
            `CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id)`,
            `CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`,
            `CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC)`
          ];

          for (const sql of createStatements) {
            await client.query(sql);
          }
        }
      }
    ];

    // Run pending migrations
    for (const migration of migrations) {
      if (!applied.has(migration.id)) {
        try {
          // Check if migration is actually needed
          const needsMigration = await migration.check();
          
          if (needsMigration) {
            console.log(`[StateGraph] Running migration: ${migration.id}`);
            await migration.run();
          }
          
          // Record migration as applied
          await client.query(
            'INSERT INTO schema_migrations (migration_id, description) VALUES ($1, $2) ON CONFLICT (migration_id) DO NOTHING',
            [migration.id, migration.description]
          );
          
          console.log(`[StateGraph] Migration applied: ${migration.id}`);
        } catch (error) {
          console.error(`[StateGraph] Migration failed: ${migration.id}`, error);
          throw error;
        }
      }
    }

    console.log('[StateGraph] All migrations complete');
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
