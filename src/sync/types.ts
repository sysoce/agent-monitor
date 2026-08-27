import type { SessionDetail, SessionSummary, PlanSummary } from '../server/types';

export interface SyncInboxMessage {
  id: string;
  sessionId: string;
  content: string;
  role?: 'user' | 'assistant' | 'system';
  model?: string;
  mode?: string;
  action?: string;
  commandId?: string;
  allowed?: boolean;
  attachments?: any[];
  timestamp: number;
}

export interface SyncOutboxState {
  sessionId: string;
  updatedAt: number;
  session?: SessionDetail;
  plans?: PlanSummary[];
}

export interface SyncGistPayload {
  inbox: SyncInboxMessage[];
  sessions: SessionSummary[];
  activeSession?: SyncOutboxState;
  sessionDetails?: Record<string, SessionDetail>;
  version: number;
  updatedAt: number;
  appVersion?: string;
}

export interface GistSyncConfig {
  token: string;
  gistId: string;
  password?: string;
}

export type TransportMode = 'live-sse' | 'git-backup' | 'offline';

export interface SyncStatusEvent {
  mode: TransportMode;
  isSyncing: boolean;
  lastSyncedAt?: number;
  error?: string;
}
