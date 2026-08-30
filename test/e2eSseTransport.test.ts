import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { setServerBaseUrl, setStoredToken, getStoredToken, buildApiUrl } from '../src/ui/authStore';
import { submitUserMessage } from '../src/ui/messageSender';
import type { AppState } from '../src/ui/types';

test('E2E Local SSE: establishes live-sse mode, transmits token, and posts message', async () => {
  const originalWindow = (globalThis as any).window;
  const originalStorage = (globalThis as any).localStorage;
  const store: Record<string, string> = {};

  (globalThis as any).window = {
    location: { protocol: 'http:', hostname: '127.0.0.1', port: '4200', origin: 'http://127.0.0.1:4200', search: '', pathname: '/' },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };

  try {
    setServerBaseUrl('http://127.0.0.1:4200');
    setStoredToken('my-local-secret');
    assert.equal(getStoredToken(), 'my-local-secret');
    assert.equal(buildApiUrl('/api/events'), 'http://127.0.0.1:4200/api/events');

    let modeChange = '';
    let statusChange = '';
    const sm = new SyncStateMachine({
      onModeChange: (m) => { modeChange = m; },
      onStatusChange: (s) => { statusChange = s; },
      onDataUpdate: () => {},
    });

    sm.setMode('live-sse');
    assert.equal(modeChange, 'live-sse');
    assert.equal(statusChange, 'connecting');

    let postedUrl = '';
    let postedHeaders: Record<string, string> = {};
    let postedBody: any = null;

    const customFetch = (async (url: string, opts?: RequestInit) => {
      postedUrl = url;
      postedHeaders = (opts?.headers as Record<string, string>) || {};
      postedBody = JSON.parse(opts?.body as string);
      return new Response(JSON.stringify({ ok: true, id: 'sess-local-1' }), { status: 200 });
    }) as unknown as typeof fetch;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = customFetch;
    try {
      const state: Partial<AppState> = {
        syncMode: 'live-sse',
        activeSessionId: 'sess-local-1',
        sessions: [{ id: 'sess-local-1', title: 'Local Session', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 1 }],
        composerMode: 'agent',
      };

      await submitUserMessage(state as AppState, sm, 'Localhost SSE prompt');

      assert.equal(postedUrl, 'http://127.0.0.1:4200/api/sessions/sess-local-1/messages');
      assert.equal(postedHeaders['Authorization'], 'Bearer my-local-secret');
      assert.equal(postedBody.content, 'Localhost SSE prompt');
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalStorage;
  }
});
