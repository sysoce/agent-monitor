import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { isComposerStopMode } from '../src/ui/composerButton';
import { stopCurrentSession } from '../src/ui/messageSender';
import { applyGistSyncPayload } from '../src/ui/sessionPlanSync';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

function createBaseState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'chat', sessions: [], plans: [], syncStatus: 'connected', searchQuery: '', composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model', availableModels: [], isSending: false, isAuthenticated: true,
    attachments: [], activeSessionId: 'sess-test',
    activeSession: {
      id: 'sess-test', title: 'Test Session', mode: 'agent', createdAt: 1000, updatedAt: 1000,
      messages: [{ role: 'user', content: 'hello' }], filesChanged: [], artifacts: [], subagents: [], isGenerating: false,
    },
    ...overrides,
  };
}

test('isComposerStopMode returns true when isAwaitingResponse is true and draft is empty', () => {
  const state = createBaseState({ isAwaitingResponse: true, composerDraft: '' });
  assert.equal(isComposerStopMode(state), true, 'Stop mode should be active while awaiting response');
});

test('stopCurrentSession in git-backup mode pushes abort action to syncMachine', async () => {
  const state = createBaseState({ syncMode: 'git-backup', activeSessionId: 'sess-123' });
  const pushed: any[] = [];
  const mockSyncMachine: any = {
    pushInboxMessage: async (msg: any) => { pushed.push(msg); },
  };

  await stopCurrentSession(state, mockSyncMachine);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].action, 'abort');
  assert.equal(pushed[0].sessionId, 'sess-123');
  assert.equal(state.isAwaitingResponse, false);
});

test('applyGistSyncPayload does not clear isAwaitingResponse if assistant turn has empty content', () => {
  const state = createBaseState({
    activeSessionId: 'sess-1',
    isAwaitingResponse: true,
    awaitingSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      title: 'Session 1',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [
        { role: 'user', content: 'my message' },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
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
          { role: 'user', content: 'my message' },
          { role: 'assistant', content: '' },
        ],
        filesChanged: [],
        artifacts: [],
        subagents: [],
        isGenerating: true,
      },
    },
    inbox: [],
  };

  const turnDone = applyGistSyncPayload(state, payload);
  assert.equal(turnDone, false, 'Turn should not be marked done while assistant message is empty');
  assert.equal(state.isAwaitingResponse, true, 'isAwaitingResponse should remain true');
});

test('applyGistSyncPayload preserves optimistic active session in state.sessions', () => {
  const state = createBaseState({
    activeSessionId: 'sess-new',
    activeSession: {
      id: 'sess-new',
      title: 'New optimistic session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [{ role: 'user', content: 'brand new session' }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
  });

  const payload: any = {
    sessions: [{ id: 'sess-old', title: 'Old session', updatedAt: 500, messageCount: 4 }],
    sessionDetails: {},
    inbox: [],
  };

  applyGistSyncPayload(state, payload);
  assert.ok(state.sessions.some((s) => s.id === 'sess-new'), 'Optimistic active session should remain listed in sessions');
  assert.equal(state.activeSessionId, 'sess-new');
});

test('renderChatView renders pulsing loading indicator when assistant turn has empty content', () => {
  const state = createBaseState({
    activeSession: {
      id: 'sess-1',
      title: 'Test',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [
        { role: 'user', content: 'how are you?' },
        { role: 'assistant', content: '' } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      isGenerating: true,
    },
  });

  const html = renderChatView(state);
  assert.ok(html.includes('stream-loading'), 'Should render stream-loading indicator instead of empty gap');
});
