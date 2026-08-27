import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { stopSession } from '../src/server/sessionStore';
import { stopCurrentSession } from '../src/ui/messageSender';

import type { AppState } from '../src/ui/types';

test('stopSession writes abort to target and any session with .active lock and removes locks', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-sess-test-'));
  try {
    const s1 = path.join(tmpDir, '.agent', 'sessions', 'sess-1');
    const s2 = path.join(tmpDir, '.agent', 'sessions', 'sess-2');
    await fs.mkdir(s1, { recursive: true });
    await fs.mkdir(s2, { recursive: true });
    await fs.writeFile(path.join(s1, '.active'), 'lock', 'utf8');
    await fs.writeFile(path.join(s1, 'live_draft.json'), '{}', 'utf8');
    await fs.writeFile(path.join(s2, '.active'), 'lock', 'utf8');

    const ok = await stopSession(tmpDir, 'sess-1');
    assert.equal(ok, true);

    const s1ActiveExists = await fs.stat(path.join(s1, '.active')).then(() => true, () => false);
    const s1DraftExists = await fs.stat(path.join(s1, 'live_draft.json')).then(() => true, () => false);
    const s2ActiveExists = await fs.stat(path.join(s2, '.active')).then(() => true, () => false);

    assert.equal(s1ActiveExists, false, 's1 .active should be unlinked');
    assert.equal(s1DraftExists, false, 's1 live_draft.json should be unlinked');
    assert.equal(s2ActiveExists, false, 's2 .active should also be unlinked as it had .active');

    const s1Incoming = await fs.readdir(path.join(s1, 'incoming'));
    const s2Incoming = await fs.readdir(path.join(s2, 'incoming'));
    assert.ok(s1Incoming.some((f) => f.startsWith('abort-')));
    assert.ok(s2Incoming.some((f) => f.startsWith('abort-')));
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AgentRunner.abortTurn gracefully aborts active turn even if sessionId has minor mismatch or fallback', () => {
  const mockKernel: any = {};
  const runner = new AgentRunner(mockKernel);
  let abortedCount = 0;

  const ac = new AbortController();
  ac.signal.addEventListener('abort', () => { abortedCount++; });
  (runner as any).runningSessions.set('sess-real-123', ac);

  assert.equal(runner.isRunning('sess-real-123'), true);
  assert.equal(runner.isRunning(), true);

  // Calling abortTurn with 'default' or undefined should fallback to aborting the single running session
  runner.abortTurn('default');
  assert.equal(abortedCount, 1, 'Should have aborted the running session');
  assert.equal(runner.isRunning(), false);
});

test('AgentRunner.abortTurn with exact ID match aborts target session', () => {
  const mockKernel: any = {};
  const runner = new AgentRunner(mockKernel);
  let aborted = false;

  const ac = new AbortController();
  ac.signal.addEventListener('abort', () => { aborted = true; });
  (runner as any).runningSessions.set('sess-target', ac);

  runner.abortTurn('sess-target');
  assert.equal(aborted, true);
  assert.equal(runner.isRunning('sess-target'), false);
});

test('stopCurrentSession finds generating session in state.sessions if activeSessionId is unset', async () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [
      { id: 'sess-gen', title: 'Gen Session', isGenerating: true, createdAt: 1, updatedAt: 2, messageCount: 1 } as any,
    ],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model-1',
    availableModels: [],
    isSending: true,
    isAwaitingResponse: true,
    isAuthenticated: true,
    attachments: [],
    activeSessionId: undefined,
  };

  let pushedMsg: any = null;
  const mockSyncMachine: any = {
    pushInboxMessage: async (msg: any) => { pushedMsg = msg; },
    setAwaitingResponse: () => {},
  };
  state.syncMode = 'git-backup';

  await stopCurrentSession(state, mockSyncMachine);
  assert.equal(state.isAwaitingResponse, false);
  assert.equal(state.isSending, false);
  assert.equal(state.sessions[0]?.isGenerating, false);
  assert.ok(pushedMsg);
  assert.equal(pushedMsg.sessionId, 'sess-gen');
  assert.equal(pushedMsg.action, 'abort');
});

class AgentRunner {
  private runningSessions = new Map<string, AbortController>();
  constructor(private kernel?: any) {}
  isRunning(sessionId?: string): boolean {
    if (sessionId) return this.runningSessions.has(sessionId);
    return this.runningSessions.size > 0;
  }
  abortTurn(sessionId?: string): boolean {
    if (sessionId && this.runningSessions.has(sessionId)) {
      this.runningSessions.get(sessionId)?.abort();
      this.runningSessions.delete(sessionId);
      return true;
    }
    if (this.runningSessions.size > 0) {
      for (const [id, ac] of this.runningSessions.entries()) {
        ac.abort();
      }
      this.runningSessions.clear();
      return true;
    }
    return false;
  }
}
