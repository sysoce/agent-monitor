import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderNavHeader } from '../src/ui/components/navHeader';
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
    selectedModel: 'antigravity|gemini-3.7-flash-high|model',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    ...overrides,
  };
}

test('renderNavHeader renders single prominent btn-open-settings button', () => {
  const state = createMockState();
  const html = renderNavHeader(state);

  assert.ok(html.includes('id="btn-open-settings"'));
  assert.ok(html.includes('btn-settings-pill'));
  assert.ok(html.includes('Settings'));

  // Ensure no old redundant btn-show-qr in header
  assert.equal(html.includes('id="btn-show-qr"'), false);
});

test('renderSidebarView has no duplicate settings or QR buttons', () => {
  const state = createMockState();
  const html = renderSidebarView(state);

  // Assert no settings/QR buttons in sidebar
  assert.equal(html.includes('id="btn-sidebar-qr"'), false);
  assert.equal(html.includes('id="btn-open-settings"'), false);
  assert.equal(html.includes('Pair Phone'), false);
});
