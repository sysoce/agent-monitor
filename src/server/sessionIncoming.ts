import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatMessage } from '../types';

export interface IncomingReadResult {
  hasPending: boolean;
  incomingMtime: number;
}

export async function readIncomingMessages(
  sDir: string,
  messages: ChatMessage[]
): Promise<IncomingReadResult> {
  let hasPending = false;
  let incomingMtime = 0;
  try {
    const inDir = path.join(sDir, 'incoming');
    const inFiles = (await fs.readdir(inDir)).filter((f) => f.endsWith('.json')).sort();
    hasPending = inFiles.some((f) => !f.startsWith('abort-'));
    if (hasPending) {
      incomingMtime = (await fs.stat(inDir).catch(() => ({ mtimeMs: 0 }))).mtimeMs;
    }
    const seenUser = new Set<string>();
    for (const m of messages.slice(-5)) {
      if (m.role === 'user' && typeof m.content === 'string') seenUser.add(m.content.trim());
    }
    const incomingItems: Array<{ role: 'user' | 'assistant'; content: string; attachments?: any[]; timestamp: number }> = [];
    for (const f of inFiles) {
      try {
        const p = JSON.parse(await fs.readFile(path.join(inDir, f), 'utf8')) as {
          role?: string;
          content?: string;
          action?: string;
          attachments?: any[];
          timestamp?: number;
        };
        if (p?.action !== 'abort' && (p?.content?.trim() || (p?.attachments && p.attachments.length > 0))) {
          const content = p.content?.trim() || '';
          if (!content || !seenUser.has(content)) {
            if (content) seenUser.add(content);
            incomingItems.push({
              role: (p.role as 'user' | 'assistant') ?? 'user',
              content,
              attachments: p.attachments,
              timestamp: p.timestamp ?? 0,
            });
          }
        }
      } catch {}
    }
    incomingItems.sort((a, b) => a.timestamp - b.timestamp);
    for (const item of incomingItems) {
      messages.push({ role: item.role, content: item.content, attachments: item.attachments });
    }
  } catch {}
  return { hasPending, incomingMtime };
}
