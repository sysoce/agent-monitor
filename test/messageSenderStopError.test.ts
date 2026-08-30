import test from 'node:test';
import * as assert from 'node:assert/strict';
import { stopCurrentSession } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';

test('stopCurrentSession sets errorMessage on state if stopSession returns false or errors', async () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [
      { id: 'sess-err', title: 'Error Session', isGenerating: true, createdAt: 1, updatedAt: 2, messageCount: 1 } as any,
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
    activeSessionId: 'sess-err',
  };

  // Mock global fetch to return 500 error
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, statusText: 'Internal Server Error' });

  try {
    await stopCurrentSession(state);
    assert.ok(state.errorMessage, 'Expected errorMessage to be populated when stop fails');
    assert.match(state.errorMessage, /stop signal/i);
    assert.equal(state.isSending, false);
    assert.equal(state.isAwaitingResponse, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('stopCurrentSession clears errorMessage on state when stop succeeds', async () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [
      { id: 'sess-ok', title: 'OK Session', isGenerating: true, createdAt: 1, updatedAt: 2, messageCount: 1 } as any,
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
    activeSessionId: 'sess-ok',
    errorMessage: 'Old error',
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });

  try {
    await stopCurrentSession(state);
    assert.equal(state.errorMessage, undefined);
    assert.equal(state.isSending, false);
    assert.equal(state.isAwaitingResponse, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('stopCurrentSession falls back to pushInboxMessage when stopSession fails and syncMachine is present', async () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [
      { id: 'sess-fb', title: 'Fallback Session', isGenerating: true, createdAt: 1, updatedAt: 2, messageCount: 1 } as any,
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
    activeSessionId: 'sess-fb',
    syncMode: 'live-sse',
  };

  let pushedMsg: any = null;
  const mockSyncMachine: any = {
    setAwaitingResponse: () => {},
    pushInboxMessage: async (m: any) => { pushedMsg = m; },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('NetworkError when attempting to fetch resource'); };

  try {
    await stopCurrentSession(state, mockSyncMachine);
    assert.equal(state.errorMessage, undefined);
    assert.ok(pushedMsg, 'Expected abort message to be pushed to syncMachine');
    assert.equal(pushedMsg.action, 'abort');
    assert.equal(pushedMsg.sessionId, 'sess-fb');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
