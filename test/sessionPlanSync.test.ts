import test from 'node:test';
import * as assert from 'node:assert/strict';
import { applyGistSyncPayload } from '../src/ui/sessionPlanSync';
import type { AppState } from '../src/ui/types';
import type { SyncGistPayload } from '../src/sync/types';
import type { SessionDetail } from '../src/server/types';

function mockDetail(id: string, title: string, messages: any[]): SessionDetail {
  return { id, title, createdAt: 1000, updatedAt: 2000, mode: 'agent', messages, plans: [], filesChanged: [], artifacts: [], subagents: [] };
}

function mockState(overrides: Partial<AppState> = {}): AppState {
  return {
    sessions: [], plans: [], availableModels: [], activeTab: 'chat',
    syncStatus: 'connected', syncMode: 'git-backup', composerMode: 'agent',
    isAwaitingResponse: true, isSending: false, isAuthenticated: true,
    searchQuery: '', selectedModel: 'gpt-4o', attachments: [], ...overrides,
  };
}

test('applyGistSyncPayload updates sessions and active session state', () => {
  const state = mockState({ activeSessionId: 'sess-1' });
  const detail = mockDetail('sess-1', 'Test Session', [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }]);
  const payload: SyncGistPayload = {
    inbox: [],
    sessions: [{ id: 'sess-1', title: 'Test Session', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'Hello' }],
    activeSession: { sessionId: 'sess-1', updatedAt: 2000, session: detail },
    version: 1,
    updatedAt: 2000,
  };

  const isTurnDone = applyGistSyncPayload(state, payload);
  assert.equal(isTurnDone, true);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.activeSessionId, 'sess-1');
  assert.equal(state.activeSession?.messages.length, 2);
  assert.equal(state.isAwaitingResponse, false);
});

test('applyGistSyncPayload preserves active session when payload activeSession belongs to a different session', () => {
  const sess2 = mockDetail('sess-2', 'Session Two', [{ role: 'user', content: 'User question in sess 2' }]);
  const state = mockState({ activeSessionId: 'sess-2', activeSession: sess2 });
  const payload: SyncGistPayload = {
    inbox: [],
    sessions: [
      { id: 'sess-1', title: 'Session One', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'One' },
      { id: 'sess-2', title: 'Session Two', createdAt: 1000, updatedAt: 2000, messageCount: 1, preview: 'Two' },
    ],
    activeSession: { sessionId: 'sess-1', updatedAt: 2000, session: mockDetail('sess-1', 'Session One', [{ role: 'user', content: 'One' }]) },
    version: 1,
    updatedAt: 2000,
  };

  applyGistSyncPayload(state, payload);
  assert.equal(state.activeSessionId, 'sess-2');
  assert.equal(state.activeSession?.id, 'sess-2');
  assert.equal(state.activeSession?.title, 'Session Two');
});

test('applyGistSyncPayload updates activeSession from sessionDetails when activeSessionId matches', () => {
  const state = mockState({ activeSessionId: 'sess-2' });
  const sess2Detail = mockDetail('sess-2', 'Session Two', [{ role: 'user', content: 'Question in 2' }, { role: 'assistant', content: 'Answer in 2' }]);
  const payload: SyncGistPayload = {
    inbox: [],
    sessions: [
      { id: 'sess-1', title: 'Session One', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'One' },
      { id: 'sess-2', title: 'Session Two', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'Two' },
    ],
    activeSession: { sessionId: 'sess-1', updatedAt: 2000, session: mockDetail('sess-1', 'Session One', [{ role: 'user', content: 'One' }]) },
    sessionDetails: { 'sess-2': sess2Detail },
    version: 1,
    updatedAt: 2000,
  };

  const isTurnDone = applyGistSyncPayload(state, payload);
  assert.equal(isTurnDone, true);
  assert.equal(state.activeSessionId, 'sess-2');
  assert.equal(state.activeSession?.id, 'sess-2');
  assert.equal(state.activeSession?.messages.length, 2);
});

test('applyGistSyncPayload clears isAwaitingResponse when awaitingSessionId turn completes', () => {
  const state = mockState({ activeSessionId: 'sess-3', awaitingSessionId: 'sess-1', isAwaitingResponse: true });
  const sess1Detail = mockDetail('sess-1', 'Session One', [{ role: 'user', content: 'Do work' }, { role: 'assistant', content: 'Done work' }]);
  const payload: SyncGistPayload = {
    inbox: [],
    sessions: [{ id: 'sess-1', title: 'Session One', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'One' }],
    activeSession: { sessionId: 'sess-1', updatedAt: 2000, session: sess1Detail },
    sessionDetails: { 'sess-1': sess1Detail },
    version: 1,
    updatedAt: 2000,
  };

  const isTurnDone = applyGistSyncPayload(state, payload);
  assert.equal(isTurnDone, true);
  assert.equal(state.isAwaitingResponse, false);
  assert.equal(state.awaitingSessionId, undefined);
});

test('applyGistSyncPayload does not overwrite empty activeSession on draft chat tab', () => {
  const state = mockState({ activeSessionId: undefined, activeSession: undefined, activeTab: 'chat' });
  const payload: SyncGistPayload = {
    inbox: [],
    sessions: [{ id: 'sess-1', title: 'Session One', createdAt: 1000, updatedAt: 2000, messageCount: 2, preview: 'One' }],
    activeSession: { sessionId: 'sess-1', updatedAt: 2000, session: mockDetail('sess-1', 'Session One', [{ role: 'user', content: 'One' }]) },
    version: 1,
    updatedAt: 2000,
  };

  applyGistSyncPayload(state, payload);
  assert.equal(state.activeSessionId, undefined);
  assert.equal(state.activeSession, undefined);
});
