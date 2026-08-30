import test from 'node:test';
import * as assert from 'node:assert/strict';
import { applyPersistedSyncMode } from '../src/ui/appSyncMode';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { getServerBaseUrl, getDefaultServerUrl, clearServerBaseUrl, setServerBaseUrl } from '../src/ui/authStore';

test('applyPersistedSyncMode defaults to live-sse when live server is available and no mode is saved', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'http:', hostname: '100.115.92.1', port: '4200', origin: 'http://100.115.92.1:4200', search: '', pathname: '/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

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

  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});

test('applyPersistedSyncMode defaults to git-backup on static hosting with gist config', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {
    agent_gist_sync: JSON.stringify({ gistId: 'gist-123', token: 'token-abc' }),
  };

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '', pathname: '/agent-monitor/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

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

  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});

test('getServerBaseUrl returns empty string for direct non-static host without hardcoded IP', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'http:', hostname: '100.115.92.1', port: '4200', origin: 'http://100.115.92.1:4200', search: '' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  assert.equal(getDefaultServerUrl(), '');
  assert.equal(getServerBaseUrl(), '', 'Should return empty string for direct host to use same-origin relative URLs');

  (globalThis as any).window = originalWindow;
  (globalThis as any).localStorage = originalLocalStorage;
});
