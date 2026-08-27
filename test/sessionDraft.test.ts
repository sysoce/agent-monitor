import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readSessionDraft, injectDraftIntoSession } from '../src/server/sessionDraft';
import type { SessionDetail } from '../src/server/types';

test('readSessionDraft returns null when live_draft.json does not exist', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draft-test-'));
  try {
    const draft = await readSessionDraft(tmpDir, 'sess-none');
    assert.equal(draft, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('readSessionDraft parses active draft and ignores stale drafts', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draft-test-'));
  try {
    const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess-active');
    await fs.mkdir(sDir, { recursive: true });
    const draftFile = path.join(sDir, 'live_draft.json');

    // Fresh draft
    await fs.writeFile(draftFile, JSON.stringify({
      thinking: 'Analyzing codebase architecture...',
      content: 'Here is the plan:',
      timestamp: Date.now(),
    }), 'utf8');

    const draft = await readSessionDraft(tmpDir, 'sess-active');
    assert.ok(draft);
    assert.equal(draft.thinking, 'Analyzing codebase architecture...');
    assert.equal(draft.content, 'Here is the plan:');

    // Stale draft older than maxAge
    await fs.writeFile(draftFile, JSON.stringify({
      thinking: 'Old thought',
      content: 'Old text',
      timestamp: Date.now() - 120_000,
    }), 'utf8');

    const staleDraft = await readSessionDraft(tmpDir, 'sess-active', 60_000);
    assert.equal(staleDraft, null);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('injectDraftIntoSession attaches live assistant message to session detail', () => {
  const baseDetail: SessionDetail = {
    id: 'sess-1',
    title: 'Test Session',
    mode: 'agent',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      { role: 'user', content: 'Explain quantum computing' },
    ],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };

  const draft = {
    thinking: 'Quantum entanglement considerations...',
    content: 'Quantum computing is',
    timestamp: Date.now(),
  };

  const enriched = injectDraftIntoSession(baseDetail, draft);
  assert.equal(enriched.messages.length, 2);
  const liveMsg = enriched.messages[1] as any;
  assert.equal(liveMsg.role, 'assistant');
  assert.equal(liveMsg.thinking, 'Quantum entanglement considerations...');
  assert.equal(liveMsg.content, 'Quantum computing is');
  assert.equal(liveMsg.isLive, true);
  assert.equal(enriched.isGenerating, true);
});
