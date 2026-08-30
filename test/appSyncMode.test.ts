import test from 'node:test';
import * as assert from 'node:assert/strict';
import { applyPersistedSyncMode, setSyncModeAction } from '../src/ui/appSyncMode';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { getServerBaseUrl, getDefaultServerUrl } from '../src/ui/authStore';

function withMockEnv(
  opts: { window?: any; store?: Record<string, string> },
  fn: (store: Record<string, string>) => void
) {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const store = opts.store || {};
  (globalThis as any).window = opts.window || undefined;
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  try {
    fn(store);
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalLocalStorage;
  }
}

test('applyPersistedSyncMode defaults to live-sse when live server is available and no mode is saved', () => {
  withMockEnv({
    window: { location: { protocol: 'http:', hostname: '100.115.92.1', port: '4200', origin: 'http://100.115.92.1:4200', search: '', pathname: '/' } },
  }, () => {
    let activeMode = '';
    let sseStarted = false;
    const sm = new SyncStateMachine({
      onModeChange: (m) => { activeMode = m; },
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });

    applyPersistedSyncMode(sm, () => { sseStarted = true; });
    assert.equal(activeMode, 'live-sse', 'Should default to live-sse on live server');
    assert.equal(sseStarted, true, 'Should start SSE client on live server');
  });
});

test('applyPersistedSyncMode defaults to git-backup on static hosting with gist config', () => {
  withMockEnv({
    window: { location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '', pathname: '/agent-monitor/' } },
    store: { agent_gist_sync: JSON.stringify({ gistId: 'gist-123', token: 'token-abc' }) },
  }, () => {
    let activeMode = '';
    let sseStarted = false;
    const sm = new SyncStateMachine({
      onModeChange: (m) => { activeMode = m; },
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });

    applyPersistedSyncMode(sm, () => { sseStarted = true; });
    assert.equal(activeMode, 'git-backup', 'Should default to git-backup on static hosting with gist config');
    assert.equal(sseStarted, false, 'Should not start SSE client on static hosting without server');
  });
});

test('getServerBaseUrl returns empty string for direct non-static host without hardcoded IP', () => {
  withMockEnv({
    window: { location: { protocol: 'http:', hostname: '100.115.92.1', port: '4200', origin: 'http://100.115.92.1:4200', search: '' } },
  }, () => {
    assert.equal(getDefaultServerUrl(), '');
    assert.equal(getServerBaseUrl(), '', 'Should return empty string for direct host to use same-origin relative URLs');
  });
});

test('applyPersistedSyncMode honors saved live-sse mode on HTTPS even with HTTP server and gist configured', () => {
  withMockEnv({
    window: { location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '', pathname: '/agent-monitor/' } },
    store: {
      agent_gist_sync: JSON.stringify({ gistId: 'gist-123', token: 'token-abc' }),
      agent_server_url: 'http://192.168.1.111:4200',
      agent_sync_mode: 'live-sse',
    },
  }, () => {
    let activeMode = '';
    let sseStarted = false;
    const sm = new SyncStateMachine({
      onModeChange: (m) => { activeMode = m; },
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });

    applyPersistedSyncMode(sm, () => { sseStarted = true; });
    assert.equal(activeMode, 'live-sse', 'Should honor saved live-sse mode on HTTPS without pre-emptive override');
    assert.equal(sseStarted, true, 'Should start SSE client when live-sse mode is saved');
  });
});

test('setSyncModeAction switches from git-backup to live-sse on HTTPS without falling back to git-backup', () => {
  withMockEnv({
    window: { location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '', pathname: '/agent-monitor/' } },
    store: {
      agent_gist_sync: JSON.stringify({ gistId: 'gist-123', token: 'token-abc' }),
      agent_server_url: 'http://192.168.1.111:4200',
      agent_sync_mode: 'git-backup',
    },
  }, (store) => {
    const state: any = { syncMode: 'git-backup', autoFallbackEnabled: false };
    let sseStarted = false;
    let activeMode = 'git-backup';
    const sm = new SyncStateMachine({
      onModeChange: (m) => { activeMode = m; },
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });
    sm.setGistConfig({ gistId: 'gist-123', token: 'token-abc' });
    sm.setAutoFallback(false);

    setSyncModeAction('live-sse', state, sm, () => { sseStarted = true; });

    assert.equal(state.syncMode, 'live-sse', 'State syncMode must be live-sse');
    assert.equal(activeMode, 'live-sse', 'SyncStateMachine mode must be live-sse');
    assert.equal(store.agent_sync_mode, 'live-sse', 'localStorage must store live-sse');
    assert.equal(sseStarted, true, 'SSE client must be started');
  });
});

