/**
 * Master Seed Script
 * Runs all seeders in the correct order to populate console with realistic data
 */

const { seedApprovals } = require('./seed-approvals');
const { seedAgents } = require('./seed-agents');
const { seedPolicies } = require('./seed-policies');
const { seedExecutions } = require('./seed-executions');

async function seedAll() {
  console.log('🚀 Starting full console database seed...');
  console.log('This will populate the console with realistic test data.');
  console.log('');

  const startTime = Date.now();

  try {
    // Seed in order of dependencies
    console.log('━'.repeat(60));
    console.log('1/4: Seeding Agents...');
    console.log('━'.repeat(60));
    await seedAgents();
    console.log('');

    console.log('━'.repeat(60));
    console.log('2/4: Seeding Policies...');
    console.log('━'.repeat(60));
    await seedPolicies();
    console.log('');

    console.log('━'.repeat(60));
    console.log('3/4: Seeding Approvals...');
    console.log('━'.repeat(60));
    await seedApprovals();
    console.log('');

    console.log('━'.repeat(60));
    console.log('4/4: Seeding Execution History...');
    console.log('━'.repeat(60));
    await seedExecutions();
    console.log('');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('═'.repeat(60));
    console.log('🎉 SEEDING COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ All data seeded successfully');
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('');
    console.log('📊 Summary:');
    console.log('   • 10 agents in fleet');
    console.log('   • 7 governance policies');
    console.log('   • 5 pending approvals');
    console.log('   • 50 execution records');
    console.log('');
    console.log('🔗 View the console:');
    console.log('   https://console.regulator.ai');
    console.log('');
    console.log('📋 Test these workflows:');
    console.log('   1. Approve a pending approval');
    console.log('   2. View agent fleet status');
    console.log('   3. Inspect active policies');
    console.log('   4. Browse execution history');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('❌ Seeding failed:', err.message);
    console.error('');
    console.error('Stack trace:');
    console.error(err.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('✅ All seeders complete - console is ready!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { seedAll };
