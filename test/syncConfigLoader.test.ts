import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadSyncConfig,
  saveSyncConfig,
  encodeSetupPayload,
  decodeSetupPayload,
} from '../src/sync/syncConfigLoader';

test('syncConfigLoader saves and loads sync config from .agent directory', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-sync-cfg-'));
  try {
    const config = { token: 'ghp_test1234567890', gistId: 'gist_abc123', password: 'pin-password' };
    const savedPath = await saveSyncConfig(tmpDir, config);
    assert.ok(savedPath.endsWith('.agent/sync-config.json') || savedPath.endsWith('.agent\\sync-config.json'));

    const loaded = loadSyncConfig(tmpDir);
    assert.deepEqual(loaded, config);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('syncConfigLoader encodes and decodes setup payloads roundtrip', () => {
  const config = { token: 'ghp_secretToken_ABC', gistId: '32charactergistid1234567890abcdef', password: 'vault-pin-1234' };
  const encoded = encodeSetupPayload(config);
  assert.ok(typeof encoded === 'string');
  assert.ok(encoded.length > 0);
  assert.ok(!encoded.includes(' '));

  const decoded = decodeSetupPayload(encoded);
  assert.deepEqual(decoded, config);
});

test('syncConfigLoader decodeSetupPayload handles invalid or malformed strings safely', () => {
  assert.equal(decodeSetupPayload(''), null);
  assert.equal(decodeSetupPayload('not-base64!@#$'), null);
  assert.equal(decodeSetupPayload('{}'), null);
});
