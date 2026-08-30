import type { GistClient } from '../sync/gistClient';
import type { SyncStateMachineCallbacks } from './syncStateMachineTypes';
import { isNetworkOrOfflineError } from '../sync/gistHttp';

export async function executeGistPoll(
  gistClient: GistClient,
  lastEtag: string | undefined,
  callbacks: SyncStateMachineCallbacks,
  onRateLimitBlocked: (resetTime: number) => void
): Promise<{ etag?: string; handled: boolean }> {
  const rateInfo = gistClient.getRateLimitInfo?.();
  if (rateInfo) callbacks.onRateLimitChange?.(rateInfo);
  if (rateInfo?.isBlocked) {
    callbacks.onStatusChange('syncing');
    onRateLimitBlocked(rateInfo.resetTime);
    return { etag: lastEtag, handled: true };
  }
  try {
    const res = await gistClient.fetchSyncState(lastEtag);
    const updatedInfo = gistClient.getRateLimitInfo?.();
    if (updatedInfo) callbacks.onRateLimitChange?.(updatedInfo);
    if (res.notModified) {
      callbacks.onStatusChange('connected');
      callbacks.onError?.('');
    } else if (res.data) {
      callbacks.onStatusChange('connected');
      callbacks.onError?.('');
      callbacks.onDataUpdate(res.data);
    }
    return { etag: res.etag || lastEtag, handled: true };
  } catch (err: any) {
    callbacks.onStatusChange('disconnected');
    if (!isNetworkOrOfflineError(err)) {
      callbacks.onError?.(err?.message || 'Gist sync connection failed');
    }
    return { etag: lastEtag, handled: false };
  }
}

export class GitPollController {
  private pollTimer?: any;
  private lastEtag?: string;

  constructor(
    private readonly getGistClient: () => GistClient | undefined,
    private readonly getMode: () => any,
    private readonly getInterval: () => number,
    private readonly callbacks: SyncStateMachineCallbacks
  ) {}

  restart(): void {
    this.stop();
    void this.pollOnce();
    const timer = setInterval(() => { void this.pollOnce(); }, this.getInterval());
    if (typeof (timer as any)?.unref === 'function') (timer as any).unref();
    this.pollTimer = timer;
  }

  async pollOnce(): Promise<void> {
    const client = this.getGistClient();
    const mode = this.getMode();
    if (!client || (mode !== 'git-backup' && mode !== 'p2p')) return;
    const { etag } = await executeGistPoll(client, this.lastEtag, this.callbacks, (resetTime) => {
      const waitMs = Math.max(3000, resetTime - Date.now() + 1000);
      this.stop();
      this.pollTimer = setTimeout(() => this.restart(), waitMs);
    });
    if (etag) this.lastEtag = etag;
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }
}
