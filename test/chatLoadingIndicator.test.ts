import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderChatView } from '../src/ui/components/chatView';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'chat',
    sessions: [{ id: 'sess-1', title: 'Test Session', preview: 'hello', createdAt: 1000, updatedAt: 2000, messageCount: 2 }],
    activeSessionId: 'sess-1',
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'test-model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    attachments: [],
    ...overrides,
  };
}

test('renderChatView renders session loading indicator when isLoadingSession is true and messages are empty', () => {
  const state = createMockState({
    isLoadingSession: true,
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
  });

  const html = renderChatView(state);
  assert.match(html, /session-loading-state/);
  assert.match(html, /Loading session\.\.\./);
  assert.doesNotMatch(html, /No messages in this session yet/);
});

test('renderChatView renders loading indicator when activeSession is undefined but isLoadingSession is true', () => {
  const state = createMockState({
    isLoadingSession: true,
    activeSession: undefined,
  });

  const html = renderChatView(state);
  assert.match(html, /session-loading-state/);
  assert.match(html, /Loading session\.\.\./);
  assert.doesNotMatch(html, /Ask Agent to build or change code/);
});

test('renderChatView renders empty state when isLoadingSession is false and session is empty', () => {
  const state = createMockState({
    isLoadingSession: false,
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
  });

  const html = renderChatView(state);
  assert.doesNotMatch(html, /session-loading-state/);
  assert.match(html, /No messages in this session yet/);
});

test('renderChatView renders messages when messages exist even if isLoadingSession is true', () => {
  const state = createMockState({
    isLoadingSession: true,
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [{ role: 'user', content: 'Hello world' }],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
    },
  });

  const html = renderChatView(state);
  assert.doesNotMatch(html, /session-loading-state/);
  assert.match(html, /Hello world/);
});
