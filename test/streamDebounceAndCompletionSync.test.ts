import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { LocalSyncWorker } from '../src/sync/localSyncWorker';
import type { GistClient } from '../src/sync/gistClient';

test('LocalSyncWorker debounces outbox sync while generating and syncs immediately upon completion', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-stream-debounce-'));
  const sessionDir = path.join(tmpDir, '.agent', 'sessions', 'sess-stream');
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(path.join(sessionDir, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'hello stream' }) + '\n', 'utf8');

  // Mark active / generating with live draft
  await fs.writeFile(path.join(sessionDir, '.active'), JSON.stringify({ active: true }), 'utf8');
  await fs.writeFile(path.join(sessionDir, 'live_draft.json'), JSON.stringify({ content: 'partial chunk...', timestamp: Date.now() }), 'utf8');

  let callCount = 0;
  let lastSyncedOutbox: any = null;
  const fakeGistClient = {
    async updateOutboxAndDrainInbox(outbox: any) {
      callCount++;
      lastSyncedOutbox = outbox;
    },
  } as unknown as GistClient;

  try {
    const worker = new LocalSyncWorker(tmpDir, fakeGistClient);

    // 1. Trigger scheduleOutboxSync while generating with a 50ms debounce
    await worker.scheduleOutboxSync('sess-stream', 50);
    assert.equal(callCount, 0, 'Should not sync immediately while generating');

    // 2. Trigger again before debounce expires (stream continuing)
    await new Promise((r) => setTimeout(r, 20));
    await worker.scheduleOutboxSync('sess-stream', 50);
    assert.equal(callCount, 0, 'Debounce should have been reset by new tokens');

    // 3. Complete generation: remove .active and live_draft.json, write full response to chat.jsonl
    await fs.unlink(path.join(sessionDir, '.active'));
    await fs.unlink(path.join(sessionDir, 'live_draft.json'));
    await fs.appendFile(path.join(sessionDir, 'chat.jsonl'), JSON.stringify({ role: 'assistant', content: 'full complete response' }) + '\n', 'utf8');

    // 4. Trigger scheduleOutboxSync upon turn completion
    await worker.scheduleOutboxSync('sess-stream', 50);

    // Should sync immediately with the completed turn
    assert.equal(callCount, 1, 'Completed turn should trigger immediate outbox sync');
    assert.ok(lastSyncedOutbox?.session);
    assert.equal(lastSyncedOutbox.session.isGenerating, false);
    assert.equal(lastSyncedOutbox.session.messages.slice(-1)[0]?.content, 'full complete response');

    worker.stop();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
