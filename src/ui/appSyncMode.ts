import type { AppState } from './types';
import type { TransportMode } from '../sync/types';
import { SyncStateMachine } from './syncStateMachine';
import { loadCachedGistConfig, applyGistSyncPayload } from './sessionPlanSync';
import { hasLiveServer } from './authStore';

export function createAppSyncMachine(
  state: AppState,
  render: () => void,
  onLiveServerReachable?: () => void
): SyncStateMachine {
  let machine: SyncStateMachine;
  machine = new SyncStateMachine({
    onModeChange: (m) => {
      if (state.syncMode !== m) {
        state.syncMode = m;
        render();
      }
    },
    onStatusChange: (s) => {
      if (state.syncStatus !== s) {
        state.syncStatus = s;
        render();
      }
    },
    onDataUpdate: (p) => {
      if (applyGistSyncPayload(state, p)) machine.setAwaitingResponse(false);
      render();
    },
    onRateLimitChange: (info) => {
      if (state.rateLimitRemaining !== info.remaining) {
        state.rateLimitRemaining = info.remaining;
        render();
      }
    },
    onError: (err) => {
      const msg = err || undefined;
      if (state.errorMessage !== msg) {
        state.errorMessage = msg;
        render();
      }
    },
    onLiveServerReachable: () => {
      onLiveServerReachable?.();
    },
  });
  return machine;
}

export function applyPersistedSyncMode(syncMachine: SyncStateMachine, startSse: () => void): void {
  const cfg = loadCachedGistConfig();
  if (cfg) syncMachine.setGistConfig(cfg);
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) as TransportMode || undefined;
  let mode = saved;
  if (!mode) {
    if (cfg?.gistId && !hasLiveServer()) {
      mode = 'git-backup';
    } else {
      mode = 'p2p';
    }
  }

  if (mode === 'p2p') {
    syncMachine.forceP2PMode();
  } else if (mode === 'git-backup') {
    syncMachine.forceGitBackupMode();
  } else if (mode === 'live-sse') {
    syncMachine.forceLiveSseMode();
    startSse();
  } else {
    syncMachine.forceP2PMode();
  }
}

export function setSyncModeAction(
  targetMode: TransportMode,
  state: AppState,
  syncMachine: SyncStateMachine,
  startSse: () => void,
  sseCleanup?: () => void
): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem('agent_sync_mode', targetMode);
  state.syncMode = targetMode;
  if (targetMode === 'live-sse') {
    syncMachine.forceLiveSseMode();
    startSse();
  } else if (targetMode === 'git-backup') {
    sseCleanup?.();
    syncMachine.forceGitBackupMode();
  } else if (targetMode === 'p2p') {
    sseCleanup?.();
    syncMachine.forceP2PMode();
    state.syncStatus = 'connected';
  }
}

export function toggleSyncModeAction(
  state: AppState,
  syncMachine: SyncStateMachine,
  startSse: () => void,
  sseCleanup?: () => void
): void {
  const current = state.syncMode || 'p2p';
  let next: TransportMode = 'p2p';
  if (current === 'p2p') {
    next = 'live-sse';
  } else if (current === 'live-sse') {
    next = 'git-backup';
  } else {
    next = 'p2p';
  }
  setSyncModeAction(next, state, syncMachine, startSse, sseCleanup);
}
