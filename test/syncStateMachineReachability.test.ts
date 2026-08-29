import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';

test('SyncStateMachine triggers onLiveServerReachable on recovery in git-backup mode', () => {
  let mode = 'p2p';
  let status = 'connected';
  let recovered = false;

  const machine = new SyncStateMachine({
    onModeChange: (m) => { mode = m; },
    onStatusChange: (s) => { status = s; },
    onDataUpdate: () => {},
    onLiveServerReachable: () => { recovered = true; },
  });

  machine.setGistConfig({ token: 'tok_123', gistId: 'gist_123' });
  machine.forceGitBackupMode();
  assert.equal(mode, 'git-backup');
  assert.equal(status, 'connected');

  // Trigger reachability callback
  machine.triggerLiveServerReachable();
  assert.equal(recovered, true);

  machine.stop();
});
