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
  const liveServer = hasLiveServer();
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) as TransportMode || undefined;
  const mode = saved || (!liveServer && cfg ? 'git-backup' : 'live-sse');

  if (mode === 'git-backup' || !liveServer) {
    syncMachine.forceGitBackupMode();
  } else {
    startSse();
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
  if (targetMode === 'live-sse') {
    syncMachine.stop();
    startSse();
  } else if (targetMode === 'git-backup') {
    sseCleanup?.();
    syncMachine.forceGitBackupMode();
  } else if (targetMode === 'p2p') {
    sseCleanup?.();
    syncMachine.stop();
    state.syncMode = 'p2p';
    state.syncStatus = 'connected';
  }
}

export function toggleSyncModeAction(
  state: AppState,
  syncMachine: SyncStateMachine,
  startSse: () => void,
  sseCleanup?: () => void
): void {
  const current = state.syncMode || 'live-sse';
  let next: TransportMode = 'live-sse';
  if (current === 'live-sse') {
    next = loadCachedGistConfig() ? 'git-backup' : 'p2p';
  } else if (current === 'git-backup') {
    next = 'p2p';
  } else {
    next = hasLiveServer() ? 'live-sse' : 'git-backup';
  }
  setSyncModeAction(next, state, syncMachine, startSse, sseCleanup);
}
