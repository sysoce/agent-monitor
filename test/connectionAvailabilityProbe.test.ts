import test from 'node:test';
import * as assert from 'node:assert/strict';
import {
  probeConnectionAvailability,
  probeAllConnections,
} from '../src/ui/connectionAvailabilityProbe';
import type { AppState } from '../src/ui/types';

test('probeConnectionAvailability returns false on unreachable endpoint', async () => {
  const isAvailable = await probeConnectionAvailability('http://127.0.0.1:59999', 300);
  assert.equal(isAvailable, false);
});

test('probeAllConnections updates state.connectionAvailability for all endpoints', async () => {
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('192.168.1.111')) {
      return { ok: true, status: 200 } as any;
    }
    throw new Error('Connection refused');
  };

  const state: AppState = {
    activeTab: 'sidebar',
    sessions: [],
    plans: [],
    syncStatus: 'connected',
    searchQuery: '',
    composerMode: 'agent',
    selectedModel: 'gemini',
    availableModels: [],
    isSending: false,
    isAuthenticated: true,
    defaultLanUrl: 'http://192.168.1.111:4200',
    tailscaleUrl: 'http://100.74.73.50:4200',
  };

  let rendered = false;
  await probeAllConnections(state, () => { rendered = true; }, 500);

  assert.equal(state.connectionAvailability?.['http://192.168.1.111:4200'], true);
  assert.equal(state.connectionAvailability?.['http://100.74.73.50:4200'], false);
  assert.equal(rendered, true);

  (globalThis as any).fetch = originalFetch;
});
