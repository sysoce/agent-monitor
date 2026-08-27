import test from 'node:test';
import * as assert from 'node:assert/strict';
import { getSavedTab, saveActiveTab, getSavedSessionId, saveActiveSessionId } from '../src/ui/tabStore';
import { AppController } from '../src/ui/appController';
import type { AppState } from '../src/ui/types';

function setupMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
  (globalThis as any).localStorage = mockStorage;
  return mockStorage;
}

function setupMockFetch() {
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/sessions')) {
      return {
        ok: true,
        json: async () => [
          { id: 'sess-1', title: 'Test Session', createdAt: 1000, updatedAt: 2000, messageCount: 3, preview: 'Hello' },
        ],
      };
    }
    if (url.includes('/api/models')) {
      return {
        ok: true,
        json: async () => [],
      };
    }
    return {
      ok: true,
      json: async () => ({ id: 'sess-1', title: 'Test Session', messages: [], plans: [] }),
    };
  };
}

function createMockState(overrides: Partial<AppState> = {}): AppState {
  return {
    sessions: [],
    plans: [],
    availableModels: [],
    activeTab: 'sidebar',
    syncStatus: 'connected',
    syncMode: 'live-sse',
    composerMode: 'agent',
    isAwaitingResponse: false,
    isSending: false,
    isAuthenticated: true,
    searchQuery: '',
    selectedModel: 'gpt-4o',
    attachments: [],
    ...overrides,
  };
}

test('getSavedTab returns null when nothing is stored', () => {
  setupMockLocalStorage();
  assert.equal(getSavedTab(), null);
});

test('saveActiveTab persists tab to localStorage and getSavedTab retrieves it', () => {
  setupMockLocalStorage();
  saveActiveTab('sidebar');
  assert.equal(getSavedTab(), 'sidebar');

  saveActiveTab('chat');
  assert.equal(getSavedTab(), 'chat');

  saveActiveTab('plans');
  assert.equal(getSavedTab(), 'plans');
});

test('saveActiveSessionId persists session ID and getSavedSessionId retrieves it', () => {
  setupMockLocalStorage();
  saveActiveSessionId('session-xyz');
  assert.equal(getSavedSessionId(), 'session-xyz');

  saveActiveSessionId(undefined);
  assert.equal(getSavedSessionId(), null);
});

test('AppController restores saved sidebar tab on page refresh when saved in localStorage', async () => {
  const storage = setupMockLocalStorage();
  setupMockFetch();
  storage.setItem('agent_active_tab', 'sidebar');
  storage.setItem('agent_active_session_id', 'sess-1');

  const state = createMockState({
    activeTab: 'chat',
    activeSessionId: undefined,
  });

  const controller = new AppController(state, () => {});
  await controller.reloadData(true);

  assert.equal(state.activeTab, 'sidebar', 'Should preserve sidebar tab across refresh');
  assert.equal(state.activeSessionId, 'sess-1', 'Should restore saved session ID');
});

test('AppController restores saved chat tab on page refresh when saved in localStorage', async () => {
  const storage = setupMockLocalStorage();
  setupMockFetch();
  storage.setItem('agent_active_tab', 'chat');
  storage.setItem('agent_active_session_id', 'sess-1');

  const state = createMockState({
    activeTab: 'sidebar',
    activeSessionId: undefined,
  });

  const controller = new AppController(state, () => {});
  await controller.reloadData(true);

  assert.equal(state.activeTab, 'chat', 'Should preserve chat tab across refresh');
  assert.equal(state.activeSessionId, 'sess-1', 'Should restore saved session ID');
});
