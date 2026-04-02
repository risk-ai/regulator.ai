#!/usr/bin/env node
/**
 * Execution Invariant Audit Script — Phase 5 Task 5.6
 * 
 * Verifies execution_log data against the canonical state machine
 * and invariant rules from docs/execution-timeline-spec.md
 * 
 * Checks:
 * 1. Every execution has valid terminal state OR valid intermediate state
 * 2. No illegal state transitions in timeline
 * 3. No executions stuck in intermediate states (>5 min)
 * 4. Step ordering is sequential with no gaps
 * 5. Terminal states have completed_at timestamps
 * 6. No plaintext secrets in persisted fields
 * 
 * Usage:
 *   node scripts/audit-invariants.js
 * 
 * Exit codes:
 *   0 = PASS (all checks passed)
 *   1 = FAIL (violations found)
 */

import pg from 'pg';
const { Pool } = pg;

// State machine definition (canonical)
const VALID_STATES = ['planned', 'approved', 'executing', 'awaiting_callback', 'verifying', 'complete', 'failed', 'cancelled'];
const TERMINAL_STATES = ['complete', 'failed', 'cancelled'];
const INTERMEDIATE_STATES = ['planned', 'approved', 'executing', 'awaiting_callback', 'verifying'];

const VALID_TRANSITIONS = {
  'planned': ['approved', 'cancelled'],
  'approved': ['executing', 'cancelled'],
  'executing': ['verifying', 'failed', 'awaiting_callback'],
  'awaiting_callback': ['verifying', 'failed'],
  'verifying': ['complete', 'failed'],
  'complete': [],  // Terminal
  'failed': [],    // Terminal
  'cancelled': [], // Terminal
};

// Sensitive patterns (secrets that should never be in plaintext)
const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi,
  /sk-[A-Za-z0-9]{20,}/gi,
  /ghp_[A-Za-z0-9]{36}/gi,
  /xox[boaprs]-[A-Za-z0-9-]{10,}/gi,
  /(?:password|token|secret|api_key|apikey)["']\s*:\s*["'][^"']+["']/gi,
  /Authorization:\s*[^\s,]+/gi,
  /\$2[aby]\$\d+\$[./A-Za-z0-9]{53}/g,  // bcrypt hashes
];

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});

// Audit results
const violations = [];

