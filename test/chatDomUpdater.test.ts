import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateChatDOM } from '../src/ui/chatDomUpdater';
import { renderUserTurn, renderAssistantTurn } from '../src/ui/components/chatTurnRenderer';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'chat',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    syncMode: 'live-sse',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'antigravity|gemini-3.7-flash-high|model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...overrides,
  };
}

test('updateChatDOM initializes chat when container is empty', () => {
  let innerHtml = '';
  const container: any = {
    querySelector: () => null,
    set innerHTML(val: string) { innerHtml = val; },
    get innerHTML() { return innerHtml; },
    dataset: {},
  };

  const state = createMockState();
  updateChatDOM(state, container);

  assert.ok(innerHtml.includes('class="chat-container"'));
  assert.ok(innerHtml.includes('id="chat-messages-container"'));
});

test('updateChatDOM preserves completed turns and updates only the live turn in-place', () => {
  let turn0Replaced = 0;
  let turn1Replaced = 0;

  const initialUserMsg = { role: 'user', content: 'Hello', time: 1000 };
  const initialAssistantMsg = { role: 'assistant', content: 'Streaming chunk 1...', isLive: true };

  let turn0Html = renderUserTurn(initialUserMsg as any);
  let turn1Html = renderAssistantTurn(initialAssistantMsg as any, true);

  const turn0: any = {
    className: 'turn turn-user',
    dataset: { renderedHtml: turn0Html },
    get outerHTML() { return turn0Html; },
    set outerHTML(val: string) {
      turn0Replaced++;
      turn0Html = val;
      turn0.dataset.renderedHtml = val;
    },
  };

  const turn1: any = {
    className: 'turn turn-assistant turn--generating',
    dataset: { renderedHtml: turn1Html },
    get outerHTML() { return turn1Html; },
    set outerHTML(val: string) {
      turn1Replaced++;
      turn1Html = val;
      turn1.dataset.renderedHtml = val;
    },
  };

  const messagesContainer: any = {
    id: 'chat-messages-container',
    querySelectorAll(sel: string) {
      if (sel === '.turn') return [turn0, turn1];
      return [];
    },
    querySelector() { return null; },
    insertAdjacentHTML() {},
  };

  const chatContainer: any = {
    className: 'chat-container',
    querySelector(sel: string) {
      if (sel === '#chat-messages-container') return messagesContainer;
      return null;
    },
  };

  const container: any = {
    dataset: { activeSessionId: 'sess_123' },
    querySelector(sel: string) {
      if (sel === '.chat-container') return chatContainer;
      return null;
    },
  };

  const state = createMockState({
    activeSessionId: 'sess_123',
    activeSession: {
      id: 'sess_123',
      title: 'Test Session',
      mode: 'agent',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        initialUserMsg as any,
        { role: 'assistant', content: 'Streaming chunk 2 full response', isLive: true } as any,
      ],
      filesChanged: [],
      artifacts: [],
      plans: [],
      subagents: [],
    },
  });

  updateChatDOM(state, container);

  assert.equal(turn0Replaced, 0, 'First turn (user message) must NOT be replaced');
  assert.equal(turn1Replaced, 1, 'Second turn (live assistant message) should be updated in-place');
});
