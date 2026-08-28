import test from 'node:test';
import * as assert from 'node:assert/strict';
import { validateGistCredentials } from '../src/sync/gistValidator';
import { encryptSyncData } from '../src/sync/syncCrypto';

test('validateGistCredentials rejects missing token or gistId', async () => {
  const r1 = await validateGistCredentials({ token: '', gistId: 'abc' });
  assert.equal(r1.ok, false);
  assert.ok(r1.error?.includes('token'));

  const r2 = await validateGistCredentials({ token: 'ghp_123', gistId: '' });
  assert.equal(r2.ok, false);
  assert.ok(r2.error?.includes('Gist ID'));
});

test('validateGistCredentials fails with network / auth errors', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ message: 'Bad credentials' }), { status: 401, statusText: 'Unauthorized' });
    }) as any;

    const res = await validateGistCredentials({ token: 'ghp_invalid', gistId: 'gist123', password: 'pin' });
    assert.equal(res.ok, false);
    assert.ok(res.error?.includes('token is invalid') || res.error?.includes('Bad credentials'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('validateGistCredentials fails when decryption checksum fails', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const encrypted = encryptSyncData(JSON.stringify({ inbox: [], sessions: [], version: 1, updatedAt: 100 }), 'correct-pin');
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        files: { 'agent-sync.json': { content: encrypted } }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;

    const res = await validateGistCredentials({ token: 'ghp_valid', gistId: 'gist123', password: 'wrong-pin' });
    assert.equal(res.ok, false);
    assert.ok(res.error?.includes('Password') || res.error?.includes('Decryption'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('validateGistCredentials succeeds when Gist exists and password is valid', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const encrypted = encryptSyncData(JSON.stringify({ inbox: [], sessions: [], version: 1, updatedAt: 100 }), 'my-pin');
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({
        files: { 'agent-sync.json': { content: encrypted } }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as any;

    const res = await validateGistCredentials({ token: 'ghp_valid', gistId: 'gist123', password: 'my-pin' });
    assert.equal(res.ok, true);
    assert.equal(res.error, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
