import type { GistSyncConfig, SyncGistPayload, SyncInboxMessage, TransportMode } from '../sync/types';
import type { SyncStatus } from './types';

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: number;
  isBlocked: boolean;
}

export interface SyncStateMachineCallbacks {
  onModeChange: (mode: TransportMode) => void;
  onStatusChange: (status: SyncStatus) => void;
  onDataUpdate: (payload: SyncGistPayload) => void;
  onRateLimitChange?: (info: RateLimitInfo) => void;
  onError?: (error?: string) => void;
  onLiveServerReachable?: () => void;
}
