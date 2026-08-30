import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function computeSessionsFingerprint(
  workspaceRoot: string,
  sessions: Array<{ id: string; updatedAt: number; messageCount: number; isGenerating?: boolean }>
): Promise<string> {
  const topSessions = sessions.slice(0, 5);
  const liveIndicators: string[] = [];
  for (const s of topSessions) {
    try {
      const sDir = path.join(workspaceRoot, '.agent', 'sessions', s.id);
      const draftMtime = (await fs.stat(path.join(sDir, 'live_draft.json')).catch(() => ({ mtimeMs: 0 }))).mtimeMs;
      const hasActive = Boolean((await fs.stat(path.join(sDir, '.active')).catch(() => null))?.isFile());
      if (draftMtime > 0 || hasActive || s.isGenerating) {
        liveIndicators.push(`${s.id}:${draftMtime}:${hasActive}`);
      }
    } catch {}
  }
  return sessions.slice(0, 20).map((s) => `${s.id}:${s.updatedAt}:${s.messageCount}`).join('|') + `|live:${liveIndicators.join(',')}`;
}
