import test from 'node:test';
import * as assert from 'node:assert/strict';
import { GistClient } from '../src/sync/gistClient';
import { LocalSyncWorker } from '../src/sync/localSyncWorker';

test('GistClient updateRateLimit respects Retry-After header on 403 secondary rate limit', () => {
  const client = new GistClient({ token: 'test-token', gistId: 'test-gist' });
  const headersMap = new Map<string, string>([
    ['retry-after', '60'],
    ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000) + 3600)], // 1 hour later
  ]);
  const mockResponse = {
    status: 403,
    statusText: 'Forbidden',
    headers: { get: (k: string) => headersMap.get(k.toLowerCase()) ?? null },
  };

  (client as any).updateRateLimit(mockResponse);
  assert.equal(client.isBlockedByRateLimit(), true);
  const resetTime = (client as any).rateLimitReset;
  const diffSec = (resetTime - Date.now()) / 1000;
  assert.ok(diffSec <= 65 && diffSec >= 55, `Expected ~60s reset, got ${diffSec}s`);
});

test('GistClient updateRateLimit backs off gracefully when 403 has remaining quota > 0', () => {
  const client = new GistClient({ token: 'test-token', gistId: 'test-gist' });
  const headersMap = new Map<string, string>([
    ['x-ratelimit-remaining', '4980'],
    ['x-ratelimit-reset', String(Math.floor(Date.now() / 1000) + 3000)], // 50 mins later
  ]);
  const mockResponse = {
    status: 403,
    statusText: 'Forbidden',
    headers: { get: (k: string) => headersMap.get(k.toLowerCase()) ?? null },
  };

  (client as any).updateRateLimit(mockResponse);
  assert.equal(client.isBlockedByRateLimit(), true);
  const resetTime = (client as any).rateLimitReset;
  const diffSec = (resetTime - Date.now()) / 1000;
  assert.ok(diffSec <= 35 && diffSec >= 25, `Expected ~30s backoff, got ${diffSec}s`);
});

test('GistClient updateOutboxAndDrainInbox reuses cachedPayload without redundant GET', async () => {
  const client = new GistClient({ token: 'test-token', gistId: 'test-gist', password: 'test' });
  (client as any).cachedPayload = { inbox: [{ id: 'msg-1', sessionId: 'sess-1' }], sessions: [], version: 1, updatedAt: 1000 };
  let fetchCalled = false;
  let saveCalled = false;
  (client as any).fetchSyncState = async () => { fetchCalled = true; return { data: null, notModified: true }; };
  (client as any).saveSyncPayload = async () => { saveCalled = true; };

  await client.updateOutboxAndDrainInbox({ sessionId: 'sess-1', updatedAt: 2000, plans: [] }, ['msg-1'], []);
  assert.equal(fetchCalled, false, 'Should reuse cachedPayload without calling fetchSyncState');
  assert.equal(saveCalled, true, 'Should save updated payload');
});

test('LocalSyncWorker does not trigger outbox sync when poll returns notModified and fingerprint matches', async () => {
  const mockGistClient = {
    fetchSyncState: async () => ({ data: null, etag: 'etag-123', notModified: true }),
    updateOutboxAndDrainInbox: async () => {},
  };

  const worker = new LocalSyncWorker('/tmp', mockGistClient as any);
  (worker as any).lastSessionsFingerprint = 'sess-1:1000:2|d:0';
  (worker as any).computeFingerprint = async () => 'sess-1:1000:2|d:0';

  let scheduled = false;
  worker.scheduleOutboxSync = async () => { scheduled = true; };

  await worker.pollInboxOnce();
  assert.equal(scheduled, false, 'Should not schedule outbox sync when not modified');
});
