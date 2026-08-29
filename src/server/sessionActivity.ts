export function extractMessageTimestamp(msg: any): number | undefined {
  if (!msg || typeof msg !== 'object') return undefined;
  const val = msg.timestamp ?? msg.time ?? msg.created_at ?? msg.createdAt ?? msg.ts;
  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return val >= 1e8 && val < 1e11 ? val * 1000 : val;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num >= 1e8 && num < 1e11 ? num * 1000 : num;
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

export interface SessionActivityInfo {
  preview: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export function extractSessionActivityFromLines(
  lines: string[],
  sFile: { mtimeMs: number; birthtimeMs: number },
  liveMtimes: { activeMtime?: number; draftMtime?: number; incomingMtime?: number } = {}
): SessionActivityInfo {
  let preview = '';
  let firstMsgTimestamp: number | undefined;
  let lastMsgTimestamp: number | undefined;
  let count = 0;

  for (const line of lines) {
    try {
      const msg = JSON.parse(line) as { role?: string; content?: string; timestamp?: any };
      count++;
      if (!preview && msg.role === 'user' && msg.content?.trim()) {
        preview = msg.content.trim().split(/\r?\n/)[0]?.slice(0, 80) ?? '';
      }
      const ts = extractMessageTimestamp(msg);
      if (ts !== undefined) {
        if (firstMsgTimestamp === undefined || ts < firstMsgTimestamp) {
          firstMsgTimestamp = ts;
        }
        if (lastMsgTimestamp === undefined || ts > lastMsgTimestamp) {
          lastMsgTimestamp = ts;
        }
      }
    } catch {}
  }

  const { activeMtime = 0, draftMtime = 0, incomingMtime = 0 } = liveMtimes;
  const liveMax = Math.max(activeMtime, draftMtime, incomingMtime);

  let updatedAt: number;
  if (lastMsgTimestamp !== undefined) {
    updatedAt = Math.max(lastMsgTimestamp, liveMax);
  } else {
    updatedAt = Math.max(sFile.mtimeMs, liveMax);
  }

  const createdAt = firstMsgTimestamp || sFile.birthtimeMs || sFile.mtimeMs || updatedAt;

  return {
    preview,
    createdAt,
    updatedAt,
    messageCount: count,
  };
}
