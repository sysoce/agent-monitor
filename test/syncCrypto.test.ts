import test from 'node:test';
import * as assert from 'node:assert/strict';
import { encryptSyncData, decryptSyncData } from '../src/sync/syncCrypto';

test('syncCrypto encrypts and decrypts string payloads with password', () => {
  const secret = 'Apex-8492-Cipher-Vault';
  const data = JSON.stringify({ hello: 'world', sessions: [1, 2, 3] });

  const encrypted = encryptSyncData(data, secret);
  assert.ok(encrypted.length > 20, 'Encrypted output should be non-empty base64 string');
  assert.notEqual(encrypted, data, 'Encrypted string must differ from original');

  const decrypted = decryptSyncData(encrypted, secret);
  assert.equal(decrypted, data, 'Decrypted string must match original payload');
});

test('syncCrypto fails decryption when password is incorrect', () => {
  const secret = 'Apex-8492-Cipher-Vault';
  const data = 'classified session data';
  const encrypted = encryptSyncData(data, secret);

  assert.throws(() => {
    decryptSyncData(encrypted, 'wrong-password-999');
  });
});

test('syncCrypto fails decryption when ciphertext is tampered', () => {
  const secret = 'Apex-8492-Cipher-Vault';
  const data = 'valid data';
  const encrypted = encryptSyncData(data, secret);
  const tampered = encrypted.slice(0, -4) + 'AAAA';

  assert.throws(() => {
    decryptSyncData(tampered, secret);
  });
});
