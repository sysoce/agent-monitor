import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';

test('SyncStateMachine silently handles network offline errors during polling without raising error alerts', async () => {
  let latestError = '';
  let latestStatus = '';

  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: (status) => { latestStatus = status; },
    onDataUpdate: () => {},
    onError: (err) => { latestError = err || ''; },
  });

  const fakeGistClient = {
    fetchSyncState: async () => {
      throw new TypeError('Failed to fetch');
    },
    getRateLimitInfo: () => ({ remaining: 5000, limit: 5000, resetTime: 0, isBlocked: false }),
  };

  (sm as any).gistClient = fakeGistClient;
  (sm as any).mode = 'git-backup';

  await sm.pollOnce();

  assert.equal(latestStatus, 'disconnected');
  assert.equal(latestError, '', 'Network offline error should not trigger visible error banner');
  sm.stop();
});

test('SyncStateMachine reports permanent credential errors to onError', async () => {
  let latestError = '';
  let latestStatus = '';

  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: (status) => { latestStatus = status; },
    onDataUpdate: () => {},
    onError: (err) => { latestError = err || ''; },
  });

  const fakeGistClient = {
    fetchSyncState: async () => {
      throw new Error('GitHub Gist API error: 401 Bad credentials');
    },
    getRateLimitInfo: () => ({ remaining: 5000, limit: 5000, resetTime: 0, isBlocked: false }),
  };

  (sm as any).gistClient = fakeGistClient;
  (sm as any).mode = 'git-backup';

  await sm.pollOnce();

  assert.equal(latestStatus, 'disconnected');
  assert.ok(latestError.includes('401 Bad credentials'), '401 credential errors must be reported');
  sm.stop();
});
