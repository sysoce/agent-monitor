import test from 'node:test';
import * as assert from 'node:assert/strict';
import { applyGistSyncPayload } from '../src/ui/gistPayloadApplier';
import type { AppState } from '../src/ui/types';

test('applyGistSyncPayload respects state.lastAbortedAt and does not resurrect isGenerating from stale outbox', () => {
  const state: AppState = {
    activeTab: 'chat',
    sessions: [{ id: 'sess-abc', title: 'Test', createdAt: 1000, updatedAt: 2000, messageCount: 1, preview: '' }],
    activeSessionId: 'sess-abc',
    activeSession: {
      id: 'sess-abc',
      title: 'Test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      isGenerating: false,
      messages: [{ role: 'user', content: 'hello' }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini-3.7-flash',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    isAwaitingResponse: false,
    lastAbortedAt: Date.now(),
  };

  // Stale outbox payload arrived with isGenerating: true and updatedAt before/equal to abort
  const stalePayload: any = {
    version: 1,
    updatedAt: state.lastAbortedAt! - 500,
    activeSession: {
      sessionId: 'sess-abc',
      session: {
        id: 'sess-abc',
        title: 'Test',
        isGenerating: true,
        updatedAt: state.lastAbortedAt! - 500,
        messages: [{ role: 'user', content: 'hello' }],
      },
    },
    sessions: [{ id: 'sess-abc', isGenerating: true, updatedAt: state.lastAbortedAt! - 500 }],
    inbox: [],
  };

  applyGistSyncPayload(state, stalePayload);

  // isGenerating must remain false and isAwaitingResponse must remain false
  assert.equal(state.activeSession?.isGenerating, false, 'Optimistic abort should block stale isGenerating');
  assert.equal(state.isAwaitingResponse, false, 'Optimistic abort should block stale isAwaitingResponse');
});
