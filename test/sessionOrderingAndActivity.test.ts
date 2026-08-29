import test from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { listSessions, getSessionDetail } from '../src/server/sessionStore';
import { extractMessageTimestamp } from '../src/server/sessionActivity';
import { getSortedSessions } from '../src/ui/sidebarSessionUtils';
import type { AppState } from '../src/ui/types';

test('extractMessageTimestamp extracts numeric ms, seconds, ISO strings, and handles fallbacks', () => {
  assert.equal(extractMessageTimestamp({ timestamp: 1700000000000 }), 1700000000000);
  assert.equal(extractMessageTimestamp({ timestamp: 1700000000 }), 1700000000000); // unix seconds converted to ms
  assert.equal(extractMessageTimestamp({ time: 1700000000123 }), 1700000000123);
  assert.equal(extractMessageTimestamp({ created_at: '2026-08-30T00:00:00.000Z' }), 1788048000000);
  assert.equal(extractMessageTimestamp({ createdAt: '2026-08-30T00:00:00.000Z' }), 1788048000000);
  assert.equal(extractMessageTimestamp({}), undefined);
  assert.equal(extractMessageTimestamp(null), undefined);
});

test('listSessions sorts sessions by last recorded message activity and running status, ignoring file mtime corruption from git checkout', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-ordering-'));
  const sessionsDir = path.join(tmpDir, '.agent', 'sessions');
  await fs.mkdir(sessionsDir, { recursive: true });

  // Session A: Recorded 3 hours ago (older activity)
  const sessA = path.join(sessionsDir, 'sess_older');
  await fs.mkdir(sessA, { recursive: true });
  await fs.writeFile(
    path.join(sessA, 'chat.jsonl'),
    JSON.stringify({ role: 'user', content: 'Old task', timestamp: 1700001000000 }) + '\n' +
    JSON.stringify({ role: 'assistant', content: 'Old reply', timestamp: 1700001005000 }) + '\n'
  );

  // Session B: Recorded 1 hour ago (more recent activity)
  const sessB = path.join(sessionsDir, 'sess_recent');
  await fs.mkdir(sessB, { recursive: true });
  await fs.writeFile(
    path.join(sessB, 'chat.jsonl'),
    JSON.stringify({ role: 'user', content: 'Recent task', timestamp: 1700002000000 }) + '\n' +
    JSON.stringify({ role: 'assistant', content: 'Recent reply', timestamp: 1700002005000 }) + '\n'
  );

  // Session C: Running session (active lock) with activity
  const sessC = path.join(sessionsDir, 'sess_running');
  await fs.mkdir(sessC, { recursive: true });
  await fs.writeFile(
    path.join(sessC, 'chat.jsonl'),
    JSON.stringify({ role: 'user', content: 'Running task', timestamp: 1700000500000 }) + '\n'
  );
  await fs.writeFile(path.join(sessC, '.active'), JSON.stringify({ active: true, startedAt: Date.now() }));

  // Simulate git checkout: Touch sessA chat.jsonl to have a NEWER mtime than sessB
  const now = new Date();
  await fs.utimes(path.join(sessA, 'chat.jsonl'), now, now);

  try {
    const list = await listSessions(tmpDir);
    assert.equal(list.length, 3);
    // Running session C must be first
    assert.equal(list[0].id, 'sess_running', 'Running session must be at the top');
    assert.equal(list[0].isGenerating, true);

    // Session B must be second because its last recorded message timestamp (1700002005000) > Session A (1700001005000)
    assert.equal(list[1].id, 'sess_recent', 'Recent session by activity must come before older session despite git mtime touch');
    assert.equal(list[1].updatedAt, 1700002005000);

    assert.equal(list[2].id, 'sess_older');
    assert.equal(list[2].updatedAt, 1700001005000);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('getSessionDetail returns accurate updatedAt from journal messages', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-detail-'));
  const sDir = path.join(tmpDir, '.agent', 'sessions', 'sess_test');
  await fs.mkdir(sDir, { recursive: true });
  await fs.writeFile(
    path.join(sDir, 'chat.jsonl'),
    JSON.stringify({ role: 'user', content: 'msg 1', timestamp: 1700001234560 }) + '\n' +
    JSON.stringify({ role: 'assistant', content: 'msg 2', timestamp: 1700001234599 }) + '\n'
  );

  try {
    const detail = await getSessionDetail(tmpDir, 'sess_test');
    assert.ok(detail);
    assert.equal(detail.createdAt, 1700001234560);
    assert.equal(detail.updatedAt, 1700001234599);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('getSortedSessions sorts running first and recent by last recorded activity without clobbering inactive sessions', () => {
  const state: AppState = {
    activeTab: 'sidebar',
    activeSessionId: 'sess_old',
    activeSession: {
      id: 'sess_old',
      title: 'Old Selected Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000, // old activity
      messages: [{ role: 'user', content: 'hi', timestamp: 2000 }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      isGenerating: false,
    },
    sessions: [
      { id: 'sess_old', title: 'Old Selected Session', preview: '', createdAt: 1000, updatedAt: 2000, messageCount: 1 },
      { id: 'sess_newer', title: 'Newer Session', preview: '', createdAt: 3000, updatedAt: 5000, messageCount: 2 },
      { id: 'sess_running', title: 'Running Session', preview: '', createdAt: 100, updatedAt: 300, messageCount: 1, isGenerating: true },
    ],
    plans: [],
    syncStatus: 'connected',
    syncMode: 'live-sse',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model-a',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
  };

  const sorted = getSortedSessions(state);
  assert.equal(sorted[0].id, 'sess_running', 'Running session must be first');
  assert.equal(sorted[1].id, 'sess_newer', 'Newer activity session must be second');
  assert.equal(sorted[2].id, 'sess_old', 'Old session must stay last even when activeSession is selected');
});
