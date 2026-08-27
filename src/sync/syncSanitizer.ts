export function sanitizeSessionForSync(detail: any): any {
  if (!detail || !Array.isArray(detail.messages)) return detail;
  const messages = detail.messages.map((m: any) => {
    if (m?.role === 'tool' && typeof m.content === 'string' && m.content.length > 20_000) {
      return { ...m, content: m.content.slice(0, 20_000) + '\n... [tool output truncated for sync]' };
    }
    return m;
  });
  return { ...detail, messages };
}
