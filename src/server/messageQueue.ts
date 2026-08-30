import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { writeIncomingMessage } from '../utils/incomingMessages';
import type { AttachmentItem } from '../types';

export interface PostMessageOptions {
  workspaceRoot: string;
  sessionId: string;
  content: string;
  from?: string;
  role?: 'user' | 'assistant';
  model?: string;
  mode?: string;
  action?: 'message' | 'abort';
  attachments?: AttachmentItem[];
  timestamp?: number;
}

export async function enqueueSessionMessage(opts: PostMessageOptions): Promise<void> {
  const sessionDir = path.join(opts.workspaceRoot, '.agent', 'sessions', opts.sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  await writeIncomingMessage(opts.workspaceRoot, opts.sessionId, {
    role: opts.role ?? 'user',
    content: opts.content,
    from: opts.from ?? 'mobile-monitor',
    timestamp: opts.timestamp ?? Date.now(),
    model: opts.model,
    mode: opts.mode,
    action: opts.action ?? 'message',
    attachments: opts.attachments,
  });

  if (opts.action !== 'abort') {
    await fs.unlink(path.join(sessionDir, '.aborted')).catch(() => {});
  }
}
