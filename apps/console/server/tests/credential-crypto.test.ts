/**
 * Credential Crypto Tests — Phase 4A
 */

import { encryptCredential, decryptCredential, generateCredentialKey, isCredentialKeyConfigured } from '../src/services/credentialCrypto.js';

// Set a test key before running
const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

describe('credentialCrypto', () => {
  beforeAll(() => {
    process.env.VIENNA_CREDENTIAL_KEY = TEST_KEY;
  });

  afterAll(() => {
    delete process.env.VIENNA_CREDENTIAL_KEY;
  });

  test('encrypt then decrypt returns original plaintext', () => {
    const plaintext = 'sk-test-1234567890abcdef';
    const encrypted = encryptCredential(plaintext);
    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test('encrypted value has correct format (iv:ciphertext)', () => {
    const encrypted = encryptCredential('test-secret');
    const parts = encrypted.split(':');
    expect(parts.length).toBe(2);
    // IV should be 12 bytes = 16 base64 chars
    expect(Buffer.from(parts[0], 'base64').length).toBe(12);
    // Ciphertext+authTag should be > 16 bytes (authTag alone is 16)
    expect(Buffer.from(parts[1], 'base64').length).toBeGreaterThan(16);
  });

  test('each encryption produces unique ciphertext (unique IV)', () => {
    const plaintext = 'same-secret-value';
    const enc1 = encryptCredential(plaintext);
    const enc2 = encryptCredential(plaintext);
    expect(enc1).not.toBe(enc2);
    // But both decrypt to same value
    expect(decryptCredential(enc1)).toBe(plaintext);
    expect(decryptCredential(enc2)).toBe(plaintext);
  });

  test('tampered ciphertext fails to decrypt', () => {
    const encrypted = encryptCredential('secret');
    const parts = encrypted.split(':');
    // Corrupt one byte of ciphertext
    const corrupted = Buffer.from(parts[1], 'base64');
    corrupted[0] ^= 0xff;
    const tampered = `${parts[0]}:${corrupted.toString('base64')}`;
    expect(() => decryptCredential(tampered)).toThrow();
  });

  test('wrong key fails to decrypt', () => {
    const encrypted = encryptCredential('secret');
    // Change key
    process.env.VIENNA_CREDENTIAL_KEY = 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b200';
    expect(() => decryptCredential(encrypted)).toThrow();
    // Restore
    process.env.VIENNA_CREDENTIAL_KEY = TEST_KEY;
  });

  test('missing key throws descriptive error', () => {
    const saved = process.env.VIENNA_CREDENTIAL_KEY;
    delete process.env.VIENNA_CREDENTIAL_KEY;
    expect(() => encryptCredential('test')).toThrow('VIENNA_CREDENTIAL_KEY not set');
    process.env.VIENNA_CREDENTIAL_KEY = saved;
  });

  test('handles empty string', () => {
    const encrypted = encryptCredential('');
    expect(decryptCredential(encrypted)).toBe('');
  });

  test('handles long credentials', () => {
    const long = 'x'.repeat(10000);
    const encrypted = encryptCredential(long);
    expect(decryptCredential(encrypted)).toBe(long);
  });

  test('handles unicode credentials', () => {
    const unicode = '🔑 пароль 密码 パスワード';
    const encrypted = encryptCredential(unicode);
    expect(decryptCredential(encrypted)).toBe(unicode);
  });

  test('generateCredentialKey returns 64-char hex', () => {
    const key = generateCredentialKey();
    expect(key.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
  });

  test('isCredentialKeyConfigured returns true when set', () => {
    expect(isCredentialKeyConfigured()).toBe(true);
  });

  test('isCredentialKeyConfigured returns false when unset', () => {
    const saved = process.env.VIENNA_CREDENTIAL_KEY;
    delete process.env.VIENNA_CREDENTIAL_KEY;
    expect(isCredentialKeyConfigured()).toBe(false);
    process.env.VIENNA_CREDENTIAL_KEY = saved;
  });
});
