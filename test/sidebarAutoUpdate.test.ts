import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSidebarAutoUpdate } from '../src/ui/components/sidebarAutoUpdate';
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
    isLoadingSessions: false,
    ...overrides,
  };
}

test('renderSidebarAutoUpdate renders checked toggle when autoUpdateEnabled is true', () => {
  const state = createMockState({ autoUpdateEnabled: true });
  const html = renderSidebarAutoUpdate(state);

  assert.match(html, /sidebar-auto-update/);
  assert.match(html, /Auto-update/);
  assert.match(html, /id="toggle-auto-update"/);
  assert.match(html, /checked/);
});

test('renderSidebarAutoUpdate renders unchecked toggle when autoUpdateEnabled is false', () => {
  const state = createMockState({ autoUpdateEnabled: false });
  const html = renderSidebarAutoUpdate(state);

  assert.match(html, /sidebar-auto-update/);
  assert.match(html, /id="toggle-auto-update"/);
  assert.ok(!html.includes('checked'));
});

test('renderSidebarView includes sidebar-auto-update toggle', () => {
  const state = createMockState({ autoUpdateEnabled: true });
  const html = renderSidebarView(state);

  assert.match(html, /sidebar-auto-update/);
  assert.match(html, /id="toggle-auto-update"/);
});
