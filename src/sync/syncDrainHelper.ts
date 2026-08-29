import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SyncInboxMessage } from './types';
import { stopSession } from '../server/sessionStore';

export async function drainIncomingMessages(
  workspaceRoot: string,
  inbox: SyncInboxMessage[]
): Promise<{ processedIds: string[]; hasAbort: boolean }> {
  const processedIds: string[] = [];
  const hasAbort = inbox.some((m) => m.action === 'abort' || (m.role as string) === 'abort');
  for (const msg of inbox) {
    if (msg.action === 'abort' || (msg.role as string) === 'abort') {
      await stopSession(workspaceRoot, msg.sessionId);
    } else {
      const inDir = path.join(workspaceRoot, '.agent', 'sessions', msg.sessionId, 'incoming');
      await fs.mkdir(inDir, { recursive: true });
      await fs.writeFile(
        path.join(inDir, `${msg.timestamp}_${msg.id}.json`),
        JSON.stringify({
          role: msg.role || 'user',
          content: msg.content,
          model: msg.model,
          mode: msg.mode,
          action: msg.action || 'message',
          timestamp: msg.timestamp,
          commandId: msg.commandId,
          allowed: msg.allowed,
          attachments: msg.attachments,
        }),
        'utf8'
      );
    }
    processedIds.push(msg.id);
  }
  return { processedIds, hasAbort };
}