async function auditInvariants() {
  console.log('🔍 Execution Invariant Audit — Phase 5.6\n');
  console.log('Checking execution_log against canonical state machine...\n');

  try {
    // Fetch all executions
    const result = await pool.query(`
      SELECT 
        execution_id, 
        tenant_id, 
        state, 
        timeline, 
        steps, 
        result, 
        created_at, 
        updated_at, 
        completed_at
      FROM regulator.execution_log
      ORDER BY created_at DESC
    `);

    const executions = result.rows;
    console.log(`Found ${executions.length} executions\n`);

    if (executions.length === 0) {
      console.log('✅ No executions found — nothing to audit\n');
      process.exit(0);
    }

    // Run all checks
    for (const exec of executions) {
      await checkStateValidity(exec);
      await checkTimelineTransitions(exec);
      await checkIntermediateTimeout(exec);
      await checkStepOrdering(exec);
      await checkTerminalStateTimestamp(exec);
      await checkSecretLeakage(exec);
    }

    // Report results
    console.log('\n' + '='.repeat(60) + '\n');
    
    if (violations.length === 0) {
      console.log('✅ PASS — All invariants satisfied\n');
      process.exit(0);
    } else {
      console.log(`❌ FAIL — ${violations.length} violation(s) found:\n`);
      violations.forEach((v, i) => {
        console.log(`${i + 1}. ${v}`);
      });
      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Audit failed with error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Check 1: State Validity
 * Every execution must be in a valid state
 */
function checkStateValidity(exec) {
  if (!VALID_STATES.includes(exec.state)) {
    violations.push(`[${exec.execution_id}] Invalid state: "${exec.state}" (not in canonical state set)`);
  }
}

/**
 * Check 2: Timeline Transitions
 * All state transitions in timeline must be valid per state machine
 */
function checkTimelineTransitions(exec) {
  if (!exec.timeline || exec.timeline.length === 0) {
    violations.push(`[${exec.execution_id}] Missing timeline entries`);
    return;
  }

  const timeline = exec.timeline;
  
  // Check first entry is 'planned'
  if (timeline[0].state !== 'planned') {
    violations.push(`[${exec.execution_id}] Timeline must start with "planned", got "${timeline[0].state}"`);
  }

  // Check all transitions
  for (let i = 1; i < timeline.length; i++) {
    const prevState = timeline[i - 1].state;
    const currentState = timeline[i].state;
    
    const allowedTransitions = VALID_TRANSITIONS[prevState];
    if (!allowedTransitions) {
      violations.push(`[${exec.execution_id}] Unknown state in timeline: "${prevState}"`);
      continue;
    }
    
    if (!allowedTransitions.includes(currentState)) {
      violations.push(`[${exec.execution_id}] Illegal transition: "${prevState}" → "${currentState}"`);
    }
  }

  // Check timeline ends with current state
  const lastTimelineState = timeline[timeline.length - 1].state;
  if (lastTimelineState !== exec.state) {
    violations.push(`[${exec.execution_id}] Timeline last state "${lastTimelineState}" != current state "${exec.state}"`);
  }
}

/**
 * Check 3: Intermediate Timeout
 * Executions in intermediate states for >5 minutes are flagged
 */
function checkIntermediateTimeout(exec) {
  if (!INTERMEDIATE_STATES.includes(exec.state)) return;
  
  const now = new Date();
  const updatedAt = new Date(exec.updated_at);
  const ageMinutes = (now - updatedAt) / 1000 / 60;
  
  if (ageMinutes > 5) {
    violations.push(`[${exec.execution_id}] Stuck in "${exec.state}" for ${Math.floor(ageMinutes)} minutes`);
  }
}

/**
 * Check 4: Step Ordering
 * Steps must have sequential step_index with no gaps
 */
function checkStepOrdering(exec) {
  if (!exec.steps || exec.steps.length === 0) {
    violations.push(`[${exec.execution_id}] Missing steps`);
    return;
  }

  exec.steps.forEach((step, i) => {
    if (step.step_index !== i) {
      violations.push(`[${exec.execution_id}] Step at position ${i} has step_index=${step.step_index} (should be ${i})`);
    }
  });
}

/**
 * Check 5: Terminal State Timestamp
 * All terminal states must have completed_at timestamp
 */
function checkTerminalStateTimestamp(exec) {
  if (TERMINAL_STATES.includes(exec.state) && !exec.completed_at) {
    violations.push(`[${exec.execution_id}] Terminal state "${exec.state}" missing completed_at timestamp`);
  }
}

/**
 * Check 6: Secret Leakage
 * No plaintext secrets in result, steps, or timeline
 */
function checkSecretLeakage(exec) {
  const fieldsToCheck = [
    { name: 'result', value: JSON.stringify(exec.result || {}) },
    { name: 'steps', value: JSON.stringify(exec.steps || []) },
    { name: 'timeline', value: JSON.stringify(exec.timeline || []) },
  ];

  for (const field of fieldsToCheck) {
    for (const pattern of SECRET_PATTERNS) {
      const matches = field.value.match(pattern);
      if (matches) {
        violations.push(`[${exec.execution_id}] Secret leaked in ${field.name}: "${matches[0].substring(0, 20)}..."`);
      }
    }
    
    // Check for unredacted credential markers
    if (field.value.includes('test_bearer_token') || 
        field.value.includes('test_token_') ||
        field.value.includes('sk-proj-')) {
      violations.push(`[${exec.execution_id}] Test credential found in ${field.name} (not redacted)`);
    }
  }
}

// Run audit
auditInvariants().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
