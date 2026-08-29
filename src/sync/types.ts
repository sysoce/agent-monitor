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

export interface ClientPresence {
  clientId: string;
  clientName: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  lastActiveAt: number;
  lastSyncedAt: number;
  lastHandledMsgId?: string;
  appVersion?: string;
}

export interface SyncGistPayload {
  inbox: SyncInboxMessage[];
  sessions: SessionSummary[];
  activeSession?: SyncOutboxState;
  sessionDetails?: Record<string, SessionDetail>;
  clients?: Record<string, ClientPresence>;
  version: number;
  updatedAt: number;
  appVersion?: string;
}

export interface GistSyncConfig {
  token: string;
  gistId: string;
  password?: string;
  serverUrl?: string;
}

export type TransportMode = 'live-sse' | 'git-backup' | 'p2p' | 'offline';

export interface SyncStatusEvent {
  mode: TransportMode;
  isSyncing: boolean;
  lastSyncedAt?: number;
  hostPresence?: ClientPresence;
  rateLimitRemaining?: number;
  error?: string;
}
