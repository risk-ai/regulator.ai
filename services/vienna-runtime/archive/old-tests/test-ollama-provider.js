#!/usr/bin/env node
/**
 * Test Ollama LocalProvider integration
 * 
 * Phase 6.9 validation script
 */

const { LocalProvider } = require('./lib/providers/local/client.js');

async function testLocalProvider() {
  console.log('=== Phase 6.9: Ollama Local Provider Test ===\n');
  
  const provider = new LocalProvider({
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:0.5b',
  });
  
  // Test 1: Health check
  console.log('Test 1: Health Check');
  try {
    const healthy = await provider.isHealthy();
    console.log(`✓ Health check: ${healthy ? 'HEALTHY' : 'UNHEALTHY'}\n`);
    
    if (!healthy) {
      console.error('❌ Provider unhealthy - check Ollama service and model');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
  
  // Test 2: Provider status
  console.log('Test 2: Provider Status');
  try {
    const status = await provider.getStatus();
    console.log('✓ Status:', JSON.stringify(status, null, 2));
    console.log();
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
  
  // Test 3: Simple message
  console.log('Test 3: Simple Message');
  try {
    const response = await provider.sendMessage({
      message: 'Say "Hello from Ollama" in exactly 5 words.',
      operator: 'test',
    });
    
    console.log('✓ Response:', response.content);
    console.log('  Model:', response.model);
    console.log('  Tokens:', `input=${response.tokens.input}, output=${response.tokens.output}`);
    console.log();
  } catch (error) {
    console.error('❌ Message failed:', error.message);
  }
  
  // Test 4: Conversational context
  console.log('Test 4: Conversational Context');
  try {
    const response = await provider.sendMessage({
      message: 'What did I just ask you to say?',
      operator: 'test',
      context: {
        conversation_history: [
          { role: 'operator', content: 'Say "Hello from Ollama" in exactly 5 words.' },
          { role: 'assistant', content: 'Hello from Ollama today here.' },
        ],
      },
    });
    
    console.log('✓ Context-aware response:', response.content.substring(0, 100) + '...');
    console.log();
  } catch (error) {
    console.error('❌ Context test failed:', error.message);
  }
  
  // Test 5: Message classification
  console.log('Test 5: Message Classification');
  try {
    const classification = await provider.classifyMessage('restart the gateway');
    console.log(`✓ Classification: "${classification}"`);
    console.log();
  } catch (error) {
    console.error('❌ Classification failed:', error.message);
  }
  
  console.log('=== All tests complete ===');
}

testLocalProvider().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
