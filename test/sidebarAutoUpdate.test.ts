import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderSettingsAppSection } from '../src/ui/components/settingsModal/settingsAppSection';
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

test('renderSettingsAppSection renders checked toggle when autoUpdateEnabled is true', () => {
  const state = createMockState({ autoUpdateEnabled: true });
  const html = renderSettingsAppSection(state);

  assert.match(html, /settings-auto-update-row/);
  assert.match(html, /Automatic Updates/);
  assert.match(html, /id="toggle-auto-update"/);
  assert.match(html, /checked/);
});

test('renderSettingsAppSection renders unchecked toggle when autoUpdateEnabled is false', () => {
  const state = createMockState({ autoUpdateEnabled: false });
  const html = renderSettingsAppSection(state);

  assert.match(html, /settings-auto-update-row/);
  assert.match(html, /id="toggle-auto-update"/);
  assert.ok(!html.includes('checked'));
});
