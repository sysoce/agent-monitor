import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { applyGistSyncPayload } from '../src/ui/gistPayloadApplier';
import { isMixedContentBlocked, hasLiveServer } from '../src/ui/authStore';
import { renderChatView } from '../src/ui/components/chatView';
import { loadRecentSessionDetails } from '../src/sync/syncSanitizer';
import type { AppState } from '../src/ui/types';

describe('Session Loading and Transport Resilience', () => {
  it('applyGistSyncPayload populates activeSession stub and clears isLoadingSession for non-cached activeSessionId', () => {
    const state: Partial<AppState> = {
      activeSessionId: 'sess-unknown-123',
      activeSession: undefined,
      isLoadingSession: true,
      sessions: [
        { id: 'sess-unknown-123', title: 'My Unknown Session', createdAt: 1000, updatedAt: 2000, messageCount: 0, preview: '' },
      ],
      cachedSessionDetails: {},
    };

    applyGistSyncPayload(state as AppState, {
      version: 1,
      inbox: [],
      sessions: [
        { id: 'sess-unknown-123', title: 'My Unknown Session', createdAt: 1000, updatedAt: 2000, messageCount: 0, preview: '' },
      ],
      sessionDetails: {},
      updatedAt: Date.now(),
    });

    assert.strictEqual(state.isLoadingSession, false);
    assert.ok(state.activeSession, 'activeSession should be initialized');
    assert.strictEqual(state.activeSession?.id, 'sess-unknown-123');
    assert.strictEqual(state.activeSession?.title, 'My Unknown Session');
    assert.deepStrictEqual(state.activeSession?.messages, []);
  });

  it('chatView renders empty conversation instead of loading spinner when session is undefined and isLoadingSession is false', () => {
    const state: Partial<AppState> = {
      activeSessionId: 'sess-123',
      activeSession: undefined,
      isLoadingSession: false,
      sessions: [],
    };

    const html = renderChatView(state as AppState);
    assert.ok(!html.includes('Loading session...'), 'Should not render loading spinner when isLoadingSession is false');
    assert.ok(html.includes('Ask Agent to build or change code'), 'Should render empty prompt state');
  });

  it('isMixedContentBlocked returns true for http: urls when page is on https:', () => {
    (globalThis as any).window = {
      location: { protocol: 'https:', hostname: 'sysoce.github.io' },
    };

    assert.strictEqual(isMixedContentBlocked('http://192.168.1.111:4200'), true);
    assert.strictEqual(isMixedContentBlocked('http://localhost:4200'), true);
    assert.strictEqual(isMixedContentBlocked('https://tunnel.example.com'), false);
    assert.strictEqual(isMixedContentBlocked(''), false);
  });

  it('hasLiveServer returns false on https: static deployment when server url is http:', () => {
    (globalThis as any).window = {
      location: { protocol: 'https:', hostname: 'sysoce.github.io' },
      localStorage: {
        getItem: (k: string) => (k === 'agent_server_url' ? 'http://192.168.1.111:4200' : null),
        setItem: () => {},
        removeItem: () => {},
      },
    };

    assert.strictEqual(hasLiveServer(), false);
  });
});
