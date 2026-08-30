import type { GistSyncConfig, SyncInboxMessage, TransportMode } from '../sync/types';
import { GistClient } from '../sync/gistClient';
import { LiveReachabilityProbe } from './liveReachabilityProbe';
import { computeClientPollInterval } from '../sync/syncPollingPolicy';
import type { SyncStateMachineCallbacks, RateLimitInfo } from './syncStateMachineTypes';
import { GitPollController } from './syncStateMachinePoll';
import { dispatchInboxMessage } from './syncStateMachineDispatch';
import { switchP2PMode, switchLiveSseMode, switchGitBackupMode, handleSseFailure, restoreLive } from './syncStateMachineModes';
import type { P2PClientCoordinator } from '../p2p/p2pClientCoordinator';

export type { SyncStateMachineCallbacks, RateLimitInfo };

export class SyncStateMachine {
  private mode: TransportMode = 'p2p';
  private gistConfig?: GistSyncConfig;
  private gistClient?: GistClient;
  private p2pCoord: P2PClientCoordinator | null = null;
  private isAwaitingResponse = false;
  private awaitingStartedAt?: number;
  private autoFallback = true;
  private reachabilityProbe: LiveReachabilityProbe;
  private pollController: GitPollController;

  constructor(private readonly callbacks: SyncStateMachineCallbacks) {
    this.reachabilityProbe = new LiveReachabilityProbe({ onReachable: () => this.triggerLiveServerReachable() });
    this.pollController = new GitPollController(
      () => this.gistClient,
      () => this.mode,
      () => this.getPollInterval(),
      this.callbacks
    );
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          if (this.mode === 'git-backup') this.pollController.restart();
          if (this.autoFallback) void this.reachabilityProbe.checkReachability();
        }
      });
    }
  }

  private getModeCtx() {
    return {
      mode: this.mode,
      gistConfig: this.gistConfig,
      p2pCoord: this.p2pCoord,
      autoFallback: this.autoFallback,
      reachabilityProbe: this.reachabilityProbe,
      pollController: this.pollController,
      callbacks: this.callbacks,
    };
  }

  setAutoFallback(enabled: boolean): void {
    this.autoFallback = enabled;
    if (!enabled) this.reachabilityProbe.stop();
  }

  getAutoFallback(): boolean { return this.autoFallback; }
  getMode(): TransportMode { return this.mode; }

  getPollInterval(): number {
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden);
    const rateInfo = this.gistClient?.getRateLimitInfo?.();
    return computeClientPollInterval({
      isAwaitingResponse: this.isAwaitingResponse,
      awaitingStartedAt: this.awaitingStartedAt,
      isHidden,
      remainingQuota: rateInfo?.remaining,
    });
  }

  setAwaitingResponse(awaiting: boolean): void {
    this.isAwaitingResponse = awaiting;
    this.awaitingStartedAt = awaiting ? Date.now() : undefined;
    if (this.mode === 'git-backup') this.pollController.restart();
  }

  setGistConfig(config?: GistSyncConfig): void {
    this.gistConfig = config;
    this.gistClient = config ? new GistClient(config) : undefined;
  }

  forceP2PMode(): void {
    const ctx = this.getModeCtx();
    this.p2pCoord = switchP2PMode(ctx);
    this.mode = ctx.mode;
  }

  forceLiveSseMode(): void {
    const ctx = this.getModeCtx();
    switchLiveSseMode(ctx);
    this.mode = ctx.mode;
    this.p2pCoord = null;
  }

  forceGitBackupMode(): void {
    const ctx = this.getModeCtx();
    switchGitBackupMode(ctx);
    this.mode = ctx.mode;
    this.p2pCoord = null;
  }

  handlePrimarySseFailure(): void {
    const ctx = this.getModeCtx();
    handleSseFailure(ctx);
    this.mode = ctx.mode;
  }

  restorePrimaryLive(): void {
    const ctx = this.getModeCtx();
    restoreLive(ctx);
    this.mode = ctx.mode;
    this.p2pCoord = null;
  }

  triggerLiveServerReachable(): void {
    this.reachabilityProbe.stop();
    if (!this.autoFallback) return;
    this.callbacks.onLiveServerReachable?.();
  }

  async pushInboxMessage(msg: SyncInboxMessage): Promise<void> {
    return dispatchInboxMessage(
      {
        p2pCoord: this.p2pCoord,
        gistClient: this.gistClient,
        mode: this.mode,
        autoFallback: this.autoFallback,
        pollOnce: () => this.pollController.pollOnce(),
      },
      msg
    );
  }

  async pollOnce(): Promise<void> { await this.pollController.pollOnce(); }
  stopGitPolling(): void { this.pollController.stop(); }

  stop(): void {
    this.reachabilityProbe.stop();
    this.p2pCoord?.stop();
    this.p2pCoord = null;
    this.pollController.stop();
  }
}
