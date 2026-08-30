import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSidebarView } from '../src/ui/components/sidebarView';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
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
    ...overrides,
  };
}

test('renderSidebarView renders session loading indicator when isLoadingSessions is true and sessions are empty', () => {
  const state = createMockState({
    isLoadingSessions: true,
    sessions: [],
  });

  const html = renderSidebarView(state);
  assert.match(html, /session-loading-state/);
  assert.match(html, /Loading sessions\.\.\./);
  assert.doesNotMatch(html, /No matching sessions, plans, or artifacts/);
});

test('renderSidebarView renders empty state when isLoadingSessions is false and sessions are empty', () => {
  const state = createMockState({
    isLoadingSessions: false,
    sessions: [],
  });

  const html = renderSidebarView(state);
  assert.doesNotMatch(html, /session-loading-state/);
  assert.match(html, /No matching sessions, plans, or artifacts/);
});

test('renderSidebarView renders session cards when sessions exist', () => {
  const state = createMockState({
    isLoadingSessions: false,
    sessions: [
      { id: 'sess-1', title: 'Test Session', preview: 'preview text', createdAt: 1000, updatedAt: 2000, messageCount: 3 },
    ],
  });

  const html = renderSidebarView(state);
  assert.doesNotMatch(html, /session-loading-state/);
  assert.match(html, /Test Session/);
  assert.match(html, /preview text/);
});
