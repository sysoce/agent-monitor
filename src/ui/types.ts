import type { SessionSummary, SessionDetail, PlanSummary, PlanDetail, ModelOption, ModelGroup } from '../server/types';
export type { SessionSummary, SessionDetail, PlanSummary, PlanDetail, ModelOption, ModelGroup };
import type { AttachmentItem, MentionSuggestionItem } from '../types';
export type { AttachmentItem, MentionSuggestionItem };
import type { ClientPresence } from '../sync/types';
import type { NetworkAddressInfo } from '../server/networkAddress';

export type ActiveTab = 'sidebar' | 'chat' | 'plans';

export type SyncStatus = 'connected' | 'syncing' | 'disconnected' | 'connecting';

export interface QueuedMessage {
  id: string;
  sessionId?: string;
  text: string;
  attachments?: AttachmentItem[];
  mode?: 'agent' | 'plan' | 'ask';
  createdAt: number;
}

export interface AppState {
  activeTab: ActiveTab;
  sessions: SessionSummary[];
  activeSessionId?: string;
  activeSession?: SessionDetail;
  plans: PlanSummary[];
  activePlanName?: string;
  activePlan?: PlanDetail;
  syncStatus: SyncStatus;
  searchQuery: string;
  composerMode: 'agent' | 'plan' | 'ask';
  selectedModel: string;
  availableModels: ModelOption[];
  modelGroups?: ModelGroup[];
  modelSearchQuery?: string;
  isModelPickerOpen?: boolean;
  isSending: boolean;
  isAwaitingResponse?: boolean;
  awaitingSessionId?: string;
  awaitingMessageTimestamp?: number;
  isAuthenticated: boolean;
  authError?: string;
  syncMode?: 'live-sse' | 'git-backup' | 'p2p' | 'offline';
  composerDraft?: string;
  attachments?: AttachmentItem[];
  mentionSuggestions?: MentionSuggestionItem[];
  activeMentionIndex?: number;
  isMentionOpen?: boolean;
  cachedSessionDetails?: Record<string, SessionDetail>;
  isLoadingSession?: boolean;
  isLoadingSessions?: boolean;
  expandedSections?: Record<string, boolean>;
  showAllItems?: Record<string, boolean>;
  lastAbortedAt?: number;
  lastAbortedSessionId?: string;
  errorMessage?: string;
  autoUpdateEnabled?: boolean;
  autoFallbackEnabled?: boolean;
  availableUpdateVersion?: string;
  updateDownloaded?: boolean;
  hostPresence?: ClientPresence;
  lastSyncedAt?: number;
  rateLimitRemaining?: number;
  queuedMessages?: QueuedMessage[];
  isQueuedMessagesCollapsed?: boolean;
  isSettingsModalOpen?: boolean;
  isQrModalOpen?: boolean;
  qrModalTarget?: 'gh_pages' | 'lan' | 'download';
  qrCopyFeedback?: 'link' | 'hash';
  settingsCopyFeedback?: string;
  selectedLanIp?: string;
  defaultLanUrl?: string;
  customServerIp?: string;
  tailscaleUrl?: string;
  customConnections?: string[];
  serverSetupInfo?: {
    githubPagesUrl?: string;
    lanUrl?: string;
    setupPayload?: string;
    hasSyncConfig?: boolean;
    gistId?: string;
    version?: string;
    networks?: NetworkAddressInfo[];
  };
}

