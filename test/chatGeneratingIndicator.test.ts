import test from 'node:test';
import * as assert from 'node:assert/strict';
import { updateChatDOM } from '../src/ui/chatDomUpdater';
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

test('updateChatDOM appends generating indicator when awaiting response with only user message', () => {
  const insertedHtmls: string[] = [];
  const messagesContainer: any = {
    id: 'chat-messages-container',
    querySelectorAll(sel: string) {
      if (sel === '.turn') return [];
      return [];
    },
    querySelector() { return null; },
    insertAdjacentHTML(_pos: string, html: string) {
      insertedHtmls.push(html);
    },
  };

  const chatContainer: any = {
    className: 'chat-container',
    querySelector(sel: string) {
      if (sel === '#chat-messages-container') return messagesContainer;
      return null;
    },
  };

  const container: any = {
    dataset: { activeSessionId: 'sess_live' },
    querySelector(sel: string) {
      if (sel === '.chat-container') return chatContainer;
      return null;
    },
  };

  const state = createMockState({
    activeSessionId: 'sess_live',
    isAwaitingResponse: true,
    awaitingSessionId: 'sess_live',
    activeSession: {
      id: 'sess_live',
      title: 'Live Session',
      mode: 'agent',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [{ role: 'user', content: 'test p2p gist', timestamp: Date.now() } as any],
      filesChanged: [],
      artifacts: [],
      plans: [],
      subagents: [],
      isGenerating: true,
    },
  });

  updateChatDOM(state, container);

  assert.equal(insertedHtmls.length, 2, 'Should insert both user turn and generating indicator turn');
  assert.ok(insertedHtmls[0]?.includes('msg-user-text'), 'First inserted turn should be user message');
  assert.ok(insertedHtmls[1]?.includes('turn--generating'), 'Second inserted turn should have turn--generating class');
  assert.ok(insertedHtmls[1]?.includes('stream-loading'), 'Second inserted turn should have stream-loading dots');
});
