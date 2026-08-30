import test, { beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  getDefaultLanUrl,
  setDefaultLanUrl,
  getTailscaleUrl,
  setTailscaleUrl,
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
  getServerBaseUrl,
  setServerBaseUrl,
} from '../src/ui/authStore';
import {
  addNewCustomConnection,
  deleteCustomConnection,
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

test('authStore manages defaultLanUrl, tailscaleUrl, and customConnections list independently', () => {
  assert.equal(getDefaultLanUrl(), '');
  assert.equal(getTailscaleUrl(), '');
  assert.deepEqual(getCustomConnections(), []);
  setDefaultLanUrl('http://192.168.1.111:4200');
  setTailscaleUrl('http://100.74.73.50:4200');
  addCustomConnection('http://10.0.0.99:4200');
  addCustomConnection('http://custom-node.local:4200');

  assert.equal(getDefaultLanUrl(), 'http://192.168.1.111:4200');
  assert.equal(getTailscaleUrl(), 'http://100.74.73.50:4200');
  assert.deepEqual(getCustomConnections(), ['http://10.0.0.99:4200', 'http://custom-node.local:4200']);

  removeCustomConnection('http://10.0.0.99:4200');
  assert.deepEqual(getCustomConnections(), ['http://custom-node.local:4200']);
  assert.equal(getDefaultLanUrl(), 'http://192.168.1.111:4200');
  assert.equal(getTailscaleUrl(), 'http://100.74.73.50:4200');
});

test('addNewCustomConnection adds to list, sets active server URL, and preserves default LAN & Tailscale', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
  });
  setDefaultLanUrl('http://192.168.1.111:4200');
  setTailscaleUrl('http://100.74.73.50:4200');
  let rendered = false;
  addNewCustomConnection(state, '10.0.0.99:4200', () => { rendered = true; });

  assert.equal(state.selectedLanIp, 'http://10.0.0.99:4200');
  assert.equal(getServerBaseUrl(), 'http://10.0.0.99:4200');
  assert.deepEqual(state.customConnections, ['http://10.0.0.99:4200']);
  assert.equal(state.defaultLanUrl, 'http://192.168.1.111:4200');
  assert.equal(state.tailscaleUrl, 'http://100.74.73.50:4200');
  assert.equal(rendered, true);
});

test('deleteCustomConnection removes custom IP and falls back active connection', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    customConnections: ['http://10.0.0.99:4200'],
    selectedLanIp: 'http://10.0.0.99:4200',
  });
  setDefaultLanUrl('http://192.168.1.111:4200');
  setTailscaleUrl('http://100.74.73.50:4200');
  addCustomConnection('http://10.0.0.99:4200');
  setServerBaseUrl('http://10.0.0.99:4200');
  let rendered = false;
  deleteCustomConnection(state, 'http://10.0.0.99:4200', () => { rendered = true; });

  assert.deepEqual(state.customConnections, []);
  assert.equal(state.selectedLanIp, 'http://192.168.1.111:4200');
  assert.equal(getServerBaseUrl(), 'http://192.168.1.111:4200');
  assert.equal(rendered, true);
});

test('renderSettingsNetworkSection renders Default LAN, Tailscale, and custom connection items', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    customConnections: ['http://10.0.0.99:4200'],
    selectedLanIp: 'http://10.0.0.99:4200',
  });
  const html = renderSettingsNetworkSection(state);
  assert.ok(html.includes('192.168.1.111:4200'), 'Must display Default LAN URL');
  assert.ok(html.includes('100.74.73.50:4200'), 'Must display Tailscale URL');
  assert.ok(html.includes('10.0.0.99:4200'), 'Must display Custom connection URL');
  assert.ok(html.includes('data-delete-custom-ip="http://10.0.0.99:4200"'), 'Must render delete button');
  assert.ok(html.includes('id="btn-save-custom-ip"'), 'Must render add connection button');
});

test('handleSettingsModalClick handles switching and deleting connections', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    customConnections: ['http://10.0.0.99:4200'],
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
