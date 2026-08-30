import test, { beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { getServerBaseUrl } from '../src/ui/authStore';
import { handleSettingsModalClick } from '../src/ui/settingsModalEvents';
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
afterEach(() => { (globalThis as any).localStorage = originalStorage; });

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    activeTab: 'sidebar', sessions: [], plans: [], syncStatus: 'connected',
    searchQuery: '', composerMode: 'agent', selectedModel: 'gemini-3.7-flash',
    availableModels: [], isSending: false, isAuthenticated: true, ...overrides,
  };
}

test('handleSettingsModalClick handles switching and deleting connections', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    customConnections: [{ url: 'http://10.0.0.99:4200' }],
    selectedLanIp: 'http://10.0.0.99:4200',
  });
  let rendered = false;
  const switchTarget = {
    closest: (sel: string) => (sel.includes('[data-switch-connection]') ? { getAttribute: () => 'http://100.74.73.50:4200' } : null),
  } as unknown as HTMLElement;
  assert.equal(handleSettingsModalClick(state, switchTarget, { onRender: () => { rendered = true; } } as any), true);
  assert.equal(state.selectedLanIp, 'http://100.74.73.50:4200');

  const deleteTarget = {
    closest: (sel: string) => (sel.includes('[data-delete-custom-ip]') ? { getAttribute: () => 'http://10.0.0.99:4200' } : null),
  } as unknown as HTMLElement;
  assert.equal(handleSettingsModalClick(state, deleteTarget, { onRender: () => { rendered = true; } } as any), true);
  assert.deepEqual(state.customConnections, []);
});

test('handleSettingsModalClick triggers onSwitchConnection callback when switching connection', async () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
  });
  let switchedUrl = '';
  const callbacks = {
    onRender: () => {},
    onSwitchConnection: (url: string) => { switchedUrl = url; },
  };

  const switchTarget = {
    closest: (sel: string) => (sel.includes('[data-switch-connection]') ? { getAttribute: () => 'http://192.168.1.200:4200' } : null),
  } as unknown as HTMLElement;

  handleSettingsModalClick(state, switchTarget, callbacks as any);
  assert.equal(switchedUrl, 'http://192.168.1.200:4200');
  assert.equal(state.selectedLanIp, 'http://192.168.1.200:4200');
  assert.equal(getServerBaseUrl(), 'http://192.168.1.200:4200');
});
