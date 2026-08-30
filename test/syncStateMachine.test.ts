import test from 'node:test';
import * as assert from 'node:assert/strict';
import { SyncStateMachine } from '../src/ui/syncStateMachine';

test('SyncStateMachine initializes in p2p default mode and transitions on status updates', () => {
  const sm = new SyncStateMachine({
    onModeChange: () => {},
    onStatusChange: () => {},
    onDataUpdate: () => {},
  });

  assert.equal(sm.getMode(), 'p2p');
  assert.equal(sm.getPollInterval(), 15000);

  // Set active turn (waiting for agent response)
  sm.setAwaitingResponse(true);
  assert.equal(sm.getPollInterval(), 6000, 'Should use 6-second active poll during turn');

  sm.setAwaitingResponse(false);
  assert.equal(sm.getPollInterval(), 15000, 'Should return to gentle interval when idle');
});

test('SyncStateMachine preserves live-sse mode on SSE drop when autoFallback is disabled and falls back when enabled', () => {
  let activeMode = '';
  let activeStatus = '';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: (s) => { activeStatus = s; },
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceLiveSseMode();
  sm.setAutoFallback(false);
  assert.equal(activeMode, 'live-sse');

  // When autoFallback is off, SSE failure preserves live-sse mode and marks status disconnected
  sm.handlePrimarySseFailure();
  assert.equal(sm.getMode(), 'live-sse');
  assert.equal(activeStatus, 'disconnected');

  // When autoFallback is on, SSE failure falls back to git-backup
  sm.setAutoFallback(true);
  sm.handlePrimarySseFailure();
  assert.equal(sm.getMode(), 'git-backup');
  assert.equal(activeMode, 'git-backup');
  assert.equal(activeStatus, 'syncing');
  sm.stop();
});

test('SyncStateMachine allows explicit switching across p2p, git-backup, and live-sse', () => {
  let activeMode = '';
  const sm = new SyncStateMachine({
    onModeChange: (m) => { activeMode = m; },
    onStatusChange: () => {},
    onDataUpdate: () => {},
  });

  sm.setGistConfig({ token: 'test-pat', gistId: 'gist-123' });
  sm.forceGitBackupMode();

  assert.equal(activeMode, 'git-backup');
  assert.equal(sm.getMode(), 'git-backup');

  sm.forceLiveSseMode();
  assert.equal(activeMode, 'live-sse');
  assert.equal(sm.getMode(), 'live-sse');

  sm.forceP2PMode();
  assert.equal(activeMode, 'p2p');
  assert.equal(sm.getMode(), 'p2p');
  sm.stop();
});
