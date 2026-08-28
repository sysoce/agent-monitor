import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function computeSessionsFingerprint(
  workspaceRoot: string,
  sessions: Array<{ id: string; updatedAt: number; messageCount: number }>
): Promise<string> {
  const topId = sessions[0]?.id;
  let draftMtime = 0, hasActive = false;
  if (topId) {
    try {
      const sDir = path.join(workspaceRoot, '.agent', 'sessions', topId);
      draftMtime = (await fs.stat(path.join(sDir, 'live_draft.json')).catch(() => ({ mtimeMs: 0 }))).mtimeMs;
      hasActive = Boolean((await fs.stat(path.join(sDir, '.active')).catch(() => null))?.isFile());
    } catch {}
  }
  return sessions.slice(0, 20).map((s) => `${s.id}:${s.updatedAt}:${s.messageCount}`).join('|') + `|d:${draftMtime}|a:${hasActive}`;
}
