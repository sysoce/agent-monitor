import type { TransportAdapter, TransportMessage, TransportStatus } from './types';
import { GistClient } from '../sync/gistClient';
import type { GistSyncConfig, SyncGistPayload } from '../sync/types';
import { computeClientPollInterval } from '../sync/syncPollingPolicy';

export interface GistTransportOptions {
  config: GistSyncConfig;
  gistClient?: GistClient;
  onSyncState?: (payload: SyncGistPayload) => void;
}

export class GistTransportAdapter implements TransportAdapter {
  public readonly mode = 'git-backup';
  public readonly priority = 3;
  public readonly name = 'GitHub Gist Sync';

  private status: TransportStatus = 'disconnected';
  private readonly gistClient: GistClient;
  private readonly onSyncState?: (payload: SyncGistPayload) => void;
  private timer: NodeJS.Timeout | null = null;
  private etag?: string;
  private isAwaitingResponse = false;
  private awaitingStartedAt?: number;
  private readonly messageListeners = new Set<(msg: TransportMessage) => void>();
  private readonly statusListeners = new Set<(status: TransportStatus) => void>();

  constructor(options: GistTransportOptions) {
    this.gistClient = options.gistClient || new GistClient(options.config);
    this.onSyncState = options.onSyncState;
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  async connect(): Promise<boolean> {
    this.disconnect();
    this.setStatus('connecting');
    const ok = await this.pollOnce();
    if (ok) {
      this.setStatus('connected');
      this.scheduleNextPoll();
      return true;
    }
    this.setStatus('failed');
    return false;
  }

  disconnect(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setStatus('disconnected');
  }

  async send(message: TransportMessage): Promise<boolean> {
    this.isAwaitingResponse = true;
    this.awaitingStartedAt = Date.now();
    try {
      await this.gistClient.pushInboxMessage({
        id: message.id,
        sessionId: message.sessionId || '',
        content: message.payload?.content || '',
        role: message.payload?.role || 'user',
        model: message.payload?.model,
        mode: message.payload?.mode,
        attachments: message.payload?.attachments,
        timestamp: message.timestamp || Date.now(),
      });
      await this.pollOnce();
      return true;
    } catch {
      return false;
    }
  }

  onMessage(listener: (msg: TransportMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: (status: TransportStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private async pollOnce(): Promise<boolean> {
    try {
      const res = await this.gistClient.fetchSyncState(this.etag);
      if (res.etag) this.etag = res.etag;
      if (res.data) {
        this.onSyncState?.(res.data);
      }
      return true;
    } catch {
      return false;
    }
  }

  private scheduleNextPoll(): void {
    if (this.status !== 'connected') return;
    const rateInfo = this.gistClient.getRateLimitInfo();
    const isHidden = typeof document !== 'undefined' && Boolean(document.hidden);
    const delay = computeClientPollInterval({
      isAwaitingResponse: this.isAwaitingResponse,
      awaitingStartedAt: this.awaitingStartedAt,
      isHidden,
      remainingQuota: rateInfo.remaining,
    });
    this.timer = setTimeout(async () => {
      await this.pollOnce();
      this.scheduleNextPoll();
    }, delay);
    this.timer.unref?.();
  }

  private setStatus(s: TransportStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const listener of this.statusListeners) {
      listener(s);
    }
  }
}
