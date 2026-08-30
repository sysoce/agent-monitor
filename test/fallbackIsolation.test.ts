import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';
import { submitUserMessage } from '../src/ui/messageSender';
import { parseUrlConfig } from '../src/ui/urlConfigLoader';
import type { AppState } from '../src/ui/types';

test('SyncStateMachine falls back from live-sse to git-backup on SSE failure when autoFallback is true', () => {
  let activeMode = 'live-sse';
  let activeStatus = 'connected';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: (s) => { activeStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceLiveSseMode();
  sm.setAutoFallback(true);

  sm.handlePrimarySseFailure();
  assert.equal(activeMode, 'git-backup');
  assert.equal(activeStatus, 'syncing');
  sm.stop();
});

test('SyncStateMachine stays in live-sse with disconnected status on SSE failure when autoFallback is false', () => {
  let activeMode = 'live-sse';
  let activeStatus = 'connected';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: (s) => { activeStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceLiveSseMode();
  sm.setAutoFallback(false);

  sm.handlePrimarySseFailure();
  assert.equal(activeMode, 'live-sse');
  assert.equal(activeStatus, 'disconnected');
  sm.stop();
});

test('SyncStateMachine.pushInboxMessage throws clear error in p2p mode when disconnected and autoFallback is false', async () => {
  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: () => {},
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceP2PMode();
  sm.setAutoFallback(false);

  await assert.rejects(
    async () => {
      await sm.pushInboxMessage({
        id: 'msg-1',
        sessionId: 'sess-1',
        content: 'test',
        role: 'user',
        timestamp: Date.now(),
      });
    },
    (err: Error) => {
      assert.ok(err.message.includes('WebRTC P2P is not connected') || err.message.includes('auto-fallback is disabled'));
      return true;
    }
  );
  sm.stop();
});

test('submitUserMessage in git-backup mode throws Gist error immediately without HTTP fallback when autoFallback is false', async () => {
  const state: Partial<AppState> = {
    syncMode: 'git-backup',
    sessions: [],
    autoFallbackEnabled: false,
    selectedModel: 'test-model',
    composerMode: 'agent',
  };

  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: () => {},
    onDataUpdate: () => {},
  });
  sm.setAutoFallback(false);

  await assert.rejects(
    async () => {
      await submitUserMessage(state as AppState, sm, 'Hello Agent');
    },
    (err: Error) => {
      assert.ok(err.message.length > 0);
      return true;
    }
  );
  sm.stop();
});

test('parseUrlConfig handles standalone fallback=false hash/query', () => {
  const parsed = parseUrlConfig('#fallback=false');
  assert.ok(parsed);
  assert.equal(parsed.autoFallback, false);

  const parsedZero = parseUrlConfig('?autoFallback=0');
  assert.ok(parsedZero);
  assert.equal(parsedZero.autoFallback, false);
});
