import type { AppState } from './types';
import type { SyncStateMachine } from './syncStateMachine';
import { loadCachedGistConfig } from './sessionPlanSync';

export function toggleSyncModeAction(state: AppState, syncMachine: SyncStateMachine, startSse: () => void, sseCleanup?: () => void): void {
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
