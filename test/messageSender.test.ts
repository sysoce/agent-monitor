import test from 'node:test';
import * as assert from 'node:assert/strict';
import { submitUserMessage, submitMessageFlow } from '../src/ui/messageSender';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import type { AppState } from '../src/ui/types';

test('submitMessageFlow optimistically appends message and renders before submit finishes', async () => {
  const state: AppState = {
    activeTab: 'chat',
    syncMode: 'live-sse',
    activeSessionId: 'sess-1',
    activeSession: {
      id: 'sess-1',
      title: 'Session 1',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 1000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    },
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'test-model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };

  const renders: number[] = [];
  const mockSyncMachine = {
    setAwaitingResponse: () => {},
  } as unknown as SyncStateMachine;

  // We mock submitUserMessage by checking that during reload, state.activeSession already has the message
  let renderedWithOptimisticMessage = false;
  const onRender = () => {
    renders.push(state.activeSession?.messages.length || 0);
    if (state.activeSession?.messages.some((m) => m.content === 'Optimistic message')) {
      renderedWithOptimisticMessage = true;
    }
  };

  await submitMessageFlow(state, mockSyncMachine, 'Optimistic message', async () => {}, onRender);

  assert.equal(renderedWithOptimisticMessage, true);
  assert.equal(renders[0], 1, 'First render call must immediately have the user message');
  assert.equal(state.composerDraft, '');
});
