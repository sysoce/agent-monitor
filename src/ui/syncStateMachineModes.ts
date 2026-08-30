import type { GistSyncConfig, TransportMode } from '../sync/types';
import type { SyncStateMachineCallbacks } from './syncStateMachineTypes';
import { startP2PCoordination } from './syncStateMachineP2P';
import { getServerBaseUrl } from './authStore';
import type { P2PClientCoordinator } from '../p2p/p2pClientCoordinator';
import type { LiveReachabilityProbe } from './liveReachabilityProbe';
import type { GitPollController } from './syncStateMachinePoll';

export interface ModeContext {
  mode: TransportMode;
  gistConfig?: GistSyncConfig;
  p2pCoord: P2PClientCoordinator | null;
  autoFallback: boolean;
  reachabilityProbe: LiveReachabilityProbe;
  pollController: GitPollController;
  callbacks: SyncStateMachineCallbacks;
}

export function switchP2PMode(ctx: ModeContext): P2PClientCoordinator | null {
  ctx.pollController.stop();
  ctx.reachabilityProbe.stop();
  ctx.mode = 'p2p';
  ctx.callbacks.onModeChange('p2p');
  ctx.callbacks.onError?.('');
  ctx.p2pCoord?.stop();
  const coord = startP2PCoordination(ctx.callbacks, ctx.gistConfig, getServerBaseUrl());
  if (!coord) ctx.callbacks.onStatusChange('connected');
  return coord;
}

export function switchLiveSseMode(ctx: ModeContext): void {
  ctx.pollController.stop();
  ctx.reachabilityProbe.stop();
  ctx.p2pCoord?.stop();
  ctx.p2pCoord = null;
  ctx.mode = 'live-sse';
  ctx.callbacks.onModeChange('live-sse');
  ctx.callbacks.onStatusChange('connecting');
  ctx.callbacks.onError?.('');
}

export function switchGitBackupMode(ctx: ModeContext): void {
  ctx.p2pCoord?.stop();
  ctx.p2pCoord = null;
  if (ctx.gistConfig) {
    ctx.mode = 'git-backup';
    ctx.callbacks.onModeChange('git-backup');
    ctx.callbacks.onStatusChange('connected');
    ctx.callbacks.onError?.('');
    if (ctx.autoFallback) ctx.reachabilityProbe.start();
    ctx.pollController.restart();
  } else {
    ctx.callbacks.onError?.('Gist configuration missing. Scan pairing QR code or set token & Gist ID in Settings.');
  }
}

export function handleSseFailure(ctx: ModeContext): void {
  if (!ctx.autoFallback) {
    ctx.callbacks.onStatusChange('disconnected');
    return;
  }
  if (ctx.gistConfig) {
    ctx.mode = 'git-backup';
    ctx.callbacks.onModeChange('git-backup');
    ctx.callbacks.onStatusChange('syncing');
    ctx.reachabilityProbe.start();
    ctx.pollController.restart();
  } else {
    ctx.mode = 'offline';
    ctx.callbacks.onModeChange('offline');
    ctx.callbacks.onStatusChange('disconnected');
  }
}

export function restoreLive(ctx: ModeContext): void {
  ctx.pollController.stop();
  ctx.reachabilityProbe.stop();
  ctx.p2pCoord?.stop();
  ctx.p2pCoord = null;
  ctx.mode = 'live-sse';
  ctx.callbacks.onModeChange('live-sse');
  ctx.callbacks.onStatusChange('connected');
  ctx.callbacks.onError?.('');
}
