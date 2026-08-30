import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { writeIncomingMessage } from '../utils/incomingMessages';

export async function stopSession(workspaceRoot: string, sessionId: string): Promise<boolean> {
  try {
    const sBase = path.join(workspaceRoot, '.agent', 'sessions'), sids = new Set<string>();
    if (sessionId) sids.add(sessionId);
    try {
      const dirs = await fs.readdir(sBase);
      for (const d of dirs) {
        try { if ((await fs.stat(path.join(sBase, d, '.active'))).isFile()) sids.add(d); } catch {}
      }
    } catch {}
    await Promise.all(Array.from(sids).map(async (sid) => {
      const sDir = path.join(sBase, sid);
      await Promise.all([
        writeIncomingMessage(workspaceRoot, sid, { action: 'abort', content: 'stop', from: 'monitor-stop' }),
        fs.writeFile(path.join(sDir, '.aborted'), JSON.stringify({ abortedAt: Date.now() }), 'utf8').catch(() => {}),
        fs.unlink(path.join(sDir, '.active')).catch(() => {}),
        fs.unlink(path.join(sDir, 'live_draft.json')).catch(() => {}),
      ]);
    }));
    return true;
  } catch { return false; }
}

export async function createSession(workspaceRoot: string, _title?: string): Promise<string> {
  const sessionId = `sess-${crypto.randomBytes(4).toString('hex')}`;
  const dir = path.join(workspaceRoot, '.agent', 'sessions', sessionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'chat.jsonl'), '', 'utf8');
  await fs.unlink(path.join(dir, '.aborted')).catch(() => {});
  return sessionId;
}
