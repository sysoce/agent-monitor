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

test('renderChatView renders exactly one loading indicator when isGenerating is true and session ends with user turn', () => {
  const state = createMockState({
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Hello test from mobile' },
        { role: 'assistant', content: 'Hello! Connectivity confirmed.' },
        { role: 'user', content: 'Great. Can you set default model to the current champion.' },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
      isGenerating: true,
    },
  });

  const html = renderChatView(state);
  const loadingMatches = html.match(/class="stream-loading"/g) || [];
  assert.equal(loadingMatches.length, 1, 'Should render exactly one stream-loading indicator');
});

test('renderChatView renders exactly one loading indicator when session has a live draft message', () => {
  const state = createMockState({
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Hello test from mobile' },
        { role: 'assistant', content: 'Hello! Connectivity confirmed.' },
        { role: 'user', content: 'Great. Can you set default model to the current champion.' },
        { role: 'assistant', content: '', isLive: true } as any,
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
      isGenerating: true,
    },
  });

  const html = renderChatView(state);
  const loadingMatches = html.match(/class="stream-loading"/g) || [];
  assert.equal(loadingMatches.length, 1, 'Should render exactly one stream-loading indicator');
});

test('renderChatView does not mark previous assistant turns as generating when isGenerating is true', () => {
  const state = createMockState({
    activeSession: {
      id: 'sess-1',
      title: 'Test Session',
      mode: 'agent',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Done.', thought: 'Initial reasoning' } as any,
        { role: 'user', content: 'Next prompt' },
      ],
      filesChanged: [],
      artifacts: [],
      subagents: [],
      plans: [],
      isGenerating: true,
    },
  });

  const html = renderChatView(state);
  assert.match(html, /<span class="activity-toggle-title">Thought<\/span>/, 'Previous thought should show Thought, not Thinking…');
  assert.doesNotMatch(html, /activity-toggle--live/, 'Previous thought should not have live activity toggle class');
  const generatingMatches = html.match(/turn--generating/g) || [];
  assert.equal(generatingMatches.length, 1, 'Only the active generating indicator turn should have turn--generating class');
});
