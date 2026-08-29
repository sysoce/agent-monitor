import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { AppState } from '../src/ui/types';
import {
  enqueueQueuedMessage,
  dequeueNextQueuedMessage,
  removeQueuedMessageById,
  getQueuedMessagesForSession,
  clearQueuedMessagesForSession,
  toggleQueuedCollapse,
} from '../src/ui/queuedMessagesStore';
import { renderQueuedMessagesCard } from '../src/ui/components/queuedMessagesCard';
import {
  isAgentBusy,
  handleEditQueuedMessage,
  handleDeleteQueuedMessage,
} from '../src/ui/queuedMessagesOps';

function createMockState(partial: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'test-model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...partial,
  };
}

test('queuedMessagesStore manages FIFO queue and session isolation', () => {
  const state = createMockState({ activeSessionId: 'sess-1' });

  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 0);

  const msg1 = enqueueQueuedMessage(state, 'First prompt', undefined, 'agent', 'sess-1');
  const msg2 = enqueueQueuedMessage(state, 'Second prompt', undefined, 'plan', 'sess-1');
  const msg3 = enqueueQueuedMessage(state, 'Other session prompt', undefined, 'ask', 'sess-2');

  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 2);
  assert.equal(getQueuedMessagesForSession(state, 'sess-2').length, 1);
  assert.equal(msg1.text, 'First prompt');
  assert.equal(msg2.text, 'Second prompt');

  const dequeued = dequeueNextQueuedMessage(state, 'sess-1');
  assert.equal(dequeued?.id, msg1.id);
  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 1);

  removeQueuedMessageById(state, msg2.id);
  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 0);
  assert.equal(getQueuedMessagesForSession(state, 'sess-2').length, 1);

  clearQueuedMessagesForSession(state, 'sess-2');
  assert.equal(getQueuedMessagesForSession(state, 'sess-2').length, 0);
});

test('queuedMessagesStore handles collapse toggling', () => {
  const state = createMockState();
  assert.equal(state.isQueuedMessagesCollapsed, undefined);

  assert.equal(toggleQueuedCollapse(state), true);
  assert.equal(state.isQueuedMessagesCollapsed, true);

  assert.equal(toggleQueuedCollapse(state), false);
  assert.equal(state.isQueuedMessagesCollapsed, false);
});

test('renderQueuedMessagesCard renders HTML correctly when messages exist', () => {
  const state = createMockState({ activeSessionId: 'sess-1' });
  assert.equal(renderQueuedMessagesCard(state), '');

  enqueueQueuedMessage(state, 'Test prompt for review', undefined, 'agent', 'sess-1');
  const html = renderQueuedMessagesCard(state);

  assert.match(html, /queued-messages/);
  assert.match(html, /Queued Messages/);
  assert.match(html, /Sends after agent finishes working/);
  assert.match(html, /Test prompt for review/);
  assert.match(html, /data-action="queued-send-now"/);
  assert.match(html, /data-action="queued-edit"/);
  assert.match(html, /data-action="queued-delete"/);
});

test('isAgentBusy detects generating and awaiting states', () => {
  const state = createMockState({ activeSessionId: 'sess-1' });
  assert.equal(isAgentBusy(state), false);

  state.isSending = true;
  assert.equal(isAgentBusy(state), true);
  state.isSending = false;

  state.isAwaitingResponse = true;
  assert.equal(isAgentBusy(state), true);
  state.isAwaitingResponse = false;

  state.activeSession = {
    id: 'sess-1',
    title: 'Test',
    mode: 'agent',
    isGenerating: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    filesChanged: [],
    artifacts: [],
    subagents: [],
  };
  assert.equal(isAgentBusy(state), true);
});

test('handleEditQueuedMessage and handleDeleteQueuedMessage update state properly', () => {
  const state = createMockState({ activeSessionId: 'sess-1' });
  const msg = enqueueQueuedMessage(state, 'Editable text', [{ id: 'att-1', type: 'file', label: 'file.ts', uri: 'file:///path' }], 'agent', 'sess-1');

  let rendered = false;
  handleEditQueuedMessage(state, msg.id, () => { rendered = true; });

  assert.equal(rendered, true);
  assert.equal(state.composerDraft, 'Editable text');
  assert.equal(state.attachments?.length, 1);
  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 0);

  const msg2 = enqueueQueuedMessage(state, 'Deletable text', undefined, 'agent', 'sess-1');
  handleDeleteQueuedMessage(state, msg2.id, () => { rendered = true; });
  assert.equal(getQueuedMessagesForSession(state, 'sess-1').length, 0);
});
