import test, { beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  getCustomServerIp,
  setCustomServerIp,
  clearCustomServerIp,
  getTailscaleUrl,
  setTailscaleUrl,
  getServerBaseUrl,
  setServerBaseUrl,
} from '../src/ui/authStore';
import {
  saveCustomServerUrl,
  switchToSetIp,
  switchToTailscale,
  handleSettingsModalClick,
} from '../src/ui/settingsModalEvents';
import { renderSettingsNetworkSection } from '../src/ui/components/settingsModal/settingsNetworkSection';
import type { AppState } from '../src/ui/types';
let originalStorage: any;
let mockStorage: Record<string, string>;
beforeEach(() => {
  mockStorage = {};
  originalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { mockStorage = {}; },
  };
});
afterEach(() => {
  (globalThis as any).localStorage = originalStorage;
});
function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini-3.7-flash',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    ...overrides,
  };
}
test('authStore helpers manage customServerIp and tailscaleUrl independently', () => {
  assert.equal(getCustomServerIp(), '');
  assert.equal(getTailscaleUrl(), '');
  setCustomServerIp('http://192.168.1.111:4200');
  setTailscaleUrl('http://100.74.73.50:4200');
  assert.equal(getCustomServerIp(), 'http://192.168.1.111:4200');
  assert.equal(getTailscaleUrl(), 'http://100.74.73.50:4200');
  clearCustomServerIp();
  assert.equal(getCustomServerIp(), '');
  assert.equal(getTailscaleUrl(), 'http://100.74.73.50:4200');
});
test('saveCustomServerUrl saves custom IP into storage and state and sets server base URL', () => {
  const state = createMockState();
  let rendered = false;
  saveCustomServerUrl(state, 'http://192.168.1.111:4200', () => { rendered = true; });
  assert.equal(state.customServerIp, 'http://192.168.1.111:4200');
  assert.equal(state.selectedLanIp, 'http://192.168.1.111:4200');
  assert.equal(getCustomServerIp(), 'http://192.168.1.111:4200');
  assert.equal(getServerBaseUrl(), 'http://192.168.1.111:4200');
  assert.equal(state.settingsCopyFeedback, 'server-saved');
  assert.equal(rendered, true);
});
test('switchToTailscale switches active server URL to Tailscale while preserving customServerIp', () => {
  const state = createMockState({
    customServerIp: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    selectedLanIp: 'http://192.168.1.111:4200',
  });
  setCustomServerIp('http://192.168.1.111:4200');
  setServerBaseUrl('http://192.168.1.111:4200');
  let rendered = false;
  switchToTailscale(state, () => { rendered = true; });
  assert.equal(state.selectedLanIp, 'http://100.74.73.50:4200');
  assert.equal(getServerBaseUrl(), 'http://100.74.73.50:4200');
  assert.equal(state.customServerIp, 'http://192.168.1.111:4200', 'customServerIp MUST be preserved');
  assert.equal(getCustomServerIp(), 'http://192.168.1.111:4200', 'customServerIp in storage MUST be preserved');
  assert.equal(rendered, true);
});
test('switchToSetIp switches active server URL back to customServerIp while preserving tailscaleUrl', () => {
  const state = createMockState({
    customServerIp: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    selectedLanIp: 'http://100.74.73.50:4200',
  });
  setCustomServerIp('http://192.168.1.111:4200');
  setTailscaleUrl('http://100.74.73.50:4200');
  setServerBaseUrl('http://100.74.73.50:4200');
  let rendered = false;
  switchToSetIp(state, () => { rendered = true; });
  assert.equal(state.selectedLanIp, 'http://192.168.1.111:4200');
  assert.equal(getServerBaseUrl(), 'http://192.168.1.111:4200');
  assert.equal(state.tailscaleUrl, 'http://100.74.73.50:4200', 'tailscaleUrl MUST be preserved');
  assert.equal(rendered, true);
});
test('renderSettingsNetworkSection renders connection switcher with Set IP and Tailscale options', () => {
  const state = createMockState({
    customServerIp: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    selectedLanIp: 'http://100.74.73.50:4200',
    serverSetupInfo: {
      networks: [
        { name: 'Tailscale', address: '100.74.73.50', url: 'http://100.74.73.50:4200', isTailscale: true },
        { name: 'en0', address: '192.168.1.111', url: 'http://192.168.1.111:4200', isTailscale: false },
      ],
    },
  });
  const html = renderSettingsNetworkSection(state);
  assert.ok(html.includes('id="btn-switch-set-ip"'), 'Must render switch to Set IP button');
  assert.ok(html.includes('id="btn-switch-tailscale"'), 'Must render switch to Tailscale button');
  assert.ok(html.includes('192.168.1.111:4200'), 'Must display Set IP address');
  assert.ok(html.includes('100.74.73.50:4200'), 'Must display Tailscale address');
  assert.ok(html.includes('value="http://192.168.1.111:4200"'), 'Set IP input must show customServerIp even when Tailscale is active');
});
test('handleSettingsModalClick handles switcher buttons', () => {
  const state = createMockState({
    customServerIp: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    selectedLanIp: 'http://192.168.1.111:4200',
  });
  let rendered = false;
  const targetTailscale = {
    closest: (sel: string) => (sel.includes('#btn-switch-tailscale') ? {} : null),
  } as unknown as HTMLElement;
  assert.equal(handleSettingsModalClick(state, targetTailscale, { onRender: () => { rendered = true; } } as any), true);
  assert.equal(state.selectedLanIp, 'http://100.74.73.50:4200');
  const targetSetIp = {
    closest: (sel: string) => (sel.includes('#btn-switch-set-ip') ? {} : null),
  } as unknown as HTMLElement;
  assert.equal(handleSettingsModalClick(state, targetSetIp, { onRender: () => { rendered = true; } } as any), true);
  assert.equal(state.selectedLanIp, 'http://192.168.1.111:4200');
});
