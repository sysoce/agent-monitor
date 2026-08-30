import test from 'node:test';
import * as assert from 'node:assert/strict';
import { detectIsTailscale, getConnectionEndpointInfo } from '../src/ui/components/connectionEndpointInfo';
import { setServerBaseUrl, getServerBaseUrl, buildApiUrl } from '../src/ui/authStore';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { submitUserMessage } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';

test('E2E LAN SSE: detects LAN IPv4 endpoint and formats LAN indicator info', () => {
  const lanUrl = 'http://192.168.1.150:4200';
  assert.equal(detectIsTailscale(lanUrl), false, '192.168.x.x must not be identified as Tailscale');

  const mockState = {
    selectedLanIp: lanUrl,
  } as unknown as AppState;

  const endpoint = getConnectionEndpointInfo(mockState);
  assert.equal(endpoint.isTailscale, false);
  assert.equal(endpoint.connectionType, 'LAN');
  assert.equal(endpoint.fullUrl, 'http://192.168.1.150:4200');
});

test('E2E LAN SSE: configures server base URL and routes API endpoints', () => {
  const originalWindow = (globalThis as any).window;
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'app.example.com', origin: 'https://app.example.com', search: '', pathname: '/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    setServerBaseUrl('http://192.168.1.150:4200');
    assert.equal(getServerBaseUrl(), 'http://192.168.1.150:4200');
    assert.equal(buildApiUrl('/api/events'), 'http://192.168.1.150:4200/api/events');
    assert.equal(buildApiUrl('/api/message'), 'http://192.168.1.150:4200/api/message');
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalStorage;
  }
});

test('E2E LAN SSE: SyncStateMachine connects to live-sse and dispatches message via HTTP', async () => {
  const originalWindow = (globalThis as any).window;
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'app.example.com', origin: 'https://app.example.com', search: '', pathname: '/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  setServerBaseUrl('http://192.168.1.150:4200');

  let activeMode = '';
  let activeStatus = '';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: (s) => { activeStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setMode('live-sse');
  assert.equal(activeMode, 'live-sse');
  assert.equal(activeStatus, 'connecting');

  let postedUrl = '';
  let postedBody: any = null;
  const customFetch = (async (url: string, opts?: RequestInit) => {
    postedUrl = url;
    postedBody = JSON.parse(opts?.body as string);
    return new Response(JSON.stringify({ ok: true, id: 'sess-lan-1' }), { status: 200 });
  }) as unknown as typeof fetch;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = customFetch;
  try {
    const state: Partial<AppState> = {
      syncMode: 'live-sse',
      activeSessionId: 'sess-lan-1',
      sessions: [{ id: 'sess-lan-1', title: 'LAN Session', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 1 }],
      composerMode: 'agent',
    };

    await submitUserMessage(state as AppState, sm, 'Refactor transport layer');

    assert.equal(postedUrl, 'http://192.168.1.150:4200/api/sessions/sess-lan-1/messages');
    assert.equal(postedBody.content, 'Refactor transport layer');
  } finally {
    globalThis.fetch = originalFetch;
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalStorage;
  }
});
