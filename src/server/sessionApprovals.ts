import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { writeIncomingMessage } from '../utils/incomingMessages';

export interface PendingApprovalItem {
  commandId: string;
  command: string;
  createdAt: number;
}

export async function readPendingApprovals(sDir: string): Promise<PendingApprovalItem[]> {
  try {
    const raw = await fs.readFile(path.join(sDir, 'pending_approval.json'), 'utf8');
    const p = JSON.parse(raw) as { commandId?: string; command?: string; createdAt?: number };
    if (p.commandId && p.command) {
      return [{ commandId: p.commandId, command: p.command, createdAt: p.createdAt || Date.now() }];
    }
  } catch {}
  return [];
}

export async function resolveSessionApproval(
  workspaceRoot: string,
  sessionId: string,
  commandId: string,
  allowed: boolean
): Promise<boolean> {
  try {
    const sDir = path.join(workspaceRoot, '.agent', 'sessions', sessionId);
    await fs.unlink(path.join(sDir, 'pending_approval.json')).catch(() => {});
    await writeIncomingMessage(workspaceRoot, sessionId, {
      action: 'approval',
      commandId,
      allowed,
      from: 'monitor-approval',
    });
    return true;
  } catch {
    return false;
  }
}
