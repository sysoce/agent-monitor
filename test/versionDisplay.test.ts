import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderNavHeader } from '../src/ui/components/navHeader';
import { renderLoginView } from '../src/ui/components/loginView';
import { renderSidebarAutoUpdate } from '../src/ui/components/sidebarAutoUpdate';
import { CLIENT_VERSION } from '../src/ui/version';
import type { AppState } from '../src/ui/types';

function createMockState(): AppState {
  return {
    activeTab: 'sidebar',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
  };
}

test('renderNavHeader renders brand version text with active CLIENT_VERSION', () => {
  const state = createMockState();
  const html = renderNavHeader(state);
  assert.match(html, /<span class="brand-version">\s*v[\d.]+\s*<\/span>/);
  assert.match(html, new RegExp(`v${CLIENT_VERSION}`));
});

test('renderLoginView renders login header version text with active CLIENT_VERSION', () => {
  const state = { ...createMockState(), isAuthenticated: false };
  const html = renderLoginView(state);
  assert.match(html, /<span class="login-version">\s*v[\d.]+\s*<\/span>/);
  assert.match(html, new RegExp(`v${CLIENT_VERSION}`));
});

test('renderSidebarAutoUpdate renders version tag with active CLIENT_VERSION', () => {
  const state = createMockState();
  const html = renderSidebarAutoUpdate(state);
  assert.match(html, /<span class="sidebar-version-tag">\s*v[\d.]+\s*<\/span>/);
  assert.match(html, new RegExp(`v${CLIENT_VERSION}`));
});
