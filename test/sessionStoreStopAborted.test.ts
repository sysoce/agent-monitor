import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { stopSession, getSessionDetail } from '../src/server/sessionStore';

test('stopSession writes .aborted marker and getSessionDetail suppresses draft / isGenerating', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-aborted-test-'));
  try {
    const s1 = path.join(tmpDir, '.agent', 'sessions', 'sess-abort-1');
    await fs.mkdir(s1, { recursive: true });
    await fs.writeFile(path.join(s1, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'Long request' }) + '\n', 'utf8');
    await fs.writeFile(path.join(s1, '.active'), JSON.stringify({ active: true, startedAt: Date.now() }), 'utf8');
    await fs.writeFile(path.join(s1, 'live_draft.json'), JSON.stringify({ content: 'Stream draft...', timestamp: Date.now() }), 'utf8');

    // Before stop: should be isGenerating: true
    const detailBefore = await getSessionDetail(tmpDir, 'sess-abort-1');
    assert.equal(detailBefore?.isGenerating, true);

    // Call stopSession
    const ok = await stopSession(tmpDir, 'sess-abort-1');
    assert.equal(ok, true);

    // After stop: should be isGenerating: false, live draft cleaned
    const detailAfter = await getSessionDetail(tmpDir, 'sess-abort-1');
    assert.equal(detailAfter?.isGenerating, false);

    // Even if live_draft.json was re-created before .aborted timestamp, getSessionDetail should ignore it
    await fs.writeFile(path.join(s1, 'live_draft.json'), JSON.stringify({ content: 'Stale draft', timestamp: Date.now() - 5000 }), 'utf8');
    const detailWithStaleDraft = await getSessionDetail(tmpDir, 'sess-abort-1');
    assert.equal(detailWithStaleDraft?.isGenerating, false);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
