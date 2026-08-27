import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SessionSummary } from './types';
import { extractSummaryPlansAndArtifacts } from './sessionEnricher';
import { findSessionFile } from './sessionFinder';

export async function listSessions(workspaceRoot: string): Promise<SessionSummary[]> {
  const root = path.join(workspaceRoot, '.agent', 'sessions');
  let entries: import('node:fs').Dirent[] = [];
  try { entries = await fs.readdir(root, { withFileTypes: true }); } catch { return []; }
  const summaries: SessionSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sFile = await findSessionFile(path.join(root, entry.name));
    if (!sFile) continue;
    try {
      const raw = await fs.readFile(sFile.path, 'utf8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      let preview = '';
      for (const line of lines) {
        try {
          const msg = JSON.parse(line) as { role?: string; content?: string };
          if (msg.role === 'user' && msg.content?.trim()) {
            preview = msg.content.trim().split(/\r?\n/)[0]?.slice(0, 80) ?? '';
            break;
          }
        } catch {}
      }
      const { plans, artifacts } = extractSummaryPlansAndArtifacts(lines);
      summaries.push({
        id: entry.name,
        title: preview ? preview.slice(0, 40) : entry.name,
        createdAt: sFile.birthtimeMs,
        updatedAt: sFile.mtimeMs,
        messageCount: lines.length,
        preview: preview || '(empty session)',
        plans: plans.length > 0 ? plans : undefined,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
      });
    } catch {}
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}
