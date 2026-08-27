import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { stopSession, getSessionDetail } from '../src/server/sessionStore';

test('stopSession unlinks active lock, live draft, and ensures getSessionDetail isGenerating === false', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-session-test-'));
  const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-123');
  await fs.mkdir(sDir, { recursive: true });

  // Create active lock, draft, and chat.jsonl with a user message
  await fs.writeFile(path.join(sDir, '.active'), JSON.stringify({ active: true, startedAt: Date.now() }), 'utf8');
  await fs.writeFile(path.join(sDir, 'live_draft.json'), JSON.stringify({ content: 'Generating...', timestamp: Date.now() }), 'utf8');
  await fs.writeFile(path.join(sDir, 'chat.jsonl'), JSON.stringify({ role: 'user', content: 'Do something long' }) + '\n', 'utf8');

  // Verify before stop, getSessionDetail reports isGenerating: true
  const beforeDetail = await getSessionDetail(tmpDir, 'sess-123');
  assert.equal(beforeDetail?.isGenerating, true);

  // Stop session
  const stopped = await stopSession(tmpDir, 'sess-123');
  assert.equal(stopped, true);

  // Verify after stop, active lock is removed and getSessionDetail reports isGenerating: false
  const afterDetail = await getSessionDetail(tmpDir, 'sess-123');
  assert.equal(afterDetail?.isGenerating, false, 'Should NOT report isGenerating after stop even if last message was user');

  // Verify incoming abort file was written
  const inDir = path.join(sDir, 'incoming');
  const files = await fs.readdir(inDir);
  const abortFile = files.find((f) => f.startsWith('abort-'));
  assert.ok(abortFile, 'Abort incoming message should be written');

  await fs.rm(tmpDir, { recursive: true, force: true });
});
