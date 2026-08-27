import type { ChatMessage } from '../types';

export interface MonitorServerConfig {
  port: number;
  host: string;
  workspaceRoot: string;
  tunnel?: boolean;
  password?: string;
  requireAuth?: boolean;
}

export interface ModelOption {
  id: string;
  value?: string;
  label: string;
  provider: string;
  category?: string;
  hint?: string;
  badge?: string;
  isDefault?: boolean;
  capabilities?: {
    thinking?: boolean;
    vision?: boolean;
    tools?: boolean;
    contextWindow?: number;
  };
  pills?: string[];
}

export interface ModelGroup {
  label: string;
  category: string;
  options: ModelOption[];
}


export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  messageCount: number;
  preview: string;
  model?: string;
  mode?: string;
  plans?: Array<{ name: string; title: string; path: string }>;
  artifacts?: Array<{ name: string; path: string; type?: string }>;
  isGenerating?: boolean;
}

export interface SessionFileStat {
  path: string;
  status?: string;
  additions?: number;
  deletions?: number;
}

export interface SessionArtifactItem {
  name: string;
  path: string;
  type: string;
}

export interface SessionSubagentItem {
  id: string;
  role: string;
  type?: string;
  prompt?: string;
  summary?: string;
  status?: 'running' | 'completed' | 'failed' | 'idle' | 'aborted';
}

export interface SessionDetail {
  id: string;
  title: string;
  mode: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  filesChanged: SessionFileStat[];
  artifacts: SessionArtifactItem[];
  subagents: SessionSubagentItem[];
  pendingApprovals?: Array<{ commandId: string; command: string; createdAt: number }>;
  backgroundTasks?: Array<{ id: string; name: string; command?: string; status: 'running' | 'completed' | 'failed' | 'done' }>;
  plans?: PlanSummary[];
  isGenerating?: boolean;
}

export interface PlanSummary {
  name: string;
  title: string;
  path: string;
  updatedAt: number;
  sizeBytes: number;
  content?: string;
}

export interface PlanDetail extends PlanSummary {
  content: string;
}
