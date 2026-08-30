export type AgentMode = 'agent' | 'plan' | 'debug' | 'multitask' | 'ask';
import type { SidebarViewMode } from './sidebarViewMode';

export interface SidebarSessionSummary {
  id: string;
  title: string;
  mode: AgentMode;
  model: string;
  messageCount: number;
  updatedAt: number;
  isCurrent: boolean;
  isRunning: boolean;
  isPinned?: boolean;
  hasError: boolean;
  preview?: string;
  plans?: Array<{ path: string; title?: string; name?: string }>;
  artifacts?: Array<{ path: string; name?: string; type?: string }>;
  searchText?: string;
}

export type SidebarFilterTab = 'all' | 'running' | 'pinned' | 'artifacts';

export interface SidebarDashboardStats {
  runningCount: number;
  pinnedCount: number;
  totalSessions: number;
  totalMessages: number;
  artifactsCount: number;
}

export interface SidebarChangedFile {
  file: string;
  dir: string;
  ext: string;
  fullPath: string;
  status?: 'added' | 'deleted' | 'modified';
  additions?: number;
  deletions?: number;
}

export interface SidebarArtifact {
  name: string;
  path: string;
  type?: 'plan' | 'walkthrough' | 'file';
}

export interface SidebarSubagent {
  id: string;
  role: string;
  type?: string;
  status: 'running' | 'completed' | 'failed' | string;
  summary?: string;
}

export interface SidebarUpload {
  label: string;
  path?: string;
  type: 'image' | 'file' | 'selection' | string;
  timestamp?: number;
}

export interface SidebarBackgroundTask {
  id: string;
  name: string;
  command?: string;
  status: 'running' | 'completed' | 'failed' | string;
}

export interface SidebarSkill {
  name: string;
  path: string;
}

export interface SidebarSessionDetails {
  sessionId: string;
  title: string;
  mode: AgentMode;
  model: string;
  filesChanged: SidebarChangedFile[];
  artifacts: SidebarArtifact[];
  subagents: SidebarSubagent[];
  uploads: SidebarUpload[];
  tasks: SidebarBackgroundTask[];
  terminals?: SidebarBackgroundTask[];
  skills: SidebarSkill[];
}

export interface SidebarStatePayload {
  activeSessionId: string | null;
  sessions: SidebarSessionSummary[];
  currentDetails?: SidebarSessionDetails;
  dashboardArtifacts?: SidebarArtifact[];
  stats?: SidebarDashboardStats;
  searchQuery?: string;
  viewMode: SidebarViewMode;
  hasOpenPanels: boolean;
}

export type SidebarToHostMessage =
  | { type: 'ready' }
  | { type: 'open_session'; sessionId: string }
  | { type: 'new_session' }
  | { type: 'delete_session'; sessionId: string }
  | { type: 'copy_session'; sessionId: string }
  | { type: 'pin_session'; sessionId: string }
  | { type: 'unpin_session'; sessionId: string }
  | { type: 'open_file'; filePath: string; startLine?: number; endLine?: number }
  | { type: 'open_artifact'; filePath: string }
  | { type: 'open_skill'; skillPath: string }
  | { type: 'search_query'; query: string }
  | { type: 'show_dashboard' };

export type HostToSidebarEvent =
  | { type: 'sync_state'; state: SidebarStatePayload }
  | { type: 'edit_command'; command: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll' };
