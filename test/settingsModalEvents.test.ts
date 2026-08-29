import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  openSettingsModal,
  closeSettingsModal,
  selectQrTab,
  selectLanIp,
  saveCustomServerUrl,
  handleSettingsModalClick,
} from '../src/ui/settingsModalEvents';
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

test('openSettingsModal opens modal and sets default tab', () => {
  const state = createMockState();
  let rendered = false;
  openSettingsModal(state, () => { rendered = true; });

  assert.equal(state.isSettingsModalOpen, true);
  assert.equal(state.isQrModalOpen, true);
  assert.equal(state.qrModalTarget, 'gh_pages');
  assert.equal(rendered, true);
});

test('closeSettingsModal closes modal and resets feedbacks', () => {
  const state = createMockState({ isSettingsModalOpen: true, settingsCopyFeedback: 'link' });
  let rendered = false;
  closeSettingsModal(state, () => { rendered = true; });

  assert.equal(state.isSettingsModalOpen, false);
  assert.equal(state.settingsCopyFeedback, undefined);
  assert.equal(rendered, true);
});

test('selectQrTab updates qrModalTarget', () => {
  const state = createMockState();
  let rendered = false;
  selectQrTab(state, 'lan', () => { rendered = true; });

  assert.equal(state.qrModalTarget, 'lan');
  assert.equal(rendered, true);
});

test('selectLanIp sets selectedLanIp and sets target to lan', () => {
  const state = createMockState();
  let rendered = false;
  selectLanIp(state, 'http://192.168.1.88:4200', () => { rendered = true; });

  assert.equal(state.selectedLanIp, 'http://192.168.1.88:4200');
  assert.equal(state.qrModalTarget, 'lan');
  assert.equal(rendered, true);
});

test('handleSettingsModalClick handles open settings button', () => {
  const state = createMockState();
  let rendered = false;
  const target = {
    closest: (selector: string) => selector.includes('#btn-open-settings') ? {} : null,
    id: 'btn-open-settings',
  } as unknown as HTMLElement;

  const handled = handleSettingsModalClick(state, target, { onRender: () => { rendered = true; } } as any);
  assert.equal(handled, true);
  assert.equal(state.isSettingsModalOpen, true);
  assert.equal(rendered, true);
});

test('handleSettingsModalClick handles LAN IP selection button', () => {
  const state = createMockState();
  let rendered = false;
  const target = {
    closest: (selector: string) => selector.includes('[data-use-ip]') ? {
      getAttribute: (attr: string) => attr === 'data-use-ip' ? 'http://10.0.0.5:4200' : null,
    } : null,
    id: '',
  } as unknown as HTMLElement;

  const handled = handleSettingsModalClick(state, target, { onRender: () => { rendered = true; } } as any);
  assert.equal(handled, true);
  assert.equal(state.selectedLanIp, 'http://10.0.0.5:4200');
  assert.equal(state.qrModalTarget, 'lan');
  assert.equal(rendered, true);
});

test('saveCustomServerUrl saves server url and triggers feedback', () => {
  const state = createMockState();
  let rendered = false;
  saveCustomServerUrl(state, 'http://192.168.1.99:4200', () => { rendered = true; });

  assert.equal(state.selectedLanIp, 'http://192.168.1.99:4200');
  assert.equal(state.settingsCopyFeedback, 'server-saved');
  assert.equal(rendered, true);
});

test('handleSettingsModalClick handles save custom IP button', () => {
  const originalDocument = (globalThis as any).document;
  (globalThis as any).document = {
    getElementById: (id: string) => id === 'input-custom-server-ip' ? { value: 'http://192.168.1.77:4200' } : null,
  };

  const state = createMockState();
  let rendered = false;
  const target = {
    closest: (selector: string) => selector.includes('#btn-save-custom-ip') ? {} : null,
    id: 'btn-save-custom-ip',
  } as unknown as HTMLElement;

  const handled = handleSettingsModalClick(state, target, { onRender: () => { rendered = true; } } as any);
  assert.equal(handled, true);
  assert.equal(state.selectedLanIp, 'http://192.168.1.77:4200');
  assert.equal(state.settingsCopyFeedback, 'server-saved');
  assert.equal(rendered, true);

  (globalThis as any).document = originalDocument;
});
