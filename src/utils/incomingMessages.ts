import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ChatMessage } from '../types';

export interface IncomingMessagePayload {
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  from?: string;
  timestamp?: number;
  model?: string;
  mode?: string;
  action?: 'message' | 'abort' | 'approval';
  commandId?: string;
  allowed?: boolean;
  attachments?: any[];
}

let messageSequenceCounter = 0;

export function incomingMessagesDir(workspaceRoot: string, sessionId: string): string {
  return path.join(workspaceRoot, '.agent', 'sessions', sessionId, 'incoming');
}

/**
 * Enqueue an incoming message into the session's incoming spool directory.
 */
export async function writeIncomingMessage(
  workspaceRoot: string,
  sessionId: string,
  payload: IncomingMessagePayload
): Promise<string> {
  const dir = incomingMessagesDir(workspaceRoot, sessionId);
  await fs.mkdir(dir, { recursive: true });
  const ts = payload.timestamp ?? Date.now();
  const seq = String(++messageSequenceCounter).padStart(6, '0');
  const rand = crypto.randomBytes(4).toString('hex');
  const filename = payload.action === 'abort' ? `abort-${ts}-${seq}-${rand}.json` : `msg-${ts}-${seq}-${rand}.json`;
  const filePath = path.join(dir, filename);
  const data = JSON.stringify({
    role: payload.role ?? 'user',
    content: payload.content,
    from: payload.from ?? 'agent',
    timestamp: ts,
    model: payload.model,
    mode: payload.mode,
    action: payload.action ?? 'message',
    attachments: payload.attachments,
  });
  await fs.writeFile(filePath, data, 'utf8');
  return filePath;
}
