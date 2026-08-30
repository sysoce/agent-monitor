import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { toggleSyncModeAction } from '../src/ui/appSyncMode';
import type { AppState } from '../src/ui/types';
import { getSavedSessionId, saveActiveSessionId, getCachedSessionDetail, saveCachedSessionDetail } from '../src/ui/tabStore';

test('SyncStateMachine does NOT fallback to git-backup on SSE failure when autoFallback is disabled', () => {
  let currentMode: string = 'live-sse';
  let currentStatus: string = 'connected';

  const machine = new SyncStateMachine({
    onModeChange: (m) => { currentMode = m; },
    onStatusChange: (s) => { currentStatus = s; },
    onDataUpdate: () => {},
  });

  machine.setAutoFallback(false);
  assert.equal(machine.getAutoFallback(), false);

  // Trigger primary SSE failure
  machine.handlePrimarySseFailure();

  assert.equal(currentMode, 'live-sse', 'Mode must remain live-sse when autoFallback is false');
  assert.equal(currentStatus, 'disconnected', 'Status should be disconnected');
});

test('SyncStateMachine falls back to git-backup when autoFallback is explicitly enabled', () => {
  let currentMode: string = 'live-sse';
  let currentStatus: string = 'connected';

  const machine = new SyncStateMachine({
    onModeChange: (m) => { currentMode = m; },
    onStatusChange: (s) => { currentStatus = s; },
    onDataUpdate: () => {},
  });

  machine.setGistConfig({ gistId: 'gist-123', token: 'token-abc' });
  machine.setAutoFallback(true);

  machine.handlePrimarySseFailure();
  assert.equal(currentMode, 'git-backup', 'Mode should switch to git-backup when autoFallback is true');
});

test('toggleSyncModeAction always toggles mode even when server is offline', () => {
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    const state = {
      sessions: [],
      syncMode: 'live-sse',
      syncStatus: 'disconnected',
      activeTab: 'chat',
      composerMode: 'agent',
      isMentionOpen: false,
      isModelPickerOpen: false,
      selectedModel: 'gemini-2.5-pro',
      availableModels: [],
      customConnections: [],
    } as unknown as AppState;

    let startedSse = false;
    const machine = new SyncStateMachine({
      onModeChange: (m) => { state.syncMode = m; },
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });

    machine.setGistConfig({ gistId: 'gist-123', token: 'token-abc' });

    // Toggle from live-sse to git-backup
    toggleSyncModeAction(state, machine, () => { startedSse = true; });
    assert.equal(state.syncMode, 'git-backup', 'Should toggle to git-backup');

    // Toggle from git-backup to p2p
    toggleSyncModeAction(state, machine, () => { startedSse = true; });
    assert.equal(state.syncMode, 'p2p', 'Should toggle to p2p');

    // Toggle from p2p to live-sse
    toggleSyncModeAction(state, machine, () => { startedSse = true; });
    assert.equal(state.syncMode, 'live-sse', 'Should toggle to live-sse');
    assert.equal(startedSse, true, 'startSse should be invoked');
  } finally {
    (globalThis as any).localStorage = originalStorage;
  }
});

test('tabStore caches and restores active session detail for instant reload display', () => {
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    const detail = {
      id: 'sess-persisted-1',
      title: 'Persisted Session',
      mode: 'agent' as const,
      createdAt: 1000,
      updatedAt: 2000,
      messages: [{ role: 'user' as const, content: 'Saved prompt' }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    };

    saveActiveSessionId('sess-persisted-1');
    saveCachedSessionDetail(detail);

    assert.equal(getSavedSessionId(), 'sess-persisted-1');
    const restored = getCachedSessionDetail('sess-persisted-1');
    assert.ok(restored, 'Restored session detail should exist');
    assert.equal(restored?.id, 'sess-persisted-1');
    assert.equal(restored?.messages.length, 1);
  } finally {
    (globalThis as any).localStorage = originalStorage;
  }
});
