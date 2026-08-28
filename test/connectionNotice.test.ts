import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderConnectionNotice } from '../src/ui/components/connectionNotice';
import type { AppState } from '../src/ui/types';

function createMockState(overrides: Partial<AppState> = {}): AppState {
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
    isLoadingSessions: false,
    ...overrides,
  };
}

test('renderConnectionNotice returns empty string when connected and healthy', () => {
  const state = createMockState({ syncStatus: 'connected' });
  const html = renderConnectionNotice(state);
  assert.equal(html, '');
});

test('renderConnectionNotice renders error banner when errorMessage is present', () => {
  const state = createMockState({ errorMessage: 'Server connection failed: ECONNREFUSED' });
  const html = renderConnectionNotice(state);
  assert.match(html, /connection-notice--error/);
  assert.match(html, /Server connection failed: ECONNREFUSED/);
});

test('renderConnectionNotice renders offline / sleep notice when syncStatus is disconnected', () => {
  const state = createMockState({ syncStatus: 'disconnected' });
  const html = renderConnectionNotice(state);
  assert.match(html, /connection-notice--disconnected/);
  assert.match(html, /computer may be asleep/i);
});

test('renderConnectionNotice returns empty string when in git-backup mode and awaiting response', () => {
  const state = createMockState({
    syncMode: 'git-backup',
    syncStatus: 'connected',
    isAwaitingResponse: true,
  });
  const html = renderConnectionNotice(state);
  assert.equal(html, '');
});

test('renderConnectionNotice safely escapes dangerous HTML in error messages', () => {
  const state = createMockState({ errorMessage: '<script>alert("hack")</script>' });
  const html = renderConnectionNotice(state);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});
