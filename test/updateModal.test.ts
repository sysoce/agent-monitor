import test from 'node:test';
import * as assert from 'node:assert/strict';
import { renderUpdateModal } from '../src/ui/components/updateModal';
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

test('renderUpdateModal returns empty string when modal is closed', () => {
  const state = createMockState({ isUpdateModalOpen: false });
  const html = renderUpdateModal(state);
  assert.equal(html, '');
});

test('renderUpdateModal renders Firefox local file link and copy button when modal is open and downloaded', () => {
  const state = createMockState({
    isUpdateModalOpen: true,
    updateDownloaded: true,
    availableUpdateVersion: '2.3.199',
  });
  const html = renderUpdateModal(state);

  assert.match(html, /update-modal/);
  assert.match(html, /file:\/\/\/storage\/emulated\/0\/Download\/agent-monitor\.html/);
  assert.match(html, /file:\/\/\/sdcard\/Download\/agent-monitor\.html/);
  assert.match(html, /data-copy-text="file:\/\/\/storage\/emulated\/0\/Download\/agent-monitor\.html"/);
  assert.match(html, /btn-toggle-auto-update/);
  assert.match(html, /checked/);
});

test('renderUpdateModal renders download button and available badge when update is not yet downloaded', () => {
  const state = createMockState({
    isUpdateModalOpen: true,
    updateDownloaded: false,
    availableUpdateVersion: '2.3.212',
  });
  const html = renderUpdateModal(state);

  assert.match(html, /update-modal-badge--info/);
  assert.match(html, /Update Available/);
  assert.match(html, /Version v2\.3\.212 Available/);
  assert.match(html, /btn-manual-download-update/);
  assert.match(html, /Download Update \(v2\.3\.212\)/);
});

test('renderUpdateModal reflects auto-update toggle state when disabled', () => {
  const state = createMockState({
    isUpdateModalOpen: true,
    autoUpdateEnabled: false,
    availableUpdateVersion: '2.3.199',
  });
  const html = renderUpdateModal(state);

  assert.match(html, /update-modal/);
  assert.ok(!html.includes('id="toggle-auto-update" checked'));
});
