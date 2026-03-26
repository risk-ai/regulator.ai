/**
 * Vienna CLI: init command
 * 
 * Create a new Vienna OS agent project
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

const TEMPLATES = {
  basic: {
    name: 'Basic Agent',
    description: 'Simple governed AI agent with warrant system',
    files: {
      'agent.js': require('../templates/basic/agent'),
      'package.json': require('../templates/basic/package'),
      '.env.example': require('../templates/basic/env'),
      'README.md': require('../templates/basic/readme'),
    }
  },
  regulatory: {
    name: 'Regulatory Monitoring Agent',
    description: 'Monitor regulatory changes and generate compliance alerts',
    files: {
      'agent.js': require('../templates/regulatory/agent'),
      'config/sources.json': require('../templates/regulatory/sources'),
      'package.json': require('../templates/regulatory/package'),
      '.env.example': require('../templates/regulatory/env'),
      'README.md': require('../templates/regulatory/readme'),
    }
  },
  trading: {
    name: 'Trading Signal Agent',
    description: 'Execute trades with risk limits and audit trail',
    files: {
      'agent.js': require('../templates/trading/agent'),
      'config/risk-limits.json': require('../templates/trading/risk'),
      'package.json': require('../templates/trading/package'),
      '.env.example': require('../templates/trading/env'),
      'README.md': require('../templates/trading/readme'),
    }
  },
  legal: {
    name: 'Legal Research Assistant',
    description: 'Analyze case law with citation validation',
    files: {
      'agent.js': require('../templates/legal/agent'),
      'package.json': require('../templates/legal/package'),
      '.env.example': require('../templates/legal/env'),
      'README.md': require('../templates/legal/readme'),
    }
  }
};

async function init(projectName, options) {
  const template = TEMPLATES[options.template];
  
  if (!template) {
    console.error(chalk.red(`❌ Unknown template: ${options.template}`));
    console.log(chalk.yellow(`Available templates: ${Object.keys(TEMPLATES).join(', ')}`));
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  console.log();
  console.log(chalk.bold.blue('🏛 Vienna OS Agent Scaffolder'));
  console.log();
  console.log(chalk.gray(`Template: ${template.name}`));
  console.log(chalk.gray(`Directory: ${targetDir}`));
  console.log();

  // Check if directory exists
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(chalk.red(`❌ Directory ${projectName} already exists and is not empty`));
    process.exit(1);
  }

  const spinner = ora('Creating project...').start();

  try {
    // Create project directory
    await fs.ensureDir(targetDir);

    // Write template files
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = path.join(targetDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    }

    spinner.succeed('Project created successfully!');

    console.log();
    console.log(chalk.green('✅ Vienna OS agent project ready!'));
    console.log();
    console.log(chalk.bold('Next steps:'));
    console.log();
    console.log(chalk.gray(`  cd ${projectName}`));
    console.log(chalk.gray('  npm install'));
    console.log(chalk.gray('  cp .env.example .env'));
    console.log(chalk.gray('  # Add your ANTHROPIC_API_KEY to .env'));
    console.log(chalk.gray('  npm start'));
    console.log();
    console.log(chalk.dim('📚 Documentation: https://docs.vienna-os.com'));
    console.log(chalk.dim('💬 Discord: https://discord.gg/vienna-os'));
    console.log();

  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

module.exports = init;
