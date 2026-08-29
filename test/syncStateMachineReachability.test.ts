import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';

test('SyncStateMachine falls back to git-backup on SSE failure and triggers onLiveServerReachable on recovery', () => {
  let mode = 'live-sse';
  let status = 'connected';
  let recovered = false;

  const machine = new SyncStateMachine({
    onModeChange: (m) => { mode = m; },
    onStatusChange: (s) => { status = s; },
    onDataUpdate: () => {},
    onLiveServerReachable: () => { recovered = true; },
  });

  machine.setGistConfig({ token: 'tok_123', gistId: 'gist_123' });

  // Simulate SSE failure
  machine.handlePrimarySseFailure();
  assert.equal(mode, 'git-backup');
  assert.equal(status, 'syncing');

  // Trigger reachability callback
  machine.triggerLiveServerReachable();
  assert.equal(recovered, true);

  machine.stop();
});
