import type { GistSyncConfig, SyncGistPayload, SyncInboxMessage, TransportMode } from '../sync/types';
import { GistClient } from '../sync/gistClient';
import type { SyncStatus } from './types';

export interface SyncStateMachineCallbacks {
  onModeChange: (mode: TransportMode) => void;
  onStatusChange: (status: SyncStatus) => void;
  onDataUpdate: (payload: SyncGistPayload) => void;
}

export class SyncStateMachine {
  private mode: TransportMode = 'live-sse';
  private gistConfig?: GistSyncConfig;
  private gistClient?: GistClient;
  private isAwaitingResponse = false;
  private pollTimer?: any;
  private lastEtag?: string;

  constructor(private readonly callbacks: SyncStateMachineCallbacks) {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.mode === 'git-backup') this.restartGitPolling();
      });
    }
  }

  getMode(): TransportMode {
    return this.mode;
  }

  getPollInterval(): number {
    if (typeof document !== 'undefined' && document.hidden) {
      return this.isAwaitingResponse ? 10000 : 30000;
    }
    return this.isAwaitingResponse ? 2500 : 15000;
  }

  setAwaitingResponse(awaiting: boolean): void {
    this.isAwaitingResponse = awaiting;
    if (this.mode === 'git-backup') {
      this.restartGitPolling();
    }
  }

  setGistConfig(config?: GistSyncConfig): void {
    this.gistConfig = config;
    this.gistClient = config ? new GistClient(config) : undefined;
  }

  forceGitBackupMode(): void {
    if (this.gistConfig) {
      this.mode = 'git-backup';
      this.callbacks.onModeChange('git-backup');
      this.callbacks.onStatusChange('connected');
      this.restartGitPolling();
    }
  }

  handlePrimarySseFailure(): void {
    if (this.gistConfig) {
      this.mode = 'git-backup';
      this.callbacks.onModeChange('git-backup');
      this.callbacks.onStatusChange('syncing');
      this.restartGitPolling();
    } else {
      this.mode = 'offline';
      this.callbacks.onModeChange('offline');
      this.callbacks.onStatusChange('disconnected');
    }
  }

  restorePrimaryLive(): void {
    this.stopGitPolling();
    this.mode = 'live-sse';
    this.callbacks.onModeChange('live-sse');
    this.callbacks.onStatusChange('connected');
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
    const timer = setInterval(() => {
      void this.pollOnce();
    }, this.getPollInterval());
    if (typeof (timer as any)?.unref === 'function') {
      (timer as any).unref();
    }
    this.pollTimer = timer;
  }

  async pollOnce(): Promise<void> {
    if (!this.gistClient || this.mode !== 'git-backup') return;
    if (typeof this.gistClient.isBlockedByRateLimit === 'function' && this.gistClient.isBlockedByRateLimit()) {
      this.callbacks.onStatusChange('syncing');
      return;
    }
    try {
      const res = await this.gistClient.fetchSyncState(this.lastEtag);
      if (res.etag) this.lastEtag = res.etag;
      if (res.notModified) {
        this.callbacks.onStatusChange('connected');
      } else if (res.data) {
        this.callbacks.onStatusChange('connected');
        this.callbacks.onDataUpdate(res.data);
      }
    } catch {
      this.callbacks.onStatusChange('disconnected');
    }
  }

  stopGitPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  stop(): void {
    this.stopGitPolling();
  }
}
