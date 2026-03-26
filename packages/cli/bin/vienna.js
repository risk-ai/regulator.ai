#!/usr/bin/env node

/**
 * Vienna OS CLI
 * 
 * Scaffold, test, and deploy governed AI agents
 */

const { program } = require('commander');
const packageJson = require('../package.json');

program
  .name('vienna')
  .description('Vienna OS CLI for governed AI agents')
  .version(packageJson.version);

// Initialize new Vienna OS project
program
  .command('init [project-name]')
  .description('Create a new Vienna OS agent project')
  .option('-t, --template <template>', 'Template to use (basic, regulatory, trading, legal)', 'basic')
  .action(async (projectName, options) => {
    const init = require('../commands/init');
    await init(projectName || '.', options);
  });

// Create new agent
program
  .command('create <agent-name>')
  .description('Create a new agent in the current project')
  .option('-t, --type <type>', 'Agent type (simple, orchestrator, specialist)', 'simple')
  .action(async (agentName, options) => {
    const create = require('../commands/create');
    await create(agentName, options);
  });

// Test agent
program
  .command('test [agent-path]')
  .description('Test an agent with sample intents')
  .option('-i, --intent <intent>', 'Intent JSON file to test with')
  .option('-v, --verbose', 'Verbose output')
  .action(async (agentPath, options) => {
    const test = require('../commands/test');
    await test(agentPath || '.', options);
  });

// Deploy agent
program
  .command('deploy')
  .description('Deploy Vienna OS to production')
  .option('-e, --environment <env>', 'Environment (staging, production)', 'staging')
  .option('--dry-run', 'Simulate deployment without making changes')
  .action(async (options) => {
    const deploy = require('../commands/deploy');
    await deploy(options);
  });

// Validate agent configuration
program
  .command('validate')
  .description('Validate agent configuration and dependencies')
  .action(async () => {
    const validate = require('../commands/validate');
    await validate();
  });

// Start local development server
program
  .command('dev')
  .description('Start local development server')
  .option('-p, --port <port>', 'Port to run on', '3100')
  .action(async (options) => {
    const dev = require('../commands/dev');
    await dev(options);
  });

// Generate documentation
program
  .command('docs')
  .description('Generate documentation for your agents')
  .option('-o, --output <dir>', 'Output directory', './docs')
  .action(async (options) => {
    const docs = require('../commands/docs');
    await docs(options);
  });

program.parse();
