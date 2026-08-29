import { getSessionDetail } from '../server/sessionStore';

export function sanitizeSessionForSync(detail: any): any {
  if (!detail || !Array.isArray(detail.messages)) return detail;
  const messages = detail.messages.map((m: any) => {
    if (!m) return m;
    const sanitized = { ...m };
    if (typeof sanitized.content === 'string' && sanitized.content.length > 25_000) {
      sanitized.content = sanitized.content.slice(0, 25_000) + '\n... [content truncated for mobile sync]';
    }
    if (typeof sanitized.thought === 'string' && sanitized.thought.length > 15_000) {
      sanitized.thought = sanitized.thought.slice(0, 15_000) + '\n... [thought truncated for mobile sync]';
    }
    if (typeof sanitized.thinking === 'string' && sanitized.thinking.length > 15_000) {
      sanitized.thinking = sanitized.thinking.slice(0, 15_000) + '\n... [thinking truncated for mobile sync]';
    }
    if (Array.isArray(sanitized.tool_calls)) {
      sanitized.tool_calls = sanitized.tool_calls.map((tc: any) => {
        if (!tc || !tc.args) return tc;
        const args = { ...tc.args };
        for (const k of ['CodeContent', 'code', 'content', 'ReplacementContent', 'replacementContent']) {
          if (typeof args[k] === 'string' && args[k].length > 5_000) {
            args[k] = args[k].slice(0, 5_000) + '\n... [truncated]';
          }
        }
        return { ...tc, args };
      });
    }
    return sanitized;
  });
  return { ...detail, messages };
}

export async function loadRecentSessionDetails(
  workspaceRoot: string,
  sessions: Array<{ id: string }>,
  extraId?: string,
  limit = 3
): Promise<Record<string, any>> {
  const details: Record<string, any> = {};
  const targetIds = new Set(sessions.slice(0, limit).map((s) => s.id));
  if (extraId) targetIds.add(extraId);
  for (const sid of targetIds) {
    try {
      const d = await getSessionDetail(workspaceRoot, sid);
      if (d) details[sid] = sanitizeSessionForSync(d);
    } catch {}
  }
  return details;
}
