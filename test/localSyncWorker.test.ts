import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalSyncWorker } from '../src/sync/localSyncWorker';
import type { GistClient } from '../src/sync/gistClient';
import type { SyncGistPayload, SyncInboxMessage } from '../src/sync/types';

test('LocalSyncWorker polls Gist inbox and drains incoming message files to disk', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-worker-test-'));
  const sessionDir = path.join(tmpDir, '.agent', 'sessions', 'sess-alpha');
  await fs.mkdir(path.join(sessionDir, 'incoming'), { recursive: true });

  const drainedIds: string[] = [];
  const fakeGistClient = {
    async fetchSyncState() {
      const payload: SyncGistPayload = {
        inbox: [{ id: 'inbox-123', sessionId: 'sess-alpha', content: 'run diagnostics', timestamp: 5000 }],
        sessions: [],
        version: 1,
        updatedAt: 5000,
      };
      return { data: payload, etag: '"etag-1"', notModified: false };
    },
    async updateOutboxAndDrainInbox(_outbox: any, processedIds: string[]) {
      drainedIds.push(...processedIds);
    },
  } as unknown as GistClient;

  try {
    const worker = new LocalSyncWorker(tmpDir, fakeGistClient);
    await worker.pollInboxOnce();

    assert.equal(drainedIds.length, 1);
    assert.equal(drainedIds[0], 'inbox-123');

    const incomingFiles = await fs.readdir(path.join(sessionDir, 'incoming'));
    assert.equal(incomingFiles.length, 1);
    const content = JSON.parse(await fs.readFile(path.join(sessionDir, 'incoming', incomingFiles[0]!), 'utf8'));
    assert.equal(content.content, 'run diagnostics');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('LocalSyncWorker syncOutboxOnce pushes sessions and recent details to Gist', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-outbox-test-'));
  const sessionDir = path.join(tmpDir, '.agent', 'sessions', 'sess-beta');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'hello backup' }) + '\n', 'utf8');

  let syncedOutbox: any = null;
  let syncedSessions: any[] = [];
  let syncedDetails: Record<string, any> = {};

  const fakeGistClient = {
    async updateOutboxAndDrainInbox(outbox: any, _processed: any[], sessions: any[], recentDetails: any) {
      syncedOutbox = outbox;
      syncedSessions = sessions;
      syncedDetails = recentDetails;
    },
  } as unknown as GistClient;

  try {
    const worker = new LocalSyncWorker(tmpDir, fakeGistClient);
    await worker.syncOutboxOnce('sess-beta');

    assert.equal(syncedOutbox?.sessionId, 'sess-beta');
    assert.equal(syncedSessions.length, 1);
    assert.equal(syncedSessions[0].id, 'sess-beta');
    assert.ok(syncedDetails['sess-beta']);
    assert.equal(syncedDetails['sess-beta'].messages[0].content, 'hello backup');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('LocalSyncWorker scheduleOutboxSync throttles rapid outbox updates', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-throttle-test-'));
  const sessionDir = path.join(tmpDir, '.agent', 'sessions', 'sess-gamma');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'test' }) + '\n', 'utf8');
  await fs.writeFile(path.join(sessionDir, '.active'), '', 'utf8');

  let callCount = 0;
  const fakeGistClient = {
    async updateOutboxAndDrainInbox() {
      callCount++;
    },
  } as unknown as GistClient;

  try {
    const worker = new LocalSyncWorker(tmpDir, fakeGistClient);
    worker.scheduleOutboxSync('sess-gamma', 10);
    worker.scheduleOutboxSync('sess-gamma', 10);
    worker.scheduleOutboxSync('sess-gamma', 10);

    await new Promise((r) => setTimeout(r, 50));

    // Only 1 call should have gone through
    assert.equal(callCount, 1, 'Rapid calls should be throttled to 1 call');
    worker.stop();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

