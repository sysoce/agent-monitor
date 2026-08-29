import { getSessionDetail } from '../server/sessionStore';

function sanitizeToolCall(tc: any): any {
  if (!tc) return tc;
  const { result: _strippedResult, ...rest } = tc;
  const args = rest.args ? { ...rest.args } : rest.args;
  if (args && typeof args === 'object') {
    for (const k of ['CodeContent', 'code', 'content', 'ReplacementContent', 'replacementContent', 'file_text', 'text']) {
      if (typeof args[k] === 'string' && args[k].length > 120) {
        args[k] = args[k].slice(0, 120) + '... [truncated]';
      }
    }
  }
  return { ...rest, args };
}

export function sanitizeSessionForSync(detail: any): any {
  if (!detail || !Array.isArray(detail.messages)) return detail;
  const rawMessages = detail.messages.length > 30 ? detail.messages.slice(-30) : detail.messages;
  const messages = rawMessages.map((m: any) => {
    if (!m) return m;
    const sanitized = { ...m };
    if (typeof sanitized.content === 'string' && sanitized.content.length > 20_000) {
      sanitized.content = sanitized.content.slice(0, 20_000) + '\n... [content truncated for mobile sync]';
    }
    if (typeof sanitized.thought === 'string' && sanitized.thought.length > 8_000) {
      sanitized.thought = sanitized.thought.slice(0, 8_000) + '\n... [thought truncated for mobile sync]';
    }
    if (typeof sanitized.thinking === 'string' && sanitized.thinking.length > 8_000) {
      sanitized.thinking = sanitized.thinking.slice(0, 8_000) + '\n... [thinking truncated for mobile sync]';
    }
    if (Array.isArray(sanitized.toolCalls)) sanitized.toolCalls = sanitized.toolCalls.map(sanitizeToolCall);
    if (Array.isArray(sanitized.tool_calls)) sanitized.tool_calls = sanitized.tool_calls.map(sanitizeToolCall);
    if (Array.isArray(sanitized.parts)) {
      sanitized.parts = sanitized.parts.map((p: any) => (p?.type === 'tool_call' && p.toolCall ? { ...p, toolCall: sanitizeToolCall(p.toolCall) } : p));
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
