import type { AppState } from './types';
import { SyncStateMachine } from './syncStateMachine';
import { loadCachedGistConfig, applyGistSyncPayload } from './sessionPlanSync';

export function createAppSyncMachine(state: AppState, render: () => void): SyncStateMachine {
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
  });
  return machine;
}

export function applyPersistedSyncMode(syncMachine: SyncStateMachine, startSse: () => void): void {
  const cfg = loadCachedGistConfig();
  if (cfg) syncMachine.setGistConfig(cfg);
  const isStatic = typeof window !== 'undefined' && (
    window.location.protocol === 'file:' ||
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.endsWith('.pages.dev')
  );
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('agent_sync_mode')) || undefined;
  const mode = saved || (isStatic && cfg ? 'git-backup' : 'live-sse');
  if (mode === 'git-backup' && cfg) {
    syncMachine.forceGitBackupMode();
  } else if (isStatic && cfg) {
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
  try { localStorage.setItem('agent_sync_mode', isGit ? 'live-sse' : 'git-backup'); } catch {}
  if (isGit) {
    syncMachine.restorePrimaryLive();
    startSse();
  } else {
    sseCleanup?.();
    const cfg = loadCachedGistConfig();
    if (cfg) syncMachine.setGistConfig(cfg);
    syncMachine.forceGitBackupMode();
  }
}
