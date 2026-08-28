import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  isAutoUpdateEnabled,
  setAutoUpdateEnabled,
  triggerBundleDownload,
  processVersionCheck,
} from '../src/ui/updateManager';
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

test('isAutoUpdateEnabled defaults to true when localStorage is empty', () => {
  const originalStorage = globalThis.localStorage;
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
  };

  try {
    assert.equal(isAutoUpdateEnabled(), true);
    setAutoUpdateEnabled(false);
    assert.equal(isAutoUpdateEnabled(), false);
    setAutoUpdateEnabled(true);
    assert.equal(isAutoUpdateEnabled(), true);
  } finally {
    (globalThis as any).localStorage = originalStorage;
  }
});

test('processVersionCheck triggers auto-download when newer version is detected and auto-update is ON', () => {
  const originalStorage = globalThis.localStorage;
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
  };

  let downloadedUrl = '';
  const mockDownloader = (url: string) => { downloadedUrl = url; };

  try {
    const state = createMockState();
    const result = processVersionCheck(state, '2.3.199', '2.3.198', mockDownloader);

    assert.equal(result.hasUpdate, true);
    assert.equal(state.availableUpdateVersion, '2.3.199');
    assert.equal(state.updateDownloaded, true);
    assert.equal(downloadedUrl, '/download');
  } finally {
    (globalThis as any).localStorage = originalStorage;
  }
});

test('processVersionCheck does not download automatically when auto-update is OFF', () => {
  const originalStorage = globalThis.localStorage;
  const store = new Map<string, string>();
  store.set('agent_auto_update', 'false');
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
  };

  let downloadCount = 0;
  const mockDownloader = () => { downloadCount++; };

  try {
    const state = createMockState();
    const result = processVersionCheck(state, '2.3.199', '2.3.198', mockDownloader);

    assert.equal(result.hasUpdate, true);
    assert.equal(state.availableUpdateVersion, '2.3.199');
    assert.equal(state.updateDownloaded, false);
    assert.equal(downloadCount, 0);
  } finally {
    (globalThis as any).localStorage = originalStorage;
  }
});

test('processVersionCheck suppresses auto-download when running on file: protocol', () => {
  const originalStorage = globalThis.localStorage;
  const originalWindow = (globalThis as any).window;
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
  };
  (globalThis as any).window = { location: { protocol: 'file:' } };

  let downloadCount = 0;
  const mockDownloader = () => { downloadCount++; };

  try {
    const state = createMockState();
    const result = processVersionCheck(state, '2.3.199', '2.3.198', mockDownloader);

    assert.equal(result.hasUpdate, true);
    assert.equal(state.availableUpdateVersion, '2.3.199');
    assert.equal(state.updateDownloaded, false);
    assert.equal(downloadCount, 0);
  } finally {
    (globalThis as any).localStorage = originalStorage;
    (globalThis as any).window = originalWindow;
  }
});

test('triggerBundleDownload does nothing on file: protocol when target is relative', () => {
  const originalWindow = (globalThis as any).window;
  const originalDoc = (globalThis as any).document;
  (globalThis as any).window = { location: { protocol: 'file:' } };
  let appended = false;
  (globalThis as any).document = {
    createElement: () => ({ setAttribute: () => {}, click: () => {} }),
    body: { appendChild: () => { appended = true; }, removeChild: () => {} },
  };

  try {
    triggerBundleDownload('/download');
    assert.equal(appended, false);
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).document = originalDoc;
  }
});
