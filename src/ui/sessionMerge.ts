import type { AppState } from './types';
import type { SessionDetail } from '../server/types';
import type { ChatMessage } from '../types';
import type { SyncInboxMessage } from '../sync/types';
import { applyAbortSuppression } from './sessionAbortSuppression';

export function appendOptimisticUserMessage(state: AppState, text: string, attachments?: any[]): void {
  const sid = state.activeSessionId || `sess-${Date.now()}`;
  state.activeSessionId = sid;
  const now = Date.now();
  const atts = attachments || (state.attachments && state.attachments.length > 0 ? [...state.attachments] : undefined);
  if (!state.activeSession) {
    state.activeSession = {
      id: sid,
      title: text.slice(0, 30) || (atts?.[0]?.label || 'Session'),
      mode: state.composerMode,
      createdAt: now,
      updatedAt: now,
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    };
  } else {
    state.activeSession.updatedAt = now;
  }

  const userMsg: ChatMessage = {
    role: 'user', content: text, timestamp: now,
    model: state.selectedModel, mode: state.composerMode, attachments: atts,
  } as any;
  state.activeSession.messages.push(userMsg);

  const sSummary = state.sessions.find((s) => s.id === sid);
  if (sSummary) {
    sSummary.updatedAt = now;
    sSummary.messageCount = (sSummary.messageCount || 0) + 1;
  } else {
    state.sessions.unshift({
      id: sid, title: state.activeSession.title, updatedAt: now,
      createdAt: state.activeSession.createdAt || now,
      messageCount: state.activeSession.messages.length,
      isGenerating: state.activeSession.isGenerating,
    });
  }
}

export function mergeSessionDetail(
  existing: SessionDetail | undefined,
  incoming: SessionDetail,
  inbox?: SyncInboxMessage[],
  lastAbortedAt?: number
): SessionDetail {
  const incomingUserTexts = new Set<string>();
  for (const m of incoming.messages || []) {
    if (m.role === 'user' && typeof m.content === 'string') {
      incomingUserTexts.add(m.content.trim());
    }
  }

  const pendingInboxMsgs: ChatMessage[] = (inbox || [])
    .filter((m) => m.sessionId === incoming.id && (m.content || (m.attachments && m.attachments.length > 0)) && !incomingUserTexts.has((m.content || '').trim()))
    .map((m) => ({
      role: 'user',
      content: m.content || '',
      timestamp: m.timestamp || Date.now(),
      model: m.model,
      mode: m.mode as any,
      attachments: m.attachments,
    } as any));

  if (!existing || existing.id !== incoming.id) {
    let baseDetail = incoming;
    if (pendingInboxMsgs.length > 0) {
      baseDetail = { ...incoming, messages: [...(incoming.messages || []), ...pendingInboxMsgs] };
    }
    return applyAbortSuppression(baseDetail, lastAbortedAt);
  }

  const pendingUserMsgs = (existing.messages || []).filter((m) => {
    if (m.role !== 'user') return false;
    const text = typeof m.content === 'string' ? m.content.trim() : '';
    const hasAtts = Boolean(m.attachments && m.attachments.length > 0);
    if (!text && !hasAtts) return false;
    if (text && incomingUserTexts.has(text)) return false;
    const ts = (m as any).timestamp || 0;
    return ts === 0 || Date.now() - ts < 120_000;
  });

  const allPending = [...pendingUserMsgs];
  for (const p of pendingInboxMsgs) {
    const pText = typeof p.content === 'string' ? p.content.trim() : '';
    const isDup = allPending.some((e) => {
      const eText = typeof e.content === 'string' ? e.content.trim() : '';
      if (pText && eText && eText === pText) return true;
      if (!pText && !eText && JSON.stringify(e.attachments) === JSON.stringify(p.attachments)) return true;
      return false;
    });
    if (!isDup) allPending.push(p);
  }

  const mergedMessages = [...(incoming.messages || [])];
  let isGenerating = incoming.isGenerating;
  if (
    mergedMessages.length > 0 &&
    existing.messages &&
    existing.messages.length === mergedMessages.length &&
    !existing.isGenerating
  ) {
    const existLast = existing.messages[existing.messages.length - 1];
    const incLast = mergedMessages[mergedMessages.length - 1];
    if (
      existLast?.role === 'assistant' &&
      incLast?.role === 'assistant' &&
      !(existLast as any).isLive &&
      typeof existLast.content === 'string' &&
      typeof incLast.content === 'string' &&
      existLast.content.length > incLast.content.length &&
      existLast.content.startsWith(incLast.content)
    ) {
      mergedMessages[mergedMessages.length - 1] = existLast;
      isGenerating = false;
    }
  }

  if (allPending.length > 0) {
    const lastMsg = mergedMessages[mergedMessages.length - 1];
    const isTrailingDraft = lastMsg?.role === 'assistant' && (
      Boolean((lastMsg as any).isLive) ||
      (!lastMsg.content?.trim() && !(lastMsg as any).tool_calls?.length && !(lastMsg as any).thought?.trim())
    );
    if (isTrailingDraft) mergedMessages.splice(mergedMessages.length - 1, 0, ...allPending);
    else mergedMessages.push(...allPending);
  }

  return applyAbortSuppression({
    ...incoming,
    isGenerating,
    messages: mergedMessages,
  }, lastAbortedAt);
}
