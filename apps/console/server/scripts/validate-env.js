#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Validates required environment variables before server startup.
 */

import { exit } from 'process';

const REQUIRED_VARS = [
  {
    name: 'VIENNA_OPERATOR_PASSWORD',
    description: 'Operator password for authentication',
    example: 'your_secure_password_here',
  },
];

const OPTIONAL_VARS = [
  {
    name: 'VIENNA_OPERATOR_NAME',
    description: 'Operator name',
    default: 'vienna',
  },
  {
    name: 'VIENNA_SESSION_SECRET',
    description: 'Session secret for signing cookies (generate with: openssl rand -hex 32)',
    default: 'random (sessions won\'t persist across restarts)',
  },
  {
    name: 'VIENNA_SESSION_TTL',
    description: 'Session TTL in milliseconds',
    default: '86400000 (24 hours)',
  },
  {
    name: 'PORT',
    description: 'Server port',
    default: '3100',
  },
  {
    name: 'HOST',
    description: 'Server host',
    default: 'localhost',
  },
  {
    name: 'NODE_ENV',
    description: 'Node environment',
    default: 'development',
  },
];

console.log('🔍 Validating environment configuration...\n');

let hasErrors = false;

// Check required variables
REQUIRED_VARS.forEach(({ name, description, example }) => {
  if (!process.env[name]) {
    console.error(`❌ MISSING: ${name}`);
    console.error(`   ${description}`);
    if (example) {
      console.error(`   Example: ${name}=${example}`);
    }
    console.error();
    hasErrors = true;
  } else {
    console.log(`✅ ${name}: [configured]`);
  }
});

// Check optional variables (informational)
if (process.env.VERBOSE === '1') {
  console.log('\n📋 Optional configuration:');
  OPTIONAL_VARS.forEach(({ name, description, default: defaultValue }) => {
    const value = process.env[name];
    if (value) {
      console.log(`   ${name}: [configured]`);
    } else {
      console.log(`   ${name}: ${defaultValue} (default)`);
    }
  });
}

// Session secret warning
if (!process.env.VIENNA_SESSION_SECRET) {
  console.log('\n⚠️  WARNING: VIENNA_SESSION_SECRET not set');
  console.log('   Sessions will not persist across server restarts');
  console.log('   Generate one with: openssl rand -hex 32');
}

console.log();

if (hasErrors) {
  console.error('❌ Environment validation failed');
  console.error('   See .env.example for full configuration reference\n');
  exit(1);
} else {
  console.log('✅ Environment validation passed\n');
  exit(0);
}
