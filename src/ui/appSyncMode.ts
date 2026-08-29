import type { AppState } from './types';
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
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) || undefined;
  const mode = saved || (!liveServer && cfg ? 'git-backup' : 'live-sse');

  if (mode === 'git-backup' || !liveServer) {
    syncMachine.forceGitBackupMode();
  } else {
    startSse();
  }
}

export function toggleSyncModeAction(
  state: AppState,
  syncMachine: SyncStateMachine,
  startSse: () => void,
  sseCleanup?: () => void
): void {
  const isGit = state.syncMode === 'git-backup';
  if (isGit) {
    if (!hasLiveServer()) return;
    if (typeof localStorage !== 'undefined') localStorage.setItem('agent_sync_mode', 'live-sse');
    syncMachine.stop();
    startSse();
  } else {
    if (typeof localStorage !== 'undefined') localStorage.setItem('agent_sync_mode', 'git-backup');
    sseCleanup?.();
    syncMachine.forceGitBackupMode();
  }
}
