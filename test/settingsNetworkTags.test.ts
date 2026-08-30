import test, { beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  getCustomConnections,
  addCustomConnection,
  removeCustomConnection,
} from '../src/ui/authStore';
import {
  addNewCustomConnection,
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

test('custom connections support custom name and tag in store and UI', () => {
  const added = addCustomConnection('http://192.168.1.50:4200', 'Work Desktop', 'Office');
  assert.equal(added.length, 1);
  assert.equal(added[0].url, 'http://192.168.1.50:4200');
  assert.equal(added[0].name, 'Work Desktop');
  assert.equal(added[0].tag, 'Office');

  const stored = getCustomConnections();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, 'Work Desktop');
  assert.equal(stored[0].tag, 'Office');
});

test('renderSettingsNetworkSection renders status Active/Disabled, no Set as active button, and Name input', () => {
  const state = createMockState({
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
    customConnections: [{ url: 'http://10.0.0.99:4200', name: 'Cloud Server', tag: 'Cloud' }],
    selectedLanIp: 'http://192.168.1.111:4200',
  });
  const html = renderSettingsNetworkSection(state);

  // Must NOT have "Set as active" button
  assert.ok(!html.includes('Set as Active'), 'Must not render "Set as Active" button text');
  assert.ok(!html.includes('network-btn-use-qr'), 'Must not render network-btn-use-qr button');

  // Must have Active and Disabled status tags
  assert.ok(html.includes('Active'), 'Must render Active status');
  assert.ok(html.includes('Disabled'), 'Must render Disabled status');

  // Must show Name / Tag input
  assert.ok(html.includes('id="input-custom-server-name"'), 'Must render custom connection name/tag input');
  assert.ok(html.includes('id="input-custom-server-ip"'), 'Must render custom connection URL input');

  // Must display custom name and tag
  assert.ok(html.includes('Cloud Server'), 'Must display custom name');
  assert.ok(html.includes('Cloud'), 'Must display custom tag');
});
