import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatMessage } from '../types';

export async function findSessionFile(
  dir: string
): Promise<{ path: string; mtimeMs: number; birthtimeMs: number } | null> {
  for (const name of ['chat.jsonl', 'session.jsonl']) {
    try {
      const full = path.join(dir, name);
      const st = await fs.stat(full);
      if (st.isFile()) {
        return {
          path: full,
          mtimeMs: st.mtimeMs,
          birthtimeMs: st.birthtimeMs || st.ctimeMs || st.mtimeMs,
        };
      }
    } catch {}
  }
  return null;
}

export function parseAndDeduplicateLines(raw: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const line of raw.split('\n').filter((l) => l.trim())) {
    try {
      const msg = JSON.parse(line) as ChatMessage;
      const prev = messages[messages.length - 1];
      if (prev && prev.role === msg.role && JSON.stringify(prev) === JSON.stringify(msg)) continue;
      if (
        msg.role === 'assistant' &&
        !msg.content &&
        !(msg as any).tool_calls?.length &&
        !(msg as any).thinking &&
        !(msg as any).thought
      ) {
        continue;
      }
      messages.push(msg);
    } catch {}
  }
  return messages;
}
