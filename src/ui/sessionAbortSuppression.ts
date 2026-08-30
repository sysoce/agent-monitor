import type { SessionDetail } from '../server/types';

export function applyAbortSuppression(detail: SessionDetail, lastAbortedAt?: number): SessionDetail {
  if (!lastAbortedAt || lastAbortedAt <= 0) return detail;
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
