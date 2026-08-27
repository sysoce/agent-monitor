import type { SessionSummary, SessionDetail, PlanSummary, PlanDetail, ModelOption, ModelGroup } from '../server/types';
import type { AttachmentItem } from '../types';
import type { MentionSuggestionItem } from '../types';

export type ActiveTab = 'sidebar' | 'chat' | 'plans';

export type SyncStatus = 'connected' | 'syncing' | 'disconnected' | 'connecting';

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
  isAuthenticated: boolean;
  authError?: string;
  syncMode?: 'live-sse' | 'git-backup' | 'offline';
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
  availableUpdateVersion?: string;
  updateDownloaded?: boolean;
  isUpdateModalOpen?: boolean;
}

