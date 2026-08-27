import test from 'node:test';
import * as assert from 'node:assert/strict';
import { parseUrlConfig, applyConfigToStorage } from '../src/ui/urlConfigLoader';
import { encodeSetupPayload } from '../src/sync/syncConfigLoader';

test('parseUrlConfig parses base64 #setup= hash fragment correctly', () => {
  const payload = encodeSetupPayload({ gistId: 'gist_123', token: 'ghp_tokenABC', password: 'pin99' });
  const result = parseUrlConfig(`#setup=${payload}`);
  assert.ok(result);
  assert.equal(result?.gistId, 'gist_123');
  assert.equal(result?.token, 'ghp_tokenABC');
  assert.equal(result?.password, 'pin99');
});

test('parseUrlConfig parses raw base64 payload string without #setup= prefix', () => {
  const payload = encodeSetupPayload({ gistId: 'gist_456', token: 'ghp_tokenDEF', password: 'pin88' });
  const result = parseUrlConfig(payload);
  assert.ok(result);
  assert.equal(result?.gistId, 'gist_456');
  assert.equal(result?.token, 'ghp_tokenDEF');
  assert.equal(result?.password, 'pin88');
});

test('parseUrlConfig parses raw hash params #gistId=...&token=... correctly', () => {
  const result = parseUrlConfig('#gistId=mygist&token=mytoken&password=mypass');
  assert.ok(result);
  assert.equal(result?.gistId, 'mygist');
  assert.equal(result?.token, 'mytoken');
  assert.equal(result?.password, 'mypass');
});

test('applyConfigToStorage saves gist sync config, auth token, and git-backup mode to localStorage', () => {
  const storage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => storage[k] || null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; },
  };

  const ok = applyConfigToStorage(
    { gistId: 'g1', token: 't1', password: 'p1' },
    mockLocalStorage as any
  );

  assert.equal(ok, true);
  assert.equal(JSON.parse(storage['agent_gist_sync']!).gistId, 'g1');
  assert.equal(JSON.parse(storage['agent_gist_sync']!).token, 't1');
  assert.equal(storage['agent_monitor_token'], 'p1');
  assert.equal(storage['agent_sync_mode'], 'git-backup');
});
