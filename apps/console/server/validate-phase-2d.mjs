/**
 * Phase 2D End-to-End Validation
 * 
 * Test workspace-aware command planning through API
 */

async function testCommandSubmission(command, attachments = []) {
  const response = await fetch('http://127.0.0.1:3100/api/v1/commands/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command,
      attachments,
      context: {},
    }),
  });
  
  const data = await response.json();
  return data;
}

async function main() {
  console.log('\n=== Phase 2D End-to-End Validation ===\n');
  
  const tests = [
    {
      name: 'Auto-resolve file by name',
      command: 'summarize package-lock.json',
      attachments: [],
      expectSuccess: true,
    },
    {
      name: 'Find and summarize pattern',
      command: 'find and summarize AGENTS.md',
      attachments: [],
      expectSuccess: true,
    },
    {
      name: 'Explain with path',
      command: 'explain src/server.ts',
      attachments: [],
      expectSuccess: true,
    },
    {
      name: 'File not found',
      command: 'summarize nonexistent-file.txt',
      attachments: [],
      expectSuccess: false,
      expectError: 'File not found',
    },
    {
      name: 'Manual attachment (legacy)',
      command: 'summarize this file',
      attachments: ['AGENTS.md'],
      expectSuccess: true,
    },
  ];
  
  for (const test of tests) {
    console.log(`Test: ${test.name}`);
    console.log(`  Command: "${test.command}"`);
    console.log(`  Attachments: ${test.attachments.length ? test.attachments.join(', ') : '(none)'}`);
    
    try {
      const result = await testCommandSubmission(test.command, test.attachments);
      
      if (result.success) {
        console.log(`  ✓ Success`);
        console.log(`    Objective ID: ${result.data.objective_id}`);
        console.log(`    Message: ${result.data.message}`);
      } else {
        console.log(`  ✗ Failed`);
        console.log(`    Error: ${result.error}`);
        
        if (test.expectSuccess === false && test.expectError) {
          if (result.error.includes(test.expectError)) {
            console.log(`    ✓ Expected error message confirmed`);
          } else {
            console.log(`    ⚠ Error message doesn't match expected pattern`);
          }
        }
      }
    } catch (error) {
      console.log(`  ✗ Request failed: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('=== Validation Complete ===\n');
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
