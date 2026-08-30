import type { AppState } from './types';
import type { TransportMode } from '../sync/types';
import { SyncStateMachine } from './syncStateMachine';
import { loadCachedGistConfig, applyGistSyncPayload } from './sessionPlanSync';
import { hasLiveServer, isStaticDeployment } from './authStore';
import { isAutoFallbackEnabled } from './fallbackSettings';

export function createAppSyncMachine(
  state: AppState,
  render: () => void,
  onLiveServerReachable?: () => void
): SyncStateMachine {
  const machine = new SyncStateMachine({
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
  const fallback = state.autoFallbackEnabled ?? isAutoFallbackEnabled();
  machine.setAutoFallback(fallback);
  return machine;
}

export function applyPersistedSyncMode(syncMachine: SyncStateMachine, startSse: () => void): void {
  const cfg = loadCachedGistConfig();
  if (cfg) syncMachine.setGistConfig(cfg);
  syncMachine.setAutoFallback(isAutoFallbackEnabled());
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) as TransportMode || undefined;
  let mode: TransportMode;
  if (saved) {
    mode = saved;
  } else if (!isStaticDeployment()) {
    mode = 'live-sse';
  } else {
    mode = hasLiveServer() ? 'live-sse' : (cfg?.gistId ? 'git-backup' : 'p2p');
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
  }
}

export function toggleSyncModeAction(
  state: AppState,
  syncMachine: SyncStateMachine,
  startSse: () => void,
  sseCleanup?: () => void
): void {
  const current = state.syncMode || 'p2p';
  const next: TransportMode = current === 'p2p' ? 'live-sse' : current === 'live-sse' ? 'git-backup' : 'p2p';
  setSyncModeAction(next, state, syncMachine, startSse, sseCleanup);
}

