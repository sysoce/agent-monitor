import type { SessionDetail } from '../server/types';

export function applyAbortSuppression(
  detail: SessionDetail,
  lastAbortedAt?: number,
  lastAbortedSessionId?: string
): SessionDetail {
  if (!lastAbortedAt || lastAbortedAt <= 0) return detail;
  const isEpoch = lastAbortedAt > 1_000_000_000_000;
  if (isEpoch && Date.now() - lastAbortedAt > 10_000) return detail;
  if (lastAbortedSessionId && detail.id !== lastAbortedSessionId) return detail;
  if (isEpoch && detail.updatedAt && detail.updatedAt > lastAbortedAt) return detail;

  const msgs = detail.messages || [];
  const hasUserMsgAfterAbort = msgs.some(
    (m) => m.role === 'user' && ((m as { timestamp?: number }).timestamp || 0) > lastAbortedAt
  );
  if (hasUserMsgAfterAbort) return detail;
  return {
    ...detail,
    isGenerating: false,
    messages: msgs.map((m) => ((m as { isLive?: boolean }).isLive ? { ...m, isLive: false } : m)),
  };
}
