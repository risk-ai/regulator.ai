/**
 * Test Postgres Initialization (Minimal)
 * Tests StateGraph and ChatHistoryService initialization without full server boot
 */

import dotenv from 'dotenv';
dotenv.config();

// Set test environment
process.env.POSTGRES_URL = process.env.POSTGRES_URL || "postgres://maxlawai@localhost:5432/vienna_dev";
process.env.VIENNA_ENV = "test";
process.env.NODE_ENV = "test";

console.log('🧪 Testing Postgres Initialization...\n');
console.log(`POSTGRES_URL: ${process.env.POSTGRES_URL.replace(/\/\/.*@/, '//***@')}`);
console.log(`VIENNA_ENV: ${process.env.VIENNA_ENV}\n`);

async function testChatHistory() {
  console.log('📝 Testing ChatHistoryService...');
  
  try {
    const { ChatHistoryService } = await import('./src/services/chatHistoryService.postgres.js');
    const chatHistory = new ChatHistoryService();
    
    await chatHistory.initialize();
    console.log('✅ ChatHistoryService initialized\n');
    
    return true;
  } catch (error) {
    console.error('❌ ChatHistoryService failed:');
    console.error(error);
    return false;
  }
}

async function testStateGraph() {
  console.log('🗄️  Testing StateGraph...');
  
  try {
    // Import via require (CommonJS module)
    const { getStateGraph } = await import('@vienna/lib');
    const stateGraph = getStateGraph();
    
    await stateGraph.initialize();
    console.log('✅ StateGraph initialized\n');
    
    return true;
  } catch (error) {
    console.error('❌ StateGraph failed:');
    console.error(error);
    return false;
  }
}

async function main() {
  const chatHistoryOk = await testChatHistory();
  const stateGraphOk = await testStateGraph();
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS:');
  console.log(`  ChatHistoryService: ${chatHistoryOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  StateGraph: ${stateGraphOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50) + '\n');
  
  if (chatHistoryOk && stateGraphOk) {
    console.log('🎉 All persistence modules initialized successfully!');
    process.exit(0);
  } else {
    console.log('❌ Some modules failed to initialize');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unhandled error:');
  console.error(error);
  process.exit(1);
});
