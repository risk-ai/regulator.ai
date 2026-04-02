#!/usr/bin/env node
/**
 * Generate VIENNA_CREDENTIAL_KEY (Phase 4A)
 * 
 * Generates a cryptographically secure 32-byte key for AES-256-GCM encryption.
 * Output format: base64-encoded (for easy env var storage).
 * 
 * Usage:
 *   node scripts/generate-credential-key.js
 * 
 * Then set in environment:
 *   export VIENNA_CREDENTIAL_KEY="<output>"
 * 
 * Or add to .env:
 *   VIENNA_CREDENTIAL_KEY=<output>
 */

const crypto = require('crypto');

function generateCredentialKey() {
  // Generate 32 random bytes (256 bits for AES-256)
  const key = crypto.randomBytes(32);
  
  // Encode as base64 for easy storage
  const base64Key = key.toString('base64');
  
  // Also provide hex format as alternative
  const hexKey = key.toString('hex');
  
  return { base64Key, hexKey };
}

console.log('🔐 Generating VIENNA_CREDENTIAL_KEY (Phase 4A)\n');

const { base64Key, hexKey } = generateCredentialKey();

console.log('Base64 format (recommended):');
console.log(`VIENNA_CREDENTIAL_KEY=${base64Key}\n`);

console.log('Hex format (alternative):');
console.log(`VIENNA_CREDENTIAL_KEY=${hexKey}\n`);

console.log('⚠️  SECURITY WARNINGS:');
console.log('  1. Store this key securely (env var, secrets manager, NOT in code)');
console.log('  2. Never commit this key to version control');
console.log('  3. Rotate this key if ever compromised (will invalidate all stored credentials)');
console.log('  4. Use different keys for dev/staging/production environments\n');

console.log('✅ Add to .env file:');
console.log(`   echo "VIENNA_CREDENTIAL_KEY=${base64Key}" >> .env\n`);

console.log('✅ Or set directly:');
console.log(`   export VIENNA_CREDENTIAL_KEY="${base64Key}"\n`);
