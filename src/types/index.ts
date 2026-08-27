export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: any[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  thought?: string;
  thinking?: string;
  isLive?: boolean;
  attachments?: AttachmentItem[];
  toolCalls?: ToolCallItem[];
  planMeta?: PlanMeta;
  walkthroughMeta?: WalkthroughMeta;
  todos?: TodoItem[];
  timestamp?: number | string | Date;
  isError?: boolean;
}

export interface ToolCall {
  id: string;
  type?: 'function';
  name?: string;
  args?: Record<string, unknown>;
  function?: {
    name: string;
    arguments: string;
  };
  result?: unknown;
  status?: string;
  error?: string;
}

export interface AttachmentItem {
  id: string;
  type: 'file' | 'selection' | 'image' | 'problems' | 'directory' | 'code' | 'symbol' | 'git';
  label: string;
  uri?: string;
  path?: string;
  content?: string;
  range?: {
    startLine: number;
    endLine: number;
  };
}

export interface MentionSuggestionItem {
  type: 'file' | 'folder' | 'symbol' | 'git' | 'problems';
  label: string;
  detail?: string;
  uri?: string;
}

export interface ToolCallItem {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export interface PlanMeta {
  title?: string;
  overview?: string;
  path?: string;
}

export interface WalkthroughMeta {
  title?: string;
  summary?: string;
  path?: string;
}

export interface TodoItem {
  id?: string;
  title?: string;
  text?: string;
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'done' | string;
  done?: boolean;
}
