import type { AppState } from './types';
import type { SessionDetail } from '../server/types';
import type { ChatMessage } from '../types';
import type { SyncInboxMessage } from '../sync/types';

export function appendOptimisticUserMessage(state: AppState, text: string): void {
  const sid = state.activeSessionId || `sess-${Date.now()}`;
  state.activeSessionId = sid;
  if (!state.activeSession) {
    state.activeSession = {
      id: sid,
      title: text.slice(0, 30) || (state.attachments?.[0]?.label || 'Session'),
      mode: state.composerMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      filesChanged: [],
      artifacts: [],
      subagents: [],
    };
  }

  const userMsg: ChatMessage = {
    role: 'user',
    content: text,
    timestamp: Date.now(),
    model: state.selectedModel,
    mode: state.composerMode,
    attachments: state.attachments && state.attachments.length > 0 ? [...state.attachments] : undefined,
  } as any;

  state.activeSession.messages.push(userMsg);
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
      (!lastMsg.content?.trim() && !(lastMsg as any).tool_calls?.length && !(lastMsg as any).thought?.trim() && !(lastMsg as any).thinking?.trim())
    );
    if (isTrailingDraft) {
      mergedMessages.splice(mergedMessages.length - 1, 0, ...allPending);
    } else {
      mergedMessages.push(...allPending);
    }
  }

  return applyAbortSuppression({
    ...incoming,
    isGenerating,
    messages: mergedMessages,
  }, lastAbortedAt);
}

function applyAbortSuppression(detail: SessionDetail, lastAbortedAt?: number): SessionDetail {
  if (!lastAbortedAt || lastAbortedAt <= 0) return detail;
  const msgs = detail.messages || [];
  const hasUserMsgAfterAbort = msgs.some((m) => m.role === 'user' && ((m as { timestamp?: number }).timestamp || 0) > lastAbortedAt);
  if (hasUserMsgAfterAbort) return detail;
  return {
    ...detail,
    isGenerating: false,
    messages: msgs.map((m) => ((m as { isLive?: boolean }).isLive ? { ...m, isLive: false } : m)),
  };
}

