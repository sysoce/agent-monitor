import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SessionDetail } from './types';
import type { ChatMessage } from '../types';

export interface SessionDraftPayload {
  thinking?: string;
  content?: string;
  timestamp: number;
}

export async function readSessionDraft(
  workspaceRoot: string,
  sessionId: string,
  maxAgeMs = 60_000
): Promise<SessionDraftPayload | null> {
  const draftPath = path.join(workspaceRoot, '.agent', 'sessions', sessionId, 'live_draft.json');
  try {
    const raw = await fs.readFile(draftPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SessionDraftPayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    const ts = typeof parsed.timestamp === 'number' ? parsed.timestamp : 0;
    if (Date.now() - ts > maxAgeMs) return null;
    return {
      thinking: typeof parsed.thinking === 'string' && parsed.thinking.trim() ? parsed.thinking.trim() : undefined,
      content: typeof parsed.content === 'string' ? parsed.content : '',
      timestamp: ts,
    };
  } catch {
    return null;
  }
}

export function injectDraftIntoSession(
  detail: SessionDetail,
  draft: SessionDraftPayload
): SessionDetail {
  const draftMessage: ChatMessage = {
    role: 'assistant',
    content: draft.content ?? '',
    thinking: draft.thinking,
    thought: draft.thinking,
    isLive: true,
  };

  return {
    ...detail,
    isGenerating: true,
    messages: [...detail.messages, draftMessage],
  };
}
