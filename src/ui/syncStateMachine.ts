import type { GistSyncConfig, SyncGistPayload, SyncInboxMessage, TransportMode } from '../sync/types';
import { GistClient } from '../sync/gistClient';
import { LiveReachabilityProbe } from './liveReachabilityProbe';
import { computeClientPollInterval } from '../sync/syncPollingPolicy';
import type { SyncStateMachineCallbacks, RateLimitInfo } from './syncStateMachineTypes';

export type { SyncStateMachineCallbacks, RateLimitInfo };

export class SyncStateMachine {
  private mode: TransportMode = 'p2p';
  private gistConfig?: GistSyncConfig;
  private gistClient?: GistClient;
  private isAwaitingResponse = false;
  private awaitingStartedAt?: number;
  private pollTimer?: any;
  private lastEtag?: string;
  private reachabilityProbe: LiveReachabilityProbe;

  constructor(private readonly callbacks: SyncStateMachineCallbacks) {
    this.reachabilityProbe = new LiveReachabilityProbe({ onReachable: () => this.triggerLiveServerReachable() });
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          if (this.mode === 'git-backup') this.restartGitPolling();
          void this.reachabilityProbe.checkReachability();
        }
      });
    }
  }

  getMode(): TransportMode { return this.mode; }

  getPollInterval(): number {
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden);
    const rateInfo = this.gistClient?.getRateLimitInfo?.();
    return computeClientPollInterval({ isAwaitingResponse: this.isAwaitingResponse, awaitingStartedAt: this.awaitingStartedAt, isHidden, remainingQuota: rateInfo?.remaining });
  }

  setAwaitingResponse(awaiting: boolean): void {
    this.isAwaitingResponse = awaiting;
    this.awaitingStartedAt = awaiting ? Date.now() : undefined;
    if (this.mode === 'git-backup') this.restartGitPolling();
  }

  setGistConfig(config?: GistSyncConfig): void {
    this.gistConfig = config;
    this.gistClient = config ? new GistClient(config) : undefined;
  }

  forceP2PMode(): void {
    this.stopGitPolling();
    this.reachabilityProbe.stop();
    this.mode = 'p2p';
    this.callbacks.onModeChange('p2p');
    this.callbacks.onStatusChange('connected');
    this.callbacks.onError?.('');
  }

  forceLiveSseMode(): void {
    this.stopGitPolling();
    this.reachabilityProbe.stop();
    this.mode = 'live-sse';
    this.callbacks.onModeChange('live-sse');
    this.callbacks.onStatusChange('connecting');
    this.callbacks.onError?.('');
  }

  forceGitBackupMode(): void {
    if (this.gistConfig) {
      this.mode = 'git-backup';
      this.callbacks.onModeChange('git-backup');
      this.callbacks.onStatusChange('connected');
      this.callbacks.onError?.('');
      this.reachabilityProbe.start();
      this.restartGitPolling();
    } else {
      this.callbacks.onError?.('Gist configuration missing. Scan pairing QR code or set token & Gist ID in Settings.');
    }
  }

  handlePrimarySseFailure(): void {
    if (this.mode === 'live-sse') {
      this.callbacks.onStatusChange('disconnected');
      return;
    }
    if (this.mode === 'p2p') return;
    if (this.gistConfig) {
      this.mode = 'git-backup';
      this.callbacks.onModeChange('git-backup');
      this.callbacks.onStatusChange('syncing');
      this.reachabilityProbe.start();
      this.restartGitPolling();
    } else {
      this.mode = 'offline';
      this.callbacks.onModeChange('offline');
      this.callbacks.onStatusChange('disconnected');
    }
  }

  restorePrimaryLive(): void {
    this.stopGitPolling();
    this.reachabilityProbe.stop();
    this.mode = 'live-sse';
    this.callbacks.onModeChange('live-sse');
    this.callbacks.onStatusChange('connected');
    this.callbacks.onError?.('');
  }

  triggerLiveServerReachable(): void {
    this.reachabilityProbe.stop();
    this.callbacks.onLiveServerReachable?.();
  }

  async pushInboxMessage(msg: SyncInboxMessage): Promise<void> {
    if (this.gistClient && this.mode === 'git-backup') {
      await this.gistClient.pushInboxMessage(msg);
      await this.pollOnce();
    } else {
      throw new Error('Gist client is not configured or transport mode is not git-backup');
    }
  }

  private restartGitPolling(): void {
    this.stopGitPolling();
    void this.pollOnce();
    const timer = setInterval(() => { void this.pollOnce(); }, this.getPollInterval());
    if (typeof (timer as any)?.unref === 'function') (timer as any).unref();
    this.pollTimer = timer;
  }

  async pollOnce(): Promise<void> {
    if (!this.gistClient || this.mode !== 'git-backup') return;
    const rateInfo = this.gistClient.getRateLimitInfo?.();
    if (rateInfo) this.callbacks.onRateLimitChange?.(rateInfo);
    if (rateInfo?.isBlocked) {
      this.callbacks.onStatusChange('syncing');
      const waitMs = Math.max(3000, rateInfo.resetTime - Date.now() + 1000);
      this.stopGitPolling();
      this.pollTimer = setTimeout(() => this.restartGitPolling(), waitMs);
      return;
    }
    try {
      const res = await this.gistClient.fetchSyncState(this.lastEtag);
      const updatedInfo = this.gistClient.getRateLimitInfo?.();
      if (updatedInfo) this.callbacks.onRateLimitChange?.(updatedInfo);
      if (res.etag) this.lastEtag = res.etag;
      if (res.notModified) {
        this.callbacks.onStatusChange('connected');
        this.callbacks.onError?.('');
      } else if (res.data) {
        this.callbacks.onStatusChange('connected');
        this.callbacks.onError?.('');
        this.callbacks.onDataUpdate(res.data);
      }
    } catch (err: any) {
      this.callbacks.onStatusChange('disconnected');
      this.callbacks.onError?.(err?.message || 'Gist sync connection failed');
    }
  }

  stopGitPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); clearTimeout(this.pollTimer); this.pollTimer = undefined; }
  }

  stop(): void {
    this.reachabilityProbe.stop();
    this.stopGitPolling();
  }
}
