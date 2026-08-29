import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SessionSummary } from './types';
import { extractSummaryPlansAndArtifacts } from './sessionEnricher';
import { findSessionFile } from './sessionFinder';
import { extractSessionActivityFromLines } from './sessionActivity';

export async function listSessions(workspaceRoot: string): Promise<SessionSummary[]> {
  const root = path.join(workspaceRoot, '.agent', 'sessions');
  let entries: import('node:fs').Dirent[] = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return []; }
  const summaries: SessionSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sDir = path.join(root, entry.name);
    const sFile = await findSessionFile(sDir);
    if (!sFile) continue;
    try {
      const raw = await fs.readFile(sFile.path, 'utf8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      const { plans, artifacts } = extractSummaryPlansAndArtifacts(lines);

      let abortedAt = 0;
      try {
        const abRaw = await fs.readFile(path.join(sDir, '.aborted'), 'utf8');
        abortedAt = Number((JSON.parse(abRaw) as { abortedAt?: number }).abortedAt) || 0;
      } catch {}

      let hasActiveLock = false;
      let activeMtime = 0;
      if (abortedAt === 0) {
        try {
          const activeSt = await fs.stat(path.join(sDir, '.active'));
          hasActiveLock = activeSt.isFile() && (Date.now() - activeSt.mtimeMs < 120_000);
          activeMtime = activeSt.mtimeMs;
        } catch {}
      }

      let hasDraft = false;
      let draftMtime = 0;
      if (abortedAt === 0) {
        try {
          const draftSt = await fs.stat(path.join(sDir, 'live_draft.json'));
          hasDraft = draftSt.isFile() && (Date.now() - draftSt.mtimeMs < 60_000);
          draftMtime = draftSt.mtimeMs;
        } catch {}
      }

      let hasIncoming = false;
      let incomingMtime = 0;
      try {
        const inDir = path.join(sDir, 'incoming');
        const inFiles = await fs.readdir(inDir);
        hasIncoming = inFiles.some((f) => f.endsWith('.json') && !f.startsWith('abort-'));
        if (hasIncoming) {
          const inSt = await fs.stat(inDir);
          incomingMtime = inSt.mtimeMs;
        }
      } catch {}

      const isGenerating = Boolean((hasActiveLock || hasDraft || hasIncoming) && abortedAt === 0);
      const activity = extractSessionActivityFromLines(lines, sFile, { activeMtime, draftMtime, incomingMtime });

      summaries.push({
        id: entry.name,
        title: activity.preview ? activity.preview.slice(0, 40) : entry.name,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
        messageCount: activity.messageCount,
        preview: activity.preview || '(empty session)',
        plans: plans.length > 0 ? plans : undefined,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        isGenerating: isGenerating || undefined,
      });
    } catch {}
  }
  return summaries.sort((a, b) => {
    const aRunning = a.isGenerating ? 1 : 0;
    const bRunning = b.isGenerating ? 1 : 0;
    if (aRunning !== bRunning) return bRunning - aRunning;
    if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return a.id.localeCompare(b.id);
  });
}
