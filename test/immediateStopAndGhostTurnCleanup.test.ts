import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { applyGistSyncPayload } from '../src/ui/sessionPlanSync';
import { stopCurrentSession } from '../src/ui/messageSender';
import { handleControlClick } from '../src/ui/controlHandlers';

import { getSessionDetail } from '../src/server/sessionStore';
import type { AppState } from '../src/ui/types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

function createTestState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'chat', sessions: [], plans: [], syncStatus: 'connected', searchQuery: '', composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model', availableModels: [], isSending: false, isAuthenticated: true,
    attachments: [], activeSessionId: 'sess-test',
    activeSession: {
      id: 'sess-test', title: 'Test Session', mode: 'agent', createdAt: 1000, updatedAt: 1000,
      messages: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: '' }],
      filesChanged: [], artifacts: [], subagents: [], isGenerating: false,
    },
    ...overrides,
  };
}

test('applyGistSyncPayload clears isAwaitingResponse when remote session is not generating and inbox is empty', () => {
  const state = createTestState({
    activeSessionId: 'sess-1',
    isAwaitingResponse: true,
    awaitingSessionId: 'sess-1',
  });

  const payload: any = {
    sessions: [{ id: 'sess-1', title: 'Session 1', updatedAt: 2000, messageCount: 2 }],
    sessionDetails: {
      'sess-1': {
        id: 'sess-1',
        title: 'Session 1',
        mode: 'agent',
        createdAt: 1000,
        updatedAt: 2000,
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: '' },
        ],
        filesChanged: [], artifacts: [], subagents: [],
        isGenerating: false,
      },
    },
    inbox: [],
  };

  const turnDone = applyGistSyncPayload(state, payload);
  assert.equal(state.isAwaitingResponse, false, 'isAwaitingResponse should be cleared when remote is not generating');
  assert.equal(state.awaitingSessionId, undefined);
  assert.equal(turnDone, true);
});

test('applyGistSyncPayload ignores abort messages in inbox when determining pending status', () => {
  const state = createTestState({ activeSessionId: 'sess-1', isAwaitingResponse: true, awaitingSessionId: 'sess-1' });
  const payload: any = {
    sessions: [{ id: 'sess-1', title: 'Session 1', updatedAt: 2000, messageCount: 2 }],
    sessionDetails: {
      'sess-1': { id: 'sess-1', title: 'Session 1', mode: 'agent', createdAt: 1000, updatedAt: 2000, messages: [{ role: 'user', content: 'hello' }], filesChanged: [], artifacts: [], subagents: [], isGenerating: false },
    },
    inbox: [{ id: 'abort-1', sessionId: 'sess-1', action: 'abort', role: 'user', timestamp: 2001 }],
  };
  const turnDone = applyGistSyncPayload(state, payload);
  assert.equal(state.isAwaitingResponse, false, 'isAwaitingResponse should clear even if abort message is in inbox');
  assert.equal(turnDone, true);
});

test('stopCurrentSession immediately clears isAwaitingResponse, isGenerating, and removes trailing empty assistant turn', async () => {
  const state = createTestState({
    activeSessionId: 'sess-test',
    isAwaitingResponse: true,
    awaitingSessionId: 'sess-test',
  });
  const mockSyncMachine: any = {
    pushInboxMessage: async () => {},
  };

  await stopCurrentSession(state, mockSyncMachine);
  assert.equal(state.isAwaitingResponse, false);
  assert.equal(state.awaitingSessionId, undefined);
  assert.equal(state.activeSession?.isGenerating, false);
  assert.equal(state.activeSession?.messages.length, 1, 'Trailing empty assistant turn should be trimmed');
  assert.equal(state.activeSession?.messages[0]?.role, 'user');
});

test('handleControlClick triggers onStopSession when clicking a button with stop-mode or btn-stop class', () => {
  const state = createTestState({ isAwaitingResponse: true });
  let stopped = false;
  let sent = false;
  const callbacks: any = {
    onStopSession: () => { stopped = true; },
    onSendMessage: () => { sent = true; },
    onRender: () => {},
  };

  const mockBtn: any = {
    closest: (sel: string) => {
      if (sel.includes('.btn-stop') || sel.includes('.stop-mode') || sel.includes('#btn-stop')) return mockBtn;
      if (sel.includes('#btn-send')) return mockBtn;
      return null;
    },
  };

  const handled = handleControlClick(mockBtn, state, callbacks);
  assert.equal(handled, true);
  assert.equal(stopped, true, 'onStopSession should have been called');
  assert.equal(sent, false, 'onSendMessage should NOT have been called');
});

