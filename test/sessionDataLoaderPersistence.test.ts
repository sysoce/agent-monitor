import test from 'node:test';
import * as assert from 'node:assert/strict';
import { reloadSessionData } from '../src/ui/sessionDataLoader';
import type { AppState } from '../src/ui/types';

test('reloadSessionData retains existing sessions if API fetch fails on static host', async () => {
  const originalFetch = (global as any).fetch;
  (global as any).fetch = async () => {
    throw new Error('Network error 404');
  };

  const state: AppState = {
    activeTab: 'chat',
    syncMode: 'git-backup',
    sessions: [
      { id: 'sess-1', title: 'Existing Gist Session', preview: '', messageCount: 5, isGenerating: false, updatedAt: 1000, createdAt: 1000 },
    ],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  let doneCalled = false;
  await reloadSessionData(state, false, () => {
    doneCalled = true;
  });

  assert.equal(doneCalled, true);
  assert.equal(state.sessions.length, 1, 'Should retain existing Gist synced session');
  assert.equal(state.sessions[0].id, 'sess-1');

  (global as any).fetch = originalFetch;
});
