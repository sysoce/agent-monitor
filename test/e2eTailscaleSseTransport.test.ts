import test from 'node:test';
import * as assert from 'node:assert/strict';
import { detectIsTailscale, getConnectionEndpointInfo } from '../src/ui/components/connectionEndpointInfo';
import { setServerBaseUrl, getServerBaseUrl, buildApiUrl, setStoredToken } from '../src/ui/authStore';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { submitUserMessage } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';

test('E2E Tailscale SSE: detects 100.x.y.z IP and MagicDNS ts.net endpoints', () => {
  assert.equal(detectIsTailscale('http://100.115.92.1:4200'), true);
  assert.equal(detectIsTailscale('http://my-host.tailscale01.ts.net:4200'), true);
  assert.equal(detectIsTailscale('http://agent-box.ts.net:4200'), true);

  const mockStateIp = {
    selectedLanIp: 'http://100.115.92.1:4200',
  } as unknown as AppState;
  const endpointIp = getConnectionEndpointInfo(mockStateIp);
  assert.equal(endpointIp.isTailscale, true);
  assert.equal(endpointIp.connectionType, 'Tailscale');
  assert.equal(endpointIp.fullUrl, 'http://100.115.92.1:4200');

  const mockStateDns = {
    selectedLanIp: 'http://my-host.ts.net:4200',
  } as unknown as AppState;
  const endpointDns = getConnectionEndpointInfo(mockStateDns);
  assert.equal(endpointDns.isTailscale, true);
  assert.equal(endpointDns.connectionType, 'Tailscale');
});

test('E2E Tailscale SSE: routes authenticated API requests over Tailscale endpoint', async () => {
  const originalWindow = (globalThis as any).window;
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'https:', hostname: 'sysoce.github.io', origin: 'https://sysoce.github.io', search: '', pathname: '/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    setServerBaseUrl('http://100.115.92.1:4200');
    setStoredToken('ts-auth-pass-123');

    assert.equal(getServerBaseUrl(), 'http://100.115.92.1:4200');
    assert.equal(buildApiUrl('/api/events'), 'http://100.115.92.1:4200/api/events');

    const sm = new SyncStateMachine({
      onModeChange: () => {},
      onStatusChange: () => {},
      onDataUpdate: () => {},
    });
    sm.setMode('live-sse');

    let postedUrl = '';
    let authHeader = '';
    const customFetch = (async (url: string, opts?: RequestInit) => {
      postedUrl = url;
      authHeader = (opts?.headers as Record<string, string> | undefined)?.Authorization || '';
      return new Response(JSON.stringify({ ok: true, id: 'sess-ts-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = customFetch;
    try {
      const state: Partial<AppState> = {
        syncMode: 'live-sse',
        activeSessionId: 'sess-ts-1',
        sessions: [{ id: 'sess-ts-1', title: 'TS Session', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 1 }],
        composerMode: 'agent',
      };

      await submitUserMessage(state as AppState, sm, 'Run benchmark across tailscale');

      assert.equal(postedUrl, 'http://100.115.92.1:4200/api/sessions/sess-ts-1/messages');
      assert.equal(authHeader, 'Bearer ts-auth-pass-123');
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalStorage;
  }
});
