#!/bin/bash
#
# Phase 10.3 Post-Deployment Verification
# Run immediately after deployment to validate Phase 10.3 is operational
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIENNA_CORE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$VIENNA_CORE_DIR"

echo "==================================================="
echo "Phase 10.3 Post-Deployment Verification"
echo "==================================================="
echo ""

# Check 1: Test Suite Validation
echo "CHECK 1: Test Suite Validation"
echo "---------------------------------------------------"
npm test -- tests/phase-10/test-phase-10.3-execution-timeouts.test.js 2>&1 | grep -E "Tests:|Test Suites:" || true
echo ""

# Check 2: Production Schema Verification
echo "CHECK 2: Production Schema Verification"
echo "---------------------------------------------------"
VIENNA_ENV=prod node -e "
const {getStateGraph} = require('./lib/state/state-graph');
(async () => {
  const sg = getStateGraph();
  await sg.initialize();
  const cols = sg.db.prepare('PRAGMA table_info(managed_objectives)').all();
  const allCols = cols.map(c => c.name);
  
  const expected = [
    'active_attempt_id',
    'execution_started_at',
    'execution_deadline_at',
    'cancel_requested_at',
    'execution_terminated_at',
    'last_terminal_reason',
    'last_timeout_at',
    'termination_result'
  ];
  
  const present = expected.filter(col => allCols.includes(col));
  const missing = expected.filter(col => !allCols.includes(col));
  
  console.log('Phase 10.3 columns:', present.join(', '));
  console.log('Total Phase 10.3 columns:', present.length, '/ 8');
  
  if (missing.length > 0) {
    console.error('✗ Missing columns:', missing.join(', '));
    process.exit(1);
  } else {
    console.log('✓ All 8 Phase 10.3 columns present');
  }
})();
"
echo ""

# Check 3: Stuck Objectives Detection
echo "CHECK 3: Stuck Objectives Detection"
echo "---------------------------------------------------"
VIENNA_ENV=prod node -e "
const {getStateGraph} = require('./lib/state/state-graph');
(async () => {
  const sg = getStateGraph();
  await sg.initialize();
  
  const reconciling = sg.listObjectives({reconciliation_status: 'reconciling'});
  console.log('Objectives in reconciling state:', reconciling.length);
  
  if (reconciling.length > 0) {
    console.log('');
    console.log('Objectives with active attempts:');
    reconciling.forEach(o => {
      const status = o.execution_deadline_at && new Date(o.execution_deadline_at) < new Date() 
        ? 'EXPIRED' 
        : 'ACTIVE';
      console.log({
        id: o.objective_id,
        attempt: o.active_attempt_id,
        deadline: o.execution_deadline_at,
        status
      });
    });
    
    const expired = reconciling.filter(o => 
      o.execution_deadline_at && new Date(o.execution_deadline_at) < new Date()
    );
    
    if (expired.length > 0) {
      console.warn('⚠ Warning:', expired.length, 'objectives with expired deadlines');
    } else {
      console.log('✓ No expired deadlines detected');
    }
  } else {
    console.log('✓ No objectives stuck in reconciling state');
  }
})();
"
echo ""

echo "==================================================="
echo "Post-Deployment Verification Complete"
echo "==================================================="
echo ""
echo "Next steps:"
echo "1. Monitor for 24 hours (until 2026-03-14 21:50 EDT)"
echo "2. Run monitoring queries from PHASE_10.3_DEPLOYED.md"
echo "3. If stable, proceed to Phase 10.4"
echo ""
