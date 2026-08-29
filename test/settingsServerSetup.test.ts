import test from 'node:test';
import * as assert from 'node:assert/strict';
import { fetchServerSetupInfo } from '../src/ui/settingsModalEvents';
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

test('fetchServerSetupInfo skips network call when hosted statically without server URL', async () => {
  const originalWindow = (globalThis as any).window;
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({}) } as any;
  }) as any;

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '' },
  };

  const state = createMockState();
  let rendered = false;
  await fetchServerSetupInfo(state, () => { rendered = true; });

  assert.equal(fetchCalled, false, 'Should not fetch /api/setup-info on static host without server');
  assert.equal(rendered, false);

  (globalThis as any).window = originalWindow;
  globalThis.fetch = originalFetch;
});

test('fetchServerSetupInfo executes fetch when server URL is configured', async () => {
  const originalWindow = (globalThis as any).window;
  let fetchedUrl = '';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    fetchedUrl = url;
    return {
      ok: true,
      json: async () => ({ networks: [{ name: 'Wi-Fi', address: '192.168.1.5', url: 'http://192.168.1.5:4200' }] }),
    } as any;
  }) as any;

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '?server=http://192.168.1.5:4200' },
  };

  const state = createMockState();
  let rendered = false;
  await fetchServerSetupInfo(state, () => { rendered = true; }, true);

  assert.equal(fetchedUrl, 'http://192.168.1.5:4200/api/setup-info');
  assert.equal(rendered, true);
  assert.equal(state.serverSetupInfo?.networks?.length, 1);

  (globalThis as any).window = originalWindow;
  globalThis.fetch = originalFetch;
});
