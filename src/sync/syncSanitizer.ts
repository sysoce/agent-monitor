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
