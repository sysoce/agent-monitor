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
